import type {
  JiraEpicDetails,
  JiraEpicSearchItem,
  JiraIssueSummary,
  JiraUser,
} from "../types/jira";

interface FetchResponse<T> {
  data: T;
}

export interface JiraClient {
  signIn: () => Promise<JiraUser | null>;
  restoreSession: () => Promise<JiraUser | null>;
  signOut: () => Promise<void>;
  searchEpics: (query: string) => Promise<JiraEpicSearchItem[]>;
  getEpicDetails: (epicKey: string) => Promise<JiraEpicDetails>;
  syncIssues: (issueKeys: string[]) => Promise<JiraIssueSummary[]>;
}

interface CreateJiraClientOptions {
  fetchImpl?: typeof fetch;
  useMock?: boolean;
}

interface JiraSignInResponse {
  accountId?: string;
  displayName?: string;
  authUrl?: string;
}

const mockUser: JiraUser = {
  accountId: "mock-account-1",
  displayName: "Ari Sprint",
};

const mockEpicData: JiraEpicDetails[] = [
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

const httpError = (message: string): Error => new Error(`Jira API: ${message}`);

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw httpError(`request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FetchResponse<T>;
  return payload.data;
};

export const createJiraClient = (
  options: CreateJiraClientOptions = {}
): JiraClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const useMock =
    options.useMock ??
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_JIRA_MOCK !== "false");

  const signIn = async (): Promise<JiraUser | null> => {
    if (useMock) {
      return mockUser;
    }

    const response = await fetchImpl("/api/jira/auth/sign-in", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnTo: window.location.pathname }),
    });
    const payload = await parseJson<JiraSignInResponse>(response);

    if (payload.authUrl) {
      window.location.assign(payload.authUrl);
      return null;
    }

    if (payload.accountId && payload.displayName) {
      return {
        accountId: payload.accountId,
        displayName: payload.displayName,
      };
    }

    throw httpError("unexpected sign-in payload");
  };

  const restoreSession = async (): Promise<JiraUser | null> => {
    if (useMock) {
      return mockUser;
    }

    const response = await fetchImpl("/api/jira/auth/me", {
      credentials: "include",
    });

    if (response.status === 401) {
      return null;
    }

    return parseJson<JiraUser>(response);
  };

  const signOut = async (): Promise<void> => {
    if (useMock) {
      return;
    }

    const response = await fetchImpl("/api/jira/auth/sign-out", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw httpError(`sign-out failed with status ${response.status}`);
    }
  };

  const searchEpics = async (query: string): Promise<JiraEpicSearchItem[]> => {
    if (useMock) {
      const normalized = query.trim().toUpperCase();
      return mockEpicData
        .filter((item) => {
          const key = item.epic.key.toUpperCase();
          const title = item.epic.title.toUpperCase();
          return key.includes(normalized) || title.includes(normalized);
        })
        .map((item) => ({ key: item.epic.key, title: item.epic.title }));
    }

    const params = new URLSearchParams({ query });
    const response = await fetchImpl(`/api/jira/epics/search?${params}`, {
      credentials: "include",
    });
    return parseJson<JiraEpicSearchItem[]>(response);
  };

  const getEpicDetails = async (epicKey: string): Promise<JiraEpicDetails> => {
    if (useMock) {
      const found = mockEpicData.find((item) => item.epic.key === epicKey);
      if (!found) {
        throw httpError(`epic ${epicKey} not found`);
      }
      return found;
    }

    const response = await fetchImpl(`/api/jira/epics/${epicKey}`, {
      credentials: "include",
    });
    return parseJson<JiraEpicDetails>(response);
  };

  const syncIssues = async (
    issueKeys: string[]
  ): Promise<JiraIssueSummary[]> => {
    if (useMock) {
      return mockEpicData
        .flatMap((epic) => [epic.epic, ...epic.tasks])
        .filter((issue) => issueKeys.includes(issue.key));
    }

    const response = await fetchImpl("/api/jira/issues/sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueKeys }),
    });
    return parseJson<JiraIssueSummary[]>(response);
  };

  return {
    signIn,
    restoreSession,
    signOut,
    searchEpics,
    getEpicDetails,
    syncIssues,
  };
};

export const jiraClient = createJiraClient();
