export type JiraAuthStatus = "signed-out" | "loading" | "signed-in" | "error";

export interface JiraUser {
  accountId: string;
  displayName: string;
}

export interface JiraIssueSummary {
  key: string;
  title: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
}

export interface JiraEpicDetails {
  epic: JiraIssueSummary;
  tasks: JiraIssueSummary[];
}

export interface JiraEpicSearchItem {
  key: string;
  title: string;
}

export interface JiraIssueLink {
  issueKey: string;
  taskId: string;
  subtaskId?: string;
  updatedAt?: string;
  isEpic: boolean;
}

export interface JiraSyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export interface JiraImportNotice {
  kind: "fallback-dates" | "duplicate-epic";
  fallbackCount: number;
  message: string;
}
