// src/pages/keepItGoing/KeepItGoingPage.jsx
// Fundraising MVP page: sections + copy from useKeepItGoingPageData (locale/mode resolved locally).

import { getText } from '../../utils/content/getText.js';
import { useKeepItGoingPageData } from './resolveKeepItGoingPageData.js';

export function KeepItGoingPage() {
  const { shared, story, meta } = useKeepItGoingPageData();

  return (
    <div className="keepItGoing-page">
      <div className="keepItGoing-inner">
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
    </div>
  );
}
