import { atom } from "jotai";

import { TASK_PRESET_COLORS } from "../../constants";
import { createTimelineTabId } from "../../utils/ids";
import { createFreshTimelineTabData } from "../sampleData";
import {
  activeTabIdAtom,
  redoStackByTabAtom,
  tabsAtom,
  timelineDataByTabAtom,
  undoStackByTabAtom,
} from "../store";

const move = <T>(items: T[], fromIndex: number, toIndex: number): T[] => {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const createTimelineTabAtom = atom(
  null,
  (get, set, payload?: { title?: string; color?: string }) => {
    const existingTabs = get(tabsAtom);
    const nextTabId = createTimelineTabId();
    const color =
      payload?.color ??
      TASK_PRESET_COLORS[existingTabs.length % TASK_PRESET_COLORS.length];
    const title =
      payload?.title?.trim() || `Timeline ${existingTabs.length + 1}`;

    set(tabsAtom, [...existingTabs, { id: nextTabId, title, color }]);
    set(timelineDataByTabAtom, {
      ...get(timelineDataByTabAtom),
      [nextTabId]: createFreshTimelineTabData(),
    });
    set(activeTabIdAtom, nextTabId);
  }
);

export const renameTimelineTabAtom = atom(
  null,
  (get, set, payload: { tabId: string; title: string }) => {
    const nextTitle = payload.title.trim();
    if (!nextTitle) return;

    set(
      tabsAtom,
      get(tabsAtom).map((tab) =>
        tab.id === payload.tabId ? { ...tab, title: nextTitle } : tab
      )
    );
  }
);

export const recolorTimelineTabAtom = atom(
  null,
  (get, set, payload: { tabId: string; color: string }) => {
    set(
      tabsAtom,
      get(tabsAtom).map((tab) =>
        tab.id === payload.tabId ? { ...tab, color: payload.color } : tab
      )
    );
  }
);

export const reorderTimelineTabsAtom = atom(
  null,
  (get, set, payload: { fromIndex: number; toIndex: number }) => {
    set(tabsAtom, move(get(tabsAtom), payload.fromIndex, payload.toIndex));
  }
);

export const deleteTimelineTabAtom = atom(null, (get, set, tabId: string) => {
  const existingTabs = get(tabsAtom);
  const previousActiveTabId = get(activeTabIdAtom);
  const filteredTabs = existingTabs.filter((tab) => tab.id !== tabId);
  const timelineDataByTab = { ...get(timelineDataByTabAtom) };
  const undoByTab = { ...get(undoStackByTabAtom) };
  const redoByTab = { ...get(redoStackByTabAtom) };

  delete timelineDataByTab[tabId];
  delete undoByTab[tabId];
  delete redoByTab[tabId];

  if (filteredTabs.length === 0) {
    const nextTabId = createTimelineTabId();
    const nextTab = {
      id: nextTabId,
      title: "Timeline 1",
      color: TASK_PRESET_COLORS[0],
    };
    set(tabsAtom, [nextTab]);
    set(timelineDataByTabAtom, {
      ...timelineDataByTab,
      [nextTabId]: createFreshTimelineTabData(),
    });
    set(undoStackByTabAtom, undoByTab);
    set(redoStackByTabAtom, redoByTab);
    set(activeTabIdAtom, nextTabId);
    return;
  }

  set(tabsAtom, filteredTabs);
  set(timelineDataByTabAtom, timelineDataByTab);
  set(undoStackByTabAtom, undoByTab);
  set(redoStackByTabAtom, redoByTab);

  if (previousActiveTabId === tabId) {
    set(activeTabIdAtom, filteredTabs[0].id);
  }
});
