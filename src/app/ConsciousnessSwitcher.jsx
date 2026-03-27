// src/app/ConsciousnessSwitcher.jsx
// Mental-state toggle block — flex row at block level.
// .cs-block: [שי label]  [.cs-toggle-wrap]  [נאור label]  — row, labels flank the toggle-wrap.
// .cs-toggle-wrap: flex column containing toggle + sublabel — sublabel centers under the toggle only, not the full row.

import '../styles/app/ConsciousnessSwitcher.css';
import { resolveSiteShellContent } from '../content/site/resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';

export function ConsciousnessSwitcher() {
  const { locale, mode, setMode } = useAppContext();
  const content = resolveSiteShellContent(locale).consciousness ?? {};

  const isShay = mode === 'shay';
  const toggle = () => setMode(isShay ? 'naor' : 'shay');

  return (
    <div className={`cs-block cs-block--${mode}`}>
      <span className="cs-label cs-label--shay" aria-hidden="true">
        {getText(content, 'optionShay')}
      </span>
      {/* toggle-wrap: toggle + sublabel stacked — sublabel centers under the track, not the full label row */}
      <div className="cs-toggle-wrap">
        {/* role=switch: aria-checked=true means שי active */}
        <button
          type="button"
          className="cs-toggle"
          role="switch"
          aria-checked={isShay}
          aria-label={getText(content, 'label')}
          onClick={toggle}
        >
          <span className="cs-knob" />
        </button>
        <span className="cs-sublabel">{getText(content, 'label')}</span>
      </div>
      <span className="cs-label cs-label--naor" aria-hidden="true">
        {getText(content, 'optionNaor')}
      </span>
    </div>
  );
}
