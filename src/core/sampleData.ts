import type { Task, Marker, TimelineConfig } from "./types";
import { addDays, addMonths, format } from "date-fns";

const today = new Date();
const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const d = (offset: number) => format(addDays(base, offset), "yyyy-MM-dd");

export const defaultTasks: Task[] = [
  {
    id: "t1",
    name: "Research & Discovery",
    startDate: d(0),
    endDate: d(9),
    color: "#3b82f6",
    progress: 80,
    subtasks: [
      {
        id: "t1-s1",
        name: "User interviews",
        startDate: d(0),
        endDate: d(4),
        color: "#60a5fa",
      },
      {
        id: "t1-s2",
        name: "Competitor analysis",
        startDate: d(3),
        endDate: d(9),
        color: "#93c5fd",
      },
    ],
  },
  {
    id: "t2",
    name: "Design System",
    startDate: d(5),
    endDate: d(16),
    color: "#8b5cf6",
    progress: 55,
    subtasks: [
      {
        id: "t2-s1",
        name: "Token definitions",
        startDate: d(5),
        endDate: d(9),
        color: "#a78bfa",
      },
      {
        id: "t2-s2",
        name: "Component library",
        startDate: d(10),
        endDate: d(16),
        color: "#c4b5fd",
      },
    ],
  },
  {
    id: "t3",
    name: "Frontend Architecture",
    startDate: d(10),
    endDate: d(22),
    color: "#06b6d4",
    progress: 30,
    subtasks: [
      {
        id: "t3-s1",
        name: "Routing & state",
        startDate: d(10),
        endDate: d(15),
        color: "#22d3ee",
      },
      {
        id: "t3-s2",
        name: "API integration",
        startDate: d(14),
        endDate: d(22),
        color: "#67e8f9",
      },
    ],
  },
  {
    id: "t4",
    name: "Backend Services",
    startDate: d(8),
    endDate: d(25),
    color: "#10b981",
    progress: 20,
    subtasks: [
      {
        id: "t4-s1",
        name: "Database schema",
        startDate: d(8),
        endDate: d(13),
        color: "#34d399",
      },
      {
        id: "t4-s2",
        name: "REST endpoints",
        startDate: d(12),
        endDate: d(20),
        color: "#6ee7b7",
      },
      {
        id: "t4-s3",
        name: "Auth service",
        startDate: d(18),
        endDate: d(25),
        color: "#a7f3d0",
      },
    ],
  },
  {
    id: "t5",
    name: "Content & Copy",
    startDate: d(12),
    endDate: d(20),
    color: "#f59e0b",
    progress: 10,
    subtasks: [
      {
        id: "t5-s1",
        name: "Microcopy",
        startDate: d(12),
        endDate: d(16),
        color: "#fbbf24",
      },
      {
        id: "t5-s2",
        name: "Help docs",
        startDate: d(16),
        endDate: d(20),
        color: "#fcd34d",
      },
    ],
  },
  {
    id: "t6",
    name: "QA & Testing",
    startDate: d(20),
    endDate: d(32),
    color: "#ef4444",
    progress: 0,
    subtasks: [
      {
        id: "t6-s1",
        name: "Unit tests",
        startDate: d(20),
        endDate: d(26),
        color: "#f87171",
      },
      {
        id: "t6-s2",
        name: "E2E tests",
        startDate: d(25),
        endDate: d(32),
        color: "#fca5a5",
      },
    ],
  },
  {
    id: "t7",
    name: "Performance Optimization",
    startDate: d(28),
    endDate: d(35),
    color: "#ec4899",
    progress: 0,
    subtasks: [
      {
        id: "t7-s1",
        name: "Lighthouse audit",
        startDate: d(28),
        endDate: d(31),
        color: "#f472b6",
      },
      {
        id: "t7-s2",
        name: "Bundle splitting",
        startDate: d(31),
        endDate: d(35),
        color: "#f9a8d4",
      },
    ],
  },
  {
    id: "t8",
    name: "Staging Deploy",
    startDate: d(33),
    endDate: d(38),
    color: "#6366f1",
    progress: 0,
    subtasks: [
      {
        id: "t8-s1",
        name: "CI/CD pipeline",
        startDate: d(33),
        endDate: d(36),
        color: "#818cf8",
      },
      {
        id: "t8-s2",
        name: "Staging QA",
        startDate: d(36),
        endDate: d(38),
        color: "#a5b4fc",
      },
    ],
  },
  {
    id: "t9",
    name: "Launch",
    startDate: d(38),
    endDate: d(42),
    color: "#14b8a6",
    progress: 0,
    subtasks: [],
  },
];

export const defaultMarkers: Marker[] = [
  { id: "m1", date: d(0), label: "Kickoff", color: "#3b82f6" },
  { id: "m2", date: d(25), label: "Beta", color: "#f59e0b" },
  { id: "m3", date: d(42), label: "Launch", color: "#10b981" },
];

export const defaultTimelineConfig: TimelineConfig = {
  startDate: d(0),
  endDate: format(addMonths(base, 3), "yyyy-MM-dd"),
  zoomLevel: 40,
  viewMode: "week",
  customDateRange: false,
};
