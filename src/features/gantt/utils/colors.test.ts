import { describe, expect, it } from "vitest";

import { darkenHex } from "./colors";

describe("darkenHex", () => {
  it("darkens a color using default amount", () => {
    expect(darkenHex("#6699CC")).toBe("rgb(56,107,158)");
  });

  it("darkens a color using a custom amount", () => {
    expect(darkenHex("#336699", 0.1)).toBe("rgb(25,76,127)");
  });
});
