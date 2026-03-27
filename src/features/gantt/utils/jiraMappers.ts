import { addDays, format } from "date-fns";

import type { Task } from "../types";
import type { JiraEpicDetails, JiraIssueSummary } from "../types/jira";

export interface DateRangeResolution {
  startDate: string;
  endDate: string;
  usedFallback: boolean;
}

export interface JiraTaskBuildResult {
  task: Task;
  fallbackCount: number;
}

export const formatJiraItemName = (key: string, title: string): string => {
  const normalizedKey = key.trim().toUpperCase();
  const normalizedTitle = title.trim();
  return `[${normalizedKey}] - ${normalizedTitle}`;
};

const toIsoDate = (value: Date): string => format(value, "yyyy-MM-dd");

export const resolveJiraDateRange = (
  issue: JiraIssueSummary,
  now: Date
): DateRangeResolution => {
  if (issue.startDate && issue.endDate) {
    return {
      startDate: issue.startDate,
      endDate: issue.endDate,
      usedFallback: false,
    };
  }

  return {
    startDate: toIsoDate(now),
    endDate: toIsoDate(addDays(now, 7)),
    usedFallback: true,
  };
};

export const buildTaskFromJiraEpic = (
  details: JiraEpicDetails,
  color: string,
  now: Date,
  idFactory: { createTaskId: () => string; createSubtaskId: () => string }
): JiraTaskBuildResult => {
  const epicRange = resolveJiraDateRange(details.epic, now);
  let fallbackCount = epicRange.usedFallback ? 1 : 0;

  const task: Task = {
    id: idFactory.createTaskId(),
    name: formatJiraItemName(details.epic.key, details.epic.title),
    startDate: epicRange.startDate,
    endDate: epicRange.endDate,
    color,
    progress: 0,
    subtasks: details.tasks.map((issue) => {
      const issueRange = resolveJiraDateRange(issue, now);
      if (issueRange.usedFallback) {
        fallbackCount += 1;
      }
      return {
        id: idFactory.createSubtaskId(),
        name: formatJiraItemName(issue.key, issue.title),
        startDate: issueRange.startDate,
        endDate: issueRange.endDate,
        color,
      };
    }),
  };

  return { task, fallbackCount };
};
