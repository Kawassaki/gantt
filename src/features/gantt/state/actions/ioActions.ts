import { atom } from "jotai";

import { toExportPayload } from "../../mappers/exportMappers";
import type { GanttExportPayload } from "../../types";
import {
  markersAtom,
  redoStackAtom,
  tasksAtom,
  timelineConfigAtom,
  undoStackAtom,
} from "../store";

export const exportDataAtom = atom((get) =>
  toExportPayload({
    tasks: get(tasksAtom),
    markers: get(markersAtom),
    timelineConfig: get(timelineConfigAtom),
  })
);

export const importDataAtom = atom(
  null,
  (_get, set, data: GanttExportPayload) => {
    set(tasksAtom, data.tasks);
    set(markersAtom, data.markers);
    set(timelineConfigAtom, data.timelineConfig);
    set(undoStackAtom, []);
    set(redoStackAtom, []);
  }
);
