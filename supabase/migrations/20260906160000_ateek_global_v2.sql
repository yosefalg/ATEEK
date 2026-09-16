-- ATEEK v2.0.0 additive-only migration.
-- Existing Auth, existing RLS policies, and Gemini Edge Functions/JWT are intentionally untouched.

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.ateek_profiles(id) on delete cascade,
  listing_id uuid references public.ateek_listings(id) on delete set null,
  storage_path text,
  playback_url text not null,
  hls_url text,
  media_provider text not null default 'supabase' check (media_provider in ('supabase','cloudinary')),
  thumbnail_url text,
  caption text not null default '',
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 90),
  status text not null default 'active' check (status in ('active','hidden','removed')),
  created_at timestamptz not null default now()
);
create index if not exists reels_created_idx on public.reels(created_at desc);
create index if not exists reels_listing_idx on public.reels(listing_id) where listing_id is not null;
create index if not exists reels_author_idx on public.reels(author_id,created_at desc);
alter table public.reels enable row level security;
create policy "reels_public_read" on public.reels for select to authenticated using (status='active' or author_id=auth.uid());
create policy "reels_owner_insert" on public.reels for insert to authenticated with check (author_id=auth.uid());
create policy "reels_owner_update" on public.reels for update to authenticated using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy "reels_owner_delete" on public.reels for delete to authenticated using (author_id=auth.uid());

create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  author_id uuid not null references public.ateek_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists reel_comments_reel_idx on public.reel_comments(reel_id,created_at asc);
alter table public.reel_comments enable row level security;
create policy "reel_comments_read" on public.reel_comments for select to authenticated using (true);
create policy "reel_comments_owner_insert" on public.reel_comments for insert to authenticated with check (author_id=auth.uid());
create policy "reel_comments_owner_delete" on public.reel_comments for delete to authenticated using (author_id=auth.uid());

