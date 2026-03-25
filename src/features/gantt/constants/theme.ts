import type { ThemeMode } from "../types";

import { STORAGE_KEYS } from "./storage";

export interface ThemeColorPalette {
  appBg: string;
  cream: string;
  terracotta: string;
  sage: string;
  charcoal: string;
  ivory: string;
  ruleLight: string;
  ruleVert: string;
  barShadow: string;
  overlayOpacity: number;
  toolbarBg: string;
  pillBg: string;
  editorBg: string;
  rowHover: string;
  toolbarBtnBg: string;
  toolbarBtnBorder: string;
  toolbarBtnHoverBg: string;
  toolbarBtnHoverBorder: string;
}

export const THEME_STORAGE_KEY = STORAGE_KEYS.themeMode;

export const THEME_COLORS: Record<ThemeMode, ThemeColorPalette> = {
  light: {
    appBg: "#F4F5F7",
    cream: "#F4F5F7",
    terracotta: "#0052CC",
    sage: "#4C9AFF",
    charcoal: "#172B4D",
    ivory: "#FFFFFF",
    ruleLight: "rgba(9,30,66,0.08)",
    ruleVert: "rgba(9,30,66,0.04)",
    barShadow: "0 1px 2px rgba(9,30,66,0.12), 0 0 1px rgba(9,30,66,0.2)",
    overlayOpacity: 0.045,
    toolbarBg: "rgba(244,245,247,0.92)",
    pillBg: "rgba(255,255,255,0.9)",
    editorBg: "rgba(255,255,255,0.9)",
    rowHover: "rgba(0,82,204,0.04)",
    toolbarBtnBg: "rgba(9,30,66,0.06)",
    toolbarBtnBorder: "rgba(9,30,66,0.1)",
    toolbarBtnHoverBg: "rgba(0,82,204,0.1)",
    toolbarBtnHoverBorder: "rgba(0,82,204,0.25)",
  },
  dark: {
    appBg: "#0D1117",
    cream: "#161B22",
    terracotta: "#58A6FF",
    sage: "#2F81F7",
    charcoal: "#E6EDF3",
    ivory: "#0D1117",
    ruleLight: "rgba(230,237,243,0.16)",
    ruleVert: "rgba(230,237,243,0.08)",
    barShadow: "0 1px 2px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.75)",
    overlayOpacity: 0.02,
    toolbarBg: "rgba(22,27,34,0.86)",
    pillBg: "rgba(13,17,23,0.88)",
    editorBg: "rgba(13,17,23,0.9)",
    rowHover: "rgba(88,166,255,0.08)",
    toolbarBtnBg: "rgba(230,237,243,0.08)",
    toolbarBtnBorder: "rgba(230,237,243,0.16)",
    toolbarBtnHoverBg: "rgba(88,166,255,0.2)",
    toolbarBtnHoverBorder: "rgba(88,166,255,0.4)",
  },
};
