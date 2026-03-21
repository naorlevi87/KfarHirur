// src/components/layout/SiteHeader/SiteHeader.jsx
// Site shell: brand row + consciousness mode control (locale-aware copy from siteShell.content).

import { useState } from 'react';
import logo from '../../../assets/images/kfar-hirur-logo.png';
import { siteShellContent as siteShellHe } from '../../../content/site/he/siteShell.content.js';
import { siteShellContent as siteShellEn } from '../../../content/site/en/siteShell.content.js';
import { getText } from '../../../utils/content/getText.js';

const shellByLocale = {
  he: siteShellHe,
  en: siteShellEn,
};

function resolveShell(locale) {
  return shellByLocale[locale] ?? shellByLocale.he;
}

export function SiteHeader({ locale, mode, setMode }) {
  const [isConsciousnessOpen, setIsConsciousnessOpen] = useState(false);
  const shell = resolveShell(locale);
  const brand = shell.brand ?? {};
  const consciousness = shell.consciousness ?? {};

  return (
    <header className="keepItGoing-siteHeader">
      <div className="keepItGoing-consciousness">
        <button
          type="button"
          className="keepItGoing-consciousnessTrigger"
          onClick={() => setIsConsciousnessOpen((open) => !open)}
          aria-expanded={isConsciousnessOpen}
          aria-haspopup="true"
        >
          <span className="keepItGoing-consciousnessBadge">
            {getText(consciousness, mode === 'shay' ? 'shortShay' : 'shortNaor')}
          </span>
        </button>
        {isConsciousnessOpen ? (
          <div className="keepItGoing-consciousnessPanel">
            <p className="keepItGoing-consciousnessTitle">{getText(consciousness, 'label')}</p>
            <div
              className="keepItGoing-consciousnessOptions keepItGoing-consciousnessSegmented"
              role="group"
            >
              <button
                type="button"
                className={
                  mode === 'shay'
                    ? 'keepItGoing-consciousnessOption keepItGoing-consciousnessOptionActive'
                    : 'keepItGoing-consciousnessOption'
                }
                onClick={() => {
                  setMode('shay');
                  setIsConsciousnessOpen(false);
                }}
              >
                {getText(consciousness, 'optionShay')}
              </button>
              <button
                type="button"
                className={
                  mode === 'naor'
                    ? 'keepItGoing-consciousnessOption keepItGoing-consciousnessOptionActive'
                    : 'keepItGoing-consciousnessOption'
                }
                onClick={() => {
                  setMode('naor');
                  setIsConsciousnessOpen(false);
                }}
              >
                {getText(consciousness, 'optionNaor')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="keepItGoing-brand">
        <img src={logo} alt={getText(brand, 'logoAlt')} className="keepItGoing-brandLogo" />
        <div className="keepItGoing-brandText">
          <p className="keepItGoing-brandTitle">{getText(brand, 'title')}</p>
          <p className="keepItGoing-brandSubtitle">{getText(brand, 'subtitle')}</p>
        </div>
      </div>
    </header>
  );
}
