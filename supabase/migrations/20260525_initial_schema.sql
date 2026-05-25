create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  display_name text,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('facebook', 'instagram', 'linkedin', 'tiktok', 'x')),
  account_name text not null,
  account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  timezone text not null default 'UTC',
  start_date timestamptz,
  end_date timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  message text not null,
  location text,
  timezone text not null default 'UTC',
  scheduled_at timestamptz not null,
  selected_platforms text[] not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'retrying')),
  last_error text,
  publish_attempts int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publish_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheduled_post_id uuid not null references public.scheduled_posts(id) on delete cascade,
  attempt_number int not null,
  status text not null check (status in ('pending', 'running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  publish_attempt_id uuid not null references public.publish_attempts(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin', 'tiktok', 'x')),
  status text not null check (status in ('published', 'failed', 'retrying')),
  provider_id text,
  raw_response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  signature text,
  status text not null default 'received' check (status in ('received', 'processed', 'failed')),
  response_body jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.role in ('owner','admin')
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.social_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.publish_attempts enable row level security;
alter table public.platform_results enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_upsert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_select_members" on public.organizations
  for select using (public.is_org_member(id));

create policy "organizations_manage_admins" on public.organizations
  for all using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "organization_members_select_members" on public.organization_members
  for select using (public.is_org_member(organization_id));

create policy "organization_members_manage_admins" on public.organization_members
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "social_accounts_select_members" on public.social_accounts
  for select using (public.is_org_member(organization_id));

create policy "social_accounts_manage_admins" on public.social_accounts
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "campaigns_select_members" on public.campaigns
  for select using (public.is_org_member(organization_id));

create policy "campaigns_manage_admins" on public.campaigns
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "scheduled_posts_select_members" on public.scheduled_posts
  for select using (public.is_org_member(organization_id));

create policy "scheduled_posts_manage_admins" on public.scheduled_posts
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "media_assets_select_members" on public.media_assets
  for select using (public.is_org_member(organization_id));

create policy "media_assets_manage_admins" on public.media_assets
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "publish_attempts_select_members" on public.publish_attempts
  for select using (public.is_org_member(organization_id));

create policy "publish_attempts_manage_admins" on public.publish_attempts
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "platform_results_select_members" on public.platform_results
  for select using (public.is_org_member(organization_id));

create policy "platform_results_manage_admins" on public.platform_results
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "audit_logs_select_members" on public.audit_logs
  for select using (public.is_org_member(organization_id));

create policy "audit_logs_manage_admins" on public.audit_logs
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "webhook_events_select_members" on public.webhook_events
  for select using (public.is_org_member(coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid)));

create policy "webhook_events_manage_admins" on public.webhook_events
  for all using (
    organization_id is null or public.is_org_admin(organization_id)
  ) with check (
    organization_id is null or public.is_org_admin(organization_id)
  );
