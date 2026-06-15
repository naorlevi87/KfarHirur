-- supabase/migrations/20260614100000_commons_attachments_storage.sql
-- Private bucket for documentation photos/files. Path = {workspace_id}/{node_id}/{uuid}-{filename}.
-- 5 MB cap, image+pdf+doc allowlist. Access keyed on the first path segment (workspace_id):
-- read/insert = active member, delete = manager/admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commons-attachments', 'commons-attachments', false, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "commons att read" on storage.objects;
create policy "commons att read" on storage.objects for select to authenticated
  using (bucket_id = 'commons-attachments'
    and commons.is_active_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "commons att insert" on storage.objects;
create policy "commons att insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'commons-attachments'
    and commons.is_active_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "commons att delete" on storage.objects;
create policy "commons att delete" on storage.objects for delete to authenticated
  using (bucket_id = 'commons-attachments'
    and commons.my_permission(((storage.foldername(name))[1])::uuid) in ('admin','manager'));
