# Iteration Features - 2026-03-26

## Overview

This document summarizes the features and UX updates implemented in this iteration for the Gantt timeline experience.

## Timeline Tabs

- Added multi-timeline tabs with isolated data per tab.
- Added create tab flow with a default fresh timeline.
- Added inline rename for tabs (double-click to edit, Enter to confirm, Escape to cancel).
- Added tab color customization with preset and custom colors.
- Added tab delete flow with confirmation dialog.
- Added tab reordering via drag and drop.
- Added fallback behavior when deleting the last tab (auto-create a default replacement tab).
- Moved the `+` create-tab action into the tab strip, positioned after the last tab.

## Marker System

- Added a fixed `Today` marker rendered in every timeline view.
- The `Today` marker is read-only.
- The `Today` marker cannot be dragged.
- The `Today` marker cannot be renamed.
- The `Today` marker has no marker options menu (cannot be recolored or deleted).
- Updated reset action to center the chart on the `Today` marker.
- Improved marker layering so markers stay above chart content.
- Added left inset logic so markers remain visible near the chart start.

## Chart and Layout

- Added a top chart spacer/lane so marker UI does not overlap the first task row.
- Added a `Markers` label in the left sidebar aligned with the new marker lane.
- Preserved chart visual continuity by extending weekend tint and vertical grid lines into the top spacer area.
- Updated drag/drop calculations to account for chart top offset so row movement remains accurate.

## Bar Interaction and Resize Affordance

- Removed hover scaling/grow behavior from task and subtask bars.
- Added visible left/right edge guide lines on bar hover to better indicate resize handles.

## Popovers and Layering

- Updated tab color picker popover to open outside tab bounds.
- Anchored tab color picker popover with fixed positioning to prevent clipping by tab container overflow.
- Increased tab strip/popover z-index to ensure popovers render above chart layers.
- Tuned marker action trigger stacking to avoid visual conflicts with marker content.

## Import/Export and Type Safety

- Refactored import/export payload validation to parser-style, strongly typed flows.
- Removed unsafe cast-dependent validation paths.
- Preserved compatibility with legacy export payload format.
- Kept v2 tab-aware payload handling.

## Quality and Verification

- Build validated after each major UI/state update.
- Existing tests were kept passing while implementing these changes.
- Formatting and lint/coverage gates were maintained during the iteration process.

## Notes

- This file captures implementation-level outcomes for the 2026-03-26 iteration.
- Historical docs from previous dates remain available in the same `docs/` directory.
