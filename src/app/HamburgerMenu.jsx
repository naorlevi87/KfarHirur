// src/app/HamburgerMenu.jsx
// Global nav overlay — always mounted; open state from MainLayout (not AppContext).

import '../styles/app/HamburgerMenu.css';
import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { resolveSiteShellContent } from '../content/site/resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Stable routes; labels come from siteShell.navigation (locale files). */
const MENU_ROUTES = [
  { to: '/', labelKey: 'home', end: true },
  { to: '/keep-it-going', labelKey: 'keepItGoing' },
  { to: '/timeline', labelKey: 'timeline' },
  { to: '/join-team', labelKey: 'joinTeam' },
];

export function HamburgerMenu({ isOpen, onClose }) {
  const { locale } = useAppContext();
  const shell = resolveSiteShellContent(locale);
  const navigation = shell.navigation ?? {};
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    // Focus first element when panel opens
    panel.querySelector(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      id="site-navigation-menu"
      className={isOpen ? 'site-menuRoot site-menuRoot--open' : 'site-menuRoot'}
      aria-hidden={!isOpen}
    >
      <div
        className="site-menuBackdrop"
        role="presentation"
        onClick={onClose}
        aria-hidden="true"
      />
      <nav
        ref={panelRef}
        className="site-menuPanel"
        aria-label={getText(navigation, 'mainNavAriaLabel')}
      >
        <ul className="site-menuList">
          {MENU_ROUTES.map(({ to, labelKey, end }) => (
            <li key={to} className="site-menuItem">
              <NavLink className="site-menuLink" to={to} end={end} onClick={onClose}>
                {getText(navigation, labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
        <button type="button" className="site-menuClose" onClick={onClose}>
          {getText(navigation, 'closeLabel')}
        </button>
      </nav>
    </div>
  );
}
