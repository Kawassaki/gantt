# Iteration Features - 2026-03-27

## Overview

This document summarizes the Jira integration work completed in this iteration, including frontend UX, backend OAuth/API behavior, serverless hardening, and final polish updates.

## Jira Integration Scope

- Added Jira sign-in and sign-out flow in the header.
- Added signed-in user display in the header.
- Added Jira epic search and import flow in the timeline panel.
- Imported epics create parent task + child subtasks in the chart.
- Jira item naming format follows: [ISSUE-KEY] - Title.
- Added periodic Jira sync for linked issues.

## Frontend Behavior Updates

### Header and Controls

- Moved Jira controls to the left side of the top header area near the title row.
- Removed the previous Command Strip label.
- Removed right-side Jira status text labels such as Ready to sync and Jira disconnected.
- Added Jira SVG icon usage in the Connect with Jira action and signed-in Jira user chip.
- Matched the signed-in Jira user chip style to the Connect button style for consistency.

### Jira Search and Import UX

- Jira search input is shown only when the user is signed in.
- Logged-out state shows a passive hint instead of an active search combobox.
- Importing an already-linked epic triggers a user-facing dialog.
- Importing issues with missing Jira dates triggers a user-facing dialog.
- Added automatic scroll-to-imported item in the chart after Jira import.

### Timeline Visuals

- Added chart border accents that follow the currently selected tab color.

## State and Data Integrity Fixes

- Fixed stale Jira link data when deleting tasks.
- Fixed stale Jira link data when deleting subtasks.
- Resolved bug where deleted Jira-backed items could not be added again.
- Added richer Jira import notice typing to distinguish duplicate-epic vs fallback-dates notices.

## Backend and OAuth Hardening

### Local Dev + BFF

- Expanded Jira backend modules under server/jira for config, OAuth, session handling, and Atlassian API access.
- Added local middleware routes for Jira auth and issue endpoints.

### Vercel Serverless

- Added serverless Jira API entrypoints under api/jira.
- Centralized route logic in shared handler for consistency.
- Ensured runtime-safe ESM imports with explicit .js specifiers where needed.
- Added health endpoint for non-secret environment/scopes diagnostics.

### Session, State, and Token Reliability

- Added cookie-backed OAuth state to avoid invalid or expired state issues in stateless environments.
- Added cookie-backed Jira session restoration to avoid no-session errors across invocations.
- Added token recovery flow using refresh token when in-memory access token is unavailable.
- Reduced token cookie payload size to improve preview deployment reliability.

## Atlassian App Configuration Outcome

- Encountered Atlassian consent screen restriction: app in development mode blocks non-authorized users.
- Resolved by enabling app sharing/distribution and validating callback/scopes configuration.

## Quality Gates and Validation

- Lint checks pass with zero warnings/errors.
- TypeScript build passes.
- Targeted tests for Jira actions and deletion-link cleanup pass.

Validation commands used during iteration:

- pnpm lint
- pnpm build
- pnpm vitest run src/features/gantt/state/actions/jiraActions.test.ts src/features/gantt/state/actions/taskActions.test.ts src/features/gantt/state/actions/subtaskActions.test.ts src/screens/GanttEarth.tabs.test.tsx

## Primary Files Updated

- src/screens/GanttEarth.tsx
- src/features/gantt/state/actions/jiraActions.ts
- src/features/gantt/state/actions/taskActions.ts
- src/features/gantt/state/actions/subtaskActions.ts
- src/features/gantt/state/actions/jiraActions.test.ts
- src/features/gantt/state/actions/taskActions.test.ts
- src/features/gantt/state/actions/subtaskActions.test.ts
- api/jira/handler.ts
- api/jira/auth/sign-in.ts
- api/jira/auth/callback.ts
- api/jira/auth/me.ts
- api/jira/auth/sign-out.ts
- api/jira/epics/search.ts
- api/jira/epics/[epicKey].ts
- api/jira/issues/sync.ts
- api/jira/health.ts
- server/jira/devPlugin.ts

## Wrap-up

The Jira-to-Gantt integration is now functional end-to-end with production-oriented serverless safeguards, stronger UX messaging, and cleaner visual hierarchy in the header and chart.