create table if not exists public.ateek_client_errors(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,scope text not null,entity_id uuid,message text not null,created_at timestamptz not null default now());
alter table public.ateek_client_errors enable row level security;
revoke all on public.ateek_client_errors from anon,authenticated;
create index if not exists ateek_client_errors_created_idx on public.ateek_client_errors(created_at desc);
create or replace function public.ateek_client_error_log(p_scope text,p_entity_id uuid,p_message text) returns void language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if; insert into public.ateek_client_errors(user_id,scope,entity_id,message) values(auth.uid(),left(coalesce(p_scope,'client'),60),p_entity_id,left(coalesce(p_message,'unknown'),1200)); end $$;
revoke all on function public.ateek_client_error_log(text,uuid,text) from public; grant execute on function public.ateek_client_error_log(text,uuid,text) to authenticated;
