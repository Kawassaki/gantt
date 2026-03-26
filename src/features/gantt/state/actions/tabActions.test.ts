import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  activeTabIdAtom,
  tabsAtom,
  timelineDataByTabAtom,
  undoStackByTabAtom,
  redoStackByTabAtom,
} from "../store";

import {
  createTimelineTabAtom,
  deleteTimelineTabAtom,
  recolorTimelineTabAtom,
  renameTimelineTabAtom,
  reorderTimelineTabsAtom,
} from "./tabActions";

describe("tabActions", () => {
  it("creates a fresh timeline tab and activates it", () => {
    const store = createStore();
    const before = store.get(tabsAtom).length;

    store.set(createTimelineTabAtom, { title: "Ops" });

    const tabs = store.get(tabsAtom);
    expect(tabs).toHaveLength(before + 1);
    const created = tabs[tabs.length - 1];
    expect(created.title).toBe("Ops");
    expect(store.get(activeTabIdAtom)).toBe(created.id);
    expect(store.get(timelineDataByTabAtom)[created.id].tasks[0].name).toBe(
      "Starter Task"
    );
  });

  it("renames and recolors a tab", () => {
    const store = createStore();
    const currentTab = store.get(tabsAtom)[0];

    store.set(renameTimelineTabAtom, {
      tabId: currentTab.id,
      title: "  Product  ",
    });
    store.set(recolorTimelineTabAtom, {
      tabId: currentTab.id,
      color: "#36B37E",
    });

    const updated = store.get(tabsAtom).find((tab) => tab.id === currentTab.id);
    expect(updated?.title).toBe("Product");
    expect(updated?.color).toBe("#36B37E");
  });

  it("ignores empty rename and unknown recolor target", () => {
    const store = createStore();
    const originalTab = store.get(tabsAtom)[0];

    store.set(renameTimelineTabAtom, { tabId: originalTab.id, title: "   " });
    store.set(recolorTimelineTabAtom, { tabId: "missing", color: "#FF5630" });

    const next = store.get(tabsAtom)[0];
    expect(next.title).toBe(originalTab.title);
    expect(next.color).toBe(originalTab.color);
  });

  it("reorders tabs", () => {
    const store = createStore();
    store.set(createTimelineTabAtom, { title: "A" });
    store.set(createTimelineTabAtom, { title: "B" });

    const before = store.get(tabsAtom).map((tab) => tab.title);
    const fromIndex = before.indexOf("A");
    const toIndex = before.indexOf("B");

    store.set(reorderTimelineTabsAtom, { fromIndex, toIndex });

    const after = store.get(tabsAtom).map((tab) => tab.title);
    expect(after.indexOf("A")).toBe(toIndex);
  });

  it("keeps order when reorder indices are invalid", () => {
    const store = createStore();
    const before = store.get(tabsAtom).map((tab) => tab.id);

    store.set(reorderTimelineTabsAtom, { fromIndex: 0, toIndex: 0 });

    expect(store.get(tabsAtom).map((tab) => tab.id)).toEqual(before);
  });

  it("deletes selected tab and switches active tab", () => {
    const store = createStore();
    store.set(createTimelineTabAtom, { title: "Delete Me" });

    const tabs = store.get(tabsAtom);
    const deleteMe = tabs.find((tab) => tab.title === "Delete Me");
    expect(deleteMe).toBeDefined();

    store.set(deleteTimelineTabAtom, deleteMe!.id);

    expect(store.get(tabsAtom).some((tab) => tab.id === deleteMe!.id)).toBe(
      false
    );
    expect(store.get(activeTabIdAtom)).not.toBe(deleteMe!.id);
    expect(store.get(timelineDataByTabAtom)[deleteMe!.id]).toBeUndefined();
  });

  it("keeps active tab when deleting a non-active tab", () => {
    const store = createStore();
    const initialActive = store.get(activeTabIdAtom);
    store.set(createTimelineTabAtom, { title: "To Remove" });
    const removable = store
      .get(tabsAtom)
      .find((tab) => tab.title === "To Remove");
    expect(removable).toBeDefined();

    store.set(activeTabIdAtom, initialActive);
    store.set(deleteTimelineTabAtom, removable!.id);

    expect(store.get(activeTabIdAtom)).toBe(initialActive);
  });

  it("deleting last tab auto-creates a default replacement", () => {
    const store = createStore();
    const initial = store.get(tabsAtom)[0];
    store.set(undoStackByTabAtom, {
      [initial.id]: [{ tasks: [], markers: [] }],
    });
    store.set(redoStackByTabAtom, {
      [initial.id]: [{ tasks: [], markers: [] }],
    });

    store.set(deleteTimelineTabAtom, initial.id);

    const tabs = store.get(tabsAtom);
    expect(tabs).toHaveLength(1);
    const onlyTab = tabs[0];
    expect(onlyTab.id).not.toBe(initial.id);
    expect(store.get(activeTabIdAtom)).toBe(onlyTab.id);
    expect(store.get(timelineDataByTabAtom)[onlyTab.id]).toBeDefined();
    expect(store.get(undoStackByTabAtom)[initial.id]).toBeUndefined();
    expect(store.get(redoStackByTabAtom)[initial.id]).toBeUndefined();
  });
});
