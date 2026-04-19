-- Gathered — Prayer social platform schema
-- Run in Supabase SQL Editor (single transaction recommended).
-- Requires: extensions pgcrypto (gen_random_uuid)

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  username text not null unique,
  avatar_url text,
  bio text,
  favorite_verse text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  chosen_username text;
  suffix int := 0;
begin
  base_username := coalesce(nullif(lower(trim(new.raw_user_meta_data->>'username')), ''), 'friend');
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '', 'g');
  if base_username = '' then
    base_username := 'friend';
  end if;

  chosen_username := base_username;
  while exists (select 1 from public.profiles p where lower(p.username) = chosen_username) loop
    suffix := suffix + 1;
    chosen_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), initcap(chosen_username)),
    chosen_username,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Follows (asymmetric; MVP "friends feed" = people you follow)
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> following_id),
  constraint follows_unique unique (follower_id, following_id)
);

create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------------
-- Prayer requests
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null default 'other',
  status text not null default 'active',
  visibility text not null default 'friends',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_requests_status_check check (status in ('active', 'answered', 'archived')),
  constraint prayer_requests_visibility_check check (visibility in ('friends', 'public')),
  constraint prayer_requests_category_check check (
    category in ('health', 'family', 'school', 'work', 'spiritual', 'other')
  )
);

create index if not exists prayer_requests_user_idx on public.prayer_requests (user_id);
create index if not exists prayer_requests_created_idx on public.prayer_requests (created_at desc);
create index if not exists prayer_requests_updated_idx on public.prayer_requests (updated_at desc);

drop trigger if exists prayer_requests_touch on public.prayer_requests;
create trigger prayer_requests_touch
  before update on public.prayer_requests
  for each row execute function public.touch_updated_at();

-- Notify followers when someone posts a new request (same payload shape as updates)
create or replace function public.notify_followers_new_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select
    f.follower_id,
    'prayer_update',
    jsonb_build_object('request_id', new.id, 'actor_id', new.user_id, 'is_new_request', true)
  from public.follows f
  where f.following_id = new.user_id
    and f.follower_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists prayer_request_new_notify on public.prayer_requests;
create trigger prayer_request_new_notify
  after insert on public.prayer_requests
  for each row execute function public.notify_followers_new_request();

-- ---------------------------------------------------------------------------
-- Prayer updates (timeline on a request)
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_updates (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.prayer_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists prayer_updates_request_idx on public.prayer_updates (prayer_request_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Prayer interactions ("I prayed" + optional preset encouragement)
-- ---------------------------------------------------------------------------
create table if not exists public.prayer_interactions (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.prayer_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  message_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_interactions_message_check check (
    message_key is null or message_key in ('praying_for_you', 'lifted_up', 'not_alone')
  ),
  constraint prayer_interactions_unique unique (prayer_request_id, user_id)
);

create index if not exists prayer_interactions_request_idx on public.prayer_interactions (prayer_request_id);

drop trigger if exists prayer_interactions_touch on public.prayer_interactions;
create trigger prayer_interactions_touch
  before update on public.prayer_interactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications (MVP: rows created via triggers)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in ('prayer_update', 'prayer_received', 'encouragement')
  )
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notification triggers
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_prayer_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No PL/pgSQL variables in SQL fragments (avoids "relation does not exist" name resolution bugs).
  insert into public.notifications (user_id, type, payload)
  select
    pr.user_id,
    case when new.message_key is null then 'prayer_received' else 'encouragement' end,
    jsonb_build_object(
      'request_id', new.prayer_request_id,
      'actor_id', new.user_id,
      'message_key', new.message_key
    )
  from public.prayer_requests pr
  where pr.id = new.prayer_request_id
    and pr.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists prayer_interaction_notify on public.prayer_interactions;
create trigger prayer_interaction_notify
  after insert on public.prayer_interactions
  for each row execute function public.notify_on_prayer_interaction();

create or replace function public.notify_followers_on_prayer_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, payload)
  select
    f.follower_id,
    'prayer_update',
    jsonb_build_object(
      'request_id', pr.id,
      'actor_id', new.user_id
    )
  from public.prayer_requests pr
  inner join public.follows f on f.following_id = pr.user_id
  where pr.id = new.prayer_request_id
    and f.follower_id <> pr.user_id;

  return new;
