import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { STORAGE_KEYS } from "../constants";
import type {
  Marker,
  Task,
  TimelineConfig,
  TimelineTab,
  TimelineTabData,
} from "../types";

import {
  INITIAL_TIMELINE_TAB_ID,
  defaultTimelineDataByTab,
  defaultTimelineTabs,
  createFreshTimelineTabData,
} from "./sampleData";

type Updater<T> = T | ((prev: T) => T);

const resolveUpdate = <T>(previous: T, update: Updater<T>): T =>
  typeof update === "function" ? (update as (prev: T) => T)(previous) : update;

const tabsStorageAtom = atomWithStorage<TimelineTab[]>(
  STORAGE_KEYS.tabs,
  defaultTimelineTabs
);
const activeTabIdStorageAtom = atomWithStorage<string>(
  STORAGE_KEYS.activeTabId,
  INITIAL_TIMELINE_TAB_ID
);
const timelineDataByTabStorageAtom = atomWithStorage<
  Record<string, TimelineTabData>
>(STORAGE_KEYS.timelineDataByTab, defaultTimelineDataByTab);

const resolveActiveTabId = (tabs: TimelineTab[], rawActiveTabId: string) => {
  return tabs.some((tab) => tab.id === rawActiveTabId)
    ? rawActiveTabId
    : tabs[0].id;
};

export const tabsAtom = atom(
  (get) => get(tabsStorageAtom),
  (get, set, update: Updater<TimelineTab[]>) => {
    const nextTabs = resolveUpdate(get(tabsStorageAtom), update);
    set(tabsStorageAtom, nextTabs.length > 0 ? nextTabs : defaultTimelineTabs);
  }
);

export const activeTabIdAtom = atom(
  (get) => resolveActiveTabId(get(tabsAtom), get(activeTabIdStorageAtom)),
  (get, set, nextActiveTabId: string) => {
    const tabs = get(tabsAtom);
    if (tabs.some((tab) => tab.id === nextActiveTabId)) {
      set(activeTabIdStorageAtom, nextActiveTabId);
    }
  }
);

export const timelineDataByTabAtom = atom(
  (get) => {
    const stored = get(timelineDataByTabStorageAtom);
    const tabs = get(tabsAtom);
    const nextDataByTab = { ...stored };

    for (const tab of tabs) {
      if (!nextDataByTab[tab.id]) {
        nextDataByTab[tab.id] = createFreshTimelineTabData();
      }
    }

    return nextDataByTab;
  },
  (get, set, update: Updater<Record<string, TimelineTabData>>) => {
    const nextDataByTab = resolveUpdate(get(timelineDataByTabAtom), update);
    set(timelineDataByTabStorageAtom, nextDataByTab);
  }
);

const activeTabDataAtom = atom(
  (get) => {
    const activeTabId = get(activeTabIdAtom);
    const timelineDataByTab = get(timelineDataByTabAtom);
    return timelineDataByTab[activeTabId];
  },
  (get, set, update: Updater<TimelineTabData>) => {
    const activeTabId = get(activeTabIdAtom);
    const current = get(activeTabDataAtom);
    const next = resolveUpdate(current, update);
    set(timelineDataByTabAtom, {
      ...get(timelineDataByTabAtom),
      [activeTabId]: next,
    });
  }
);

export const tasksAtom = atom(
  (get) => get(activeTabDataAtom).tasks,
  (get, set, update: Updater<Task[]>) => {
    const current = get(activeTabDataAtom);
    const nextTasks = resolveUpdate(current.tasks, update);
    set(activeTabDataAtom, { ...current, tasks: nextTasks });
  }
);

export const markersAtom = atom(
  (get) => get(activeTabDataAtom).markers,
  (get, set, update: Updater<Marker[]>) => {
    const current = get(activeTabDataAtom);
    const nextMarkers = resolveUpdate(current.markers, update);
    set(activeTabDataAtom, { ...current, markers: nextMarkers });
  }
);

export const timelineConfigAtom = atom(
  (get) => get(activeTabDataAtom).timelineConfig,
  (get, set, update: Updater<TimelineConfig>) => {
    const current = get(activeTabDataAtom);
    const nextTimelineConfig = resolveUpdate(current.timelineConfig, update);
    set(activeTabDataAtom, { ...current, timelineConfig: nextTimelineConfig });
  }
);

export interface HistorySnapshot {
  tasks: Task[];
  markers: Marker[];
}

export const undoStackByTabAtom = atom<Record<string, HistorySnapshot[]>>({});
export const redoStackByTabAtom = atom<Record<string, HistorySnapshot[]>>({});

export const undoStackAtom = atom(
  (get) => get(undoStackByTabAtom)[get(activeTabIdAtom)] ?? [],
  (get, set, update: Updater<HistorySnapshot[]>) => {
    const activeTabId = get(activeTabIdAtom);
    const current = get(undoStackByTabAtom)[activeTabId] ?? [];
    const next = resolveUpdate(current, update);
    set(undoStackByTabAtom, {
      ...get(undoStackByTabAtom),
      [activeTabId]: next,
    });
  }
);

export const redoStackAtom = atom(
  (get) => get(redoStackByTabAtom)[get(activeTabIdAtom)] ?? [],
  (get, set, update: Updater<HistorySnapshot[]>) => {
    const activeTabId = get(activeTabIdAtom);
    const current = get(redoStackByTabAtom)[activeTabId] ?? [];
    const next = resolveUpdate(current, update);
    set(redoStackByTabAtom, {
      ...get(redoStackByTabAtom),
      [activeTabId]: next,
    });
  }
);
