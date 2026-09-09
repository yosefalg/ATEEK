-- ATEEK 1.9.0 Spatial Social analytics / merchant hub
-- Additive only: does not alter Auth, existing RLS policies, or Gemini Edge Function.

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ateek_profiles(id) on delete cascade,
  viewer_id uuid not null references public.ateek_profiles(id) on delete cascade,
  view_date date not null default current_date,
  viewed_at timestamptz not null default now(),
  unique(profile_id,viewer_id,view_date)
);
create index if not exists profile_views_profile_date_idx on public.profile_views(profile_id,view_date desc);
alter table public.profile_views enable row level security;
drop policy if exists "profile_views_owner_read" on public.profile_views;
create policy "profile_views_owner_read" on public.profile_views for select to authenticated using (profile_id=auth.uid());

create table if not exists public.ateek_social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ateek_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  image_path text,
  listing_id uuid references public.ateek_listings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ateek_social_posts_user_created_idx on public.ateek_social_posts(user_id,created_at desc);
alter table public.ateek_social_posts enable row level security;
drop policy if exists "social_posts_authenticated_read" on public.ateek_social_posts;
create policy "social_posts_authenticated_read" on public.ateek_social_posts for select to authenticated using (true);
drop policy if exists "social_posts_owner_insert" on public.ateek_social_posts;
create policy "social_posts_owner_insert" on public.ateek_social_posts for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "social_posts_owner_update" on public.ateek_social_posts;
create policy "social_posts_owner_update" on public.ateek_social_posts for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "social_posts_owner_delete" on public.ateek_social_posts;
create policy "social_posts_owner_delete" on public.ateek_social_posts for delete to authenticated using (user_id=auth.uid());

create table if not exists public.ateek_support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ateek_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 5 and 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists ateek_support_tickets_user_created_idx on public.ateek_support_tickets(user_id,created_at desc);
alter table public.ateek_support_tickets enable row level security;
drop policy if exists "support_ticket_owner_read" on public.ateek_support_tickets;
create policy "support_ticket_owner_read" on public.ateek_support_tickets for select to authenticated using (user_id=auth.uid());
drop policy if exists "support_ticket_owner_insert" on public.ateek_support_tickets;
create policy "support_ticket_owner_insert" on public.ateek_support_tickets for insert to authenticated with check (user_id=auth.uid());

alter table public.ateek_profiles add column if not exists business_hours text;
alter table public.ateek_profiles add column if not exists notify_messages boolean not null default true;
alter table public.ateek_profiles add column if not exists notify_auctions boolean not null default true;
alter table public.ateek_profiles add column if not exists notify_followers boolean not null default true;

