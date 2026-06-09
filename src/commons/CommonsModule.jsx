// src/commons/CommonsModule.jsx
// Commons Engine root: provides MembershipsContext, resolves workspace selection, and owns
// /commons/* routing under its own shell — no MainLayout, no consciousness mode.
//   /commons                 → 0 memberships: no-access · 1: auto-enter · 2+: picker
//   /commons/:workspaceSlug  → WorkspaceProvider(slug) → access gate → shell

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { MembershipsProvider, useMemberships } from './commonsState/MembershipsContext.jsx';
import { WorkspaceProvider, useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { CommonsLayout } from './CommonsLayout.jsx';
import { WorkspacePicker } from './WorkspacePicker.jsx';
import { NoAccessScreen } from './NoAccessScreen.jsx';
import { DashboardPage } from './pages/DashboardPage/DashboardPage.jsx';
import { ComingSoonPage } from './pages/ComingSoonPage/ComingSoonPage.jsx';

function LoadingScreen() {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  return (
    <div className="commons-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-center"><p>{shell.access.loading}</p></div>
    </div>
  );
}

// /commons — decide where the user lands based on how many workspaces they belong to.
function MembershipsGate() {
  const { loading, workspaces } = useMemberships();
  if (loading) return <LoadingScreen />;
  if (workspaces.length === 0) return <NoAccessScreen />;
  if (workspaces.length === 1) return <Navigate to={`/commons/${workspaces[0].slug}`} replace />;
  return <WorkspacePicker />;
}

// /commons/:workspaceSlug — gate on membership for that specific workspace, then render the shell.
function WorkspaceGate() {
  const { loading, isMember } = useWorkspace();
  if (loading) return <LoadingScreen />;
  if (!isMember) return <Navigate to="/commons" replace />;
  return (
    <Routes>
      <Route element={<CommonsLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="board" element={<ComingSoonPage />} />
        <Route path="overview" element={<ComingSoonPage />} />
        <Route path="alerts" element={<ComingSoonPage />} />
      </Route>
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
