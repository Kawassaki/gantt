# Gantt Chart App

An interactive Gantt chart application built with React, featuring five visually distinct design themes. Drag bars to reschedule tasks, resize edges to adjust duration, reorder rows vertically, and manage subtasks — all with full undo/redo and persistent state.

## Quick Start

```bash
pnpm install
pnpm dev        # → http://localhost:4000
```

Production build:

```bash
pnpm build
pnpm preview
```

## Tech Stack

| Layer          | Choice                                    |
| -------------- | ----------------------------------------- |
| Framework      | React 19 + TypeScript 6                   |
| Build          | Vite 8                                    |
| Styling        | Tailwind CSS 4 (utility layer) + inline styles (design-specific) |
| State          | Jotai (`atomWithStorage` for persistence)  |
| Routing        | React Router 7                            |
| Dates          | date-fns 4                                |
| Animation      | Motion 12 (available), CSS keyframes      |
| Package Mgr    | pnpm                                      |

## Architecture

```
src/
├── core/                     # Shared logic layer
│   ├── types.ts              # Task, Subtask, Marker, TimelineConfig, DragMode types
│   ├── store.ts              # Jotai atoms with localStorage persistence
│   ├── actions.ts            # Write atoms: CRUD, undo/redo, import/export, reorder
│   ├── useGanttDrag.ts       # Pointer-event drag hook (horizontal move/resize + vertical reorder)
│   ├── useTimeline.ts        # Timeline scale, date↔pixel math, zoom, column headers
│   ├── useKeyboardShortcuts.ts # Ctrl+Z / Ctrl+Shift+Z bindings
│   ├── undoHelper.ts         # Undo snapshot helper hook
│   ├── importExport.ts       # JSON validation, file download/upload
│   ├── GanttToolbar.tsx      # Shared toolbar: zoom, undo/redo, import/export, home nav
│   └── sampleData.ts         # Default project: 9 tasks, subtasks, 3 milestones
│
├── designs/                  # Five unique Gantt chart themes
│   ├── gantt-1/GanttNoir.tsx     # "Noir Blueprint"
│   ├── gantt-2/GanttEarth.tsx    # "Warm Earth"
│   ├── gantt-3/GanttNeon.tsx     # "Neon Terminal"
│   ├── gantt-4/GanttSwiss.tsx    # "Swiss Editorial"
│   └── gantt-6/GanttGlass.tsx    # "Candy Glass"
│
├── Home.tsx                  # Landing page with design gallery
├── App.tsx                   # Router (lazy-loaded routes)
├── main.tsx                  # Entry point
└── index.css                 # Tailwind import + global resets
```

### Data Flow

All five designs share the same core layer. The Jotai atom store is the single source of truth — every design reads from and writes to the same atoms. Switching between designs preserves your data.

```
┌─────────────────────────────────────────────────┐
│                  Jotai Store                     │
│  tasksAtom ──── markersAtom ──── timelineConfig  │
│       │              │                │          │
│       └──── atomWithStorage (localStorage) ──────│
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   useGanttDrag  useTimeline  actions.ts
        │            │            │
        └────────────┼────────────┘
                     │
    ┌────────────────┼────────────────┐
    │       │        │        │       │
  Noir   Earth    Neon    Swiss   Glass
```

## Features

### Interactions

- **Drag to move** — Grab a bar's center and drag horizontally to shift its date range
- **Drag to resize** — Grab the left or right edge of a bar (cursor changes to `ew-resize`) and drag to extend or shorten
- **Vertical reorder** — Drag a bar up or down past a row boundary to reorder tasks or move subtasks between tasks
- **Add task** — Click the `+ Add Task` button at the bottom of the side panel
- **Add subtask** — Click the `+` button next to any task name
- **Add marker** — Milestone markers render as vertical lines on the timeline
- **Zoom** — Use the toolbar zoom controls (15px–120px per day)
- **Keyboard shortcuts** — `Ctrl+Z` to undo, `Ctrl+Shift+Z` to redo (also `Cmd` on macOS)
- **Horizontal scroll** — Timeline scrolls independently; task name panel stays pinned

### Persistence

State is automatically saved to `localStorage` via Jotai's `atomWithStorage`. Closing and reopening the browser preserves all tasks, subtasks, markers, and timeline configuration. Storage keys are prefixed with `gantt-v1-` for future schema migration.

### Import / Export

- **Export**: Downloads the full project as `gantt-export-YYYY-MM-DD.json`
- **Import**: Upload a `.json` file; it's validated against the expected schema before loading
- Schema: `{ version: 1, tasks: [...], markers: [...], timelineConfig: {...} }`

### Undo / Redo

Every mutation (move, resize, add, delete, reorder) pushes a snapshot to the undo stack (capped at 30 entries). Undo and redo are available via toolbar buttons or keyboard shortcuts.

## The Five Designs

### 1. Noir Blueprint — `/gantt-1`

Dark technical blueprint aesthetic. Deep midnight navy background with cyan grid lines, crosshatch SVG fill pattern on bars, glowing hover effects, and a coordinate readout badge that follows the cursor.

- **Fonts**: JetBrains Mono + Archivo
- **Palette**: `#0a0f1e`, `#00e5ff`, `#2a3a5c`

### 2. Warm Earth — `/gantt-2`