create or replace function public.ateek_profile_view(p_profile uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_profile is null or p_profile=auth.uid() then return; end if;
  insert into public.profile_views(profile_id,viewer_id,view_date,viewed_at)
  values(p_profile,auth.uid(),current_date,now())
  on conflict(profile_id,viewer_id,view_date) do update set viewed_at=excluded.viewed_at;
end;$$;
revoke all on function public.ateek_profile_view(uuid) from public;
grant execute on function public.ateek_profile_view(uuid) to authenticated;

create or replace function public.ateek_profile_analytics(p_profile uuid)
returns jsonb language plpgsql security definer set search_path=public,ateek_private as $$
declare
  v_followers integer:=0; v_profile_views integer:=0; v_listing_views bigint:=0;
  v_rating numeric:=0; v_rating_count integer:=0; v_completed integer:=0;
  v_response_seconds numeric:=0; v_verified boolean:=false;
  v_recent jsonb:='[]'::jsonb; v_badges jsonb:='[]'::jsonb;
begin
  if auth.uid() is null or auth.uid()<>p_profile then raise exception 'not allowed'; end if;
  select count(*) into v_followers from public.ateek_follows where followed_id=p_profile;
  select count(*) into v_profile_views from public.profile_views where profile_id=p_profile and view_date>=current_date-29;
  select count(*) into v_listing_views
    from ateek_private.listing_daily_views v
    join public.ateek_listings l on l.id=v.listing_id
    where l.seller_id=p_profile;
  select coalesce(avg(stars),0),count(*) into v_rating,v_rating_count
    from public.ateek_reviews where target_id=p_profile;
  select count(*) into v_completed
    from public.ateek_offers o join public.ateek_threads t on t.id=o.thread_id
    where t.seller_id=p_profile and o.status='completed';
  select verified,case when response_count>0 then response_seconds_total::numeric/response_count else 0 end
    into v_verified,v_response_seconds from public.ateek_profiles where id=p_profile;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'name',q.name,'username',q.username,'avatar_url',q.avatar_url,'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)
    into v_recent
    from (
      select p.id,p.name,p.username,p.avatar_url,f.created_at
      from public.ateek_follows f join public.ateek_profiles p on p.id=f.follower_id
      where f.followed_id=p_profile order by f.created_at desc limit 8
    ) q;
  if v_verified then v_badges:=v_badges||jsonb_build_array('حساب موثق'); end if;
  if v_completed>=10 and v_rating>=4.5 then v_badges:=v_badges||jsonb_build_array('بائع مميز'); end if;
  if v_completed>=25 then v_badges:=v_badges||jsonb_build_array('خبير صفقات'); end if;
  return jsonb_build_object(
    'followers',v_followers,'recentFollowers',v_recent,'profileViews30d',v_profile_views,
    'lifetimeListingViews',v_listing_views,'rating',round(v_rating,2),'ratingCount',v_rating_count,
    'completedDeals',v_completed,'responseSecondsAvg',round(v_response_seconds),'badges',v_badges,'generatedAt',now()
  );
end;$$;
revoke all on function public.ateek_profile_analytics(uuid) from public;
grant execute on function public.ateek_profile_analytics(uuid) to authenticated;

create or replace function public.ateek_profile_settings_update(
  p_username text,p_bio text,p_cover_url text,p_business_hours text,
  p_notify_messages boolean,p_notify_auctions boolean,p_notify_followers boolean
)
returns void language plpgsql security definer set search_path=public as $$
declare v_username text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  v_username:=lower(trim(coalesce(p_username,'')));
  if v_username !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid username'; end if;
  update public.ateek_profiles set
    username=v_username,bio=left(coalesce(p_bio,''),300),cover_url=nullif(trim(coalesce(p_cover_url,'')),''),
    business_hours=left(coalesce(p_business_hours,''),160),notify_messages=coalesce(p_notify_messages,true),
    notify_auctions=coalesce(p_notify_auctions,true),notify_followers=coalesce(p_notify_followers,true)
  where id=auth.uid();
end;$$;
revoke all on function public.ateek_profile_settings_update(text,text,text,text,boolean,boolean,boolean) from public;
grant execute on function public.ateek_profile_settings_update(text,text,text,text,boolean,boolean,boolean) to authenticated;

create or replace function public.ateek_social_post_create(p_body text,p_image_path text default null,p_listing_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(coalesce(p_body,'')))<1 then raise exception 'post body required'; end if;
  insert into public.ateek_social_posts(user_id,body,image_path,listing_id)
  values(auth.uid(),left(trim(p_body),1000),nullif(trim(coalesce(p_image_path,'')),''),p_listing_id)
  returning id into v_id;
  select name into v_name from public.ateek_profiles where id=auth.uid();
  insert into public.ateek_notifications(user_id,title,is_read,created_at)
  select f.follower_id,coalesce(v_name,'بائع')||' نشر تحديثاً جديداً',false,now()
  from public.ateek_follows f join public.ateek_profiles p on p.id=f.follower_id
  where f.followed_id=auth.uid() and coalesce(p.notify_followers,true);
  return v_id;
end;$$;
revoke all on function public.ateek_social_post_create(text,text,uuid) from public;
grant execute on function public.ateek_social_post_create(text,text,uuid) to authenticated;

create or replace function public.ateek_support_ticket_create(p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(coalesce(p_body,'')))<5 then raise exception 'message too short'; end if;
  insert into public.ateek_support_tickets(user_id,body) values(auth.uid(),left(trim(p_body),2000)) returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.ateek_support_ticket_create(text) from public;
grant execute on function public.ateek_support_ticket_create(text) to authenticated;

create or replace function public.ateek_notify_followers_new_listing()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if NEW.status='active' then
    insert into public.ateek_notifications(user_id,title,thread_id,is_read)
    select f.follower_id,'إعلان جديد من @'||coalesce(p.username,p.name),null,false
    from public.ateek_follows f
    join public.ateek_profiles p on p.id=NEW.seller_id
    join public.ateek_profiles fp on fp.id=f.follower_id
    where f.followed_id=NEW.seller_id and f.follower_id<>NEW.seller_id and coalesce(fp.notify_followers,true);
  end if;
  return NEW;
end;$$;

create or replace function public.ateek_notify_followers_price_update_v19()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if NEW.status='active' and OLD.price is distinct from NEW.price then
    insert into public.ateek_notifications(user_id,title,thread_id,is_read)
    select f.follower_id,'تم تحديث سعر إعلان من @'||coalesce(p.username,p.name),null,false
    from public.ateek_follows f
    join public.ateek_profiles p on p.id=NEW.seller_id
    join public.ateek_profiles fp on fp.id=f.follower_id
    where f.followed_id=NEW.seller_id and f.follower_id<>NEW.seller_id and coalesce(fp.notify_followers,true);
  end if;
  return NEW;
end;$$;
drop trigger if exists ateek_notify_followers_price_update_v19 on public.ateek_listings;
create trigger ateek_notify_followers_price_update_v19 after update of price on public.ateek_listings
for each row execute function public.ateek_notify_followers_price_update_v19();
