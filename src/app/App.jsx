// src/app/App.jsx
// Root: random default mode; AppProviders -> RouterProvider (data router) -> nested layout routes.
// A data router (createBrowserRouter) is used — rather than BrowserRouter — so React Router's
// useBlocker is available: the Commons unsaved-changes guard relies on it to catch *every*
// navigation, including the browser / phone hardware back (a POP that a manual guard can't see).
// The whole existing route tree is kept verbatim under a single catch-all data route.

import { useState } from 'react';
import { createBrowserRouter, RouterProvider, Route, Routes } from 'react-router-dom';
import { AppProviders } from './AppProviders.jsx';
import { MainLayout } from './MainLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { PostAuthRedirect } from './PostAuthRedirect.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { JoinTeamPage } from '../pages/joinTeam/JoinTeamPage.jsx';
import { KenZeOvedPage } from '../pages/kenZeOved/KenZeOvedPage.jsx';
import { TimelinePage } from '../pages/timeline/TimelinePage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { ProfilePage } from '../pages/profile/ProfilePage.jsx';
import { PrivacyPage } from '../pages/privacy/PrivacyPage.jsx';
import { TermsPage } from '../pages/terms/TermsPage.jsx';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx';
import { AdminListPage } from '../pages/admin/AdminListPage.jsx';
import { AdminItemPage } from '../pages/admin/AdminItemPage.jsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx';
import { AdminContentListPage } from '../pages/admin/AdminContentListPage.jsx';
import { AdminContentEditorPage } from '../pages/admin/AdminContentEditorPage.jsx';
import { CommonsModule } from '../commons/CommonsModule.jsx';

// The full route tree (unchanged), rendered as the data router's single catch-all element.
function AppRoutes() {
  return (
    <>
      <PostAuthRedirect />
      <Routes>
        {/* Public site */}
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="ken-ze-oved" element={<KenZeOvedPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="timeline/:slug" element={<TimelinePage />} />
          <Route path="join-team" element={<JoinTeamPage />} />
        </Route>

        {/* Auth & static */}
        <Route path="login" element={<LoginPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        {/* Protected — any authenticated user */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route element={<MainLayout />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Commons Engine — any authenticated user; membership gate lives inside CommonsModule.
            Intentionally NOT wrapped in MainLayout — it has its own shell. */}
        <Route element={<ProtectedRoute allowedRoles={[]} />}>
          <Route path="commons/*" element={<CommonsModule />} />
        </Route>

        {/* Admin — editor or admin role required */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'editor']} />}>
          <Route element={<MainLayout />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/timeline" element={<AdminListPage />} />
            <Route path="admin/timeline/items/new" element={<AdminItemPage />} />
            <Route path="admin/timeline/items/:slug" element={<AdminItemPage />} />
            <Route path="admin/content" element={<AdminContentListPage />} />
            <Route path="admin/content/:pageKey" element={<AdminContentEditorPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }]);

export function App() {
  const locale = 'he';
  const [mode, setMode] = useState(() => (Math.random() < 0.5 ? 'shay' : 'naor'));

  return (
    <AppProviders locale={locale} mode={mode} setMode={setMode}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