Organic stationery-inspired planner. Cream background with paper grain overlay, terracotta and sage pill-shaped bars, hand-drawn wavy SVG connector lines between parents and subtasks, and a flag pennant icon on markers.

- **Fonts**: Fraunces (italic) + DM Sans
- **Palette**: `#faf5eb`, `#c4613a`, `#7d9a6f`, `#2d2a26`

### 3. Neon Terminal — `/gantt-3`

Retro-futuristic CRT terminal. Pure black background with oscilloscope gridlines, neon-colored bars (green, pink, purple, cyan cycling), CRT scanline overlay, screen curvature vignette, blinking cursor on subtask bars, and flickering marker lines.

- **Fonts**: Orbitron + IBM Plex Mono
- **Palette**: `#000`, `#39ff14`, `#ff2d6b`, `#b026ff`, `#00fff5`

### 4. Swiss Editorial — `/gantt-4`

Ultra-precise International Typographic Style. Off-white background with a defining black header band, hairline borders on flat sharp-cornered bars, signal-red progress lines and marker rules (with rotated labels), magazine-style row numbers (`01.`, `02.`), and a red expanding underline on hover.

- **Fonts**: Newsreader + Hanken Grotesk
- **Palette**: `#f8f6f2`, `#111`, `#e63226`, `#888`

### 5. Candy Glass — `/gantt-6`

Modern glassmorphism with animated gradient mesh. Five color blobs drift continuously behind frosted glass panels, bars have `backdrop-filter: blur` with gradient fills, a subtle breathe animation, spring-like hover transitions, and diamond-shaped marker icons.

- **Fonts**: Sora + Plus Jakarta Sans
- **Palette**: Gradient mesh (`#7c3aed`, `#ec4899`, `#06b6d4`, `#f97316`)

## Core Modules Reference

### `types.ts`

| Type             | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `Task`           | id, name, startDate, endDate, color, subtasks[], progress |
| `Subtask`        | id, name, startDate, endDate, color               |
| `Marker`         | id, date, label, color                            |
| `TimelineConfig` | startDate, endDate, zoomLevel (px/day)            |
| `GanttExport`    | version, tasks, markers, timelineConfig            |
| `DragMode`       | `'move'` \| `'resize-start'` \| `'resize-end'`   |

Dates are stored as ISO strings (`YYYY-MM-DD`) for JSON serialization.

### `store.ts`

Three persisted atoms and two ephemeral atoms:

```
tasksAtom          → localStorage 'gantt-v1-tasks'
markersAtom        → localStorage 'gantt-v1-markers'
timelineConfigAtom → localStorage 'gantt-v1-timeline'
undoStackAtom      → in-memory only
redoStackAtom      → in-memory only
```

### `actions.ts`

Write-only derived atoms for mutations:

- `addNewTaskAtom` — Creates a task with sensible defaults (today → +5 days, color from cycle)
- `addNewSubtaskAtom(taskId)` — Creates a subtask within the parent's date range
- `addTaskAtom`, `updateTaskAtom`, `deleteTaskAtom` — Generic CRUD
- `addSubtaskAtom`, `updateSubtaskAtom`, `deleteSubtaskAtom` — Subtask CRUD
- `addMarkerAtom`, `removeMarkerAtom` — Marker CRUD
- `undoAtom`, `redoAtom` — Pop/push from snapshot stacks
- `exportDataAtom` — Read-only atom returning serializable `GanttExport`
- `importDataAtom` — Validates and loads JSON into all atoms

### `useGanttDrag(pxPerDay, rowConfig?, chartBodyRef?)`

Pointer-event based drag hook supporting three modes:

1. **Move** (center of bar) — Shifts dates horizontally; if dragged vertically past a threshold, computes a drop target for reordering
2. **Resize start** (left edge) — Adjusts start date, minimum 1-day duration
3. **Resize end** (right edge) — Adjusts end date, minimum 1-day duration

Returns: `isDragging`, `dragTaskId`, `dragSubtaskId`, `dragMode`, `dropIndicatorY`, `startDrag`, `onPointerMove`, `endDrag`, `getCursor`

Vertical reorder logic:
- Dragging a **task** reorders it among other tasks (all subtasks move with it)
- Dragging a **subtask** can reorder within its parent or move it to a different task

### `useTimeline()`

Manages the horizontal time axis:

- `dateToX(date)` / `xToDate(x)` — Coordinate conversion
- `barStyle(start, end)` → `{ left, width }` for positioning bars
- `dayColumns`, `weekHeaders`, `monthHeaders` — Column header data
- `setZoom(level)` — Clamped between 15–120 px/day

### `useKeyboardShortcuts()`

Binds `Ctrl+Z` → undo, `Ctrl+Shift+Z` → redo (also `Cmd` on macOS).

### `GanttToolbar`

Shared toolbar component with:
- Home navigation button
- Zoom in/out with level display
- Undo/redo with disabled state and keyboard hints
- Export/Import with SVG icons

Accepts `className`, `buttonClass`, `titleClass`, `accentColor` for per-design theming.

### `importExport.ts`

- `validateExport(data)` — Type-guards every field (string IDs, ISO date format, number progress, etc.)
- `downloadJson(data)` — Triggers browser download via blob URL
- `readJsonFile(file)` — Returns parsed JSON from a `File` via `FileReader`
