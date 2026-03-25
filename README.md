# Gantt Chart App

Interactive Gantt planner built with React + TypeScript

## Quick Start

```bash
pnpm install
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

## Local Setup

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+

Install pnpm globally if needed:

```bash
npm install -g pnpm
```

### 1) Install dependencies

From the project root:

```bash
pnpm install
```

### 2) Run the app in development

```bash
pnpm dev
```

Vite will print a local URL in the terminal (usually `http://localhost:5173`).

### 3) Build for production

```bash
pnpm build
```

### 4) Preview the production build

```bash
pnpm preview
```

### Useful scripts

- `pnpm lint` - run Oxlint + ESLint
- `pnpm lint:fix` - auto-fix lint issues where possible
- `pnpm format` - format files with Prettier
- `pnpm test` - run tests once
- `pnpm test:watch` - run tests in watch mode
- `pnpm test:coverage` - run tests with coverage output

## Documentation

- Full implementation breakdown: `docs/gantt-features-and-implementation-2026-03-25.md`

## Tech Stack

- React 19 + TypeScript 6
- Vite 8
- Jotai (`atomWithStorage`) for state + persistence
- React Router 7
- date-fns 4
- Tailwind CSS 4 (base utility layer)
- Lucide React icons
- pnpm

## Application Capabilities

### Scheduling and Timeline

- Task/subtask bars rendered on a timeline with grouped headers
- View mode selector in main header: `Week`, `Month`, `Year`
- Zoom controls in toolbar
- Marker/milestone rendering by date
- Date-to-pixel and pixel-to-date conversion for drag and display

### Drag and Reorder

- Drag bars horizontally to move date ranges
- Drag bar edges to resize task/subtask durations
- Reorder tasks vertically
- Reorder subtasks within a task
- Move subtasks across parent tasks
- Drag starts from both chart bars and side panel rows
- Strong drag/drop visual feedback with indicator lines
- Text selection disabled while dragging to prevent accidental highlights

### Side Panel Editing

- Add/remove tasks
- Add/remove subtasks
- Single-click task row to collapse/expand subtasks
- Quick double-click task/subtask row to edit names inline
- Enter or blur to save inline edits
- Escape to cancel inline edits
- Resizable side panel with drag handle and min/max constraints

### Task Color Customization

- Per-task color trigger button
- In-popover preset colors + free custom picker
- Active/open picker state uses icon-based affordance
- Task color updates propagate to subtasks
- Cross-task subtask moves re-sync subtask color with destination task

### Productivity and Data Safety

- Undo/redo (buttons + keyboard shortcuts)
- Import/export JSON project files
- Local persistence across reloads via browser storage

## Keyboard Shortcuts

- Undo: `Ctrl+Z` / `Cmd+Z`
- Redo: `Ctrl+Shift+Z` / `Cmd+Shift+Z`

## Data Model

Defined in `src/core/types.ts`:

- `Task`: `id`, `name`, `startDate`, `endDate`, `color`, `progress`, `subtasks`
- `Subtask`: `id`, `name`, `startDate`, `endDate`, `color`
- `Marker`: `id`, `date`, `label`, `color`
- `TimelineConfig`: `startDate`, `endDate`, `zoomLevel`, optional `viewMode`
- `GanttExport`: `{ version, tasks, markers, timelineConfig }`

Date format is ISO (`YYYY-MM-DD`) for serialization consistency.

## State Management

Primary atoms in `src/core/store.ts`:

- `tasksAtom` → persisted key `gantt-v1-tasks`
- `markersAtom` → persisted key `gantt-v1-markers`
- `timelineConfigAtom` → persisted key `gantt-v1-timeline`
- `undoStackAtom` / `redoStackAtom` → in-memory history

Mutations are centralized in `src/core/actions.ts` via Jotai write atoms.

## Core Modules

- `src/core/useTimeline.ts`
  - Time scale and header generation
  - `dateToX`, `xToDate`, `barStyle`
  - Zoom and view mode setters
- `src/core/useGanttDrag.ts`
  - Pointer-based move/resize/reorder behavior
  - Drop target computation for tasks/subtasks
- `src/core/actions.ts`
  - CRUD for tasks/subtasks/markers
  - Undo/redo snapshots
  - Import/export atom actions
- `src/core/GanttToolbar.tsx`
  - Zoom controls, undo/redo, import/export actions
- `src/core/importExport.ts`
  - JSON schema validation and file helpers

## Project Structure

```txt
src/
├── core/
│   ├── actions.ts
│   ├── GanttToolbar.tsx
│   ├── importExport.ts
│   ├── sampleData.ts
│   ├── store.ts
│   ├── types.ts
│   ├── undoHelper.ts
│   ├── useGanttDrag.ts
│   ├── useKeyboardShortcuts.ts
│   └── useTimeline.ts
├── designs/
│   └── gantt-2/GanttEarth.tsx
├── App.tsx
├── main.tsx
└── index.css
```

## Import/Export Schema

Exported payload:

```json
{
  "version": 1,
  "tasks": [],
  "markers": [],
  "timelineConfig": {}
}
```

Validation is enforced before import.

## Notes

- This README is the high-level reference.
- For per-feature implementation details and behavior notes, use:
  - `docs/gantt-features-and-implementation-2026-03-25.md`
