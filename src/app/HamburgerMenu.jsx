// src/app/HamburgerMenu.jsx
// Global nav overlay — always mounted; open state from MainLayout.

import '../styles/app/HamburgerMenu.css';
import { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { resolveSiteShellContent } from './resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';
import { useAuth } from './appState/AuthContext.jsx';
import { supabase } from '../data/timeline/supabaseClient.js';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MENU_ROUTES = [
  { to: '/',            labelKey: 'home',      end: true },
  { to: '/ken-ze-oved', labelKey: 'kenZeOved' },
  { to: '/timeline',    labelKey: 'timeline' },
  { to: '/join-team',   labelKey: 'joinTeam' },
];

export function HamburgerMenu({ isOpen, onClose, onOpenAuth }) {
  const { locale } = useAppContext();
  const { user, role, profile } = useAuth();
  const navigate   = useNavigate();
  const shell      = resolveSiteShellContent(locale);
  const navigation = shell.navigation ?? {};
  const authCopy   = shell.auth ?? {};
  const panelRef   = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    panel.querySelector(FOCUSABLE_SELECTOR)?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
    onClose();
  }

  function handleProfileClick() {
    navigate('/profile');
    onClose();
  }

  const avatarUrl   = profile?.avatarUrl ?? user?.user_metadata?.avatar_url ?? null;
  const displayName = profile?.displayName ?? user?.user_metadata?.full_name ?? user?.email ?? '';
  const initials    = displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div
      id="site-navigation-menu"
      className={isOpen ? 'site-menuRoot site-menuRoot--open' : 'site-menuRoot'}
      inert={!isOpen}
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
              <NavLink
                className="site-menuLink"
                to={to}
                end={end}
                onClick={(e) => {
                  e.preventDefault();
                  // menuNav timestamp signals TimelinePage to remount TimelineFeature
                  navigate(to, { state: { menuNav: Date.now() } });
                  onClose();
                }}
              >
                {getText(navigation, labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="site-menuAuth">
          {user ? (
            <>
              <div className="site-menuUserRow">
                <button
                  type="button"
                  className="site-menuAvatar"
                  onClick={handleProfileClick}
                  aria-label={getText(authCopy, 'profileButton')}
                >
                  {avatarUrl ? (
                    <img className="site-menuAvatar__img" src={avatarUrl} alt={displayName} />
                  ) : (
                    <span className="site-menuAvatar__initials" aria-hidden="true">{initials}</span>
                  )}
                  <span className="site-menuAvatar__name">{displayName}</span>
                </button>
                {(role === 'admin' || role === 'editor') && (
                  <button
                    type="button"
                    className="site-menuAdminBtn"
                    onClick={() => { navigate('/admin'); onClose(); }}
                  >
                    ממשק ניהול
                  </button>
                )}
              </div>
              <button type="button" className="site-menuLogout" onClick={handleLogout}>
                {getText(authCopy, 'logoutButton')}
              </button>
            </>
          ) : (
            <button type="button" className="site-menuLoginBtn" onClick={onOpenAuth}>
              {getText(authCopy, 'loginButton')}
            </button>
          )}
        </div>

      </nav>
    </div>
  );
}
