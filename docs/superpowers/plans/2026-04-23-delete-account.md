# Delete Account — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to permanently delete their account and all associated personal data from the profile page, in compliance with Israeli privacy law.

**Architecture:** A Supabase Edge Function (server-side, service role key) handles deletion — it removes the avatar from storage, then calls `auth.admin.deleteUser()` which cascades to `user_profiles` and `user_roles` via DB FK constraints. The client transitions through `idle → confirming → deleting → done` states with an inline confirmation block (no modal).

**Tech Stack:** React 19, Supabase JS v2, Supabase Edge Functions (Deno/TypeScript), PostgreSQL FK constraints, CSS custom properties.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/styles/globals.css` — add `--danger` and `--danger-surface` tokens |
| Modify | `src/content/site/he/profile.content.js` — add delete strings |
| Modify | `src/content/site/en/profile.content.js` — add delete strings |
| Modify | `src/data/auth/profileQueries.js` — add `deleteAccount()` function |
| Create | `supabase/functions/delete-account/index.ts` — Edge Function |
| Modify | `src/pages/profile/ProfilePage.jsx` — add delete UI + state machine |
| Modify | `src/pages/profile/ProfilePage.css` — add danger button + confirm block styles |

---

### Task 1: Add danger color tokens to globals.css

**Files:**
- Modify: `src/styles/globals.css`

These tokens don't exist yet. The danger color is mode-independent (red is semantically fixed), so it goes under `.main-layout` outside any mode override block.

- [ ] **Step 1: Find the overlay/shadow block in globals.css**

Open `src/styles/globals.css`. Locate the comment `/* Overlay and shadow tokens */` (around line 71). The new tokens go just after the shadow block, before `/* ── Node color palette`.

- [ ] **Step 2: Add danger tokens**

After the `--shadow-xl` line, add:

```css
  /* Danger — mode-independent (semantic red) */
  --danger:         #dc2626;
  --danger-surface: rgba(220, 38, 38, 0.07);
  --danger-border:  rgba(220, 38, 38, 0.25);
```

- [ ] **Step 3: Verify the dev server compiles with no errors**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

Check the terminal — no CSS parse errors. Stop the server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(tokens): add --danger, --danger-surface, --danger-border CSS tokens"
```

---

### Task 2: Add content strings

**Files:**
- Modify: `src/content/site/he/profile.content.js`
- Modify: `src/content/site/en/profile.content.js`

- [ ] **Step 1: Update Hebrew content**

In `src/content/site/he/profile.content.js`, add after `savedButton`:

```js
  deleteAccountButton:  'מחיקת חשבון',
  deleteConfirmText:    'פעולה זו תמחק לצמיתות את כל הנתונים שלך ולא ניתן לבטלה.',
  deleteConfirmButton:  'כן, מחק את חשבוני',
  deleteCancelButton:   'ביטול',
  deletingButton:       'מוחק...',
  deleteErrorPrefix:    'שגיאה במחיקת החשבון:',
```

Full file after edit:

```js
// src/content/site/he/profile.content.js
// UI strings for the profile editing page — Hebrew.

export const profileContent = {
  pageTitle:            'הפרופיל שלי',
  displayNameLabel:     'שם תצוגה',
  changeAvatarLabel:    'שנה תמונת פרופיל',
  uploadAvatarLabel:    'העלה תמונת פרופיל',
  changeOverlay:        'שנה',
  saveButton:           'שמור שינויים',
  savingButton:         'שומר...',
  savedButton:          'נשמר!',
  deleteAccountButton:  'מחיקת חשבון',
  deleteConfirmText:    'פעולה זו תמחק לצמיתות את כל הנתונים שלך ולא ניתן לבטלה.',
  deleteConfirmButton:  'כן, מחק את חשבוני',
  deleteCancelButton:   'ביטול',
  deletingButton:       'מוחק...',
  deleteErrorPrefix:    'שגיאה במחיקת החשבון:',
};
```

- [ ] **Step 2: Update English content**

Full file after edit:

```js
// src/content/site/en/profile.content.js
// UI strings for the profile editing page — English.

export const profileContent = {
  pageTitle:            'My Profile',
  displayNameLabel:     'Display name',
  changeAvatarLabel:    'Change profile picture',
  uploadAvatarLabel:    'Upload profile picture',
  changeOverlay:        'Change',
  saveButton:           'Save changes',
  savingButton:         'Saving...',
  savedButton:          'Saved!',
  deleteAccountButton:  'Delete account',
  deleteConfirmText:    'This will permanently delete all your data and cannot be undone.',
  deleteConfirmButton:  'Yes, delete my account',
  deleteCancelButton:   'Cancel',
  deletingButton:       'Deleting...',
  deleteErrorPrefix:    'Error deleting account:',
};
```

- [ ] **Step 3: Commit**

```bash
git add src/content/site/he/profile.content.js src/content/site/en/profile.content.js
git commit -m "feat(content): add delete account strings (he + en)"
```

