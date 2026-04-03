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
import { TimelineItemPage } from '../pages/timeline/TimelineItemPage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { AdminListPage } from '../pages/admin/AdminListPage.jsx';
import { AdminItemPage } from '../pages/admin/AdminItemPage.jsx';

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
            <Route path="timeline/:slug" element={<TimelineItemPage />} />
            <Route path="join-team" element={<JoinTeamPage />} />
          </Route>

          {/* Auth */}
          <Route path="login" element={<LoginPage />} />

          {/* Admin — editor or admin role required */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'editor']} />}>
            <Route path="admin" element={<AdminListPage />} />
            <Route path="admin/timeline" element={<AdminListPage />} />
            <Route path="admin/timeline/items/new" element={<AdminItemPage />} />
            <Route path="admin/timeline/items/:slug" element={<AdminItemPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

