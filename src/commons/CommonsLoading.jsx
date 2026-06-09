// src/commons/CommonsLoading.jsx
// Self-contained loading placeholder shown while a workspace's tree resolves. Resolves the copy and
// the workspace name itself ("בודק מה קורה ב<workspace>"), so screens render <CommonsLoading /> with
// no props. Must be used inside a WorkspaceProvider.

import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';

export function CommonsLoading() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);
  return (
    <div className="commons-loading" role="status" aria-live="polite">
      <span className="commons-loading__dots" aria-hidden="true"><span /><span /><span /></span>
      <p className="commons-loading__text">{shell.loadingInWorkspace}{workspace?.name ?? ''}</p>
    </div>
  );
}
