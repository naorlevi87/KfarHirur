// src/commons/pages/OverviewPage/useAttribution.js
// Shared state for the attribution sheet, used by the snapshot and the day-view. Rows call openResolve
// / openAssign; the sheet calls confirm({memberId, doneAt}). Wires to the tree's existing ops.

import { useCallback, useState } from 'react';

export function useAttribution(tree) {
  const [sheet, setSheet] = useState(null); // { mode: 'resolve' | 'assign', nodeId } | null

  const openResolve = useCallback((id) => setSheet({ mode: 'resolve', nodeId: id }), []);
  const openAssign = useCallback((id) => setSheet({ mode: 'assign', nodeId: id }), []);
  const close = useCallback(() => setSheet(null), []);

  const confirm = useCallback(async ({ memberId, doneAt }) => {
    if (!sheet) return;
    if (sheet.mode === 'resolve') await tree.resolveMissed(sheet.nodeId, memberId, doneAt);
    else await tree.assign(sheet.nodeId, memberId);
    setSheet(null);
  }, [sheet, tree]);

  return { sheet, openResolve, openAssign, close, confirm };
}
