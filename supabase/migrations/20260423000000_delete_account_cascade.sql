-- supabase/migrations/20260423000000_delete_account_cascade.sql
-- FK constraints so deleting an auth.users row cascades to user data
-- and nullifies audit references in page_content.

ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_user
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE page_content
  ADD CONSTRAINT fk_page_content_updated_by
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
