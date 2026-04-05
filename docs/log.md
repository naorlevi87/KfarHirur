# Development Log

---

## 2026-04-05

**Built / changed:**
- Admin pages wrapped in MainLayout (SiteHeader + HamburgerMenu visible in admin)
- HamburgerMenu: open/close animation, opens below header, z-index above preview card, `inert` replacing `aria-hidden`
- Timeline pan clamped (canvas always covers 70% viewport), manual pointer handlers replacing Framer Motion drag
- Timeline node tap: only zooms when needed to reveal next tier, not on every tap
- Timeline state resets on menu navigation, animations preserved for expand/close (`state.menuNav` key pattern)
- `useTimelineItems` module-level cache — remounts within same session skip Supabase fetch
- `clampPan` consolidated to `timelineUtils.js` (was duplicated in 3 places)
- Hint string moved to content layer (`timelineUi.hint`)
- Dead files removed: `TimelineItemView.jsx`, `AdminPage.jsx`, `AdminPage.css`
- `timelineItems` export removed from content file (superseded by Supabase)
- Docs restructured: renamed to `architecture.md` / `workflow.md` / `voice.md`, TIMELINE.md moved to `docs/features/timeline.md`, obsolete plans and specs deleted
- End-of-day cleanup command rewritten: cleaner structure, added accessibility check, build check, daily log
- `architecture.md` updated: `/privacy`, `/profile`, `AuthModal`, `ProfilePage`, embed block types, `ProtectedRoute` patterns — all were missing
- 4 lint errors fixed (`setState` in effects — eslint-disable with comment)

**Open / deferred:**
- `docs/features/ken-ze-oved.md` has open questions: "תבואו אלינו" destination, video content, financial transparency data
- Shay (`sknic83@gmail.com`) still needs to create account and be granted admin role via `user_roles`
