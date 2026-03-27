import { describe, expect, it } from "vitest";

import {
  buildTaskFromJiraEpic,
  formatJiraItemName,
  resolveJiraDateRange,
} from "./jiraMappers";

describe("jiraMappers", () => {
  it("formats Jira item names in CODE + title pattern", () => {
    expect(formatJiraItemName(" eng-10 ", " Build auth ")).toBe(
      "[ENG-10] - Build auth"
    );
  });

  it("uses issue dates when provided", () => {
    const resolved = resolveJiraDateRange(
      {
        key: "ENG-1",
        title: "Issue",
        startDate: "2026-03-01",
        endDate: "2026-03-03",
      },
      new Date("2026-03-20T00:00:00.000Z")
    );

    expect(resolved).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-03-03",
      usedFallback: false,
    });
  });

  it("falls back to today plus seven days when issue dates are missing", () => {
    const resolved = resolveJiraDateRange(
      { key: "ENG-1", title: "Issue" },
      new Date("2026-03-20T10:00:00.000Z")
    );

    expect(resolved).toEqual({
      startDate: "2026-03-20",
      endDate: "2026-03-27",
      usedFallback: true,
    });
  });

  it("builds task and subtasks while counting fallback dates", () => {
    const result = buildTaskFromJiraEpic(
      {
        epic: {
          key: "ENG-1",
          title: "Main epic",
          startDate: "2026-03-01",
          endDate: "2026-03-05",
        },
        tasks: [
          {
            key: "ENG-2",
            title: "Has dates",
            startDate: "2026-03-02",
            endDate: "2026-03-03",
          },
          { key: "ENG-3", title: "No dates" },
        ],
      },
      "#123456",
      new Date("2026-03-20T10:00:00.000Z"),
      {
        createTaskId: () => "task-1",
        createSubtaskId: () => "sub-1",
      }
    );

    expect(result.fallbackCount).toBe(1);
    expect(result.task).toEqual({
      id: "task-1",
      name: "[ENG-1] - Main epic",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      color: "#123456",
      progress: 0,
      subtasks: [
        {
          id: "sub-1",
          name: "[ENG-2] - Has dates",
          startDate: "2026-03-02",
          endDate: "2026-03-03",
          color: "#123456",
        },
        {
          id: "sub-1",
          name: "[ENG-3] - No dates",
          startDate: "2026-03-20",
          endDate: "2026-03-27",
          color: "#123456",
        },
      ],
    });
  });
});
