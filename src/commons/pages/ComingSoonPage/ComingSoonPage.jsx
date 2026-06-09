// src/commons/pages/ComingSoonPage/ComingSoonPage.jsx
// Placeholder for tabs not yet built in increment 1, so the bottom nav has no dead links.

import { useAppContext } from '../../../app/appState/useAppContext.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';

export function ComingSoonPage() {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  return (
    <section className="commons-empty">
      <h2>{shell.comingSoon.title}</h2>
      <p>{shell.comingSoon.body}</p>
    </section>
  );
}
