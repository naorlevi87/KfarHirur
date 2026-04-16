// src/app/SiteHeader.jsx
// Single-row sticky header: consciousness toggle | [spacer] | site identity | logo | hamburger.

import { Link } from 'react-router-dom';
import '../styles/app/SiteHeader.css';
import logoCircle from '../assets/images/kfar-hirur-logo-circleOnly.png';
import { resolveSiteShellContent } from './resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';
import { ConsciousnessSwitcher } from './ConsciousnessSwitcher.jsx';

export function SiteHeader({ isMenuOpen, onToggleMenu }) {
  const { locale } = useAppContext();
  const shell = resolveSiteShellContent(locale);
  const brand = shell.brand ?? {};
  const navigation = shell.navigation ?? {};

  return (
    <header className="site-header">
      {/* dir=ltr: physical left→right regardless of page RTL — switcher left, logo+hamburger right */}
      <div className="site-header-inner" dir="ltr">
        <ConsciousnessSwitcher />

        <div className="site-header-spacer" />

        {/* dir=rtl: Hebrew text flows correctly within this block */}
        <div className="site-identity" dir="rtl">
          <p className="site-identity-title">{getText(brand, 'title')}</p>
          <p className="site-identity-subtitle">{getText(brand, 'subtitle')}</p>
        </div>

        <Link to="/" className="site-headerLogo-link" aria-label={getText(brand, 'logoAlt')}>
          <img
            src={logoCircle}
            alt=""
            className="site-headerLogo"
          />
        </Link>

        <button
          type="button"
          className="site-hamburger"
          onClick={onToggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation-menu"
          aria-haspopup="true"
          aria-label={getText(navigation, 'menuLabel')}
        >
          <span className="site-hamburger-line" aria-hidden="true" />
          <span className="site-hamburger-line" aria-hidden="true" />
          <span className="site-hamburger-line" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
