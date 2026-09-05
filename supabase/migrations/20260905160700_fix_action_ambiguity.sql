create or replace function ateek_private.perform(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  v_thread public.ateek_threads%rowtype;
  v_listing public.ateek_listings%rowtype;
  v_offer public.ateek_offers%rowtype;
  rid uuid;
  other uuid;
  txt text;
  value bigint;
begin
  if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'يلزم تسجيل الدخول'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));

  if action='profile' then
    txt:=trim(payload->>'name');
    if txt is null or length(txt) not between 1 and 60 then raise exception 'اكتب اسمًا من 1 إلى 60 حرفًا'; end if;
    insert into public.ateek_profiles(id,name) values(uid,txt) on conflict(id) do update set name=excluded.name;
    return jsonb_build_object('id',uid);
  end if;

  if not exists(select 1 from public.ateek_profiles where id=uid) then raise exception 'أكمل اسمك في الحساب أولًا'; end if;

  if action='listing' then
    if (select count(*) from public.ateek_listings where seller_id=uid and created_at>now()-interval '1 day')>=30 then raise exception 'وصلت إلى حد الإعلانات اليومي'; end if;
    txt:=payload->>'image';
    if not exists(select 1 from storage.objects so where so.bucket_id='ateek-images' and so.name=txt and (storage.foldername(so.name))[1]=uid::text) then raise exception 'ارفع صورة السلعة أولًا'; end if;
    insert into public.ateek_listings(seller_id,title,description,price,category,location,condition,image)
    values(uid,trim(payload->>'title'),trim(payload->>'description'),(payload->>'price')::bigint,payload->>'category',trim(payload->>'location'),payload->>'condition',txt)
    returning id into rid;
    return jsonb_build_object('id',rid);

  elsif action='favorite' then
    if (payload->>'saved')::boolean then
      insert into public.ateek_favorites(user_id,listing_id) values(uid,(payload->>'id')::uuid) on conflict do nothing;
    else
      delete from public.ateek_favorites af where af.user_id=uid and af.listing_id=(payload->>'id')::uuid;
    end if;
    return '{}'::jsonb;

  elsif action='remove' then
    select al.* into v_listing from public.ateek_listings al where al.id=(payload->>'id')::uuid for update;
    if v_listing.id is null then raise exception 'الإعلان غير موجود'; end if;
    if v_listing.seller_id is distinct from uid then raise exception 'لا يمكنك تعديل إعلان غيرك'; end if;
    if exists(select 1 from public.ateek_offers ao join public.ateek_threads ath on ath.id=ao.thread_id where ath.listing_id=v_listing.id and ao.status='accepted') then raise exception 'أكمل الصفقة المقبولة أولًا'; end if;
    update public.ateek_listings al set status='removed' where al.id=v_listing.id;
    return '{}'::jsonb;

  elsif action='thread' then
    select al.* into v_listing from public.ateek_listings al where al.id=(payload->>'listing_id')::uuid;
    if v_listing.id is null or v_listing.status<>'active' or v_listing.seller_id=uid then raise exception 'لا يمكن بدء محادثة لهذا الإعلان'; end if;
    if exists(select 1 from public.ateek_blocks ab where (ab.user_id=uid and ab.blocked_id=v_listing.seller_id) or (ab.user_id=v_listing.seller_id and ab.blocked_id=uid)) then raise exception 'لا يمكن التواصل مع هذا المستخدم'; end if;
    insert into public.ateek_threads(listing_id,buyer_id,seller_id) values(v_listing.id,uid,v_listing.seller_id)
    on conflict(listing_id,buyer_id) do update set listing_id=excluded.listing_id returning id into rid;
    return jsonb_build_object('id',rid);

  elsif action='read' then
    update public.ateek_notifications an set is_read=true where an.user_id=uid;
    return '{}'::jsonb;

  elsif action='report' then
    insert into public.ateek_reports(reporter_id,listing_id,reason) values(uid,(payload->>'id')::uuid,trim(payload->>'reason'))
    on conflict(reporter_id,listing_id) do update set reason=excluded.reason;
    return '{}'::jsonb;

  elsif action='block' then
    if (payload->>'blocked')::boolean then
      insert into public.ateek_blocks(user_id,blocked_id) values(uid,(payload->>'id')::uuid) on conflict do nothing;
    else
      delete from public.ateek_blocks ab where ab.user_id=uid and ab.blocked_id=(payload->>'id')::uuid;
    end if;
    return '{}'::jsonb;
  end if;

  if action in ('respond','complete','review') then
    select ao.* into v_offer from public.ateek_offers ao where ao.id=(payload->>'offer_id')::uuid;
    select ath.* into v_thread from public.ateek_threads ath where ath.id=v_offer.thread_id;
  else
    select ath.* into v_thread from public.ateek_threads ath where ath.id=(payload->>'thread_id')::uuid;
  end if;

  if v_thread.id is null or (uid<>v_thread.buyer_id and uid<>v_thread.seller_id) then raise exception 'هذه المحادثة خاصة'; end if;
  other:=case when uid=v_thread.buyer_id then v_thread.seller_id else v_thread.buyer_id end;
  if exists(select 1 from public.ateek_blocks ab where (ab.user_id=uid and ab.blocked_id=other) or (ab.user_id=other and ab.blocked_id=uid)) then raise exception 'لا يمكن التواصل مع هذا المستخدم'; end if;

  select al.* into v_listing from public.ateek_listings al where al.id=v_thread.listing_id for update;
  perform 1 from public.ateek_threads ath where ath.id=v_thread.id for update;

  if action='message' then
    if (select count(*) from public.ateek_messages am where am.sender_id=uid and am.created_at>now()-interval '1 minute')>=30 then raise exception 'انتظر قليلًا قبل إرسال المزيد'; end if;
    insert into public.ateek_messages(thread_id,sender_id,body) values(v_thread.id,uid,trim(payload->>'body'));
    txt:='رسالة جديدة';

  elsif action='offer' then
    if v_listing.status<>'active' then raise exception 'الإعلان لم يعد متاحًا'; end if;
    if exists(select 1 from public.ateek_offers ao where ao.thread_id=v_thread.id and ao.status in ('accepted','completed')) then raise exception 'تم الاتفاق بالفعل'; end if;
    if (select count(*) from public.ateek_offers ao where ao.author_id=uid and ao.created_at>now()-interval '1 minute')>=10 then raise exception 'عروض كثيرة، انتظر دقيقة'; end if;
    value:=(payload->>'amount')::bigint;
    update public.ateek_offers ao set status='superseded' where ao.thread_id=v_thread.id and ao.status='pending';
    insert into public.ateek_offers(thread_id,author_id,amount) values(v_thread.id,uid,value);
    txt:='عرض سعر جديد';

  elsif action='respond' then
    select ao.* into v_offer from public.ateek_offers ao where ao.id=v_offer.id for update;
    if v_offer.author_id=uid or v_offer.status<>'pending' or v_listing.status<>'active' then raise exception 'لا يمكنك الرد على هذا العرض'; end if;
    if payload->>'status' not in ('accepted','rejected') then raise exception 'حالة غير صالحة'; end if;
    update public.ateek_offers ao set status=payload->>'status' where ao.id=v_offer.id;
    if payload->>'status'='accepted' then
      update public.ateek_listings al set status='sold' where al.id=v_listing.id;
      update public.ateek_offers ao set status='rejected' where ao.status='pending' and ao.thread_id in(select ath.id from public.ateek_threads ath where ath.listing_id=v_listing.id);
    end if;
    txt:=case when payload->>'status'='accepted' then 'تم قبول عرضك' else 'تم رفض العرض' end;

  elsif action='complete' then
    select ao.* into v_offer from public.ateek_offers ao where ao.id=v_offer.id for update;
    if v_offer.status<>'accepted' or uid<>v_thread.buyer_id then raise exception 'المشتري يؤكد الاستلام بعد القبول'; end if;
    update public.ateek_offers ao set status='completed' where ao.id=v_offer.id;
    txt:='أكد المشتري إتمام الصفقة';

  elsif action='review' then
    if v_offer.status<>'completed' then raise exception 'التقييم بعد إتمام الصفقة فقط'; end if;
    insert into public.ateek_reviews(offer_id,author_id,target_id,stars,body) values(v_offer.id,uid,other,(payload->>'stars')::integer,coalesce(payload->>'body',''));
    txt:='تقييم جديد بعد الصفقة';

  else
    raise exception 'عملية غير معروفة';
  end if;

  insert into public.ateek_notifications(user_id,title,thread_id) values(other,txt,v_thread.id);
  return jsonb_build_object('id',v_thread.id);
end $$;
