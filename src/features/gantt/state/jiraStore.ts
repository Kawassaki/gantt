import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { STORAGE_KEYS } from "../constants";
import type {
  JiraAuthStatus,
  JiraImportNotice,
  JiraIssueLink,
  JiraSyncState,
  JiraUser,
} from "../types/jira";

export const jiraAuthStatusAtom = atomWithStorage<JiraAuthStatus>(
  STORAGE_KEYS.jiraAuthStatus,
  "signed-out"
);

export const jiraUserAtom = atomWithStorage<JiraUser | null>(
  STORAGE_KEYS.jiraUser,
  null
);

export const jiraIssueLinksAtom = atomWithStorage<
  Record<string, JiraIssueLink>
>(STORAGE_KEYS.jiraIssueLinks, {});

export const jiraImportNoticeAtom = atom<JiraImportNotice | null>(null);

export const jiraSyncStateAtom = atom<JiraSyncState>({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
});

export const jiraLinkedEpicKeysAtom = atom((get) =>
  Object.values(get(jiraIssueLinksAtom))
    .filter((link) => link.isEpic)
    .map((link) => link.issueKey)
);

export const jiraLinkedIssueKeysAtom = atom((get) =>
  Object.values(get(jiraIssueLinksAtom)).map((link) => link.issueKey)
);
