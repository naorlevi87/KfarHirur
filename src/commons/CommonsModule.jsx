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
import { MyTasksPage } from './pages/MyTasksPage/MyTasksPage.jsx';
import { BoardPage } from './pages/BoardPage/BoardPage.jsx';
import { AreaPage } from './pages/AreaPage/AreaPage.jsx';
import { OverviewPage } from './pages/OverviewPage/OverviewPage.jsx';
import { TaskFormPage } from './tasks/TaskFormPage.jsx';
import { TaskViewPage } from './tasks/TaskViewPage.jsx';
import { RolesPage } from './pages/RolesPage/RolesPage.jsx';

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
  const { workspaceSlug } = useParams();
  const { loading, isMember } = useWorkspace();
  const { workspaces } = useMemberships();
  if (loading) return <LoadingScreen name={workspaces.find(w => w.slug === workspaceSlug)?.name} />;
  if (!isMember) return <Navigate to="/commons" replace />;
  return (
    <Routes>
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
