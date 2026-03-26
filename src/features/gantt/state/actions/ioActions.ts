import { atom } from "jotai";

import { toExportPayload } from "../../mappers/exportMappers";
import type { GanttExportPayload, LegacyGanttExportPayload } from "../../types";
import { createTimelineTabId } from "../../utils/ids";
import {
  activeTabIdAtom,
  markersAtom,
  redoStackByTabAtom,
  redoStackAtom,
  tabsAtom,
  tasksAtom,
  timelineDataByTabAtom,
  timelineConfigAtom,
  undoStackByTabAtom,
  undoStackAtom,
} from "../store";

export const exportDataAtom = atom((get) =>
  toExportPayload({
    tabs: get(tabsAtom),
    activeTabId: get(activeTabIdAtom),
    timelineDataByTab: get(timelineDataByTabAtom),
  })
);

export const importDataAtom = atom(
  null,
  (_get, set, data: GanttExportPayload | LegacyGanttExportPayload) => {
    if ("tabs" in data) {
      set(tabsAtom, data.tabs);
      set(timelineDataByTabAtom, data.timelineDataByTab);
      set(activeTabIdAtom, data.activeTabId);
      set(undoStackByTabAtom, {});
      set(redoStackByTabAtom, {});
      set(undoStackAtom, []);
      set(redoStackAtom, []);
      return;
    }

    const tabId = createTimelineTabId();
    set(tabsAtom, [
      {
        id: tabId,
        title: "Imported Timeline",
        color: "#0052CC",
      },
    ]);
    set(timelineDataByTabAtom, {
      [tabId]: {
        tasks: data.tasks,
        markers: data.markers,
        timelineConfig: data.timelineConfig,
      },
    });
    set(activeTabIdAtom, tabId);
    set(tasksAtom, data.tasks);
    set(markersAtom, data.markers);
    set(timelineConfigAtom, data.timelineConfig);
    set(undoStackByTabAtom, {});
    set(redoStackByTabAtom, {});
    set(undoStackAtom, []);
    set(redoStackAtom, []);
  }
);