end;
$$;

drop trigger if exists prayer_update_notify on public.prayer_updates;
create trigger prayer_update_notify
  after insert on public.prayer_updates
  for each row execute function public.notify_followers_on_prayer_update();

-- ---------------------------------------------------------------------------
-- Helper: can viewer see a prayer request?
-- ---------------------------------------------------------------------------
create or replace function public.can_view_prayer_request(request_id uuid, viewer uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.prayer_requests pr
    where pr.id = request_id
      and (
        pr.user_id = viewer
        or pr.visibility = 'public'
        or (
          pr.visibility = 'friends'
          and exists (
            select 1
            from public.follows f
            where f.follower_id = viewer
              and f.following_id = pr.user_id
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.prayer_updates enable row level security;
alter table public.prayer_interactions enable row level security;
alter table public.notifications enable row level security;

-- Profiles: any signed-in user can read profiles (MVP discovery).
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Follows
drop policy if exists follows_select_own on public.follows;
create policy follows_select_own on public.follows
  for select to authenticated
  using (follower_id = auth.uid() or following_id = auth.uid());

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

-- Prayer requests
drop policy if exists prayer_requests_select_visible on public.prayer_requests;
create policy prayer_requests_select_visible on public.prayer_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or visibility = 'public'
    or (
      visibility = 'friends'
      and exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = prayer_requests.user_id
      )
    )
  );

drop policy if exists prayer_requests_insert_own on public.prayer_requests;
create policy prayer_requests_insert_own on public.prayer_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists prayer_requests_update_own on public.prayer_requests;
create policy prayer_requests_update_own on public.prayer_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prayer_requests_delete_own on public.prayer_requests;
create policy prayer_requests_delete_own on public.prayer_requests
  for delete to authenticated
  using (user_id = auth.uid());

-- Prayer updates
drop policy if exists prayer_updates_select_visible on public.prayer_updates;
create policy prayer_updates_select_visible on public.prayer_updates
  for select to authenticated
  using (public.can_view_prayer_request(prayer_request_id, auth.uid()));

drop policy if exists prayer_updates_insert_owner on public.prayer_updates;
create policy prayer_updates_insert_owner on public.prayer_updates
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prayer_requests pr
      where pr.id = prayer_request_id
        and pr.user_id = auth.uid()
    )
  );

drop policy if exists prayer_updates_delete_owner on public.prayer_updates;
create policy prayer_updates_delete_owner on public.prayer_updates
  for delete to authenticated
  using (
    exists (
      select 1 from public.prayer_requests pr
      where pr.id = prayer_request_id
        and pr.user_id = auth.uid()
    )
  );

-- Interactions
drop policy if exists prayer_interactions_select_visible on public.prayer_interactions;
create policy prayer_interactions_select_visible on public.prayer_interactions
  for select to authenticated
  using (public.can_view_prayer_request(prayer_request_id, auth.uid()));

drop policy if exists prayer_interactions_insert_rules on public.prayer_interactions;
create policy prayer_interactions_insert_rules on public.prayer_interactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prayer_requests pr
      where pr.id = prayer_request_id
        and pr.user_id <> auth.uid()
        and public.can_view_prayer_request(pr.id, auth.uid())
    )
  );

drop policy if exists prayer_interactions_update_own on public.prayer_interactions;
create policy prayer_interactions_update_own on public.prayer_interactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prayer_interactions_delete_own on public.prayer_interactions;
create policy prayer_interactions_delete_own on public.prayer_interactions
  for delete to authenticated
  using (user_id = auth.uid());

-- Notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime (optional): uncomment in Supabase if you want live feeds
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.prayer_requests;
-- alter publication supabase_realtime add table public.prayer_updates;

-- ---------------------------------------------------------------------------
-- Grants (Supabase defaults vary; explicit grants keep local tooling happy)
-- ---------------------------------------------------------------------------
grant usage on schema public to postgres, anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update, delete on public.prayer_requests to authenticated;
grant select, insert, delete on public.prayer_updates to authenticated;
grant select, insert, update, delete on public.prayer_interactions to authenticated;
grant select, update on public.notifications to authenticated;
