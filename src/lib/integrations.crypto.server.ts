import { createHash, randomBytes, webcrypto } from "node:crypto";
import { z } from "zod";

type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
};

const encryptedTokensSchema = z.object({
  version: z.literal(1),
  iv: z.string(),
  ciphertext: z.string(),
});

const tokenSetSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_at: z.number(),
  token_type: z.string(),
});

export async function encryptProviderTokens(tokens: TokenSet, keyBytes: Uint8Array) {
  const iv = randomBytes(12);
  const key = await webcrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(tokens)),
  );
  return {
    version: 1 as const,
    iv: iv.toString("base64"),
    ciphertext: Buffer.from(encrypted).toString("base64"),
  };
}

export async function decryptProviderTokens(
  value: unknown,
  keyBytes: Uint8Array,
): Promise<TokenSet> {
  const encrypted = encryptedTokensSchema.parse(value);
  const key = await webcrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const clear = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(encrypted.iv, "base64") },
    key,
    Buffer.from(encrypted.ciphertext, "base64"),
  );
  const parsed = tokenSetSchema.parse(JSON.parse(new TextDecoder().decode(clear)));
  return {
    access_token: parsed.access_token,
    ...(parsed.refresh_token ? { refresh_token: parsed.refresh_token } : {}),
    expires_at: parsed.expires_at,
    token_type: parsed.token_type,
  };
}

export function stableLmsImportId(provider: string, userId: string, sourceId: string) {
  const digest = createHash("sha256").update(`${userId}:${sourceId}`).digest("hex").slice(0, 32);
  return `provider:${provider}:${digest}`;
}

export function stableCalendarEventId(userId: string, sourceId: string) {
  return createHash("sha256").update(`${userId}:${sourceId}`).digest("hex");
}
