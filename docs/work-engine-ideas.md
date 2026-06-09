# Work Engine — Future Ideas Backlog

> Parking lot for ideas that came up after the design spec
> (`docs/superpowers/specs/2026-06-09-community-work-engine-design.md`).
> Nothing here is committed to a release. These are raw concepts to revisit
> once Phase 1 ships. Add freely; promote to a real spec when one matures.

---

## Acknowledgment / "did you internalize this?" reminders (spaced repetition)

**The idea:** when a new procedure or change is introduced (a new נוהל, a changed
process, a new rule), the engine should make sure every relevant person actually
*absorbed* it — not just got notified once.

**Mechanic:** a decaying reminder schedule per person, until they confirm "I've got it":
- **Week 1** — prompt every day ("do you remember the new X? mark that you've got it").
- **Then** — every two days.
- **Then** — once a week.
- **Long tail** — a refresher once a month.

The cadence steps down as confidence builds, but never fully disappears, so a
procedure stays alive in memory instead of being announced once and forgotten.

**Targeting:** only people the change is *relevant* to — leans on the existing
`roles` system (relevance) from the spec. A new bar procedure pings the
Bartender role, not the whole workspace.

**No lazy checkmark — proof-of-attention gate:** confirming can't be a meaningless
tap. To clear the reminder the person has to *type a keyword* tied to the
procedure — e.g. a carton-folding procedure makes you type **"קרטון"** to dismiss
it. Forces a moment of actual recall instead of reflexively swiping it away.
- The keyword is set on the procedure when it's created (one required word, maybe a short phrase).
- Wrong word → it doesn't clear, stays in the schedule.
- Keep it light and a little playful (per `docs/voice.md`), not a quiz/exam feel.

**Open questions to resolve before this becomes a spec:**
- Is the typed keyword the *only* confirm path, or just for the important procedures (a per-procedure toggle)?
- Is this its own object (a "procedure / נוהל acknowledgment"), or a property layered onto recurring tasks / `task_templates`?
- Does it ride the existing `notifications` + `pg_cron` heartbeat from §9, or need its own scheduling table?
- Should managers see a "who's confirmed vs. who hasn't" readout?
- How does the decay reset — does editing the procedure restart everyone's clock?

---

## Bottom-up proposals (any worker can suggest a task or checklist line)

**The idea:** the engine isn't only top-down. Any member — not just managers/admins —
can **propose** something:
- a **new task** that doesn't exist yet, or
- a **new checklist line** on an existing task that's missing a step.

The proposal doesn't go live immediately; it enters a **pending approval** state.

**Two approval paths (either one promotes it to real):**
1. An **admin/manager** approves it, **or**
2. At least **3 relevant team members** endorse it (relevance via the existing `roles` system).

The "3 relevant people agree" path is the interesting part — it lets the crew
self-validate good ideas without waiting on a manager, while still keeping a bar
against random noise.

**Open questions to resolve before this becomes a spec:**
- "Relevant" = members sharing the task's eligible role(s)? And does the proposer count toward the 3?
- Is 3 a fixed number or a per-workspace setting (small crews might need 2)?
- Does this reuse the existing `pending_approval` status, or is a proposal a distinct object before it becomes a task at all?
- Where do proposals surface — a queue on the Overview tab? A pending chip on the task?
- Can a proposal be declined/withdrawn, and is that logged in `activity`?
