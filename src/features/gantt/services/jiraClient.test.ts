import { describe, expect, it, vi } from "vitest";

import { createJiraClient } from "./jiraClient";

describe("jiraClient", () => {
  it("returns mock responses when mock mode is enabled", async () => {
    const client = createJiraClient({ useMock: true });

    const user = await client.signIn();
    if (!user) {
      throw new Error("Expected mock user to be returned in mock mode");
    }
    const session = await client.restoreSession();
    const epics = await client.searchEpics("eng");
    const titleMatches = await client.searchEpics("hardening");
    const details = await client.getEpicDetails(epics[0].key);
    const updates = await client.syncIssues([details.epic.key]);

    expect(user.displayName).toBeDefined();
    expect(session?.accountId).toBe(user.accountId);
    expect(epics.length).toBeGreaterThan(0);
    expect(titleMatches[0].key).toBe("ENG-200");
    expect(details.epic.key).toBe(epics[0].key);
    expect(updates[0].key).toBe(details.epic.key);

    const emptyResults = await client.searchEpics("zzz");
    const noUpdates = await client.syncIssues(["ENG-999"]);

    expect(emptyResults).toEqual([]);
    expect(noUpdates).toEqual([]);
    await expect(client.signOut()).resolves.toBeUndefined();
    await expect(client.getEpicDetails("ENG-999")).rejects.toThrow("not found");
  });

  it("uses backend endpoints when mock mode is disabled", async () => {
    const assignMock = vi.fn();
    vi.stubGlobal("window", {
      location: {
        pathname: "/",
        assign: assignMock,
      },
    });

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { authUrl: "https://auth.atlassian.com/example" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ key: "ENG-1", title: "Epic" }] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              epic: { key: "ENG-1", title: "Epic" },
              tasks: [],
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ key: "ENG-1", title: "Epic" }] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { accountId: "1", displayName: "Nia" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const client = createJiraClient({ useMock: false, fetchImpl: fetchMock });

    const user = await client.signIn();
    const session = await client.restoreSession();
    const epics = await client.searchEpics("ENG");
    const details = await client.getEpicDetails("ENG-1");
    const updates = await client.syncIssues(["ENG-1"]);
    await client.signOut();

    expect(user).toBeNull();
    expect(assignMock).toHaveBeenCalledWith(
      "https://auth.atlassian.com/example"
    );
    expect(session).toBeNull();
    expect(epics[0].key).toBe("ENG-1");
    expect(details.epic.key).toBe("ENG-1");
    expect(updates[0].key).toBe("ENG-1");

    const last = await client.signIn();
    if (!last) {
      throw new Error("Expected backend sign-in payload with user info");
    }
    expect(last.accountId).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(7);

    vi.unstubAllGlobals();
  });

  it("throws on failed backend response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = createJiraClient({ useMock: false, fetchImpl: fetchMock });

    await expect(client.searchEpics("ENG")).rejects.toThrow("Jira API");
  });

  it("throws when sign-in returns an unexpected payload", async () => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/",
        assign: vi.fn(),
      },
    });

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = createJiraClient({ useMock: false, fetchImpl: fetchMock });

    await expect(client.signIn()).rejects.toThrow("unexpected sign-in payload");
    vi.unstubAllGlobals();
  });

  it("throws when backend sign-out fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 500 }));
    const client = createJiraClient({ useMock: false, fetchImpl: fetchMock });

    await expect(client.signOut()).rejects.toThrow("sign-out failed");
  });

  it("restores active backend session when auth endpoint returns 200", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { accountId: "2", displayName: "Rin" } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    const client = createJiraClient({ useMock: false, fetchImpl: fetchMock });

    await expect(client.restoreSession()).resolves.toEqual({
      accountId: "2",
      displayName: "Rin",
    });
  });
});
