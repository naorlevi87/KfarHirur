// src/app/MainLayout.jsx
// Single root layout: header, hamburger menu state, route outlet.

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu.jsx';
import { SiteHeader } from './SiteHeader.jsx';
import { useAppContext } from './appState/useAppContext.js';

export function MainLayout() {
  const { locale, mode } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const lang = locale === 'he' ? 'he' : 'en';

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div
      className="main-layout"
      data-consciousness-mode={mode}
      dir={dir}
      lang={lang}
    >
      <SiteHeader isMenuOpen={isMenuOpen} onToggleMenu={toggleMenu} />
      <HamburgerMenu isOpen={isMenuOpen} onClose={closeMenu} />
      <main className="main-layout-content">
        <Outlet />
      </main>
    </div>
  );
}
