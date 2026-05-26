// src/utils/useSave.js
// Shared hook for DB-backed form save state.
//
// Manages: dirty detection, loading indicator, error handling, saved feedback.
//
// Usage:
//   const save = useSave(form);
//   save.setBaseline(loadedForm);        // call once after data loads
//   await save.run(async () => { ... }); // wraps the actual DB call
//
// isDirty is computed by deep-comparing the current form against the last
// saved (or loaded) baseline. The "נשמר" feedback persists until the user
// makes a change — it's not on a timer.
//
// For new-item forms (no baseline yet), isDirty is always false — the page
// should use `isNew || save.isDirty` to decide whether the save button is
// enabled.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSave(form) {
  const baselineRef = useRef(undefined); // undefined = not yet set (pre-load)

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  // Deep comparison against the stored baseline.
  // undefined baseline = loading not complete → not dirty.
  // null baseline = new item (no DB record) → not dirty (page handles this case).
  const isDirty =
    baselineRef.current === undefined || baselineRef.current === null
      ? false
      : JSON.stringify(form) !== JSON.stringify(baselineRef.current);

  // Clear "נשמר" feedback as soon as the form diverges from the baseline.
  useEffect(() => {
    if (saved && isDirty) setSaved(false);
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  // Call once after data is loaded from DB. Pass the loaded form object.
  // Also call with null for new items so isDirty stays false.
  const setBaseline = useCallback((snapshot) => {
    baselineRef.current = snapshot;
  }, []);

  // Wrap any async DB call. Handles saving / error / saved state.
  // On success, snapshots the current form as the new baseline.
  // Returns true on success, false on error.
  const run = useCallback(async (asyncFn) => {
    setSaving(true);
    setError('');
    try {
      await asyncFn();
      baselineRef.current = form; // new baseline = what was just persisted
      setSaved(true);
      return true;
    } catch (err) {
      setError(err.message ?? 'שגיאה בשמירה');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form]);

  // Manually clear error (e.g. on user input after a failed save).
  const clearError = useCallback(() => setError(''), []);

  return { saving, saved, error, isDirty, run, setBaseline, clearError };
}
