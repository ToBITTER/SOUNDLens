import crypto from "crypto";

export function createCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
