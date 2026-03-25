import { describe, expect, it } from "vitest";

import { parseConfigDate, toConfigDate } from "./dateConfig";

describe("dateConfig utilities", () => {
  it("parses valid ISO date string", () => {
    const parsedDate = parseConfigDate("2026-03-25");
    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate?.toISOString().slice(0, 10)).toBe("2026-03-25");
  });

  it("returns undefined for invalid date string", () => {
    expect(parseConfigDate("invalid-date")).toBeUndefined();
  });

  it("formats Date into config date string", () => {
    expect(toConfigDate(new Date("2026-03-25T12:00:00.000Z"))).toBe(
      "2026-03-25"
    );
  });
});
