import type { JiraServerEpicDetails, JiraServerIssue } from "./types";

export const jiraDevEpics: JiraServerEpicDetails[] = [
  {
    epic: {
      key: "ENG-100",
      title: "Command center rollout",
      startDate: "2026-03-20",
      endDate: "2026-04-03",
      updatedAt: "2026-03-27T08:00:00.000Z",
    },
    tasks: [
      {
        key: "ENG-104",
        title: "Integrate Jira auth",
        startDate: "2026-03-22",
        endDate: "2026-03-26",
        updatedAt: "2026-03-27T08:00:00.000Z",
      },
      {
        key: "ENG-105",
        title: "Build sidepanel importer",
        updatedAt: "2026-03-27T08:00:00.000Z",
      },
    ],
  },
  {
    epic: {
      key: "ENG-200",
      title: "Realtime sync hardening",
      updatedAt: "2026-03-27T10:10:00.000Z",
    },
    tasks: [
      {
        key: "ENG-201",
        title: "Add sync cursor",
        updatedAt: "2026-03-27T09:20:00.000Z",
      },
    ],
  },
];

export const flattenJiraIssues = (): JiraServerIssue[] =>
  jiraDevEpics.flatMap((epicDetails) => [
    epicDetails.epic,
    ...epicDetails.tasks,
  ]);
