// src/app/App.jsx
// Root: random default mode; AppProviders -> BrowserRouter -> nested layout routes.

import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from './AppProviders.jsx';
import { MainLayout } from './MainLayout.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { JoinTeamPage } from '../pages/joinTeam/JoinTeamPage.jsx';
import { KeepItGoingPage } from '../pages/keepItGoing/KeepItGoingPage.jsx';
import { TimelinePage } from '../pages/timeline/TimelinePage.jsx';

export function App() {
  const locale = 'he';
  const [mode, setMode] = useState(() => (Math.random() < 0.5 ? 'shay' : 'naor'));

  return (
    <AppProviders locale={locale} mode={mode} setMode={setMode}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="keep-it-going" element={<KeepItGoingPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="join-team" element={<JoinTeamPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}

