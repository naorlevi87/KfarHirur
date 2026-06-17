// src/commons/pages/OverviewPage/useAttribution.js
// Shared state for the "זה כן קרה" attribution sheet (resolve a missed item: who did it + when), used by
// the snapshot and the day-view. Rows call openResolve; the sheet calls confirm({memberId, doneAt}).

import { useCallback, useState } from 'react';

export function useAttribution(tree) {
  const [sheet, setSheet] = useState(null); // { nodeId } | null

  const openResolve = useCallback((id) => setSheet({ nodeId: id }), []);
  const close = useCallback(() => setSheet(null), []);

  const confirm = useCallback(async ({ memberId, doneAt }) => {
    if (!sheet) return;
    await tree.resolveMissed(sheet.nodeId, memberId, doneAt);
    setSheet(null);
  }, [sheet, tree]);

  return { sheet, openResolve, close, confirm };
}
