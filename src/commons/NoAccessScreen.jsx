// src/commons/NoAccessScreen.jsx
// Shown when a signed-in user is authenticated but not a member of the workspace.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';

export function NoAccessScreen() {
  const { locale } = useAppContext();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  return (
    <div className="commons-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-center">
        <h1>{shell.access.noAccessTitle}</h1>
        <p>{shell.access.noAccessBody}</p>
        <button type="button" className="commons-backlink" onClick={() => navigate('/')}>
          {shell.access.backToSite}
        </button>
      </div>
    </div>
  );
}
