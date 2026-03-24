# Gantt Features and Implementation Guide

This document lists the current feature set of the Gantt app and explains how each feature is implemented.

## Tech Stack and Main Architecture

- React + TypeScript UI.
- Jotai atoms for application state.
- Local persistence via `atomWithStorage` (browser storage).
- Date math via `date-fns`.
- Icons via `lucide-react`.
- Main screen implementation is in `src/designs/gantt-2/GanttEarth.tsx`.

Core modules:

- `src/core/store.ts`: app state atoms.
- `src/core/actions.ts`: CRUD + undo/redo + import/export actions.
- `src/core/useTimeline.ts`: time scale, coordinates, headers.
- `src/core/useGanttDrag.ts`: drag/resize/reorder behavior.
- `src/core/GanttToolbar.tsx`: top toolbar actions.

## Data Model

Defined in `src/core/types.ts`:

- `Task`
  - `id`, `name`, `startDate`, `endDate`, `color`, `progress`, `subtasks`.
- `Subtask`
  - `id`, `name`, `startDate`, `endDate`, `color`.
- `Marker`
  - `id`, `date`, `label`, `color`.
- `TimelineConfig`
  - `startDate`, `endDate`, `zoomLevel`, optional `viewMode`.
- `GanttExport`
  - export payload with `tasks`, `markers`, `timelineConfig`.

## State Management and Persistence

Defined in `src/core/store.ts`:

- `tasksAtom`, `markersAtom`, `timelineConfigAtom` persisted in local storage.
- `undoStackAtom`, `redoStackAtom` for history navigation.

Implementation notes:

- All mutating operations route through `actions.ts`.
- Most actions push a snapshot before mutation to support undo/redo.

## Feature Inventory

## 1) Timeline Rendering and View Modes

User-visible behavior:

- Timeline with two header bands (top and bottom).
- Vertical separators across chart body.
- Switch between `Week`, `Month`, and `Year` modes from the main header.
- Zoom in/out controls in toolbar.

Implementation:

- `useTimeline()` computes:
  - `dateToX`, `xToDate`
  - `totalWidth`, `pxPerDay`
  - `gridColumns`, `topHeaders`, `bottomHeaders`
- `viewMode` is stored in timeline config and updated through `setViewMode()`.
- Header bands in `GanttEarth.tsx` render `topHeaders` and `bottomHeaders`.
- Chart separators render from `gridColumns`.

## 2) Task and Subtask Bars

User-visible behavior:

- Parent task bars and nested subtask bars rendered on chart.
- Labels shown inside bars.
- Hover effects and subtle texture styling.

Implementation:

- Position and width computed via `barStyle(startDate, endDate)` from `useTimeline`.
- Parent and subtask bars rendered in chart section of `GanttEarth.tsx`.
- Visual styles are inline styles + local CSS string (`globalStyles`).

## 3) Drag to Move and Resize Bars

User-visible behavior:

- Drag a task/subtask bar to move dates.
- Drag near bar edges to resize start/end.

Implementation:

- `useGanttDrag.ts`:
  - Detects drag mode: `move`, `resize-start`, `resize-end`.
  - Converts horizontal pixel movement to day deltas.
  - Updates task/subtask dates in `tasksAtom`.
- Uses pointer events and `setPointerCapture`.

## 4) Drag Reordering (Tasks and Subtasks)

User-visible behavior:

- Reorder tasks vertically.
- Reorder subtasks within a task.
- Move subtasks between tasks.
- Drop indicator line during drag.

Implementation:

- `computeDropTarget()` calculates insertion target by Y position.
- `DropTarget.apply()` returns reordered task list.
- Cross-task subtask moves reinsert subtask into destination task.
- Subtask color is synchronized to destination task color during move.

## 5) Drag from Left Panel and Chart

User-visible behavior:

- Drag can start from:
  - chart bars
  - left panel rows

Implementation:

- `GanttEarth.tsx` forwards row pointer events to `startDrag(..., "move")`.
- Both left and right panels forward `onPointerMove` and `onPointerUp` to drag hook.

## 6) Drag Visual Feedback

User-visible behavior:

- Highlight currently dragged row/bar.
- Strong drop indicator line in side panel and chart.
- Cursor updates (`grab`, `grabbing`, resize cursors).

Implementation:

- Drag state exposed by `useGanttDrag` (`isDragging`, `dragTaskId`, `dragSubtaskId`, `dropIndicatorY`).
- Conditional styles in `GanttEarth.tsx` for active elements and indicators.

