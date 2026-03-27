import type { IncomingMessage } from "node:http";

export const JIRA_SESSION_COOKIE_NAME = "jira_dev_session";

export const getJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => resolve());
    req.on("error", reject);
  });

  const rawBody = Buffer.concat(chunks).toString("utf-8");
  if (!rawBody) {
    return {} as T;
  }

  return JSON.parse(rawBody) as T;
};

export const getCookieValue = (
  req: IncomingMessage,
  cookieName: string
): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;

  const cookies = header.split(";").map((entry) => entry.trim());
  const target = cookies.find((entry) => entry.startsWith(`${cookieName}=`));
  if (!target) return undefined;

  return decodeURIComponent(target.slice(cookieName.length + 1));
};

export const createCookieHeader = (
  value: string,
  maxAgeSeconds = 60 * 60 * 8,
  secure = process.env.NODE_ENV === "production"
): string =>
  `${JIRA_SESSION_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;

export const createClearedCookieHeader = (
  secure = process.env.NODE_ENV === "production"
): string =>
  `${JIRA_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
