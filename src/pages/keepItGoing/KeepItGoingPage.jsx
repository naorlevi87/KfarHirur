// src/pages/keepItGoing/KeepItGoingPage.jsx
// Fundraising MVP page: shared copy + story variant by mode (shay | naor), locale (he | en).

import { SiteHeader } from '../../components/layout/SiteHeader/SiteHeader.jsx';
import { keepItGoingContent as keepItGoingHe } from '../../content/site/he/keepItGoing.content.js';
import { keepItGoingContent as keepItGoingEn } from '../../content/site/en/keepItGoing.content.js';
import { getText } from '../../utils/content/getText.js';

const byLocale = {
  he: keepItGoingHe,
  en: keepItGoingEn,
};

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

function resolveStory(root, mode) {
  const key = mode === 'shay' || mode === 'naor' ? mode : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function KeepItGoingPage({ locale, mode, setMode }) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const story = resolveStory(root, mode);
  const meta = shared.supportMeta ?? {};
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const lang = locale === 'he' ? 'he' : 'en';
  const fundraisingMode = mode === 'shay' ? 'shay' : 'naor';

  return (
    <main
      className="keepItGoing-page"
      dir={dir}
      lang={lang}
      data-fundraising-mode={fundraisingMode}
    >
      <div className="keepItGoing-inner">
        <SiteHeader locale={locale} mode={mode} setMode={setMode} />

        <section className="keepItGoing-hero" aria-labelledby="keepItGoing-pageTitle">
          <h1 id="keepItGoing-pageTitle" className="keepItGoing-pageTitle">
            {getText(shared, 'pageTitle')}
          </h1>
          <div className="keepItGoing-heroActions">
            <button type="button" className="keepItGoing-supportBanner">
              {getText(shared, 'topSupportButtonLabel')}
            </button>
            <p className="keepItGoing-supportNote">{getText(shared, 'supportNote')}</p>
          </div>
        </section>

        <section className="keepItGoing-section" aria-labelledby="keepItGoing-shortVideoHeading">
          <h2 id="keepItGoing-shortVideoHeading" className="keepItGoing-sectionTitle">
            {getText(shared, 'shortVideoTitle')}
          </h2>
          <div className="keepItGoing-videoCard">
            <p className="keepItGoing-videoPlaceholder">
              {getText(shared, 'shortVideoPlaceholder')}
            </p>
          </div>
        </section>

        <section
          className="keepItGoing-section keepItGoing-story"
          aria-labelledby="keepItGoing-storyHeading"
        >
          <h2 id="keepItGoing-storyHeading" className="keepItGoing-storyTitle">
            {getText(story, 'storyTitle')}
          </h2>
          <p className="keepItGoing-storyBody">{getText(story, 'storyBody')}</p>
        </section>

        <section className="keepItGoing-section" aria-labelledby="keepItGoing-longVideoHeading">
          <h2 id="keepItGoing-longVideoHeading" className="keepItGoing-sectionTitle">
            {getText(shared, 'longVideoTitle')}
          </h2>
          <div className="keepItGoing-videoCard">
            <p className="keepItGoing-videoPlaceholder">
              {getText(shared, 'longVideoPlaceholder')}
            </p>
          </div>
        </section>

        <section className="keepItGoing-section keepItGoing-bottomSupport">
          <button type="button" className="keepItGoing-supportBanner">
            {getText(shared, 'bottomSupportButtonLabel')}
          </button>
          <div className="keepItGoing-metaRow">
            <span className="keepItGoing-metaItem">
              <span className="keepItGoing-metaLabel">{getText(meta, 'targetLabel')}</span>
              <span className="keepItGoing-metaValue">{getText(meta, 'targetValue')}</span>
            </span>
            <span className="keepItGoing-metaSep" aria-hidden="true">
              ·
            </span>
            <span className="keepItGoing-metaItem">
              <span className="keepItGoing-metaLabel">{getText(meta, 'raisedLabel')}</span>
              <span className="keepItGoing-metaValue">{getText(meta, 'raisedValue')}</span>
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
