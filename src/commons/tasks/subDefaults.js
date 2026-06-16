// src/commons/tasks/subDefaults.js
// Defaults a new sub-task inherits from its parent task at creation: assignment (owner), who-can
// (roles/skills), and the "עד שעה" target time where it applies. Inherited values are editable
// defaults, never locks. Owner inherits the parent's assignment *choice* — an assigned parent passes
// its person down; an open parent ("מי שיכול לוקח") passes an empty owner (open) down.
export function inheritedSubDefaults(parentNode) {
  if (!parentNode) return { ownerId: '', roleIds: [], dueTime: '' };
  return {
    ownerId: parentNode.owner_id ?? '',
    roleIds: parentNode.role_ids ?? [],
    dueTime: parentNode.due_time ? parentNode.due_time.slice(0, 5) : '',
  };
}
