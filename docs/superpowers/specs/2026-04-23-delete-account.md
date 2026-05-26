# Spec: Delete Account

**Date:** 2026-04-23
**Status:** Approved

## Goal

Allow users to permanently delete their account and all associated personal data, in compliance with the Israeli Privacy Protection Law (חוק הגנת הפרטיות).

---

## Scope

Data to be deleted:
- `auth.users` row (Supabase Auth)
- `user_profiles` row (display name, avatar URL)
- `user_roles` row (role assignment)
- Avatar file from `avatars/{userId}/` storage bucket
- `page_content.updated_by` — set to NULL (audit rows are kept; user reference is nullified)

---

## DB Migration

Add FK constraints to enable cascade deletion from `auth.users`:

```sql
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_user
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE page_content
  ADD CONSTRAINT fk_page_content_updated_by
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
```

Calling `auth.admin.deleteUser(userId)` from the Edge Function triggers the cascade automatically. No manual row deletion needed for `user_profiles` or `user_roles`.

---

## Edge Function: `delete-account`

- Located at `supabase/functions/delete-account/index.ts`
- Authenticated: reads the caller's JWT, verifies `user.id` matches the request payload
- Uses service role key (env var `SUPABASE_SERVICE_ROLE_KEY`) — never exposed to the browser
- Steps:
  1. Delete all files under `avatars/{userId}/` from storage
  2. Call `supabase.auth.admin.deleteUser(userId)` — cascade handles `user_profiles`, `user_roles`, and nullifies `page_content.updated_by`
- Returns `{ success: true }` or `{ error: string }`

---

## Client-side

### `profileQueries.js`

New export:
```js
export async function deleteAccount() → { error: string | null }
```
POSTs to the `delete-account` Edge Function. Returns `null` on success, error string on failure.

### `ProfilePage.jsx`

New state:
```
idle → confirming → deleting → (success: signOut + navigate('/'))
                              → (error: show message, return to idle)
```

- `idle`: renders "מחיקת חשבון" button at bottom of page (danger style, outline)
- `confirming`: button is replaced by an inline warning block:
  - Warning text: "פעולה זו תמחק לצמיתות את כל הנתונים שלך ולא ניתן לבטלה."
  - Two buttons: "כן, מחק את חשבוני" (danger, filled) + "ביטול" (neutral)
- `deleting`: "מוחק..." spinner state, both buttons disabled
- On success: `supabase.auth.signOut()` then `navigate('/')`
- On error: display error message, return to `idle`

No modal. No separate page. Inline confirmation only.

---

## Content strings

### Hebrew (`he/profile.content.js`)

```js
deleteAccountButton:   'מחיקת חשבון',
deleteConfirmText:     'פעולה זו תמחק לצמיתות את כל הנתונים שלך ולא ניתן לבטלה.',
deleteConfirmButton:   'כן, מחק את חשבוני',
deleteCancelButton:    'ביטול',
deletingButton:        'מוחק...',
deleteErrorPrefix:     'שגיאה במחיקת החשבון:',
```

### English (`en/profile.content.js`)

```js
deleteAccountButton:   'Delete account',
deleteConfirmText:     'This will permanently delete all your data and cannot be undone.',
deleteConfirmButton:   'Yes, delete my account',
deleteCancelButton:    'Cancel',
deletingButton:        'Deleting...',
deleteErrorPrefix:     'Error deleting account:',
```

---

## Styling

- "מחיקת חשבון" button: outline style, `var(--danger)` color, separated from the save form by a visual divider
- Confirmation block: subtle red-tinted background (`var(--danger-surface)`), warning text in `var(--danger)`, same max-width as the form
- No animations needed — CSS transition on opacity for the block appearance is sufficient

---

## Accessibility (IS 5568 / WCAG 2.1 AA)

- All buttons keyboard-navigable with `focus-visible` styles
- Confirmation text has `role="alert"` so screen readers announce it on appearance
- Danger button contrast must meet 4.5:1 against its background

---

## Out of scope

- Admin deleting another user's account (future)
- Re-authentication before deletion (nice-to-have, not required now)
- Email confirmation of deletion (nice-to-have)
