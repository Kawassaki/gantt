import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { markersAtom } from "../store";

import {
  addMarkerAtom,
  removeMarkerAtom,
  updateMarkerAtom,
} from "./markerActions";

const baseMarker = {
  id: "m-1",
  date: "2026-01-01",
  label: "Marker 1",
  color: "#123456",
};

describe("markerActions", () => {
  it("adds marker with generated id", () => {
    const store = createStore();
    store.set(markersAtom, []);

    store.set(addMarkerAtom, {
      date: "2026-01-02",
      label: "New Marker",
      color: "#654321",
    });

    const markers = store.get(markersAtom);
    expect(markers).toHaveLength(1);
    expect(markers[0].id.startsWith("m-")).toBe(true);
  });

  it("updates a marker", () => {
    const store = createStore();
    store.set(markersAtom, [
      baseMarker,
      { ...baseMarker, id: "m-2", label: "Keep" },
    ]);

    store.set(updateMarkerAtom, { ...baseMarker, label: "Updated Marker" });

    expect(store.get(markersAtom)[0].label).toBe("Updated Marker");
    expect(store.get(markersAtom)[1].label).toBe("Keep");
  });

  it("removes marker by id", () => {
    const store = createStore();
    store.set(markersAtom, [baseMarker, { ...baseMarker, id: "m-2" }]);

    store.set(removeMarkerAtom, "m-1");

    expect(store.get(markersAtom).map((marker) => marker.id)).toEqual(["m-2"]);
  });
});
