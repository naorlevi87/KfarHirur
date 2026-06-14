// src/data/commons/identity.js
// How a person's name + avatar are shown in Commons, per the account/products model:
// the ACCOUNT is canonical; a workspace MAY override the display name; the avatar always inherits
// from the account. The rule lives here, once.
// See docs/superpowers/specs/2026-06-14-account-and-products-model-design.md §5.

// workspaceName  — commons.workspace_members.display_name (admin-set at invite; the override tier).
// accountProfile — { displayName, avatarUrl } from the neutral account (user_profiles).
// email          — the account email; used only as a last-resort label (its local-part).
export function resolveMemberIdentity({ workspaceName, accountProfile, email } = {}) {
  const fromWorkspace = workspaceName?.trim();
  const fromAccount   = accountProfile?.displayName?.trim();
  const fromEmail     = email ? email.split('@')[0] : '';
  return {
    displayName: fromWorkspace || fromAccount || fromEmail || '',
    avatarUrl: accountProfile?.avatarUrl ?? null,
  };
}
