import type { GanttExportPayload } from "../types";

export const CURRENT_EXPORT_VERSION = 2;

export const toExportPayload = (
  payload: Omit<GanttExportPayload, "version">
): GanttExportPayload => ({
  version: CURRENT_EXPORT_VERSION,
  ...payload,
});
