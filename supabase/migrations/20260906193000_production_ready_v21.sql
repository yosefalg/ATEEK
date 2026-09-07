create table if not exists public.ateek_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ateek_verification_pending_uidx on public.ateek_verification_requests(user_id) where status='pending';
alter table public.ateek_verification_requests enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ateek_verification_requests' and policyname='verification_owner_read') then
    create policy verification_owner_read on public.ateek_verification_requests for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.ateek_premium_interest (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('creator','merchant','business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ateek_premium_interest enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ateek_premium_interest' and policyname='premium_interest_owner_read') then
    create policy premium_interest_owner_read on public.ateek_premium_interest for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.ateek_verification_request_submit() returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); req public.ateek_verification_requests%rowtype; is_verified boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(verified,false) into is_verified from public.ateek_profiles where id = uid;
  if is_verified then return jsonb_build_object('status','verified','verified',true); end if;
  select * into req from public.ateek_verification_requests where user_id=uid and status='pending' order by requested_at desc limit 1;
  if req.id is null then insert into public.ateek_verification_requests(user_id) values(uid) returning * into req; end if;
  return jsonb_build_object('status',req.status,'verified',false,'requestedAt',req.requested_at);
end; $$;
revoke all on function public.ateek_verification_request_submit() from public;
grant execute on function public.ateek_verification_request_submit() to authenticated;

create or replace function public.ateek_verification_status() returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); req public.ateek_verification_requests%rowtype; is_verified boolean := false;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(verified,false) into is_verified from public.ateek_profiles where id = uid;
  select * into req from public.ateek_verification_requests where user_id=uid order by requested_at desc limit 1;
  return jsonb_build_object('verified',is_verified,'status',case when is_verified then 'verified' else coalesce(req.status,'none') end,'requestedAt',req.requested_at);
end; $$;
revoke all on function public.ateek_verification_status() from public;
grant execute on function public.ateek_verification_status() to authenticated;

create or replace function public.ateek_premium_interest_save(p_plan text) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_plan not in ('creator','merchant','business') then raise exception 'INVALID_PLAN'; end if;
  insert into public.ateek_premium_interest(user_id,plan) values(uid,p_plan)
  on conflict (user_id) do update set plan=excluded.plan, updated_at=now();
  return jsonb_build_object('saved',true,'plan',p_plan);
end; $$;
revoke all on function public.ateek_premium_interest_save(text) from public;
grant execute on function public.ateek_premium_interest_save(text) to authenticated;
