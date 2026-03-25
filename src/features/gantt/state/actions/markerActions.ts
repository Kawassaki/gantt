import { atom } from "jotai";

import type { Marker } from "../../types";
import { createMarkerId } from "../../utils/ids";
import { markersAtom } from "../store";

import { pushUndoAtom } from "./historyActions";

export const addMarkerAtom = atom(
  null,
  (get, set, markerData: Omit<Marker, "id">) => {
    set(pushUndoAtom);
    set(markersAtom, [
      ...get(markersAtom),
      { ...markerData, id: createMarkerId() },
    ]);
  }
);

export const removeMarkerAtom = atom(null, (get, set, markerId: string) => {
  set(pushUndoAtom);
  set(
    markersAtom,
    get(markersAtom).filter((marker) => marker.id !== markerId)
  );
});

export const updateMarkerAtom = atom(
  null,
  (get, set, updatedMarker: Marker) => {
    set(pushUndoAtom);
    set(
      markersAtom,
      get(markersAtom).map((marker) =>
        marker.id === updatedMarker.id ? updatedMarker : marker
      )
    );
  }
);