create table if not exists public.live_auctions (
  auction_id uuid primary key references public.ateek_auctions(id) on delete cascade,
  listing_id uuid not null references public.ateek_listings(id) on delete cascade,
  seller_id uuid not null references public.ateek_profiles(id) on delete cascade,
  status text not null,
  ends_at timestamptz not null,
  starting_price bigint not null,
  min_increment bigint not null,
  highest_bid bigint,
  highest_bidder uuid references public.ateek_profiles(id) on delete set null,
  last_bid_id uuid references public.ateek_bids(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists live_auctions_listing_idx on public.live_auctions(listing_id);
create index if not exists live_auctions_status_idx on public.live_auctions(status,ends_at);
alter table public.live_auctions enable row level security;
create policy "live_auctions_read" on public.live_auctions for select to authenticated using (true);

create table if not exists public.escrow_deals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid unique references public.ateek_offers(id) on delete set null,
  listing_id uuid not null references public.ateek_listings(id) on delete restrict,
  buyer_id uuid not null references public.ateek_profiles(id) on delete restrict,
  seller_id uuid not null references public.ateek_profiles(id) on delete restrict,
  agreed_amount bigint not null check (agreed_amount > 0),
  status text not null default 'agreed' check (status in ('agreed','handover','completed','disputed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists escrow_deals_buyer_idx on public.escrow_deals(buyer_id,created_at desc);
create index if not exists escrow_deals_seller_idx on public.escrow_deals(seller_id,created_at desc);
alter table public.escrow_deals enable row level security;
create policy "escrow_parties_read" on public.escrow_deals for select to authenticated using (buyer_id=auth.uid() or seller_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ateek-videos','ateek-videos',true,83886080,array['video/mp4','video/quicktime','video/webm'])
on conflict(id) do update set public=true,file_size_limit=83886080,allowed_mime_types=excluded.allowed_mime_types;
create policy "ateek_videos_public_read" on storage.objects for select using (bucket_id='ateek-videos');
create policy "ateek_videos_owner_insert" on storage.objects for insert to authenticated with check (bucket_id='ateek-videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "ateek_videos_owner_update" on storage.objects for update to authenticated using (bucket_id='ateek-videos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='ateek-videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "ateek_videos_owner_delete" on storage.objects for delete to authenticated using (bucket_id='ateek-videos' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.ateek_reel_create(
  p_listing uuid,
  p_storage_path text,
  p_playback_url text,
  p_hls_url text,
  p_media_provider text,
  p_thumbnail_url text,
  p_caption text,
  p_duration_seconds integer
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_listing is not null and not exists(select 1 from public.ateek_listings l where l.id=p_listing and l.seller_id=v_uid) then raise exception 'LISTING_NOT_OWNED'; end if;
  if p_media_provider not in ('supabase','cloudinary') then raise exception 'INVALID_MEDIA_PROVIDER'; end if;
  if coalesce(trim(p_playback_url),'')='' then raise exception 'PLAYBACK_URL_REQUIRED'; end if;
  insert into public.reels(author_id,listing_id,storage_path,playback_url,hls_url,media_provider,thumbnail_url,caption,duration_seconds)
  values(v_uid,p_listing,p_storage_path,p_playback_url,p_hls_url,p_media_provider,p_thumbnail_url,left(coalesce(p_caption,''),1000),p_duration_seconds)
  returning id into v_id;
  return v_id;
end$$;
grant execute on function public.ateek_reel_create(uuid,text,text,text,text,text,text,integer) to authenticated;

create or replace function public.ateek_reel_comment(p_reel uuid,p_body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.reels where id=p_reel and status='active') then raise exception 'REEL_NOT_FOUND'; end if;
  insert into public.reel_comments(reel_id,author_id,body) values(p_reel,v_uid,trim(p_body)) returning id into v_id;
  return v_id;
end$$;
grant execute on function public.ateek_reel_comment(uuid,text) to authenticated;

create or replace function public.ateek_sync_live_auction() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.live_auctions(auction_id,listing_id,seller_id,status,ends_at,starting_price,min_increment,updated_at)
  values(new.id,new.listing_id,new.seller_id,new.status,new.ends_at,new.starting_price,new.min_increment,now())
  on conflict(auction_id) do update set status=excluded.status,ends_at=excluded.ends_at,starting_price=excluded.starting_price,min_increment=excluded.min_increment,updated_at=now();
  return new;
end$$;
drop trigger if exists ateek_sync_live_auction on public.ateek_auctions;
create trigger ateek_sync_live_auction after insert or update on public.ateek_auctions for each row execute function public.ateek_sync_live_auction();

create or replace function public.ateek_sync_live_bid() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  update public.live_auctions set highest_bid=new.amount,highest_bidder=new.bidder_id,last_bid_id=new.id,updated_at=now()
  where auction_id=new.auction_id and (highest_bid is null or new.amount>=highest_bid);
  return new;
end$$;
drop trigger if exists ateek_sync_live_bid on public.ateek_bids;
create trigger ateek_sync_live_bid after insert on public.ateek_bids for each row execute function public.ateek_sync_live_bid();

insert into public.live_auctions(auction_id,listing_id,seller_id,status,ends_at,starting_price,min_increment,highest_bid,highest_bidder,last_bid_id,updated_at)
select a.id,a.listing_id,a.seller_id,a.status,a.ends_at,a.starting_price,a.min_increment,b.amount,b.bidder_id,b.id,now()
from public.ateek_auctions a
left join lateral (select id,amount,bidder_id from public.ateek_bids where auction_id=a.id order by amount desc,created_at desc limit 1) b on true
on conflict(auction_id) do update set status=excluded.status,ends_at=excluded.ends_at,highest_bid=excluded.highest_bid,highest_bidder=excluded.highest_bidder,last_bid_id=excluded.last_bid_id,updated_at=now();

create or replace function public.get_user_analytics_v2(p_user uuid default null) returns jsonb
language plpgsql stable security definer set search_path=public,ateek_private as $$
declare v_uid uuid:=coalesce(p_user,auth.uid()); v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_uid<>auth.uid() then raise exception 'SELF_ONLY'; end if;
  select jsonb_build_object(
    'followers',(select count(*) from public.ateek_follows f where f.followed_id=v_uid),
    'recentFollowers',coalesce((select jsonb_agg(x order by x.created_at desc) from (select p.id,p.name,p.username,p.avatar_url,f.created_at from public.ateek_follows f join public.ateek_profiles p on p.id=f.follower_id where f.followed_id=v_uid order by f.created_at desc limit 8) x),'[]'::jsonb),
    'profileViews30d',(select count(*) from public.profile_views pv where pv.profile_id=v_uid and pv.view_date>=current_date-29),
    'lifetimeListingViews',(select count(*) from ateek_private.listing_daily_views dv join public.ateek_listings l on l.id=dv.listing_id where l.seller_id=v_uid),
    'rating',coalesce((select round(avg(r.stars)::numeric,2) from public.ateek_reviews r where r.target_id=v_uid),0),
    'ratingCount',(select count(*) from public.ateek_reviews r where r.target_id=v_uid),
    'completedDeals',(select count(*) from public.ateek_offers o join public.ateek_threads t on t.id=o.thread_id where o.status='completed' and v_uid in(t.buyer_id,t.seller_id)),
    'responseSecondsAvg',coalesce((select case when p.response_count>0 then (p.response_seconds_total/p.response_count)::bigint else 0 end from public.ateek_profiles p where p.id=v_uid),0),
    'activeListings',(select count(*) from public.ateek_listings l where l.seller_id=v_uid and l.status='active'),
    'reelsCount',(select count(*) from public.reels r where r.author_id=v_uid and r.status='active'),
    'badges',to_jsonb(array_remove(array[
      case when coalesce((select verified from public.ateek_profiles where id=v_uid),false) then 'حساب موثق' end,
      case when (select count(*) from public.ateek_listings where seller_id=v_uid and status='active')>=5 then 'بائع نشط' end,
      case when (select count(*) from public.ateek_offers o join public.ateek_threads t on t.id=o.thread_id where o.status='completed' and v_uid in(t.buyer_id,t.seller_id))>=10 then 'خبير صفقات' end
    ]::text[],null)),
    'generatedAt',now()
  ) into v_result;
  return v_result;
end$$;
grant execute on function public.get_user_analytics_v2(uuid) to authenticated;

create or replace function public.ateek_profile_analytics(p_profile uuid) returns jsonb
language sql stable security definer set search_path=public as $$ select public.get_user_analytics_v2(p_profile); $$;
grant execute on function public.ateek_profile_analytics(uuid) to authenticated;

create or replace function public.ateek_nearby_listings(p_lat double precision,p_lon double precision,p_radius_km double precision default 50,p_limit integer default 100)
returns table(id uuid,title text,price bigint,category text,location text,condition text,image text,seller_id uuid,latitude double precision,longitude double precision,distance_km double precision)
language sql stable security definer set search_path=public as $$
  select l.id,l.title,l.price,l.category,l.location,l.condition,l.image,l.seller_id,l.latitude,l.longitude,
    6371*2*asin(sqrt(power(sin(radians(l.latitude-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(l.latitude))*power(sin(radians(l.longitude-p_lon)/2),2))) as distance_km
  from public.ateek_listings l
  where l.status='active' and l.latitude is not null and l.longitude is not null
    and 6371*2*asin(sqrt(power(sin(radians(l.latitude-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(l.latitude))*power(sin(radians(l.longitude-p_lon)/2),2)))<=greatest(1,least(p_radius_km,500))
  order by distance_km asc
  limit greatest(1,least(p_limit,200));
$$;
grant execute on function public.ateek_nearby_listings(double precision,double precision,double precision,integer) to authenticated;

do $$ begin alter publication supabase_realtime add table public.reels; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.reel_comments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.live_auctions; exception when duplicate_object then null; end $$;
