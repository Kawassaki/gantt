import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { Task, Marker, TimelineConfig } from "./types";
import {
  defaultTasks,
  defaultMarkers,
  defaultTimelineConfig,
} from "./sampleData";

export const tasksAtom = atomWithStorage<Task[]>(
  "gantt-v1-tasks",
  defaultTasks,
);
export const markersAtom = atomWithStorage<Marker[]>(
  "gantt-v1-markers",
  defaultMarkers,
);
export const timelineConfigAtom = atomWithStorage<TimelineConfig>(
  "gantt-v1-timeline",
  defaultTimelineConfig,
);

type Snapshot = { tasks: Task[]; markers: Marker[] };
export const undoStackAtom = atom<Snapshot[]>([]);
export const redoStackAtom = atom<Snapshot[]>([]);
