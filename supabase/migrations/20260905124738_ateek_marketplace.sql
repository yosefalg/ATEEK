create schema if not exists ateek_private;
revoke all on schema ateek_private from public, anon;
grant usage on schema ateek_private to authenticated;
create table public.ateek_profiles(id uuid primary key references auth.users(id) on delete cascade, name text not null check(length(name) between 1 and 60));
create table public.ateek_listings(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.ateek_profiles, title text not null check(length(title) between 2 and 120), description text not null check(length(description) between 1 and 2000), price bigint not null check(price between 1 and 1000000000000), category text not null check(category in ('antiques','scrap','electronics','furniture','cars','collectibles')), location text not null check(length(location) between 1 and 100), condition text not null, image text not null, status text not null default 'active' check(status in ('active','sold','removed')), created_at timestamptz default now() not null);
create table public.ateek_favorites(user_id uuid references auth.users(id) on delete cascade, listing_id uuid references public.ateek_listings on delete cascade, primary key(user_id,listing_id));
create table public.ateek_threads(id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.ateek_listings, buyer_id uuid not null references auth.users(id), seller_id uuid not null references auth.users(id), created_at timestamptz default now(), unique(listing_id,buyer_id), check(buyer_id<>seller_id));
create table public.ateek_messages(id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.ateek_threads, sender_id uuid not null references auth.users(id), body text not null check(length(body) between 1 and 2000), created_at timestamptz default now() not null);
create table public.ateek_offers(id uuid primary key default gen_random_uuid(), thread_id uuid not null references public.ateek_threads, author_id uuid not null references auth.users(id), amount bigint not null check(amount between 1 and 1000000000000), status text not null default 'pending' check(status in ('pending','accepted','rejected','superseded','completed')), created_at timestamptz default now() not null);
create unique index ateek_one_pending on public.ateek_offers(thread_id) where status='pending';
create table public.ateek_notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), title text not null, thread_id uuid references public.ateek_threads, is_read boolean default false not null, created_at timestamptz default now() not null);
create table public.ateek_reviews(id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.ateek_offers, author_id uuid not null references auth.users(id), target_id uuid not null references auth.users(id), stars integer not null check(stars between 1 and 5), body text not null check(length(body)<=1000), created_at timestamptz default now(), unique(offer_id,author_id));
create table public.ateek_reports(id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id), listing_id uuid not null references public.ateek_listings, reason text not null check(length(reason) between 3 and 1000), created_at timestamptz default now(), unique(reporter_id,listing_id));
create table public.ateek_blocks(user_id uuid references auth.users(id), blocked_id uuid references auth.users(id), primary key(user_id,blocked_id), check(user_id<>blocked_id));
create index on public.ateek_listings(status,created_at desc);
create index on public.ateek_listings(seller_id);
create index on public.ateek_threads(buyer_id);
create index on public.ateek_threads(seller_id);
create index on public.ateek_messages(thread_id,created_at);
create index on public.ateek_messages(sender_id);
create index on public.ateek_offers(thread_id,created_at);
create index on public.ateek_offers(author_id);
create index on public.ateek_notifications(user_id,created_at desc);
create index on public.ateek_notifications(thread_id);
create index on public.ateek_reviews(target_id);
create index on public.ateek_reviews(author_id);
create index on public.ateek_reports(listing_id);
create index on public.ateek_favorites(listing_id);
create index on public.ateek_blocks(blocked_id);
do $$ declare tab text; begin
foreach tab in array array['profiles','listings','favorites','threads','messages','offers','notifications','reviews','reports','blocks'] loop
execute format('alter table public.ateek_%I enable row level security',tab);
execute format('revoke all on public.ateek_%I from anon, authenticated',tab);
execute format('grant select on public.ateek_%I to authenticated',tab);
end loop; end $$;
create policy profiles_read on public.ateek_profiles for select to authenticated using(true);
create policy listings_read on public.ateek_listings for select to authenticated using(status<>'removed' or seller_id=(select auth.uid()) or exists(select 1 from public.ateek_threads t where t.listing_id=ateek_listings.id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()))));
create policy favorites_read on public.ateek_favorites for select to authenticated using(user_id=(select auth.uid()));
create policy threads_read on public.ateek_threads for select to authenticated using(buyer_id=(select auth.uid()) or seller_id=(select auth.uid()));
create policy messages_read on public.ateek_messages for select to authenticated using(exists(select 1 from public.ateek_threads t where t.id=thread_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()))));
create policy offers_read on public.ateek_offers for select to authenticated using(exists(select 1 from public.ateek_threads t where t.id=thread_id and (t.buyer_id=(select auth.uid()) or t.seller_id=(select auth.uid()))));
create policy notices_read on public.ateek_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy reviews_read on public.ateek_reviews for select to authenticated using(true);
create policy reports_read on public.ateek_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy blocks_read on public.ateek_blocks for select to authenticated using(user_id=(select auth.uid()));
create or replace function ateek_private.perform(action text, payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); t public.ateek_threads; l public.ateek_listings; o public.ateek_offers; rid uuid; other uuid; txt text; value bigint;
begin
if uid is null or not exists(select 1 from auth.users where id=uid) then raise exception 'يلزم تسجيل الدخول'; end if;
-- Serialize writes per actor, and per listing/thread below, to enforce transaction transitions.
perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
if action='profile' then
txt:=trim(payload->>'name');
if txt is null or length(txt) not between 1 and 60 then raise exception 'اكتب اسمًا من 1 إلى 60 حرفًا'; end if;
insert into public.ateek_profiles values(uid,txt) on conflict(id) do update set name=excluded.name;
return jsonb_build_object('id',uid);
end if;
if not exists(select 1 from public.ateek_profiles where id=uid) then raise exception 'أكمل اسمك في الحساب أولًا'; end if;
if action='listing' then
if (select count(*) from public.ateek_listings where seller_id=uid and created_at>now()-interval '1 day')>=30 then raise exception 'وصلت إلى حد الإعلانات اليومي'; end if;
txt:=payload->>'image';
if not exists(select 1 from storage.objects where bucket_id='ateek-images' and name=txt and (storage.foldername(name))[1]=uid::text) then raise exception 'ارفع صورة السلعة أولًا'; end if;
insert into public.ateek_listings(seller_id,title,description,price,category,location,condition,image)
values(uid,trim(payload->>'title'),trim(payload->>'description'),(payload->>'price')::bigint,payload->>'category',trim(payload->>'location'),payload->>'condition',txt) returning id into rid;
return jsonb_build_object('id',rid);
elsif action='favorite' then
if (payload->>'saved')::boolean then
insert into public.ateek_favorites values(uid,(payload->>'id')::uuid) on conflict do nothing;
else delete from public.ateek_favorites where user_id=uid and listing_id=(payload->>'id')::uuid; end if;
return '{}'::jsonb;
elsif action='remove' then
select * into l from public.ateek_listings where id=(payload->>'id')::uuid for update;
if l.seller_id is distinct from uid then raise exception 'لا يمكنك تعديل إعلان غيرك'; end if;
if exists(select 1 from public.ateek_offers o join public.ateek_threads t on t.id=o.thread_id where t.listing_id=l.id and o.status='accepted') then raise exception 'أكمل الصفقة المقبولة أولًا'; end if;
update public.ateek_listings set status='removed' where id=l.id;
return '{}'::jsonb;
elsif action='thread' then
select * into l from public.ateek_listings where id=(payload->>'listing_id')::uuid;
if l.id is null or l.status<>'active' or l.seller_id=uid then raise exception 'لا يمكن بدء محادثة لهذا الإعلان'; end if;
if exists(select 1 from public.ateek_blocks where (user_id=uid and blocked_id=l.seller_id) or (user_id=l.seller_id and blocked_id=uid)) then raise exception 'لا يمكن التواصل مع هذا المستخدم'; end if;
insert into public.ateek_threads(listing_id,buyer_id,seller_id) values(l.id,uid,l.seller_id) on conflict(listing_id,buyer_id) do update set listing_id=excluded.listing_id returning id into rid;
return jsonb_build_object('id',rid);
elsif action='read' then
update public.ateek_notifications set is_read=true where user_id=uid;
return '{}'::jsonb;
elsif action='report' then
insert into public.ateek_reports(reporter_id,listing_id,reason) values(uid,(payload->>'id')::uuid,trim(payload->>'reason')) on conflict(reporter_id,listing_id) do update set reason=excluded.reason;
return '{}'::jsonb;
elsif action='block' then
if (payload->>'blocked')::boolean then insert into public.ateek_blocks values(uid,(payload->>'id')::uuid) on conflict do nothing;
else delete from public.ateek_blocks where user_id=uid and blocked_id=(payload->>'id')::uuid; end if;
return '{}'::jsonb;
end if;
if action in ('respond','complete','review') then
select * into o from public.ateek_offers where id=(payload->>'offer_id')::uuid;
select * into t from public.ateek_threads where id=o.thread_id;
else select * into t from public.ateek_threads where id=(payload->>'thread_id')::uuid; end if;
if t.id is null or (uid<>t.buyer_id and uid<>t.seller_id) then raise exception 'هذه المحادثة خاصة'; end if;
other:=case when uid=t.buyer_id then t.seller_id else t.buyer_id end;
if exists(select 1 from public.ateek_blocks where (user_id=uid and blocked_id=other) or (user_id=other and blocked_id=uid)) then raise exception 'لا يمكن التواصل مع هذا المستخدم'; end if;
select * into l from public.ateek_listings where id=t.listing_id for update;
perform 1 from public.ateek_threads where id=t.id for update;
if action='message' then
if (select count(*) from public.ateek_messages where sender_id=uid and created_at>now()-interval '1 minute')>=30 then raise exception 'انتظر قليلًا قبل إرسال المزيد'; end if;
insert into public.ateek_messages(thread_id,sender_id,body) values(t.id,uid,trim(payload->>'body'));
txt:='رسالة جديدة';
elsif action='offer' then
if l.status<>'active' then raise exception 'الإعلان لم يعد متاحًا'; end if;
if exists(select 1 from public.ateek_offers where thread_id=t.id and status in ('accepted','completed')) then raise exception 'تم الاتفاق بالفعل'; end if;
if (select count(*) from public.ateek_offers where author_id=uid and created_at>now()-interval '1 minute')>=10 then raise exception 'عروض كثيرة، انتظر دقيقة'; end if;
value:=(payload->>'amount')::bigint;
update public.ateek_offers set status='superseded' where thread_id=t.id and status='pending';
insert into public.ateek_offers(thread_id,author_id,amount) values(t.id,uid,value);
txt:='عرض سعر جديد';
elsif action='respond' then
select * into o from public.ateek_offers where id=o.id for update;
if o.author_id=uid or o.status<>'pending' or l.status<>'active' then raise exception 'لا يمكنك الرد على هذا العرض'; end if;
if payload->>'status' not in ('accepted','rejected') then raise exception 'حالة غير صالحة'; end if;
update public.ateek_offers set status=payload->>'status' where id=o.id;
if payload->>'status'='accepted' then
update public.ateek_listings set status='sold' where id=l.id;
update public.ateek_offers oo set status='rejected' where oo.status='pending' and oo.thread_id in(select id from public.ateek_threads where listing_id=l.id);
end if;
txt:=case when payload->>'status'='accepted' then 'تم قبول عرضك' else 'تم رفض العرض' end;
elsif action='complete' then
select * into o from public.ateek_offers where id=o.id for update;
if o.status<>'accepted' or uid<>t.buyer_id then raise exception 'المشتري يؤكد الاستلام بعد القبول'; end if;
update public.ateek_offers set status='completed' where id=o.id; txt:='أكد المشتري إتمام الصفقة';
elsif action='review' then
if o.status<>'completed' then raise exception 'التقييم بعد إتمام الصفقة فقط'; end if;
insert into public.ateek_reviews(offer_id,author_id,target_id,stars,body) values(o.id,uid,other,(payload->>'stars')::integer,coalesce(payload->>'body',''));
txt:='تقييم جديد بعد الصفقة';
else raise exception 'عملية غير معروفة'; end if;
insert into public.ateek_notifications(user_id,title,thread_id) values(other,txt,t.id);
return jsonb_build_object('id',t.id);
end $$;
revoke all on function ateek_private.perform(text,jsonb) from public,anon;
grant execute on function ateek_private.perform(text,jsonb) to authenticated;
create function public.ateek_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select ateek_private.perform(action,payload) $$;
revoke all on function public.ateek_action(text,jsonb) from public,anon;
grant execute on function public.ateek_action(text,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ateek-images','ateek-images',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy ateek_image_insert on storage.objects for insert to authenticated with check(bucket_id='ateek-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy ateek_image_read on storage.objects for select to authenticated using(bucket_id='ateek-images');
create policy ateek_image_delete on storage.objects for delete to authenticated using(bucket_id='ateek-images' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.ateek_listings where image=name));
alter publication supabase_realtime add table public.ateek_messages,public.ateek_offers,public.ateek_notifications,public.ateek_listings;
