export const earthGlobalStyles = `
.earth-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-bar:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 14px rgba(9,30,66,0.2) !important;
}
.earth-subtask-bar {
  transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s ease;
}
.earth-subtask-bar:hover {
  transform: scale(1.03);
  box-shadow: 0 3px 10px rgba(9,30,66,0.15) !important;
}
.earth-row {
  transition: background-color 0.15s ease;
}
.earth-row:hover {
  background-color: var(--earth-row-hover);
}
.earth-toolbar-btn {
  background: var(--earth-toolbar-btn-bg);
  border: 1px solid var(--earth-toolbar-btn-border);
  color: var(--earth-charcoal);
  transition: all 0.15s ease;
}
.earth-toolbar-btn:hover {
  background: var(--earth-toolbar-btn-hover-bg);
  border-color: var(--earth-toolbar-btn-hover-border);
}
.earth-toolbar-btn:disabled {
  opacity: 0.35;
}
.earth-toolbar-btn-glass {
  border-radius: 999px !important;
  backdrop-filter: blur(8px);
}
.earth-marker {
  transition: transform 0.16s ease, opacity 0.16s ease;
}
.earth-marker:hover {
  transform: translateY(-1px);
}
.earth-input {
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}
.earth-input:focus {
  outline: none;
  border-color: var(--earth-terracotta);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--earth-terracotta) 20%, transparent);
}
.earth-color-chip {
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.earth-color-chip:hover {
  transform: scale(1.08);
}
.earth-color-chip[aria-pressed="true"] {
  box-shadow: 0 0 0 2px var(--earth-ivory), 0 0 0 4px color-mix(in srgb, var(--earth-charcoal) 28%, transparent);
}
.earth-subrow-initial {
  opacity: 0;
  transform: translateY(-4px);
}
@keyframes earth-subrow-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.earth-subrow {
  animation: earth-subrow-in 0.16s ease-out;
}
`;
