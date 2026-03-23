// src/app/HamburgerMenu.jsx
// Global nav overlay — always mounted; open state from MainLayout (not AppContext).

import { NavLink } from 'react-router-dom';
import { resolveSiteShellContent } from '../content/site/resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';

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
