import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { STORAGE_KEYS } from "../constants";
import type { Marker, Task, TimelineConfig } from "../types";

import {
  defaultMarkers,
  defaultTasks,
  defaultTimelineConfig,
} from "./sampleData";

export const tasksAtom = atomWithStorage<Task[]>(
  STORAGE_KEYS.tasks,
  defaultTasks
);
export const markersAtom = atomWithStorage<Marker[]>(
  STORAGE_KEYS.markers,
  defaultMarkers
);
export const timelineConfigAtom = atomWithStorage<TimelineConfig>(
  STORAGE_KEYS.timelineConfig,
  defaultTimelineConfig
);

export interface HistorySnapshot {
  tasks: Task[];
  markers: Marker[];
}

export const undoStackAtom = atom<HistorySnapshot[]>([]);
export const redoStackAtom = atom<HistorySnapshot[]>([]);
