// src/app/App.jsx
// Root: random default mode; AppProviders -> BrowserRouter -> nested layout routes.

import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from './AppProviders.jsx';
import { MainLayout } from './MainLayout.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { JoinTeamPage } from '../pages/joinTeam/JoinTeamPage.jsx';
import { KenZeOvedPage } from '../pages/kenZeOved/KenZeOvedPage.jsx';
import { TimelinePage } from '../pages/timeline/TimelinePage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { ProfilePage } from '../pages/profile/ProfilePage.jsx';
import { PrivacyPage } from '../pages/privacy/PrivacyPage.jsx';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx';
import { AdminListPage } from '../pages/admin/AdminListPage.jsx';
import { AdminItemPage } from '../pages/admin/AdminItemPage.jsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx';
import { AdminContentListPage } from '../pages/admin/AdminContentListPage.jsx';
import { AdminContentEditorPage } from '../pages/admin/AdminContentEditorPage.jsx';

export function App() {
  const locale = 'he';
  const [mode, setMode] = useState(() => (Math.random() < 0.5 ? 'shay' : 'naor'));

  return (
    <AppProviders locale={locale} mode={mode} setMode={setMode}>
      <BrowserRouter>
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

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute allowedRoles={[]} />}>
            <Route element={<MainLayout />}>
              <Route path="profile" element={<ProfilePage />} />
            </Route>
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
      </BrowserRouter>
    </AppProviders>
  );
}
