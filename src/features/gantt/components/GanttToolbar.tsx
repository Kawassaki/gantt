import { useAtomValue, useSetAtom } from "jotai";
import { Download, Redo2, Undo2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { useRef } from "react";

import { useTimeline } from "../hooks";
import {
  exportDataAtom,
  importDataAtom,
  redoAtom,
  undoAtom,
} from "../state/actions";
import { redoStackAtom, undoStackAtom } from "../state/store";
import {
  downloadExportPayload,
  readJsonFile,
  validateExportPayload,
} from "../utils/importExport";

interface ToolbarProps {
  className?: string;
  buttonClass?: string;
  title?: string;
  titleClass?: string;
  accentColor?: string;
  dividerClass?: string;
}

export const GanttToolbar = ({
  className = "",
  buttonClass = "",
  title,
  titleClass = "",
  accentColor,
  dividerClass,
}: ToolbarProps) => {
  const exportData = useAtomValue(exportDataAtom);
  const importData = useSetAtom(importDataAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const undoStack = useAtomValue(undoStackAtom);
  const redoStack = useAtomValue(redoStackAtom);
  const { config, setZoom } = useTimeline();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => downloadExportPayload(exportData);

  const handleImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rawData = await readJsonFile(file);
      const data = validateExportPayload(rawData);
      if (!data) {
        alert("Invalid Gantt file format");
        return;
      }
      importData(data);
    } catch {
      alert("Failed to read file");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const buttonBaseClass = `inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${buttonClass}`;
  const divider = dividerClass || "w-px h-5 opacity-15";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {title && (
        <span className={`mr-auto font-bold ${titleClass}`}>{title}</span>
      )}

      <div className="flex items-center gap-1">
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--zoom-out`}
          onClick={() => setZoom(config.zoomLevel - 10)}
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-7 text-center text-[10px] tabular-nums opacity-50 select-none">
          {config.zoomLevel}
        </span>
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--zoom-in`}
          onClick={() => setZoom(config.zoomLevel + 10)}
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <div
        className={divider}
        style={{ background: accentColor || "currentColor" }}
      />

      <div className="flex items-center gap-1">
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--undo`}
          onClick={() => undo()}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--redo`}
          onClick={() => redo()}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div
        className={divider}
        style={{ background: accentColor || "currentColor" }}
      />

      <div className="flex items-center gap-1">
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--export earth-toolbar-btn--io`}
          onClick={handleExport}
          title="Export as JSON"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button
          className={`${buttonBaseClass} earth-toolbar-btn--import earth-toolbar-btn--io`}
          onClick={() => fileInputRef.current?.click()}
          title="Import JSON"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
};
