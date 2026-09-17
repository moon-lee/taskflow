---
version: 0.1.0
created: 2026-09-17
last_updated: 2026-09-17T23:55:03+10:00
status: approved
---

# Taskflow Extension — BP Diary View Design

Source: `D:/MyProjects/bp_diary` (Flutter blood-pressure tracker, v0.7.0): `README.md`, `ARCHITECTURE.md`, `CHANGELOG.md` (v0.6.0–v0.7.0 notes).
Reference pattern: `extensions/salary-history` (orchestrator + dao + services + ui views, single-tab `mount-update` retarget).
SDK target: standalone extension built with `node D:/finance_flow_ai/scripts/sdk/cli.mjs` (`init` → `dev` → `build` → Install Folder).

## Decisions (approved 2026-09-17)

1. **Persistence:** local extension tables via `finance.db` — the Dart/Shelf + PostgreSQL backend is dropped, not ported. The app is remote-only today; the extension is offline-first.
2. **Scope:** Core + timer — reading entry, history, 14-day chart, status classification, rest timer. No PDF export (the app's export uses Dart-only packages with no TypeScript equivalent), no start-date setting.
3. **Home:** standalone SDK project at `D:/finance_flow_ext/taskflow`, sibling of `todo-list` / `budget` / `mortgage`. Deliberately NOT merged into `todo-list` (see Alternatives).
4. **Structure:** approach A — single tab + Lit orchestrator + DAO/services from day one (the chart + timer + history already exceed the scaffold's ~150-line split rule).
5. **Todo List second view (Extended scope):** `taskflow_todos` table (`title`, `is_done`, `due_date`, `priority` low/medium/high) + `todo-list-view` child with inline add; retargeted in place via the same orchestrator, new `Todo List` nav group.
6. **Old-parity + dashboard compat:** inline rename, All/Active/Done filters, clear-completed, and a `todo-list` service alias (`counts`/`count`/`list` over `taskflow_todos`, old camelCase shapes) so the dashboard keeps working; dashboard takes two one-line changes (refresh table set, card source); old palette commands not ported (no callers).

## 1. Manifest identity (single tab)

Extension id: `taskflow` (display name `Taskflow`); tables use the `taskflow_` prefix. The BP Diary is the extension's first view (`views[]` entry `bp-diary`, name `BP Diary`) with its nav items — future taskflow views can be added as orchestrator children. Lazy activation only — no `onStartup`, because no consumer invokes a `bp` service at boot (contrast salary/budget, which need `onStartup` for Dashboard consumers).

```json
{
  "id": "taskflow",
  "displayName": "Taskflow",
  "version": "0.1.0",
  "description": "Taskflow trackers: blood pressure diary and todo list",
  "themeColor": "#E53935",
  "activationEvents": ["onView:bp-diary"],
  "contributions": {
    "views": [{ "id": "bp-diary", "name": "BP Diary", "icon": "assets/icon.svg" }],
    "commands": [
      { "id": "taskflow.show-overview", "title": "BP Diary: Overview" },
      { "id": "taskflow.show-history", "title": "BP Diary: History" },
      { "id": "taskflow.show-todos", "title": "Todo List" }
    ],
    "navigation": [
      { "id": "bp-diary-overview", "label": "Overview", "command": "taskflow.show-overview", "group": "BP Diary" },
      { "id": "bp-diary-history", "label": "History", "command": "taskflow.show-history", "group": "BP Diary" },
      { "id": "taskflow-todos", "label": "Todo List", "command": "taskflow.show-todos", "group": "Todo List" }
    ],
    "allowedCommands": ["taskflow.show-overview", "taskflow.show-history", "taskflow.show-todos"],
    "allowedUiEvents": ["entry-add-request", "entry-create", "entry-edit-request", "entry-edit", "entry-form-cancel", "entry-delete", "todo-create", "todo-toggle", "todo-delete", "todo-rename", "todo-clear-completed"]
  },
  "tables": [<§2 taskflow_bp_readings JSON>, <§2 taskflow_todos JSON>],
  "main": "src/main.ts"
}
```

Entry form and timer are orchestrator-internal (no nav entries): entry opens as a child view, the timer lives inline in Overview — same placement as the phone app's hero rings.

## 2. Data model (copy-paste manifest JSON)

Mirrors the app's `BPReading(id, sys, dia, takenAt)` with no added fields. `id`/`created_at`/`updated_at` are auto-added by `table-ddl.ts:18`, don't declare them. Manifest bounds stay loose (`min: 0`, `max: 400`); clinical ranges are service-enforced (§3).

```json
{
  "name": "taskflow_bp_readings",
  "columns": [
    { "name": "id", "type": "integer", "primary": true, "autoIncrement": true },
    { "name": "sys", "type": "integer", "nullable": false, "min": 0, "max": 400 },
    { "name": "dia", "type": "integer", "nullable": false, "min": 0, "max": 400 },
    { "name": "taken_at", "type": "datetime", "nullable": false, "index": true },
    { "name": "created_at", "type": "datetime", "nullable": false, "default": "now" },
    { "name": "updated_at", "type": "datetime", "nullable": false, "default": "now" }
  ]
}
```

No `configuration` (no settings in scope), no seed rows — readings are pure user data, the table starts empty.

### `taskflow_todos` — todo items (Extended scope)

```json
{
  "name": "taskflow_todos",
  "columns": [
    { "name": "id", "type": "integer", "primary": true, "autoIncrement": true },
    { "name": "title", "type": "text", "nullable": false },
    { "name": "is_done", "type": "boolean", "nullable": false, "default": false },
    { "name": "due_date", "type": "date", "nullable": true },
    { "name": "priority", "type": "text", "nullable": false, "default": "medium", "enumOptions": ["low", "medium", "high"] },
    { "name": "created_at", "type": "datetime", "nullable": false, "default": "now" },
    { "name": "updated_at", "type": "datetime", "nullable": false, "default": "now" }
  ]
}
```

## 3. Layers & files

```
src/
  main.ts                    # activate → registers 3 commands, panel branch builds orchestrator
  dao/readings.ts            # typed wrapper: listReadings (taken_at DESC) / createReading / updateReading / deleteReading
  dao/todos.ts               # typed wrapper: listTodos (undone-first, due-date ASC nulls-last) / createTodo / toggleTodo / deleteTodo
  services/bp-service.ts     # validateReading, classifyStatus, last14Days, averages
  services/todo-service.ts   # validateTodo (title, due_date, priority), toggleTodo (read-then-flip)
  ui/bp-diary-orchestrator.ts# Lit host: view state + pushFinance + mount-update + returnTo + delete-confirm
  ui/bp-overview-view.ts     # latest ring + timer ring + 14-day SVG chart + recent 5
  ui/bp-history-view.ts      # full list with Edit/Delete per row
  ui/bp-entry-form.ts        # SYS/DIA steppers + date/time + live status badge
  ui/todo-list-view.ts       # inline add (title + due date + priority) + toggle + delete
  ui/index.ts                # customElements.define for all 5 tags
```

- **DAO** does transport only; validation lives in the service.
- **Service** (ported brain, pure where possible):
  - `validateReading(sys, dia, takenAt)` → field errors: SYS 40–300, DIA 20–200, integers; `takenAt` valid `YYYY-MM-DD HH:mm`, never in the future.
  - `classifyStatus(sys, dia)` → full clinical table ported from the app (`bp_status.dart`, v0.6.0 expanded table): Low (SYS<90 or DIA<60), Normal (SYS<120 and DIA<80), Elevated (SYS 120–129 and DIA<80), Stage 1 (SYS 130–139 or DIA 80–89), Stage 2 (SYS≥140 or DIA≥90). Colors follow the app: green Normal, orange Elevated, red High.
  - `last14Days(readings)` → dense 14-point series of per-day avg SYS/DIA, zero-filled on empty days (same contract the app's chart consumes).
  - `averages(readings)` → `{ avgSys, avgDia, daysRecorded }` for the stats bar.
- **Overview** renders: latest-reading ring (custom SVG conic progress, porting `BPRingWidget` — Lit has no ring widget either), timer ring beside it, 14-day SVG line chart (SYS solid / DIA dashed, per the app's v0.6.0 chart), recent-5 list. Styling via `sharedStyles` + `var(--ff-*)`; status colors as local CSS constants.
- **Todo List view** renders: inline add row (title input + `date` input + priority select defaulting to medium + Add button), All/Active/Done filter tabs with counts (view-local state, no events), todo rows sorted undone-first then `due_date` ASC (nulls last) with checkbox toggle (optimistic with rollback), inline rename (Edit → autofocused input, Enter saves, Escape cancels), due-date chip (red when overdue), priority chip, Delete per row (confirm), Clear-completed button (disabled when none done). Add is inline — no separate form child, no `returnTo` involved.
- **Timer state** lives in the overview child (preset, remaining, running flag, 1s tick, auto-complete "Ready"), never touching the DB — same rationale as the app keeping timer state in screen state so the hero rings update live with no cross-component events.
- **`main.ts`** follows the single-panel shape: commands call `finance.ui?.requestMount('bp-diary', { view: childTag })` (`taskflow.show-todos` mounts `{ view: 'todo-list-view' }`); panel branch creates `bp-diary-orchestrator` with `mount-update` retarget. It also registers the `todo-list` domain service alias (`counts`/`count`/`list` over `taskflow_todos`, shapes identical to the retired extension) so the dashboard's invoke call keeps working with zero dashboard-invoke changes. `registerUIComponents()` DOM-guarded; Host stays DOM-free. No domain service registration (no consumers — YAGNI; a future `bp` service for a dashboard card is explicitly deferred, not designed here).

## 4. Flows (backend HTTP replaced by DAO)

- **Startup load:** orchestrator `init` → `listReadings()` → overview renders latest ring + chart; empty table → empty-state copy ("No readings yet — add your first"), never a null dereference.
- **Create:** `entry-add-request` → entry form (blank, `taken_at` defaults to now) → live `validateReading` + status badge (v0.6.0 input-sheet behavior) → `entry-create` → `insert` → navigate `returnTo` + refresh.
- **Edit:** `entry-edit-request` (row id) → form prefilled → `entry-edit` → `update` → return + refresh.
- **Delete:** inline confirm (mirrors the app's dialog) → `entry-delete` → `delete` → refresh.
- **Timer:** start/pause/reset fully local; presets switch the countdown; completion shows the "Ready" ring state.
- **Todo add:** inline inputs → `validateTodo` (title non-empty ≤200 chars, `due_date` valid `YYYY-MM-DD` when set, `priority` in low/medium/high) → `todo-create` → `insert` → list refreshes in place.
- **Todo toggle/delete:** checkbox → `todo-toggle` → read-then-flip `is_done` → refresh; Delete asks confirm → `todo-delete` → refresh. Overdue = `due_date` < today and not done (derived on read, never stored).
- **Todo rename:** Edit → inline input prefilled → Enter → `validateTodo` title check → `todo-rename` `{id, title}` → `update` → refresh; Escape cancels.
- **Todo clear-completed:** button (disabled when zero done) → `todo-clear-completed` → delete all done rows → refresh.
- **Dashboard compat (app repo, two one-liners):** `extensions/dashboard/src/main.ts` `TODO_REFRESH_TABLES` gains `'taskflow_todos'`; `extensions/dashboard/src/orchestrator.ts` `_CARD_SOURCES['todo-summary']` becomes `{ viewId: 'bp-diary', commandId: 'taskflow.show-todos' }`. The `invoke('todo-list', 'counts')` call itself is untouched — taskflow answers under the same service name.

## 5. Error handling & testing

- `ValidationFailed` → inline field errors; the form never closes on invalid input.
- Any DAO throw → red in-view error banner (scaffold `{{ID}}-view.ts:10` pattern), never a crash; delete-confirm guards destructive writes.
- No cross-extension calls exist, so no graceful-`null` paths are needed.
- Tests (Vitest + happy-dom, TDD like pay/todo): service tests (classification boundaries Low→Stage 2, dense 14-day series with empty days, future-date rejection; todo validation + toggle-flip + rename-title check + clear-completed + `counts` shape), DAO tests against the mock `finance`, orchestrator tests (defaults to overview, nav retargets same panel via `mount-update`, entry round-trips to caller, todo sidebar item mounts `todo-list-view`, rename/clear events refresh).
- Manual gate: `npm run dev` (dropdown views) → `npm run build` → Install Folder → restart → entry/edit/delete round-trip + `SELECT * FROM taskflow_bp_readings` shows rows; todo add/toggle/delete + due/priority chips + `SELECT * FROM taskflow_todos` shows rows.

## 6. SDK build path (standalone extension)

```bash
node D:/finance_flow_ai/scripts/sdk/cli.mjs init taskflow D:/finance_flow_ext
cd D:/finance_flow_ext/taskflow && npm install && npm run dev
# implement: package.json (id taskflow, tables §2, views/commands/navigation §1)
# src/main.ts (activate + panel branch) → dao → services → ui (+ orchestrator)
npm run build  # → build/extension/taskflow.js + package.json
# app: Extensions → Install Folder → pick build/extension → restart
```

Bump `version +0.0.1` (top-level + `financeExtension.version` in sync) + `git commit` before each reinstall (installer rejects downgrades).

## Alternatives rejected

- **Merge into `todo-list` as a second view under a "Taskflow" umbrella:** rejected — tables would share the `todo_list_*` namespace (`extension-installer.ts:80` prefix check), version/install/enable lifecycles would fuse, one Host bundle means a BP crash takes down todos, and `todo-list` is documented as "a minimal test extension, not a pattern for complex domains" (SDK template §3). A "Taskflow" Activity Bar group is a core feature, not expressible in a manifest.
- **Keep the Shelf/Postgres backend:** rejected by scope decision — local tables give offline-first with zero infra; a sync path can be a future spec.
- **Scaffold monolith (one view file, split later):** rejected — chart + timer + history + form exceed the ~150-line split rule immediately; starting split avoids a rewrite.
- **Built-in extension in the app repo:** rejected by home decision — standalone keeps independent versioning and install.

## Self-review

- No placeholders; all ids, table/column names, commands, nav items, and event names are exact.
- Consistent: lazy-only activation matches the no-consumers constraint; no `configuration` matches the no-settings scope; 11 `allowedUiEvents` each map to an orchestrator action in §4; yearly math absent (no finance totals in this domain).
- Scope: single extension design (local tables + 5 UI files + 2 dao + 2 services), fits one SDK implementation plan.
- Unambiguous: current data = all rows (no dated-row/effective_to convention — readings are immutable facts, edits overwrite); 14-day window is trailing calendar days ending today; timer is memory-only.
