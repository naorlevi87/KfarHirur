// src/app/MainLayout.jsx
// Single root layout: header, hamburger menu state, route outlet, auth modal.

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu.jsx';
import { SiteHeader } from './SiteHeader.jsx';
import { useAppContext } from './appState/useAppContext.js';
import { AuthModal } from '../features/auth/AuthModal.jsx';
import { resolveSiteShellContent } from './resolveSiteShellContent.js';

export function MainLayout() {
  const { locale, mode } = useAppContext();
  const [isMenuOpen,      setIsMenuOpen]      = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const dir  = locale === 'he' ? 'rtl' : 'ltr';
  const lang = locale === 'he' ? 'he'  : 'en';

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu  = () => setIsMenuOpen(false);
  const openAuth   = () => { closeMenu(); setIsAuthModalOpen(true); };
  const closeAuth  = () => setIsAuthModalOpen(false);

  const shell    = resolveSiteShellContent(locale);
  const authCopy = shell.auth ?? {};

  return (
    <div
      className="main-layout"
      data-consciousness-mode={mode}
      dir={dir}
      lang={lang}
    >
      <SiteHeader isMenuOpen={isMenuOpen} onToggleMenu={toggleMenu} />
      <HamburgerMenu isOpen={isMenuOpen} onClose={closeMenu} onOpenAuth={openAuth} />
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuth} copy={authCopy} />
      <main className="main-layout-content">
        <Outlet />
      </main>
    </div>
  );
}
