export type ISODateString = string;

export interface Subtask {
  id: string;
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  color: string;
}

export interface Task {
  id: string;
  name: string;
  startDate: ISODateString;
  endDate: ISODateString;
  color: string;
  subtasks: Subtask[];
  progress: number;
}

export interface Marker {
  id: string;
  date: ISODateString;
  label: string;
  color: string;
}

export type TimelineViewMode = "day" | "week" | "month" | "year";

export interface TimelineConfig {
  startDate: ISODateString;
  endDate: ISODateString;
  zoomLevel: number;
  viewMode?: TimelineViewMode;
  customDateRange?: boolean;
}

export interface GanttExportPayload {
  version: number;
  tasks: Task[];
  markers: Marker[];
  timelineConfig: TimelineConfig;
}

export type DragMode = "move" | "resize-start" | "resize-end";

export interface DragState {
  taskId: string;
  subtaskId?: string;
  mode: DragMode;
  startX: number;
  originalStart: ISODateString;
  originalEnd: ISODateString;
}
