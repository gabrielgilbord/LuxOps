-- RLS hardening for LuxOps multi-tenant data isolation
-- Run this script in Supabase SQL editor after creating tables.

alter table if exists "Organization" enable row level security;
alter table if exists "User" enable row level security;
alter table if exists "Project" enable row level security;
alter table if exists "Photo" enable row level security;
alter table if exists "OperatorInvite" enable row level security;
alter table if exists "SyncEvent" enable row level security;
alter table if exists "NotificationJob" enable row level security;
alter table if exists "ProjectSignature" enable row level security;
alter table if exists "StripeEvent" enable row level security;

-- Helper function to resolve current Prisma User.id from Supabase auth user
create or replace function public.current_prisma_user_id()
returns text
language sql
stable
as $$
  select u.id
  from "User" u
  where u."supabaseUserId" = auth.uid()::text
  limit 1
$$;

create or replace function public.current_org_id()
returns text
language sql
stable
as $$
  select u."organizationId"
  from "User" u
  where u."supabaseUserId" = auth.uid()::text
  limit 1
$$;

-- Organization
drop policy if exists org_select_own on "Organization";
create policy org_select_own on "Organization"
for select using (id = public.current_org_id());

-- User
drop policy if exists user_select_same_org on "User";
create policy user_select_same_org on "User"
for select using ("organizationId" = public.current_org_id());

drop policy if exists user_insert_self on "User";
create policy user_insert_self on "User"
for insert with check ("supabaseUserId" = auth.uid()::text);

drop policy if exists user_update_self on "User";
create policy user_update_self on "User"
for update using ("supabaseUserId" = auth.uid()::text);

-- Project
drop policy if exists project_select_scoped on "Project";
create policy project_select_scoped on "Project"
for select using (
  "organizationId" = public.current_org_id()
  and (
    exists (
      select 1 from "User" u
      where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
    )
    or "assignedUserId" = public.current_prisma_user_id()
  )
);

drop policy if exists project_admin_insert on "Project";
create policy project_admin_insert on "Project"
for insert with check (
  "organizationId" = public.current_org_id()
  and exists (
    select 1 from "User" u
    where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
  )
);

drop policy if exists project_scoped_update on "Project";
create policy project_scoped_update on "Project"
for update using (
  "organizationId" = public.current_org_id()
  and (
    exists (
      select 1 from "User" u
      where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
    )
    or "assignedUserId" = public.current_prisma_user_id()
  )
);

-- Photo
drop policy if exists photo_select_scoped on "Photo";
create policy photo_select_scoped on "Photo"
for select using (
  exists (
    select 1 from "Project" p
    where p.id = "Photo"."projectId"
      and p."organizationId" = public.current_org_id()
      and (
        exists (
          select 1 from "User" u
          where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
        )
        or p."assignedUserId" = public.current_prisma_user_id()
      )
  )
);

drop policy if exists photo_insert_scoped on "Photo";
create policy photo_insert_scoped on "Photo"
for insert with check (
  exists (
    select 1 from "Project" p
    where p.id = "Photo"."projectId"
      and p."organizationId" = public.current_org_id()
      and (
        exists (
          select 1 from "User" u
          where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
        )
        or p."assignedUserId" = public.current_prisma_user_id()
      )
  )
);

-- OperatorInvite
drop policy if exists invite_admin_all on "OperatorInvite";
create policy invite_admin_all on "OperatorInvite"
for all using (
  "organizationId" = public.current_org_id()
  and exists (
    select 1 from "User" u
    where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
  )
);

-- SyncEvent
drop policy if exists sync_event_scoped on "SyncEvent";
create policy sync_event_scoped on "SyncEvent"
for all using (
  "organizationId" = public.current_org_id()
  and "userId" = public.current_prisma_user_id()
);

-- ProjectSignature
drop policy if exists signature_scoped on "ProjectSignature";
create policy signature_scoped on "ProjectSignature"
for all using (
  exists (
    select 1 from "Project" p
    where p.id = "ProjectSignature"."projectId"
      and p."organizationId" = public.current_org_id()
      and (
        exists (
          select 1 from "User" u
          where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
        )
        or p."assignedUserId" = public.current_prisma_user_id()
      )
  )
);

-- NotificationJob
drop policy if exists notification_job_scoped on "NotificationJob";
create policy notification_job_scoped on "NotificationJob"
for all using (
  "organizationId" = public.current_org_id()
  and (
    exists (
      select 1 from "User" u
      where u."supabaseUserId" = auth.uid()::text and u.role = 'ADMIN'
    )
    or "userId" = public.current_prisma_user_id()
  )
);

-- StripeEvent
drop policy if exists stripe_event_admin_only on "StripeEvent";
create policy stripe_event_admin_only on "StripeEvent"
for all using (
  exists (
    select 1 from "User" u
    where u."supabaseUserId" = auth.uid()::text
      and u.role = 'ADMIN'
      and (u."organizationId" = "StripeEvent"."organizationId" or "StripeEvent"."organizationId" is null)
  )
);

-- Storage RLS (bucket privado luxops-assets)
-- Aislamiento por organización usando convención de path:
-- organizations/<organizationId>/...
create or replace function public.storage_path_org_id(object_name text)
returns text
language sql
stable
as $$
  select split_part(object_name, '/', 2)
$$;

drop policy if exists storage_select_scoped on storage.objects;
create policy storage_select_scoped on storage.objects
for select to authenticated
using (
  bucket_id = 'luxops-assets'
  and public.storage_path_org_id(name) = public.current_org_id()
);

drop policy if exists storage_insert_scoped on storage.objects;
create policy storage_insert_scoped on storage.objects
for insert to authenticated
with check (
  bucket_id = 'luxops-assets'
  and public.storage_path_org_id(name) = public.current_org_id()
);

drop policy if exists storage_update_scoped on storage.objects;
create policy storage_update_scoped on storage.objects
for update to authenticated
using (
  bucket_id = 'luxops-assets'
  and public.storage_path_org_id(name) = public.current_org_id()
);

drop policy if exists storage_delete_scoped on storage.objects;
create policy storage_delete_scoped on storage.objects
for delete to authenticated
using (
  bucket_id = 'luxops-assets'
  and public.storage_path_org_id(name) = public.current_org_id()
);
