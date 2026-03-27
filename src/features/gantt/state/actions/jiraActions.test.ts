import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  jiraAuthStatusAtom,
  jiraImportNoticeAtom,
  jiraLinkedEpicKeysAtom,
  jiraLinkedIssueKeysAtom,
  jiraIssueLinksAtom,
  jiraSyncStateAtom,
  jiraUserAtom,
} from "../jiraStore";
import { tasksAtom, timelineConfigAtom } from "../store";

import {
  beginJiraSignInAtom,
  clearJiraImportNoticeAtom,
  completeJiraSignInAtom,
  completeJiraSyncAtom,
  failJiraSignInAtom,
  failJiraSyncAtom,
  importJiraEpicAtom,
  signOutJiraAtom,
  startJiraSyncAtom,
} from "./jiraActions";

describe("jiraActions", () => {
  it("handles sign-in state transitions", () => {
    const store = createStore();

    store.set(beginJiraSignInAtom);
    expect(store.get(jiraAuthStatusAtom)).toBe("loading");

    store.set(completeJiraSignInAtom, {
      accountId: "acc-1",
      displayName: "Mila Ops",
    });

    expect(store.get(jiraAuthStatusAtom)).toBe("signed-in");
    expect(store.get(jiraUserAtom)).toEqual({
      accountId: "acc-1",
      displayName: "Mila Ops",
    });

    store.set(signOutJiraAtom);
    expect(store.get(jiraAuthStatusAtom)).toBe("signed-out");
    expect(store.get(jiraUserAtom)).toBeNull();

    store.set(failJiraSignInAtom);
    expect(store.get(jiraAuthStatusAtom)).toBe("error");
  });

  it("imports epic and creates links plus fallback notice", () => {
    const store = createStore();
    store.set(tasksAtom, []);

    store.set(importJiraEpicAtom, {
      epic: {
        key: "ENG-1",
        title: "Epic",
      },
      tasks: [{ key: "ENG-2", title: "Task" }],
    });

    const tasks = store.get(tasksAtom);
    const links = store.get(jiraIssueLinksAtom);

    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toContain("[ENG-1] - Epic");
    expect(tasks[0].subtasks).toHaveLength(1);
    expect(tasks[0].subtasks[0].name).toContain("[ENG-2] - Task");

    expect(links["ENG-1"]).toMatchObject({
      issueKey: "ENG-1",
      taskId: tasks[0].id,
      isEpic: true,
    });
    expect(links["ENG-2"]).toMatchObject({
      issueKey: "ENG-2",
      taskId: tasks[0].id,
      isEpic: false,
    });
    expect(store.get(jiraLinkedEpicKeysAtom)).toEqual(["ENG-1"]);
    expect(store.get(jiraLinkedIssueKeysAtom)).toEqual(
      expect.arrayContaining(["ENG-1", "ENG-2"])
    );

    expect(store.get(jiraImportNoticeAtom)?.fallbackCount).toBe(2);

    store.set(clearJiraImportNoticeAtom);
    expect(store.get(jiraImportNoticeAtom)).toBeNull();
  });

  it("updates imported rows when sync payload arrives", () => {
    const store = createStore();
    store.set(tasksAtom, []);
    store.set(timelineConfigAtom, {
      startDate: "2026-03-01",
      endDate: "2026-03-12",
      zoomLevel: 40,
      viewMode: "week",
      customDateRange: false,
    });

    store.set(importJiraEpicAtom, {
      epic: {
        key: "ENG-10",
        title: "Initial epic",
        startDate: "2026-03-01",
        endDate: "2026-03-05",
      },
      tasks: [
        {
          key: "ENG-11",
          title: "Initial task",
          startDate: "2026-03-02",
          endDate: "2026-03-03",
        },
        {
          key: "ENG-12",
          title: "Secondary task",
          startDate: "2026-03-02",
          endDate: "2026-03-03",
        },
      ],
    });

    store.set(startJiraSyncAtom);
    expect(store.get(jiraSyncStateAtom).isSyncing).toBe(true);

    store.set(completeJiraSyncAtom, [
      {
        key: "ENG-10",
        title: "Renamed epic",
        startDate: "2026-03-04",
        endDate: "2026-03-07",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
      {
        key: "ENG-11",
        title: "Renamed task",
        startDate: "2026-03-05",
        endDate: "2026-03-06",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
      {
        key: "ENG-999",
        title: "Untracked",
        startDate: "2026-03-01",
        endDate: "2026-03-01",
      },
    ]);

    const tasks = store.get(tasksAtom);
    const importedTask = tasks.find((task) => task.name.includes("[ENG-10]"));

    expect(importedTask).toBeDefined();
    expect(importedTask?.name).toBe("[ENG-10] - Renamed epic");
    expect(importedTask?.startDate).toBe("2026-03-04");
    expect(importedTask?.subtasks[0].name).toBe("[ENG-11] - Renamed task");
    expect(importedTask?.subtasks[0].startDate).toBe("2026-03-05");
    expect(importedTask?.subtasks[1].name).toBe("[ENG-12] - Secondary task");
    expect(store.get(timelineConfigAtom).endDate).toBe("2026-03-12");

    store.set(completeJiraSyncAtom, [
      {
        key: "ENG-10",
        title: "Renamed epic",
        startDate: "2026-02-20",
        endDate: "2026-04-20",
      },
    ]);

    expect(store.get(timelineConfigAtom)).toMatchObject({
      startDate: "2026-02-20",
      endDate: "2026-04-20",
      customDateRange: true,
    });
    expect(store.get(jiraSyncStateAtom).isSyncing).toBe(false);
    expect(store.get(jiraSyncStateAtom).lastSyncedAt).not.toBeNull();

    store.set(failJiraSyncAtom, "network");
    expect(store.get(jiraSyncStateAtom).error).toBe("network");
  });

  it("keeps import notice empty when all Jira dates are present", () => {
    const store = createStore();

    store.set(importJiraEpicAtom, {
      epic: {
        key: "ENG-30",
        title: "All dated epic",
        startDate: "2026-03-01",
        endDate: "2026-03-04",
      },
      tasks: [
        {
          key: "ENG-31",
          title: "All dated task",
          startDate: "2026-03-02",
          endDate: "2026-03-03",
        },
      ],
    });

    expect(store.get(jiraImportNoticeAtom)).toBeNull();
  });

  it("expands timeline range to include imported Jira dates", () => {
    const store = createStore();
    store.set(timelineConfigAtom, {
      startDate: "2026-03-10",
      endDate: "2026-03-20",
      zoomLevel: 40,
      viewMode: "week",
      customDateRange: false,
    });

    store.set(importJiraEpicAtom, {
      epic: {
        key: "ENG-70",
        title: "Outside range epic",
        startDate: "2026-02-01",
        endDate: "2026-04-15",
      },
      tasks: [
        {
          key: "ENG-71",
          title: "Outside range task",
          startDate: "2026-02-05",
          endDate: "2026-04-10",
        },
      ],
    });

    expect(store.get(timelineConfigAtom)).toMatchObject({
      startDate: "2026-02-01",
      endDate: "2026-04-15",
      customDateRange: true,
    });
  });

  it("prevents duplicate epic import", () => {
    const store = createStore();

    const payload = {
      epic: {
        key: "ENG-44",
        title: "Duplicate epic",
      },
      tasks: [{ key: "ENG-45", title: "Task" }],
    };

    store.set(importJiraEpicAtom, payload);
    const beforeCount = store.get(tasksAtom).length;

    store.set(importJiraEpicAtom, payload);

    expect(store.get(tasksAtom)).toHaveLength(beforeCount);
    expect(store.get(jiraImportNoticeAtom)?.message).toContain(
      "already imported"
    );
  });
});
