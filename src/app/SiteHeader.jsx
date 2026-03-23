// src/app/SiteHeader.jsx
// Site shell: consciousness switcher, nav menu trigger, brand (copy from siteShell.content).

import logo from '../assets/images/kfar-hirur-logo.png';
import { resolveSiteShellContent } from '../content/site/resolveSiteShellContent.js';
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
      <div className="site-header-controls" dir="ltr">
        <ConsciousnessSwitcher />
        <button
          type="button"
          className="site-navMenuTrigger"
          onClick={onToggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation-menu"
          aria-haspopup="true"
        >
          <span className="site-navMenuTriggerIcon" aria-hidden="true">
            ☰
          </span>
          <span className="site-navMenuTriggerLabel">{getText(navigation, 'menuLabel')}</span>
        </button>
      </div>
      <div className="site-brand">
        <img src={logo} alt={getText(brand, 'logoAlt')} className="site-brandLogo" />
        <div className="site-brandText">
          <p className="site-brandTitle">{getText(brand, 'title')}</p>
          <p className="site-brandSubtitle">{getText(brand, 'subtitle')}</p>
        </div>
      </div>
    </header>
  );
}
