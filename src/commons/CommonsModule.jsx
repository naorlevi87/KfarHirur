// src/commons/CommonsModule.jsx
// Commons Engine root: provides WorkspaceContext, enforces the access gate (loading / member-only),
// and owns /commons/* routing under its own shell — no MainLayout, no consciousness mode.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { Route, Routes } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { WorkspaceProvider, useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { CommonsLayout } from './CommonsLayout.jsx';
import { NoAccessScreen } from './NoAccessScreen.jsx';
import { DashboardPage } from './pages/DashboardPage/DashboardPage.jsx';
import { ComingSoonPage } from './pages/ComingSoonPage/ComingSoonPage.jsx';

function CommonsGate() {
  const { locale } = useAppContext();
  const { loading, isMember } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);

  if (loading) {
    return (
      <div className="commons-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <div className="commons-center"><p>{shell.access.loading}</p></div>
      </div>
    );
  }
  if (!isMember) return <NoAccessScreen />;

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

export function CommonsModule() {
  return (
    <WorkspaceProvider>
      <CommonsGate />
    </WorkspaceProvider>
  );
}
