// src/commons/pages/DashboardPage/DashboardPage.jsx
// "My Tasks" home. Increment 1: empty-state only — real tasks arrive in increment 2.

import { useAppContext } from '../../../app/appState/useAppContext.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';

export function DashboardPage() {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  return (
    <section className="commons-empty">
      <h2>{shell.dashboard.emptyTitle}</h2>
      <p>{shell.dashboard.emptyBody}</p>
    </section>
  );
}
