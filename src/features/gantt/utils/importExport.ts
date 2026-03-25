import { format } from "date-fns";

import { CURRENT_EXPORT_VERSION } from "../mappers/exportMappers";
import type {
  GanttExportPayload,
  Marker,
  Subtask,
  Task,
  TimelineConfig,
} from "../types";

const isString = (value: unknown): value is string => typeof value === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const isIsoDate = (value: unknown): value is string =>
  isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidSubtask = (subtask: unknown): subtask is Subtask => {
  if (!isRecord(subtask)) return false;
  return (
    isString(subtask.id) &&
    isString(subtask.name) &&
    isIsoDate(subtask.startDate) &&
    isIsoDate(subtask.endDate) &&
    isString(subtask.color)
  );
};

const isValidTask = (task: unknown): task is Task => {
  if (!isRecord(task)) return false;
  return (
    isString(task.id) &&
    isString(task.name) &&
    isIsoDate(task.startDate) &&
    isIsoDate(task.endDate) &&
    isString(task.color) &&
    typeof task.progress === "number" &&
    Array.isArray(task.subtasks) &&
    task.subtasks.every(isValidSubtask)
  );
};

const isValidMarker = (marker: unknown): marker is Marker => {
  if (!isRecord(marker)) return false;
  return (
    isString(marker.id) &&
    isIsoDate(marker.date) &&
    isString(marker.label) &&
    isString(marker.color)
  );
};

const isValidTimelineConfig = (
  timelineConfig: unknown
): timelineConfig is TimelineConfig => {
  if (!isRecord(timelineConfig)) return false;
  const { startDate, endDate, zoomLevel, viewMode, customDateRange } =
    timelineConfig;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return false;
  if (typeof zoomLevel !== "number") return false;
  if (
    viewMode !== undefined &&
    viewMode !== "day" &&
    viewMode !== "week" &&
    viewMode !== "month" &&
    viewMode !== "year"
  ) {
    return false;
  }
  if (customDateRange !== undefined && typeof customDateRange !== "boolean") {
    return false;
  }
  return true;
};

export const validateExportPayload = (
  data: unknown
): GanttExportPayload | null => {
  if (!isRecord(data)) return null;
  if (data.version !== CURRENT_EXPORT_VERSION) return null;
  if (!Array.isArray(data.tasks) || !data.tasks.every(isValidTask)) return null;
  if (!Array.isArray(data.markers) || !data.markers.every(isValidMarker))
    return null;
  if (!isValidTimelineConfig(data.timelineConfig)) return null;
  return data as unknown as GanttExportPayload;
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

export const readJsonFile = (file: File): Promise<unknown> =>
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