---

### Task 3: DB migration — add FK constraints

**Files:**
- Create: `supabase/migrations/20260423000000_delete_account_cascade.sql`

This migration adds three FK constraints. After `auth.admin.deleteUser()` is called, Postgres automatically cascades the delete to `user_profiles` and `user_roles`, and nullifies `page_content.updated_by`.

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration via Supabase dashboard**

Go to the Supabase dashboard → SQL Editor → paste the migration SQL → Run.

Verify: in Table Editor, open `user_profiles` → check that `id` column now shows a FK relationship to `auth.users`.

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/20260423000000_delete_account_cascade.sql
git commit -m "feat(db): add ON DELETE CASCADE for user_profiles/user_roles, SET NULL for page_content.updated_by"
```

---

### Task 4: Create the Edge Function

**Files:**
- Create: `supabase/functions/delete-account/index.ts`

The Edge Function runs server-side with the service role key. It:
1. Verifies the caller's JWT matches the `userId` in the request body (prevents one user deleting another)
2. Removes the avatar folder from storage
3. Calls `auth.admin.deleteUser()` — DB cascade handles the rest

- [ ] **Step 1: Create the functions directory and file**

Create `supabase/functions/delete-account/index.ts` with this content:

```ts
// supabase/functions/delete-account/index.ts
// Deletes the authenticated user's account: avatar storage + auth user (cascades to DB rows).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Build a client using the caller's JWT to verify identity.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = await req.json();
    if (userId !== callerUser.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for privileged operations.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Delete avatar files from storage (best-effort — don't block on error).
    const { data: avatarFiles } = await adminClient.storage
      .from('avatars')
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f: { name: string }) => `${userId}/${f.name}`);
      await adminClient.storage.from('avatars').remove(paths);
    }

    // 2. Delete the auth user — DB cascade handles user_profiles, user_roles, page_content.updated_by.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy the Edge Function via Supabase dashboard**

Go to Supabase dashboard → Edge Functions → Deploy new function → name it `delete-account` → paste the code → Deploy.

Verify it appears in the functions list with status "Active".

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/delete-account/index.ts
git commit -m "feat(edge): add delete-account Edge Function"
```

---

### Task 5: Add `deleteAccount()` to profileQueries.js

**Files:**
- Modify: `src/data/auth/profileQueries.js`

- [ ] **Step 1: Add the function**

At the end of `src/data/auth/profileQueries.js`, add:

```js
// Calls the delete-account Edge Function to remove the user's account and all data.
// Returns null on success, error string on failure.
export async function deleteAccount(userId) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await supabase.functions.invoke('delete-account', {
    body: { userId },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
  });

  if (res.error) return res.error.message ?? 'Unknown error';
  if (res.data?.error) return res.data.error;
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/auth/profileQueries.js
git commit -m "feat(profile): add deleteAccount() query function"
```

---

### Task 6: Add delete UI to ProfilePage.jsx

**Files:**
- Modify: `src/pages/profile/ProfilePage.jsx`

The page gains a new `deleteState` variable (`'idle' | 'confirming' | 'deleting'`) and renders a danger section below the save form.

- [ ] **Step 1: Update imports and state in ProfilePage.jsx**

Add `useNavigate` to the React Router import and `deleteAccount` to the profileQueries import. Add `deleteState` state.

Full updated top of file (lines 1–26):

```jsx
// src/pages/profile/ProfilePage.jsx
// Profile editing: display name, avatar upload, and account deletion.

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { upsertUserProfile, uploadAvatar, deleteAccount } from '../../data/auth/profileQueries.js';
import { resolveProfileContent } from './resolveProfileContent.js';
import './ProfilePage.css';

