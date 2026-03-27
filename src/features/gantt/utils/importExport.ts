import { format } from "date-fns";

import { CURRENT_EXPORT_VERSION } from "../mappers/exportMappers";
import type {
  GanttExportPayload,
  LegacyGanttExportPayload,
  Marker,
  Subtask,
  Task,
  TimelineTab,
  TimelineTabData,
  TimelineConfig,
} from "../types";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

const isString = (value: JsonValue): value is string =>
  typeof value === "string";

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isIsoDate = (value: JsonValue): value is string =>
  isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseSubtask = (subtask: JsonValue): Subtask | null => {
  if (!isJsonObject(subtask)) return null;
  if (!isString(subtask.id)) return null;
  if (!isString(subtask.name)) return null;
  if (!isIsoDate(subtask.startDate)) return null;
  if (!isIsoDate(subtask.endDate)) return null;
  if (!isString(subtask.color)) return null;

  return {
    id: subtask.id,
    name: subtask.name,
    startDate: subtask.startDate,
    endDate: subtask.endDate,
    color: subtask.color,
  };
};

const parseTask = (task: JsonValue): Task | null => {
  if (!isJsonObject(task)) return null;
  if (!isString(task.id)) return null;
  if (!isString(task.name)) return null;
  if (!isIsoDate(task.startDate)) return null;
  if (!isIsoDate(task.endDate)) return null;
  if (!isString(task.color)) return null;
  if (typeof task.progress !== "number") return null;
  if (!Array.isArray(task.subtasks)) return null;

  const subtasks: Subtask[] = [];
  for (const subtask of task.subtasks) {
    const parsedSubtask = parseSubtask(subtask);
    if (!parsedSubtask) return null;
    subtasks.push(parsedSubtask);
  }

  return {
    id: task.id,
    name: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
    color: task.color,
    progress: task.progress,
    subtasks,
  };
};

const parseMarker = (marker: JsonValue): Marker | null => {
  if (!isJsonObject(marker)) return null;
  if (!isString(marker.id)) return null;
  if (!isIsoDate(marker.date)) return null;
  if (!isString(marker.label)) return null;
  if (!isString(marker.color)) return null;

  return {
    id: marker.id,
    date: marker.date,
    label: marker.label,
    color: marker.color,
  };
};

const parseTimelineConfig = (
  timelineConfig: JsonValue
): TimelineConfig | null => {
  if (!isJsonObject(timelineConfig)) return null;
  const { startDate, endDate, zoomLevel, viewMode, customDateRange } =
    timelineConfig;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return null;
  if (typeof zoomLevel !== "number") return null;
  if (
    viewMode !== undefined &&
    viewMode !== "day" &&
    viewMode !== "week" &&
    viewMode !== "month" &&
    viewMode !== "year"
  ) {
    return null;
  }
  if (customDateRange !== undefined && typeof customDateRange !== "boolean") {
    return null;
  }

  return {
    startDate,
    endDate,
    zoomLevel,
    ...(viewMode !== undefined ? { viewMode } : {}),
    ...(customDateRange !== undefined ? { customDateRange } : {}),
  };
};

const parseTimelineTab = (tab: JsonValue): TimelineTab | null => {
  if (!isJsonObject(tab)) return null;
  if (!isString(tab.id)) return null;
  if (!isString(tab.title)) return null;
  if (!isString(tab.color)) return null;

  return {
    id: tab.id,
    title: tab.title,
    color: tab.color,
  };
};

const parseTimelineTabData = (
  timelineTabData: JsonValue
): TimelineTabData | null => {
  if (!isJsonObject(timelineTabData)) return null;
  if (!Array.isArray(timelineTabData.tasks)) return null;
  if (!Array.isArray(timelineTabData.markers)) return null;

  const tasks: Task[] = [];
  for (const task of timelineTabData.tasks) {
    const parsedTask = parseTask(task);
    if (!parsedTask) return null;
    tasks.push(parsedTask);
  }

  const markers: Marker[] = [];
  for (const marker of timelineTabData.markers) {
    const parsedMarker = parseMarker(marker);
    if (!parsedMarker) return null;
    markers.push(parsedMarker);
  }

  const timelineConfig = parseTimelineConfig(timelineTabData.timelineConfig);
  if (!timelineConfig) return null;

  return {
    tasks,
    markers,
    timelineConfig,
  };
};

const parseLegacyPayload = (
  data: JsonValue
): LegacyGanttExportPayload | null => {
  if (!isJsonObject(data)) return null;
  if (data.version !== 1) return null;
  if (!Array.isArray(data.tasks)) return null;
  if (!Array.isArray(data.markers)) return null;

  const tasks: Task[] = [];
  for (const task of data.tasks) {
    const parsedTask = parseTask(task);
    if (!parsedTask) return null;
    tasks.push(parsedTask);
  }

  const markers: Marker[] = [];
  for (const marker of data.markers) {
    const parsedMarker = parseMarker(marker);
    if (!parsedMarker) return null;
    markers.push(parsedMarker);
  }

  const timelineConfig = parseTimelineConfig(data.timelineConfig);
  if (!timelineConfig) return null;

  return {
    version: 1,
    tasks,
    markers,
    timelineConfig,
  };
};

const parseTabPayload = (data: JsonValue): GanttExportPayload | null => {
  if (!isJsonObject(data)) return null;
  if (data.version !== CURRENT_EXPORT_VERSION) return null;
  if (!Array.isArray(data.tabs)) return null;
  if (!isString(data.activeTabId)) return null;
  if (!isJsonObject(data.timelineDataByTab)) return null;

  const tabs: TimelineTab[] = [];
  const timelineDataByTab: Record<string, TimelineTabData> = {};

  for (const tab of data.tabs) {
    const parsedTab = parseTimelineTab(tab);
    if (!parsedTab) return null;
    const parsedTabData = parseTimelineTabData(
      data.timelineDataByTab[parsedTab.id]
    );
    if (!parsedTabData) return null;
    tabs.push(parsedTab);
    timelineDataByTab[parsedTab.id] = parsedTabData;
  }

  return {
    version: CURRENT_EXPORT_VERSION,
    tabs,
    activeTabId: data.activeTabId,
    timelineDataByTab,
  };
};

export const validateExportPayload = (
  data: JsonValue
): GanttExportPayload | LegacyGanttExportPayload | null => {
  return parseLegacyPayload(data) ?? parseTabPayload(data);
};

export const downloadExportPayload = (data: GanttExportPayload): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchorElement = document.createElement("a");
  anchorElement.href = downloadUrl;
  anchorElement.download = `gantt-export-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(anchorElement);
  anchorElement.click();
  document.body.removeChild(anchorElement);
  URL.revokeObjectURL(downloadUrl);
};

export const readJsonFile = (file: File): Promise<JsonValue> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("Invalid JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });

export const importExportInternals = {
  isString,
  isJsonObject,
  isIsoDate,
  parseSubtask,
  parseTask,
  parseMarker,
  parseTimelineConfig,
  parseTimelineTab,
  parseTimelineTabData,
  parseLegacyPayload,
  parseTabPayload,
};
