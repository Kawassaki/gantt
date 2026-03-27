import type { JiraServerEpicDetails, JiraServerIssue } from "./types";

interface AtlassianResource {
  id: string;
  name: string;
}

interface AtlassianUser {
  accountId: string;
  displayName: string;
}

interface JiraSearchResponse {
  issues: Array<{
    key: string;
    fields: {
      summary: string;
      updated?: string;
      issuetype?: { name?: string };
      parent?: { key?: string };
      duedate?: string;
      customfield_10015?: string;
      customfield_10016?: string;
    };
  }>;
}

const toJiraIssue = (
  issue: JiraSearchResponse["issues"][number]
): JiraServerIssue => ({
  key: issue.key,
  title: issue.fields.summary,
  startDate: issue.fields.customfield_10015,
  endDate: issue.fields.duedate ?? issue.fields.customfield_10016,
  updatedAt: issue.fields.updated,
});

const getJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T & { errorMessages?: string[] };

  if (!response.ok) {
    const message =
      (payload as { errorMessages?: string[] }).errorMessages?.join(", ") ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
};

export const fetchAtlassianCloudId = async (
  fetchImpl: typeof fetch,
  accessToken: string
): Promise<string> => {
  const response = await fetchImpl(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const resources = await getJson<AtlassianResource[]>(response);

  if (!resources[0]) {
    throw new Error("No accessible Jira cloud resource found for this user");
  }

  return resources[0].id;
};

export const fetchAtlassianCurrentUser = async (
  fetchImpl: typeof fetch,
  accessToken: string,
  cloudId: string
): Promise<AtlassianUser> => {
  const response = await fetchImpl(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const user = await getJson<AtlassianUser>(response);
  return { accountId: user.accountId, displayName: user.displayName };
};

const jiraSearch = async (
  fetchImpl: typeof fetch,
  accessToken: string,
  cloudId: string,
  jql: string
): Promise<JiraServerIssue[]> => {
  const response = await fetchImpl(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jql,
        maxResults: 50,
        fields: [
          "summary",
          "updated",
          "duedate",
          "customfield_10015",
          "customfield_10016",
          "issuetype",
          "parent",
        ],
      }),
    }
  );

  const payload = await getJson<JiraSearchResponse>(response);
  return payload.issues.map(toJiraIssue);
};

export const searchAtlassianEpics = async (
  fetchImpl: typeof fetch,
  accessToken: string,
  cloudId: string,
  query: string
): Promise<Array<{ key: string; title: string }>> => {
  const escaped = query.replace(/"/g, '\\"');
  const jql =
    query.trim().length > 0
      ? `issuetype = Epic AND (summary ~ "${escaped}" OR key ~ "${escaped}") ORDER BY updated DESC`
      : "issuetype = Epic ORDER BY updated DESC";

  const issues = await jiraSearch(fetchImpl, accessToken, cloudId, jql);
  return issues.map((issue) => ({ key: issue.key, title: issue.title }));
};

export const fetchAtlassianEpicDetails = async (
  fetchImpl: typeof fetch,
  accessToken: string,
  cloudId: string,
  epicKey: string
): Promise<JiraServerEpicDetails> => {
  const epics = await jiraSearch(
    fetchImpl,
    accessToken,
    cloudId,
    `key = "${epicKey}"`
  );

  if (!epics[0]) {
    throw new Error(`Epic ${epicKey} not found`);
  }

  const children = await jiraSearch(
    fetchImpl,
    accessToken,
    cloudId,
    `parent = "${epicKey}" OR "Epic Link" = "${epicKey}" ORDER BY updated DESC`
  );

  return {
    epic: epics[0],
    tasks: children.filter((issue) => issue.key !== epicKey),
  };
};

export const fetchAtlassianIssueSync = async (
  fetchImpl: typeof fetch,
  accessToken: string,
  cloudId: string,
  issueKeys: string[]
): Promise<JiraServerIssue[]> => {
  if (issueKeys.length === 0) return [];
  const quoted = issueKeys.map((key) => `"${key}"`).join(",");
  const jql = `key in (${quoted})`;

  return jiraSearch(fetchImpl, accessToken, cloudId, jql);
};