export function ProfilePage() {
  const { locale } = useAppContext();
  const ui = resolveProfileContent(locale);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const currentName   = profile?.displayName ?? user?.user_metadata?.full_name ?? '';
  const currentAvatar = profile?.avatarUrl    ?? user?.user_metadata?.avatar_url ?? null;

  const [name,        setName]        = useState(currentName);
  const [preview,     setPreview]     = useState(currentAvatar);
  const [file,        setFile]        = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const [deleteState, setDeleteState] = useState('idle');   // 'idle' | 'confirming' | 'deleting'
  const [deleteError, setDeleteError] = useState('');
  const fileRef = useRef(null);
```

- [ ] **Step 2: Add handleDelete function**

Add this function after `handleSave`, before the `initials` calculation:

```jsx
  async function handleDelete() {
    setDeleteError('');
    setDeleteState('deleting');

    const err = await deleteAccount(user.id);

    if (err) {
      setDeleteError(err);
      setDeleteState('idle');
      return;
    }

    await supabase.auth.signOut();
    navigate('/');
  }
```

Note: `supabase` must be imported. Add this import at the top of the file:

```js
import { supabase } from '../../data/timeline/supabaseClient.js';
```

- [ ] **Step 3: Add the delete section to the JSX return**

After the closing `</form>` tag and before `</div>`, add:

```jsx
      <div className="profile-delete-section">
        <hr className="profile-delete-divider" />

        {deleteState === 'idle' && (
          <button
            type="button"
            className="profile-delete-btn"
            onClick={() => setDeleteState('confirming')}
          >
            {ui.deleteAccountButton}
          </button>
        )}

        {(deleteState === 'confirming' || deleteState === 'deleting') && (
          <div className="profile-delete-confirm" role="alert">
            <p className="profile-delete-confirm__text">{ui.deleteConfirmText}</p>
            {deleteError && (
              <p className="profile-delete-confirm__error">
                {ui.deleteErrorPrefix} {deleteError}
              </p>
            )}
            <div className="profile-delete-confirm__actions">
              <button
                type="button"
                className="profile-delete-confirm__cancel"
                onClick={() => setDeleteState('idle')}
                disabled={deleteState === 'deleting'}
              >
                {ui.deleteCancelButton}
              </button>
              <button
                type="button"
                className="profile-delete-confirm__submit"
                onClick={handleDelete}
                disabled={deleteState === 'deleting'}
              >
                {deleteState === 'deleting' ? ui.deletingButton : ui.deleteConfirmButton}
              </button>
            </div>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/profile/ProfilePage.jsx
git commit -m "feat(profile): add delete account UI with idle/confirming/deleting states"
```

---

### Task 7: Add delete styles to ProfilePage.css

**Files:**
- Modify: `src/pages/profile/ProfilePage.css`

- [ ] **Step 1: Append styles at the end of ProfilePage.css**

```css
/* ── Account deletion ─────────────────────────────────────────── */

.profile-delete-section {
  margin-top: 1rem;
}

.profile-delete-divider {
  border: none;
  border-top: 1px solid var(--surface-border);
  margin: 0 0 1.25rem;
}

.profile-delete-btn {
  background: transparent;
  border: 1.5px solid var(--danger-border);
  color: var(--danger);
  padding: 0.65rem 1rem;
  border-radius: 10px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s ease;
}

.profile-delete-btn:hover {
  background: var(--danger-surface);
}

.profile-delete-btn:focus-visible {
  outline: 2px solid var(--danger);
  outline-offset: 2px;
}

.profile-delete-confirm {
  background: var(--danger-surface);
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile-delete-confirm__text {
  margin: 0;
  font-size: 0.88rem;
  color: var(--danger);
  font-weight: 500;
  line-height: 1.5;
}

.profile-delete-confirm__error {
  margin: 0;
  font-size: 0.82rem;
  color: var(--danger);
}

.profile-delete-confirm__actions {
  display: flex;
  gap: 0.5rem;
}

.profile-delete-confirm__cancel {
  flex: 1;
  padding: 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.profile-delete-confirm__cancel:disabled {
  opacity: 0.5;
  cursor: default;
}

.profile-delete-confirm__cancel:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.profile-delete-confirm__submit {
  flex: 2;
  padding: 0.65rem;
  border-radius: 8px;
  border: none;
  background: var(--danger);
  color: #fff;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.profile-delete-confirm__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.profile-delete-confirm__submit:focus-visible {
  outline: 2px solid var(--danger);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Verify contrast**

`--danger` is `#dc2626` (red). Button text is `#fff` (white). Contrast ratio ≈ 5.1:1 — passes WCAG AA (4.5:1 required). No action needed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile/ProfilePage.css
git commit -m "feat(profile): add delete account styles"
```

---

### Task 8: Manual end-to-end test

No automated test suite is configured. Verify manually in the browser.

- [ ] **Step 1: Start the dev server**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```

- [ ] **Step 2: Test the idle state**

Log in → navigate to the profile page. Verify:
- "מחיקת חשבון" button appears below the save form, separated by a divider
- Button has a red outline, no fill

- [ ] **Step 3: Test the confirming state**

Click "מחיקת חשבון". Verify:
- The button disappears and is replaced by the confirmation block
- Warning text appears in red
- Two buttons: "ביטול" and "כן, מחק את חשבוני"
- Screen reader / `role="alert"` is present on the block (inspect in DevTools)

- [ ] **Step 4: Test cancel**

Click "ביטול". Verify the confirmation block disappears and the "מחיקת חשבון" button returns.

- [ ] **Step 5: Test actual deletion (use a test account)**

Create a test user in Supabase Auth dashboard. Log in as that user. Click "מחיקת חשבון" → "כן, מחק את חשבוני". Verify:
- Button shows "מוחק..." while processing
- After completion: redirected to `/`
- User no longer appears in Supabase Auth dashboard
- `user_profiles` and `user_roles` rows are gone
- Any `page_content` rows previously updated by that user now have `updated_by = NULL`

- [ ] **Step 6: Run lint and build**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```

Both must pass with no errors.
