import { describe, expect, it } from "vitest";

import { earthGlobalStyles } from "./earthGlobalStyles";

describe("earthGlobalStyles", () => {
  it("contains core class rules used by the screen", () => {
    expect(earthGlobalStyles).toContain(".earth-bar");
    expect(earthGlobalStyles).toContain(".earth-subtask-bar");
    expect(earthGlobalStyles).toContain(".earth-toolbar-btn");
    expect(earthGlobalStyles).toContain("@keyframes earth-subrow-in");
  });
});
