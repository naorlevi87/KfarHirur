// src/commons/CommonsModule.jsx
// Commons Engine root: provides MembershipsContext, resolves workspace selection, and owns
// /commons/* routing under its own shell — no MainLayout, no consciousness mode.
//   /commons                 → 0 memberships: no-access · 1: auto-enter · 2+: picker
//   /commons/:workspaceSlug  → WorkspaceProvider(slug) → access gate → shell

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import './pages/JoinInvitePage/join.css';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { MembershipsProvider, useMemberships } from './commonsState/MembershipsContext.jsx';
import { WorkspaceProvider, useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { myPendingInvites } from '../data/commons/memberQueries.js';
import { CommonsLayout } from './CommonsLayout.jsx';
import { WorkspacePicker } from './WorkspacePicker.jsx';
import { NoAccessScreen } from './NoAccessScreen.jsx';
import { MyTasksPage } from './pages/MyTasksPage/MyTasksPage.jsx';
import { BoardPage } from './pages/BoardPage/BoardPage.jsx';
import { AreaPage } from './pages/AreaPage/AreaPage.jsx';
import { OverviewPage } from './pages/OverviewPage/OverviewPage.jsx';
import { TaskFormPage } from './tasks/TaskFormPage.jsx';
import { TaskViewPage } from './tasks/TaskViewPage.jsx';
import { RolesPage } from './pages/RolesPage/RolesPage.jsx';
import { MembersPage } from './pages/MembersPage/MembersPage.jsx';
import { JoinInvitePage } from './pages/JoinInvitePage/JoinInvitePage.jsx';

// `name` (the workspace) is shown when known: "בודק מה קורה ב<workspace>". Falls back to the
// generic line at the memberships gate, where no specific workspace is in context yet.
function LoadingScreen({ name }) {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  const text = name ? `${shell.loadingInWorkspace}${name}` : shell.access.loading;
  return (
    <div className="commons-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-center"><p>{text}</p></div>
    </div>
  );
}

// Pending project invitations the signed-in user can accept — surfaced at /commons no matter how
// many workspaces they already belong to, so the flow works even if they never click the email link.
// Their existing workspaces are listed below so they can still enter one.
function PendingInvites({ invites, workspaces }) {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  const navigate = useNavigate();
  return (
    <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-join__card">
        <h1 className="commons-join__workspace">{shell.join.pendingTitle}</h1>
        <ul className="commons-join__pending">
          {invites.map(i => (
            <li key={i.token}>
              <button type="button" className="commons-btn commons-btn--primary"
                onClick={() => navigate(`/commons/${i.workspace_slug}/join/${i.token}`)}>{i.workspace_name}</button>
            </li>
          ))}
        </ul>
        {workspaces.length > 0 && (
          <>
            <p className="commons-join__divider">{shell.join.yourWorkspaces}</p>
            <ul className="commons-join__pending">
              {workspaces.map(ws => (
                <li key={ws.id}>
                  <button type="button" className="commons-btn commons-btn--ghost"
                    onClick={() => navigate(`/commons/${ws.slug}`)}>{ws.name}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// /commons — land the user based on memberships + any pending invites. Invites are loaded BEFORE
// deciding, so a single-workspace auto-enter never fires ahead of a waiting invitation.
function MembershipsGate() {
  const { loading, workspaces } = useMemberships();
  const [invites, setInvites] = useState([]);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  useEffect(() => { myPendingInvites().then(list => { setInvites(list); setInvitesLoaded(true); }); }, []);
  if (loading || !invitesLoaded) return <LoadingScreen />;
  if (invites.length > 0) return <PendingInvites invites={invites} workspaces={workspaces} />;
  if (workspaces.length === 0) return <NoAccessScreen />;
  if (workspaces.length === 1) return <Navigate to={`/commons/${workspaces[0].slug}`} replace />;
  return <WorkspacePicker />;
}

// /commons/:workspaceSlug — gate on membership for that specific workspace, then render the shell.
function WorkspaceGate() {
  const { workspaceSlug } = useParams();
  const { loading, isMember } = useWorkspace();
  const { workspaces } = useMemberships();
  if (loading) return <LoadingScreen name={workspaces.find(w => w.slug === workspaceSlug)?.name} />;
  return (
    <Routes>
      {/* Reachable by a not-yet-member (invited) user, so the join route comes before the gate. */}
      <Route path="join/:token" element={<JoinInvitePage />} />
      {isMember ? (
        <>
          <Route element={<CommonsLayout />}>
            <Route index element={<MyTasksPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="board/:containerId" element={<AreaPage />} />
            <Route path="overview" element={<OverviewPage />} />
          </Route>
          <Route path="task/new" element={<TaskFormPage mode="create" />} />
          <Route path="task/:nodeId" element={<TaskViewPage />} />
          <Route path="task/:nodeId/edit" element={<TaskFormPage mode="edit" />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="members" element={<MembersPage />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/commons" replace />} />
      )}
    </Routes>
  );
}

function WorkspaceRoutes() {
  const { workspaceSlug } = useParams();
  return (
    <WorkspaceProvider slug={workspaceSlug}>
      <WorkspaceGate />
    </WorkspaceProvider>
  );
}

export function CommonsModule() {
  return (
    <MembershipsProvider>
      <Routes>
        <Route path="/" element={<MembershipsGate />} />
        <Route path=":workspaceSlug/*" element={<WorkspaceRoutes />} />
      </Routes>
    </MembershipsProvider>
  );
}
