// src/commons/pages/JoinInvitePage/JoinInvitePage.jsx
// Deep-linked invite acceptance (/commons/:slug/join/:token). The route is authenticated (behind
// ProtectedRoute), so the user is always signed in here — sign-in happens at /login, which returns
// to this URL. Shows the matching pending invite (matched by email) with Accept / Decline. Accepting
// creates the active membership (consent), refreshes the membership contexts so the new workspace is
// visible immediately, and drops the user into the workspace.

import './join.css';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useAuth } from '../../../app/appState/AuthContext.jsx';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useMemberships } from '../../commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { myPendingInvites, acceptInvite, declineInvite } from '../../../data/commons/memberQueries.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';

export function JoinInvitePage() {
  const { locale } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const { refresh: refreshWorkspace } = useWorkspace();
  const { refresh: refreshMemberships } = useMemberships();
  const { token } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const j = shell.join;
  const levelLabel = { admin: shell.members.levelAdmin, manager: shell.members.levelManager, member: shell.members.levelMember };

  const [invite, setInvite] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    myPendingInvites().then(list => {
      if (!cancelled) setInvite(list.find(i => i.token === token) ?? null);
    });
    return () => { cancelled = true; };
  }, [authLoading, user, token]);

  async function accept() {
    await acceptInvite(token);
    // Re-resolve membership before navigating: the WorkspaceProvider for this slug resolved while
    // the user was not yet a member, so without this the workspace gate would bounce to /commons.
    await refreshWorkspace();
    refreshMemberships();
    navigate(invite?.workspace_slug ? `/commons/${invite.workspace_slug}` : '/commons');
  }
  async function decline() {
    await declineInvite(token);
    navigate('/commons');
  }

  if (authLoading) {
    return <div className="commons-root commons-center" dir={locale === 'he' ? 'rtl' : 'ltr'}><CommonsLoading /></div>;
  }
  if (invite === undefined) {
    return <div className="commons-root commons-center" dir={locale === 'he' ? 'rtl' : 'ltr'}><CommonsLoading /></div>;
  }
  if (invite === null) {
    return (
      <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <div className="commons-join__card">
          <p className="commons-join__lead">{j.notFound}</p>
          <button type="button" className="commons-btn commons-btn--ghost" onClick={() => navigate('/commons')}>{shell.access.backToSite}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-join__card">
        <p className="commons-join__to">{j.invitedTo}</p>
        <h1 className="commons-join__workspace">{invite.workspace_name}</h1>
        <p className="commons-join__level">
          {j.asLevel} {levelLabel[invite.permission_level] ?? invite.permission_level}
          {invite.role_names?.length > 0 && ` · ${j.skills}: ${invite.role_names.join(', ')}`}
        </p>
        <div className="commons-join__actions">
          <button type="button" className="commons-btn commons-btn--ghost" onClick={decline}>{j.decline}</button>
          <button type="button" className="commons-btn commons-btn--primary" onClick={accept}>{j.accept}</button>
        </div>
      </div>
    </div>
  );
}
