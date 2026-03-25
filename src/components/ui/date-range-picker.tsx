import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  isDark?: boolean;
  buttonStyle?: React.CSSProperties;
  popoverStyle?: React.CSSProperties;
};

const dayPickerStyles = `
.gantt-rdp {
  --rdp-accent-color: #0052cc;
  --rdp-range_middle-background-color: rgba(0, 82, 204, 0.12);
  --rdp-day-height: 34px;
  --rdp-day-width: 34px;
  color: #172b4d;
}

.gantt-rdp--dark {
  --rdp-accent-color: #58a6ff;
  --rdp-range_middle-background-color: rgba(88, 166, 255, 0.24);
  color: #e6edf3;
}

.gantt-rdp .rdp-months {
  gap: 16px;
}

.gantt-rdp .rdp-caption_label {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.gantt-rdp .rdp-weekday {
  font-weight: 600;
  font-size: 13px;
  opacity: 0.85;
}

.gantt-rdp .rdp-day_button {
  border-radius: 999px;
  border: 1px solid transparent;
  color: inherit;
}

.gantt-rdp .rdp-day_button:hover {
  background: rgba(9, 30, 66, 0.08);
}

.gantt-rdp--dark .rdp-day_button:hover {
  background: rgba(230, 237, 243, 0.1);
}

.gantt-rdp .rdp-selected .rdp-day_button,
.gantt-rdp .rdp-range_start .rdp-day_button,
.gantt-rdp .rdp-range_end .rdp-day_button {
  background: var(--rdp-accent-color);
  color: #ffffff;
}

.gantt-rdp .rdp-range_middle .rdp-day_button {
  background: var(--rdp-range_middle-background-color);
}

.gantt-rdp .rdp-outside,
.gantt-rdp .rdp-disabled {
  opacity: 0.3;
}

.gantt-rdp .rdp-today:not(.rdp-selected) .rdp-day_button {
  border-color: rgba(9, 30, 66, 0.25);
}

.gantt-rdp--dark .rdp-today:not(.rdp-selected) .rdp-day_button {
  border-color: rgba(230, 237, 243, 0.35);
}

.gantt-rdp .rdp-button_previous,
.gantt-rdp .rdp-button_next {
  border: 1px solid rgba(9, 30, 66, 0.16);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  color: inherit;
}

.gantt-rdp .rdp-button_previous:hover,
.gantt-rdp .rdp-button_next:hover {
  background: rgba(9, 30, 66, 0.08);
}

.gantt-rdp--dark .rdp-button_previous,
.gantt-rdp--dark .rdp-button_next {
  border-color: rgba(230, 237, 243, 0.22);
}

.gantt-rdp--dark .rdp-button_previous:hover,
.gantt-rdp--dark .rdp-button_next:hover {
  background: rgba(230, 237, 243, 0.1);
}
`;

export function DateRangePicker({
  value,
  onChange,
  isDark = false,
  buttonStyle,
  popoverStyle,
}: DateRangePickerProps) {
  const label = React.useMemo(() => {
    if (value?.from && value?.to) {
      return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
    }
    if (value?.from) {
      return format(value.from, "MMM d, yyyy");
    }
    return "Pick a date range";
  }, [value]);

  return (
    <Popover.Root>
      <style>{dayPickerStyles}</style>
      <Popover.Trigger asChild>
        <button
          type="button"
          style={{
            border: "1px solid rgba(9,30,66,0.14)",
            borderRadius: 8,
            minHeight: 30,
            padding: "0 10px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            cursor: "pointer",
            background: "rgba(255,255,255,0.92)",
            ...buttonStyle,
          }}
        >
          <CalendarIcon size={14} />
          <span style={{ whiteSpace: "nowrap" }}>{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          style={{
            borderRadius: 12,
            border: "1px solid rgba(9,30,66,0.14)",
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 14px 30px rgba(9,30,66,0.18)",
            padding: 10,
            zIndex: 80,
            ...popoverStyle,
          }}
        >
          <DayPicker
            className={isDark ? "gantt-rdp gantt-rdp--dark" : "gantt-rdp"}
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
