import { addDays, addMonths, format } from "date-fns";

import type { Marker, Task, TimelineConfig } from "../types";

const today = new Date();
const baseDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()
);

const offsetToDate = (offsetInDays: number): string =>
  format(addDays(baseDate, offsetInDays), "yyyy-MM-dd");

export const defaultTasks: Task[] = [
  {
    id: "t1",
    name: "Research & Discovery",
    startDate: offsetToDate(0),
    endDate: offsetToDate(9),
    color: "#3b82f6",
    progress: 80,
    subtasks: [
      {
        id: "t1-s1",
        name: "User interviews",
        startDate: offsetToDate(0),
        endDate: offsetToDate(4),
        color: "#60a5fa",
      },
      {
        id: "t1-s2",
        name: "Competitor analysis",
        startDate: offsetToDate(3),
        endDate: offsetToDate(9),
        color: "#93c5fd",
      },
    ],
  },
  {
    id: "t2",
    name: "Design System",
    startDate: offsetToDate(5),
    endDate: offsetToDate(16),
    color: "#8b5cf6",
    progress: 55,
    subtasks: [
      {
        id: "t2-s1",
        name: "Token definitions",
        startDate: offsetToDate(5),
        endDate: offsetToDate(9),
        color: "#a78bfa",
      },
      {
        id: "t2-s2",
        name: "Component library",
        startDate: offsetToDate(10),
        endDate: offsetToDate(16),
        color: "#c4b5fd",
      },
    ],
  },
  {
    id: "t3",
    name: "Frontend Architecture",
    startDate: offsetToDate(10),
    endDate: offsetToDate(22),
    color: "#06b6d4",
    progress: 30,
    subtasks: [
      {
        id: "t3-s1",
        name: "Routing & state",
        startDate: offsetToDate(10),
        endDate: offsetToDate(15),
        color: "#22d3ee",
      },
      {
        id: "t3-s2",
        name: "API integration",
        startDate: offsetToDate(14),
        endDate: offsetToDate(22),
        color: "#67e8f9",
      },
    ],
  },
  {
    id: "t4",
    name: "Backend Services",
    startDate: offsetToDate(8),
    endDate: offsetToDate(25),
    color: "#10b981",
    progress: 20,
    subtasks: [
      {
        id: "t4-s1",
        name: "Database schema",
        startDate: offsetToDate(8),
        endDate: offsetToDate(13),
        color: "#34d399",
      },
      {
        id: "t4-s2",
        name: "REST endpoints",
        startDate: offsetToDate(12),
        endDate: offsetToDate(20),
        color: "#6ee7b7",
      },
      {
        id: "t4-s3",
        name: "Auth service",
        startDate: offsetToDate(18),
        endDate: offsetToDate(25),
        color: "#a7f3d0",
      },
    ],
  },
  {
    id: "t5",
    name: "Content & Copy",
    startDate: offsetToDate(12),
    endDate: offsetToDate(20),
    color: "#f59e0b",
    progress: 10,
    subtasks: [
      {
        id: "t5-s1",
        name: "Microcopy",
        startDate: offsetToDate(12),
        endDate: offsetToDate(16),
        color: "#fbbf24",
      },
      {
        id: "t5-s2",
        name: "Help docs",
        startDate: offsetToDate(16),
        endDate: offsetToDate(20),
        color: "#fcd34d",
      },
    ],
  },
  {
    id: "t6",
    name: "QA & Testing",
    startDate: offsetToDate(20),
    endDate: offsetToDate(32),
    color: "#ef4444",
    progress: 0,
    subtasks: [
      {
        id: "t6-s1",
        name: "Unit tests",
        startDate: offsetToDate(20),
        endDate: offsetToDate(26),
        color: "#f87171",
      },
      {
        id: "t6-s2",
        name: "E2E tests",
        startDate: offsetToDate(25),
        endDate: offsetToDate(32),
        color: "#fca5a5",
      },
    ],
  },
  {
    id: "t7",
    name: "Performance Optimization",
    startDate: offsetToDate(28),
    endDate: offsetToDate(35),
    color: "#ec4899",
    progress: 0,
    subtasks: [
      {
        id: "t7-s1",
        name: "Lighthouse audit",
        startDate: offsetToDate(28),
        endDate: offsetToDate(31),
        color: "#f472b6",
      },
      {
        id: "t7-s2",
        name: "Bundle splitting",
        startDate: offsetToDate(31),
        endDate: offsetToDate(35),
        color: "#f9a8d4",
      },
    ],
  },
  {
    id: "t8",
    name: "Staging Deploy",
    startDate: offsetToDate(33),
    endDate: offsetToDate(38),
    color: "#6366f1",
    progress: 0,
    subtasks: [
      {
        id: "t8-s1",
        name: "CI/CD pipeline",
        startDate: offsetToDate(33),
        endDate: offsetToDate(36),
        color: "#818cf8",
      },
      {
        id: "t8-s2",
        name: "Staging QA",
        startDate: offsetToDate(36),
        endDate: offsetToDate(38),
        color: "#a5b4fc",
      },
    ],
  },
  {
    id: "t9",
    name: "Launch",
    startDate: offsetToDate(38),
    endDate: offsetToDate(42),
    color: "#14b8a6",
    progress: 0,
    subtasks: [],
  },
];

export const defaultMarkers: Marker[] = [
  { id: "m1", date: offsetToDate(0), label: "Kickoff", color: "#3b82f6" },
  { id: "m2", date: offsetToDate(25), label: "Beta", color: "#f59e0b" },
  { id: "m3", date: offsetToDate(42), label: "Launch", color: "#10b981" },
];

export const defaultTimelineConfig: TimelineConfig = {
  startDate: offsetToDate(0),
  endDate: format(addMonths(baseDate, 3), "yyyy-MM-dd"),
  zoomLevel: 40,
  viewMode: "week",
  customDateRange: false,
};
