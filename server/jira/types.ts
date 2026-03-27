export interface JiraServerIssue {
  key: string;
  title: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
}

export interface JiraServerEpicDetails {
  epic: JiraServerIssue;
  tasks: JiraServerIssue[];
}

export interface JiraServerSession {
  id: string;
  accountId?: string;
  displayName?: string;
  cloudId?: string;
}

export interface JiraTokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAtMs: number;
}

export interface JiraOAuthState {
  state: string;
  codeVerifier: string;
  sessionId: string;
  returnTo: string;
  expiresAtMs: number;
}

export interface JiraProviderConfig {
  providerMode: "mock" | "atlassian";
  frontendBaseUrl: string;
  callbackPath: string;
  jiraScopes: string[];
  clientId?: string;
  clientSecret?: string;
  encryptionKey?: string;
}
