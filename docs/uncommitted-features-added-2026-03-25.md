# Uncommitted Features Added

This document describes the feature additions found in the current uncommitted change set.

## 1) Light and Dark Theme Support

### What was added
- A full `light`/`dark` theme toggle in the main command strip.
- Theme preference persistence between reloads.
- Runtime CSS variable updates so the loading shell and app body follow the active theme.

### Where it is implemented
- `src/designs/gantt-2/GanttEarth.tsx`
  - `themeMode` state and toggle control (`Moon` / `Sun` button).
  - Theme token map via `THEME_COLORS`.
  - Persistence and DOM sync through `localStorage` key `gantt-theme-mode` and document-level variables.
- `src/App.tsx` and `src/index.css`
  - Uses `--app-bg` and `--app-text` for top-level loading/background/text continuity.

## 2) New Day View Mode

### What was added
- Timeline now supports `day` mode in addition to `week`, `month`, and `year`.
- Header grouping behavior updates to support day-level bottom headers.

### Where it is implemented
- `src/core/types.ts`
  - `TimelineConfig.viewMode` now includes `"day"`.
- `src/core/useTimeline.ts`
  - `TimelineViewMode` now includes `"day"`.
  - Header/grid selection logic updated for day mode.
- `src/designs/gantt-2/GanttEarth.tsx`
  - View mode buttons now render `day`, `week`, `month`, `year`.

## 3) Custom Date Range Selection

### What was added
- A date-range picker in the command strip to change timeline window explicitly.
- Date range updates are normalized so start/end order is safe.
- Timeline config can flag that a custom window was chosen.

### Where it is implemented
- `src/components/ui/date-range-picker.tsx`
  - New reusable date-range picker component (Radix Popover + React Day Picker).
- `src/core/useTimeline.ts`
  - Added `setDateRange(startDate, endDate)` with parse/clamp behavior.
- `src/core/types.ts`
  - Added `TimelineConfig.customDateRange?: boolean`.
- `src/designs/gantt-2/GanttEarth.tsx`
  - Wires picker value and `handleRangeChange` to timeline config.

## 4) Marker Editing Workflow (Create, Drag, Rename, Recolor, Delete)

### What was added
- Double-click chart to create a new marker at clicked date.
- Drag markers horizontally to move milestone date.
- Double-click marker label to rename inline.
- Marker actions menu with preset colors, custom color picker, and delete action.

### Where it is implemented
- `src/designs/gantt-2/GanttEarth.tsx`
  - Marker drag state and pointer event lifecycle.
  - Inline marker edit state (`editingMarker`) with Enter/Escape/blur handling.
  - Marker action popover/menu controls and outside-click close logic.
- `src/core/actions.ts`
  - New `updateMarkerAtom` for marker mutation.

## 5) Timeline Navigation Improvement (Reset to Task Window)

### What was added
- A quick action to recenter/scroll the chart viewport around the full current task date range.

### Where it is implemented
- `src/designs/gantt-2/GanttEarth.tsx`
  - Computes min/max task dates (`taskDateBounds`) and scrolls to them with padding via `handleResetToTaskWindow`.

## 6) Weekend Visual Highlighting

### What was added
- Weekend day columns are detected and visually highlighted in the chart grid for easier schedule reading.

### Where it is implemented
- `src/designs/gantt-2/GanttEarth.tsx`
  - Computes `weekendColumns` from `dayColumns` and renders overlays in chart body.

## 7) Data and Config Compatibility Updates

### What was added
- Import validation now accepts the expanded timeline config fields.
- Defaults updated for richer seeded board content and timeline metadata.

### Where it is implemented
- `src/core/importExport.ts`
  - `validateExport()` now accepts `viewMode: "day" | "week" | "month" | "year"` and optional boolean `customDateRange`.
- `src/core/sampleData.ts`
  - Refreshed default tasks/markers and default timeline config now includes `customDateRange: false`.

## 8) New UI Dependency Support

### What was added
- Dependencies required for the date range feature and popover interaction.

### Where it is implemented
- `package.json`
  - `@radix-ui/react-popover`
  - `react-day-picker`

## Notes

- This file focuses on feature additions in the current uncommitted change set, not stylistic refactors (for example quote/formatting updates).
