import { format } from "date-fns";
import { atom } from "jotai";

import { DEFAULT_TASK_COLORS } from "../../constants";
import type { Task, TimelineConfig } from "../../types";
import type {
  JiraEpicDetails,
  JiraIssueSummary,
  JiraIssueLink,
  JiraUser,
} from "../../types/jira";
import { createSubtaskId, createTaskId } from "../../utils/ids";
import {
  buildTaskFromJiraEpic,
  formatJiraItemName,
  resolveJiraDateRange,
} from "../../utils/jiraMappers";
import {
  jiraAuthStatusAtom,
  jiraImportNoticeAtom,
  jiraIssueLinksAtom,
  jiraSyncStateAtom,
  jiraUserAtom,
} from "../jiraStore";
import { tasksAtom, timelineConfigAtom } from "../store";

import { pushUndoAtom } from "./historyActions";

const todayAsDate = (): Date => new Date();
const todayAsIso = (): string =>
  format(todayAsDate(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

const patchIssueLink = (
  links: Record<string, JiraIssueLink>,
  nextLink: JiraIssueLink
): Record<string, JiraIssueLink> => ({
  ...links,
  [nextLink.issueKey]: nextLink,
});

const patchTaskForIssue = (
  task: Task,
  issue: JiraIssueSummary,
  link: JiraIssueLink,
  now: Date
): Task => {
  const issueDateRange = resolveJiraDateRange(issue, now);

  if (link.subtaskId) {
    return {
      ...task,
      subtasks: task.subtasks.map((subtask) =>
        subtask.id === link.subtaskId
          ? {
              ...subtask,
              name: formatJiraItemName(issue.key, issue.title),
              startDate: issueDateRange.startDate,
              endDate: issueDateRange.endDate,
            }
          : subtask
      ),
    };
  }

  return {
    ...task,
    name: formatJiraItemName(issue.key, issue.title),
    startDate: issueDateRange.startDate,
    endDate: issueDateRange.endDate,
  };
};

const expandTimelineRangeForTask = (
  currentRange: TimelineConfig,
  task: Task
): TimelineConfig => {
  const allDates = [task.startDate, task.endDate];
  task.subtasks.forEach((subtask) => {
    allDates.push(subtask.startDate, subtask.endDate);
  });

  const nextStartDate = allDates.reduce(
    (earliestDate, currentDate) =>
      currentDate < earliestDate ? currentDate : earliestDate,
    currentRange.startDate
  );
  const nextEndDate = allDates.reduce(
    (latestDate, currentDate) =>
      currentDate > latestDate ? currentDate : latestDate,
    currentRange.endDate
  );

  if (
    nextStartDate === currentRange.startDate &&
    nextEndDate === currentRange.endDate
  ) {
    return currentRange;
  }

  return {
    ...currentRange,
    startDate: nextStartDate,
    endDate: nextEndDate,
    customDateRange: true,
  };
};

const expandTimelineRangeForTasks = (
  currentRange: TimelineConfig,
  tasks: Task[]
): TimelineConfig =>
  tasks.reduce(
    (range, task) => expandTimelineRangeForTask(range, task),
    currentRange
  );

export const beginJiraSignInAtom = atom(null, (_get, set) => {
  set(jiraAuthStatusAtom, "loading");
});

export const completeJiraSignInAtom = atom(
  null,
  (_get, set, user: JiraUser) => {
    set(jiraUserAtom, user);
    set(jiraAuthStatusAtom, "signed-in");
    set(jiraSyncStateAtom, {
      isSyncing: false,
      error: null,
      lastSyncedAt: null,
    });
  }
);

export const failJiraSignInAtom = atom(null, (_get, set) => {
  set(jiraAuthStatusAtom, "error");
});

export const signOutJiraAtom = atom(null, (_get, set) => {
  set(jiraUserAtom, null);
  set(jiraAuthStatusAtom, "signed-out");
  set(jiraSyncStateAtom, {
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });
});

export const importJiraEpicAtom = atom(
  null,
  (get, set, details: JiraEpicDetails) => {
    const existingLinks = get(jiraIssueLinksAtom);
    if (existingLinks[details.epic.key]) {
      set(jiraImportNoticeAtom, {
        fallbackCount: 0,
        message: `${details.epic.key} is already imported in this timeline.`,
      });
      return;
    }

    const tasks = get(tasksAtom);
    const nextColor =
      DEFAULT_TASK_COLORS[tasks.length % DEFAULT_TASK_COLORS.length];

    const now = todayAsDate();
    const { task, fallbackCount } = buildTaskFromJiraEpic(
      details,
      nextColor,
      now,
      {
        createTaskId,
        createSubtaskId,
      }
    );

    set(pushUndoAtom);
    set(tasksAtom, [...tasks, task]);
    set(timelineConfigAtom, (currentRange) =>
      expandTimelineRangeForTask(currentRange, task)
    );

    let links = existingLinks;
    links = patchIssueLink(links, {
      issueKey: details.epic.key,
      taskId: task.id,
      isEpic: true,
      updatedAt: details.epic.updatedAt,
    });

    task.subtasks.forEach((subtask, index) => {
      const issue = details.tasks[index];
      links = patchIssueLink(links, {
        issueKey: issue.key,
        taskId: task.id,
        subtaskId: subtask.id,
        isEpic: false,
        updatedAt: issue.updatedAt,
      });
    });

    set(jiraIssueLinksAtom, links);

    if (fallbackCount > 0) {
      set(jiraImportNoticeAtom, {
        fallbackCount,
        message: `${fallbackCount} Jira item(s) had no dates. Defaulted to today and +7 days.`,
      });
    } else {
      set(jiraImportNoticeAtom, null);
    }
  }
);

export const clearJiraImportNoticeAtom = atom(null, (_get, set) => {
  set(jiraImportNoticeAtom, null);
});

export const startJiraSyncAtom = atom(null, (_get, set) => {
  const previous = _get(jiraSyncStateAtom);
  set(jiraSyncStateAtom, {
    ...previous,
    isSyncing: true,
    error: null,
  });
});

export const completeJiraSyncAtom = atom(
  null,
  (get, set, updates: JiraIssueSummary[]) => {
    const links = get(jiraIssueLinksAtom);
    const now = todayAsDate();

    const nextTasks = get(tasksAtom).map((task) => {
      let nextTask = task;
      updates.forEach((issue) => {
        const link = links[issue.key];
        if (!link || link.taskId !== task.id) return;
        nextTask = patchTaskForIssue(nextTask, issue, link, now);
      });
      return nextTask;
    });

    let nextLinks = links;
    updates.forEach((issue) => {
      const link = links[issue.key];
      if (!link) return;
      nextLinks = patchIssueLink(nextLinks, {
        ...link,
        updatedAt: issue.updatedAt,
      });
    });

    set(tasksAtom, nextTasks);
    set(timelineConfigAtom, (currentRange) =>
      expandTimelineRangeForTasks(currentRange, nextTasks)
    );
    set(jiraIssueLinksAtom, nextLinks);
    set(jiraSyncStateAtom, {
      isSyncing: false,
      error: null,
      lastSyncedAt: todayAsIso(),
    });
  }
);

export const failJiraSyncAtom = atom(null, (get, set, errorMessage: string) => {
  const previous = get(jiraSyncStateAtom);
  set(jiraSyncStateAtom, {
    ...previous,
    isSyncing: false,
    error: errorMessage,
  });
});