## 7) Prevent Text Selection During Drag

User-visible behavior:

- Text does not get selected while dragging.

Implementation:

- `useGanttDrag.ts` temporarily sets `document.body.style.userSelect = "none"` during drag.
- Restores previous value on drag end and unmount cleanup.

## 8) Sidebar Features

### Resizable Sidebar

User-visible behavior:

- Drag the vertical divider to resize side panel width.

Implementation:

- `leftPanelWidth` state in `GanttEarth.tsx`.
- Global pointer listeners during resize.
- Width constraints:
  - min: `200`
  - max: `420`

### Collapse/Expand Task Groups

User-visible behavior:

- Collapse/expand subtasks per task.
- Single-click task row toggles collapse.
- Subtle animation on subtask reveal.

Implementation:

- `collapsedTaskIds` set tracks collapsed tasks.
- `displayTasks` derives visible structure.
- Chevron button + row click toggle.
- `earth-subrow` animation in local CSS block.

## 9) Inline Editing

User-visible behavior:

- Edit task/subtask names inline.
- Quick double-click row to enter edit mode.
- Enter/blur to save, Escape to cancel.

Implementation:

- `editingName` state tracks current editor target and value.
- Save handlers call:
  - `updateTaskAtom`
  - `updateSubtaskAtom`
- Quick double-click detection is custom:
  - compares timestamps with threshold (`QUICK_DOUBLE_CLICK_MS`).

## 10) Task/Subtask CRUD

User-visible behavior:

- Add task.
- Add subtask.
- Remove task.
- Remove subtask.

Implementation:

- Action atoms in `actions.ts`:
  - `addNewTaskAtom`, `addNewSubtaskAtom`
  - `deleteTaskAtom`, `deleteSubtaskAtom`
- Buttons in side panel call those atoms.

## 11) Task Color Customization

User-visible behavior:

- Each task has a color trigger button.
- Opens a popover with:
  - 5 preset colors
  - custom free color picker
- Active/open state shows pipette icon in trigger.
- Subtasks inherit and stay synchronized with parent task color.

Implementation:

- `openColorTaskId` controls color popover visibility.
- Outside click closes popover.
- `handleTaskColorChange()` updates parent task and all subtasks.
- Dragging subtasks across tasks also enforces destination task color.

## 12) Markers

User-visible behavior:

- Vertical milestone markers with pennant and label.

Implementation:

- Data from `markersAtom`.
- Rendered in chart with `dateToX(marker.date)`.

## 13) Undo/Redo

User-visible behavior:

- Undo and redo controls in toolbar.
- Keyboard shortcuts also supported.

Implementation:

- Snapshot stacks in `store.ts`.
- `pushUndoAtom`, `undoAtom`, `redoAtom` in `actions.ts`.
- Toolbar buttons invoke undo/redo atoms.

## 14) Import/Export

User-visible behavior:

- Export current board to JSON.
- Import JSON file to restore board.

Implementation:

- `exportDataAtom` builds export payload.
- `importDataAtom` loads payload and resets history stacks.
- Validation in `importExport.ts` (`validateExport`).
- Toolbar handles file input and JSON download.

## 15) Keyboard Support

User-visible behavior:

- Keyboard shortcuts are available.

Implementation:

- Registered via `useKeyboardShortcuts()` in `GanttEarth.tsx`.

## 16) Styling and Design System (Current)

Highlights:

- Unified app font and consistent icon set (Lucide).
- Textures, hover effects, smooth transitions, and drag affordances.
- Responsive-ish behavior with horizontal/vertical scrolling and synchronized panel scroll.

Implementation:

- Global font and base style in `src/index.css`.
- Design-specific visual rules in `GanttEarth.tsx` via local style block.
- Icons from `lucide-react`.

## Known Implementation Notes

- `viewMode` currently changes timeline scale/headers and is stored in timeline config.
- The current view-mode behavior is intentionally using the existing day-based mapping model; it is not using a full bucketed structural remap.
- Side panel and chart are synchronized by shared row height calculations based on `displayTasks`.

## Suggested Future Documentation Additions

- End-to-end interaction diagrams for drag/reorder flows.
- State transition table for undo/redo.
- Visual tokens table (spacing, radii, colors, opacity levels).
- QA checklist for all interactions (drag, edit, collapse, resize, import/export).
