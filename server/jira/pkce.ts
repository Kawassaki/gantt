import { createHash, randomBytes } from "node:crypto";

const toBase64Url = (value: Buffer): string =>
  value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const generateRandomToken = (bytes = 32): string =>
  toBase64Url(randomBytes(bytes));

export const generatePkceVerifier = (): string => generateRandomToken(64);

export const generatePkceChallenge = (verifier: string): string =>
  toBase64Url(createHash("sha256").update(verifier).digest());
