import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const INTEGRATION_PROVIDERS = [
  "google_classroom",
  "canvas",
  "moodle",
  "google_calendar",
  "outlook_calendar",
] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

type JsonRecord = Record<string, unknown>;
type AdminDatabase = typeof import("@/integrations/supabase/client.server").supabaseAdmin;
type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
};
type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  instanceUrl?: string;
  supportsPkce: boolean;
};

const providerSchema = z.enum(INTEGRATION_PROVIDERS);
const connectSchema = z.object({
  provider: providerSchema,
  instanceUrl: z.string().trim().max(500).optional(),
});
const callbackSchema = z.object({
  code: z.string().min(1).max(4096),
  state: z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),
});
const calendarSyncSchema = z.object({
  provider: z.enum(["google_calendar", "outlook_calendar"]),
  types: z.array(z.enum(["task", "exam", "study_session"])).max(3),
});

export function parseProviderCallback(input: unknown) {
  return callbackSchema.parse(input);
}

async function adminDatabase(): Promise<AdminDatabase> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function hash(value: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

async function randomState() {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(32).toString("base64url");
}

export function validateProviderInstanceUrl(value: string, allowlist: string[]) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid institution URL.");
  }
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((!localHttp && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("Institution URLs must use HTTPS.");
  }
  if (url.port) throw new Error("Institution URLs must use the default HTTPS port.");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter the institution origin only, without a path or query.");
  }
  const allowed = allowlist.map((host) => host.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(url.hostname.toLowerCase())) {
    throw new Error("This institution host is not on the server's integration allowlist.");
  }
  return url.origin;
}

function configuredUrl(value: string, instanceOrigin?: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Provider endpoints must use HTTPS.");
  }
  if (
    url.username ||
    url.password ||
    url.hash ||
    [...url.searchParams.keys()].some((key) =>
      /^(access_token|refresh_token|token|wstoken|secret|password|code)$/i.test(key),
    )
  ) {
    throw new Error("Provider endpoints must not contain credentials or OAuth tokens.");
  }
  if (instanceOrigin && url.origin !== instanceOrigin) {
    throw new Error("Moodle OAuth endpoints must use the allowlisted instance origin.");
  }
  return url.toString();
}

function validRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (
      (url.protocol === "https:" || localHttp) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function validAllowlistedHost(value: string) {
  const host = value.trim().toLowerCase();
  if (!host) return false;
  try {
    const url = new URL(`https://${host}`);
    return (
      url.hostname === host &&
      !url.port &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function providerConfigured(provider: IntegrationProvider, instanceUrl?: string) {
  try {
    if (providerConfig(provider, instanceUrl)) return true;
  } catch {
    return false;
  }
  const env = process.env;
  if (!env["INTEGRATION_TOKEN_ENCRYPTION_KEY"]) return false;
  if (provider === "canvas") {
    return Boolean(
      env["CANVAS_CLIENT_ID"] &&
      env["CANVAS_CLIENT_SECRET"] &&
      validRedirectUri(env["CANVAS_REDIRECT_URI"] ?? "") &&
      (env["CANVAS_ALLOWED_HOSTS"] ?? "").split(",").some(validAllowlistedHost),
    );
  }
  if (provider === "moodle") {
    return (env["MOODLE_ALLOWED_HOSTS"] ?? "")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean)
      .some((host) => {
        try {
          return providerConfig(provider, `https://${host}`) !== null;
        } catch {
          return false;
        }
      });
  }
  return false;
}

function providerConfig(
  provider: IntegrationProvider,
  requestedUrl?: string,
): ProviderConfig | null {
  const env = process.env;
  const encryptionConfigured = Boolean(env["INTEGRATION_TOKEN_ENCRYPTION_KEY"]);
  const callback = (name: string) => env[name] ?? "";
  if (!encryptionConfigured) return null;

  if (provider === "google_classroom" || provider === "google_calendar") {
    const clientId = env["GOOGLE_OAUTH_CLIENT_ID"] ?? "";
    const clientSecret = env["GOOGLE_OAUTH_CLIENT_SECRET"] ?? "";
    const redirectUri = callback(
      provider === "google_classroom"
        ? "GOOGLE_CLASSROOM_REDIRECT_URI"
        : "GOOGLE_CALENDAR_REDIRECT_URI",
    );
    if (!clientId || !clientSecret || !validRedirectUri(redirectUri)) return null;
    return {
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes:
        provider === "google_classroom"
          ? [
              "https://www.googleapis.com/auth/classroom.courses.readonly",
              "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
            ]
          : ["https://www.googleapis.com/auth/calendar.events.owned"],
      supportsPkce: true,
    };
  }

  if (provider === "outlook_calendar") {
    const clientId = env["MICROSOFT_OAUTH_CLIENT_ID"] ?? "";
    const clientSecret = env["MICROSOFT_OAUTH_CLIENT_SECRET"] ?? "";
    const redirectUri = callback("MICROSOFT_CALENDAR_REDIRECT_URI");
    const tenant = env["MICROSOFT_OAUTH_TENANT_ID"] ?? "common";
    if (!clientId || !clientSecret || !validRedirectUri(redirectUri)) return null;
    return {
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
      scopes: ["offline_access", "Calendars.ReadWrite"],
      supportsPkce: true,
    };
  }

  if (provider === "canvas") {
    const clientId = env["CANVAS_CLIENT_ID"] ?? "";
    const clientSecret = env["CANVAS_CLIENT_SECRET"] ?? "";
    const redirectUri = callback("CANVAS_REDIRECT_URI");
    const allowlist = (env["CANVAS_ALLOWED_HOSTS"] ?? "").split(",");
    if (!clientId || !clientSecret || !validRedirectUri(redirectUri) || !requestedUrl) return null;
    const instanceUrl = validateProviderInstanceUrl(requestedUrl, allowlist);
    return {
      clientId,
      clientSecret,
      redirectUri,
      authorizeUrl: `${instanceUrl}/login/oauth2/auth`,
      tokenUrl: `${instanceUrl}/login/oauth2/token`,
      scopes: ["url:GET|/api/v1/courses", "url:GET|/api/v1/courses/:course_id/assignments"],
      instanceUrl,
      supportsPkce: false,
    };
  }

  const clientId = env["MOODLE_CLIENT_ID"] ?? "";
  const clientSecret = env["MOODLE_CLIENT_SECRET"] ?? "";
  const redirectUri = callback("MOODLE_REDIRECT_URI");
  const allowlist = (env["MOODLE_ALLOWED_HOSTS"] ?? "").split(",");
  const instanceUrl = requestedUrl ? validateProviderInstanceUrl(requestedUrl, allowlist) : "";
  const authorizeEndpoint = env["MOODLE_AUTHORIZATION_URL"] ?? "";
  const tokenEndpoint = env["MOODLE_TOKEN_URL"] ?? "";
  const scopes = (env["MOODLE_OAUTH_SCOPES"] ?? "").split(/\s+/).filter(Boolean);
  const coursesApi = env["MOODLE_COURSES_API_URL"] ?? "";
  const assignmentsApi = env["MOODLE_ASSIGNMENTS_API_URL"] ?? "";
  if (
    !clientId ||
    !clientSecret ||
    !validRedirectUri(redirectUri) ||
    !instanceUrl ||
    !authorizeEndpoint ||
    !tokenEndpoint ||
    !scopes.length ||
    !coursesApi ||
    !assignmentsApi
  ) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    authorizeUrl: configuredUrl(authorizeEndpoint, instanceUrl),
    tokenUrl: configuredUrl(tokenEndpoint, instanceUrl),
    scopes,
    instanceUrl,
    supportsPkce: false,
  };
}

function encryptionKey() {
  const value = process.env["INTEGRATION_TOKEN_ENCRYPTION_KEY"] ?? "";
  const key = /^[\da-f]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  if (key.byteLength !== 32)
    throw new Error("Integration token encryption is not configured correctly.");
  return key;
}

async function encryptTokens(tokens: TokenSet) {
  const { encryptProviderTokens } = await import("@/lib/integrations.crypto.server");
  return encryptProviderTokens(tokens, encryptionKey());
}

async function decryptTokens(value: unknown): Promise<TokenSet> {
  const { decryptProviderTokens } = await import("@/lib/integrations.crypto.server");
  return decryptProviderTokens(value, encryptionKey());
}

async function providerFetch(
  url: string,
  init?: RequestInit,
  options: { retryable?: boolean; allowStatuses?: number[] } = {},
) {
  const method = (init?.method ?? "GET").toUpperCase();
  const retryable = options.retryable ?? method === "GET";
  let response: Response | undefined;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      if (!retryable || attempt >= 2) {
        throw new Error("Could not reach the provider. Check configuration and try again.");
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      continue;
    }
    const shouldRetry =
      retryable && attempt < 2 && (response.status === 429 || response.status >= 500);
    if (!shouldRetry) break;
    const retryAfter = response.headers.get("retry-after");
    const parsedDelay = retryAfter
      ? Number.isFinite(Number(retryAfter))
        ? Number(retryAfter) * 1000
        : Date.parse(retryAfter) - Date.now()
      : 250 * 2 ** attempt;
    const delay = Math.min(Math.max(parsedDelay, 0), 5_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  if (!response) throw new Error("The provider request did not return a response.");
  if (!response.ok && !options.allowStatuses?.includes(response.status)) {
    if (response.status === 429)
      throw new Error("The provider rate limit was reached. Try again shortly.");
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "The provider denied this request. Authorization may be expired, revoked, or missing required scopes; reconnect and verify the provider configuration.",
      );
    throw new Error(`The provider returned an error (${response.status}).`);
  }
  return response;
}

async function exchangeCode(config: ProviderConfig, code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });
  if (config.supportsPkce) body.set("code_verifier", codeVerifier);
  if (config.instanceUrl || config.scopes.includes("offline_access")) {
    body.set("scope", config.scopes.join(" "));
  }
  const response = await providerFetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().optional(),
      expires_in: z.coerce.number().optional(),
      token_type: z.string().default("Bearer"),
      scope: z.string().optional(),
    })
    .parse(await response.json());
  const tokens: TokenSet = {
    access_token: data.access_token,
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
    expires_at:
      data.expires_in !== undefined
        ? Date.now() + data.expires_in * 1000
        : data.refresh_token
          ? Date.now() + 3600_000
          : Number.MAX_SAFE_INTEGER,
    token_type: data.token_type,
  };
  return {
    tokens,
    scopes: data.scope?.split(/\s+/).filter(Boolean) ?? config.scopes,
  };
}

async function getValidTokens(provider: IntegrationProvider, userId: string) {
  const db = await adminDatabase();
  const { data: row, error } = await db
    .from("provider_integrations")
    .select("encrypted_tokens,instance_url")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !row) throw new Error("This provider is not connected.");
  const config = providerConfig(
    provider,
    typeof row["instance_url"] === "string" ? row["instance_url"] : undefined,
  );
  if (!config)
    throw new Error("Provider configuration is incomplete. Ask the administrator to configure it.");
  let tokens = await decryptTokens(row["encrypted_tokens"]);
  if (tokens.expires_at > Date.now() + 60_000) return { tokens, config };
  if (!tokens.refresh_token)
    throw new Error("Provider authorization expired. Disconnect and reconnect.");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  if (config.scopes.includes("offline_access")) body.set("scope", config.scopes.join(" "));
  const response = await providerFetch(
    config.tokenUrl,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    { allowStatuses: [400] },
  );
  if (response.status === 400) {
    throw new Error(
      "Provider token refresh failed. The grant may be expired or revoked; reconnect and verify the provider configuration.",
    );
  }
  const data = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().optional(),
      expires_in: z.coerce.number().optional(),
      token_type: z.string().default("Bearer"),
    })
    .parse(await response.json());
  const refreshToken = data.refresh_token ?? tokens.refresh_token;
  tokens = {
    access_token: data.access_token,
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
    token_type: data.token_type,
  };
  const { error: saveError } = await db
    .from("provider_integrations")
    .update({ encrypted_tokens: await encryptTokens(tokens), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", provider);
  if (saveError) throw new Error("Could not securely refresh the provider connection.");
  return { tokens, config };
}

function bearer(tokens: TokenSet): HeadersInit {
  return { authorization: `${tokens.token_type} ${tokens.access_token}` };
}

async function providerJson(url: string, tokens: TokenSet) {
  const response = await providerFetch(url, { headers: bearer(tokens) });
  return response.json() as Promise<unknown>;
}

async function providerPages(
  url: string,
  tokens: TokenSet,
  provider: "google_classroom" | "canvas",
  collection?: string,
) {
  const origin = new URL(url).origin;
  const records: JsonRecord[] = [];
  let nextUrl: string | null = url;
  for (let page = 0; nextUrl && page < 100; page += 1) {
    const currentUrl: string = nextUrl;
    const response = await providerFetch(currentUrl, { headers: bearer(tokens) });
    const payload: unknown = await response.json();
    if (provider === "google_classroom") {
      const body = payload as JsonRecord;
      records.push(...asRecords(body[collection ?? ""]));
      const token = text(body["nextPageToken"]);
      if (!token) {
        nextUrl = null;
      } else {
        const pageUrl: URL = new URL(currentUrl);
        pageUrl.searchParams.set("pageToken", token);
        nextUrl = pageUrl.toString();
      }
    } else {
      records.push(...asRecords(payload));
      const link = response.headers.get("link") ?? "";
      const nextLink = link
        .split(/,\s*(?=<)/)
        .find((part) => /;\s*rel="?next"?/i.test(part))
        ?.match(/<([^>]+)>/)?.[1];
      if (!nextLink) {
        nextUrl = null;
      } else {
        const pageUrl: URL = new URL(nextLink, currentUrl);
        if (
          pageUrl.origin !== origin ||
          pageUrl.protocol !== "https:" ||
          !pageUrl.pathname.startsWith("/api/v1/")
        ) {
          throw new Error("Canvas returned an unsafe pagination URL.");
        }
        nextUrl = pageUrl.toString();
      }
    }
  }
  if (nextUrl) throw new Error("The provider returned too many pages to import safely.");
  return records;
}

function asRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((row): row is JsonRecord => Boolean(row) && typeof row === "object")
    : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function dateParts(value: unknown, timeZone: string) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    time: `${parts["hour"]}:${parts["minute"]}`,
  };
}

type ImportedCourse = { id: string; name: string; instructor: string };
type ImportedTask = { id: string; courseId: string; title: string; date: string; time: string };

async function loadLmsItems(provider: "google_classroom" | "canvas" | "moodle", userId: string) {
  const { tokens, config } = await getValidTokens(provider, userId);
  const db = await adminDatabase();
  const { data: preferences, error: settingsError } = await db
    .from("user_settings")
    .select("time_zone")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsError) throw new Error("Could not load your time-zone preference.");
  const timeZone = text(preferences?.["time_zone"]) || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new Error("Your saved time zone is invalid. Update it in Settings before importing.");
  }
  let courses: JsonRecord[] = [];
  const tasks: ImportedTask[] = [];
  if (provider === "google_classroom") {
    courses = await providerPages(
      "https://classroom.googleapis.com/v1/courses?pageSize=100",
      tokens,
      provider,
      "courses",
    );
    for (const course of courses) {
      const courseId = text(course["id"]);
      if (!courseId) continue;
      const coursework = await providerPages(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork?pageSize=100`,
        tokens,
        provider,
        "courseWork",
      );
      for (const item of coursework) {
        const dueDate = item["dueDate"] as JsonRecord | undefined;
        const dueTime = item["dueTime"] as JsonRecord | undefined;
        const dueYear = Number(dueDate?.["year"]);
        const dueMonth = Number(dueDate?.["month"]);
        const dueDay = Number(dueDate?.["day"]);
        const when =
          Number.isInteger(dueYear) &&
          Number.isInteger(dueMonth) &&
          Number.isInteger(dueDay) &&
          dueMonth >= 1 &&
          dueMonth <= 12 &&
          dueDay >= 1 &&
          dueDay <= 31
            ? {
                date: `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`,
                time: `${String(dueTime?.["hours"] ?? 23).padStart(2, "0")}:${String(dueTime?.["minutes"] ?? 59).padStart(2, "0")}`,
              }
            : null;
        if (when && text(item["id"]))
          tasks.push({
            id: text(item["id"]),
            courseId,
            title: text(item["title"]) || "Classroom assignment",
            ...when,
          });
      }
    }
  } else if (provider === "canvas") {
    const root = config.instanceUrl!;
    courses = await providerPages(
      `${root}/api/v1/courses?enrollment_state=active&per_page=100`,
      tokens,
      provider,
    );
    for (const course of courses) {
      const courseId = String(course["id"] ?? "");
      if (!courseId) continue;
      const assignments = await providerPages(
        `${root}/api/v1/courses/${encodeURIComponent(courseId)}/assignments?per_page=100`,
        tokens,
        provider,
      );
      for (const item of assignments) {
        const when = dateParts(item["due_at"], timeZone);
        if (when && item["id"] != null)
          tasks.push({
            id: String(item["id"]),
            courseId,
            title: text(item["name"]) || "Canvas assignment",
            ...when,
          });
      }
    }
  } else {
    const endpoint = process.env["MOODLE_COURSES_API_URL"] ?? "";
    if (!endpoint) {
      throw new Error(
        "Moodle courses API URL must be configured on the allowlisted Moodle instance.",
      );
    }
    courses = asRecords(await providerJson(configuredUrl(endpoint, config.instanceUrl), tokens));
    const assignmentTemplate = process.env["MOODLE_ASSIGNMENTS_API_URL"] ?? "";
    for (const course of courses) {
      const courseId = String(course["id"] ?? "");
      if (!courseId || !assignmentTemplate) continue;
      const assignmentUrl = configuredUrl(
        assignmentTemplate.replaceAll("{courseId}", encodeURIComponent(courseId)),
        config.instanceUrl,
      );
      const assignments = await providerJson(assignmentUrl, tokens);
      for (const item of asRecords(assignments)) {
        const when = dateParts(item["duedate"] ?? item["due_at"], timeZone);
        if (when && item["id"] != null)
          tasks.push({
            id: String(item["id"]),
            courseId,
            title: text(item["name"]) || "Moodle assignment",
            ...when,
          });
      }
    }
  }

  const importedCourses: ImportedCourse[] = courses.flatMap((course) => {
    const id = String(course["id"] ?? "");
    const name = text(course["name"] ?? course["courseName"]);
    return id && name ? [{ id, name, instructor: text(course["teacher"]) }] : [];
  });
  return { courses: importedCourses, tasks };
}

async function localImportId(provider: IntegrationProvider, userId: string, sourceId: string) {
  const { stableLmsImportId } = await import("@/lib/integrations.crypto.server");
  return stableLmsImportId(provider, userId, sourceId);
}

export const getProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const db = await adminDatabase();
    const { data, error } = await db
      .from("provider_integrations")
      .select(
        "provider,instance_url,connected_at,last_sync_at,last_sync_status,last_sync_error,preferences",
      )
      .eq("user_id", userId);
    if (error) throw new Error("Could not load integration status.");
    const rows = asRecords(data);
    return INTEGRATION_PROVIDERS.map((provider) => {
      const row = rows.find((item) => item["provider"] === provider);
      return {
        provider,
        configured: providerConfigured(
          provider,
          typeof row?.["instance_url"] === "string" ? row["instance_url"] : undefined,
        ),
        connected: Boolean(row),
        instanceUrl: text(row?.["instance_url"]),
        connectedAt: text(row?.["connected_at"]),
        lastSyncAt: text(row?.["last_sync_at"]),
        lastSyncStatus: text(row?.["last_sync_status"]),
        lastSyncError: text(row?.["last_sync_error"]),
        preferences: row?.["preferences"] ?? {},
      };
    });
  });

export const beginProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => connectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const config = providerConfig(data.provider, data.instanceUrl);
    if (!config) throw new Error("This provider is not configured on the server.");
    const state = await randomState();
    const verifier = await randomState();
    const { createHash } = await import("node:crypto");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const db = await adminDatabase();
    const { error } = await db.from("provider_oauth_states").insert({
      state_hash: await hash(state),
      user_id: context.userId,
      provider: data.provider,
      instance_url: config.instanceUrl ?? null,
      code_verifier: verifier,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw new Error("Could not start secure provider authorization.");
    const url = new URL(config.authorizeUrl);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    if (config.supportsPkce) {
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    url.searchParams.set("scope", config.scopes.join(" "));
    if (data.provider === "google_classroom" || data.provider === "google_calendar") {
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
    }
    return { authorizationUrl: url.toString() };
  });

export const completeProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseProviderCallback)
  .handler(async ({ data, context }) => {
    const db = await adminDatabase();
    const { data: state, error: stateError } = await db
      .from("provider_oauth_states")
      .delete()
      .eq("state_hash", await hash(data.state))
      .eq("user_id", context.userId)
      .gt("expires_at", new Date().toISOString())
      .select("state_hash,provider,instance_url,code_verifier")
      .maybeSingle();
    if (stateError || !state)
      throw new Error("Authorization state is invalid or expired. Restart connection.");
    const provider = providerSchema.parse(state["provider"]);
    const config = providerConfig(
      provider,
      typeof state["instance_url"] === "string" ? state["instance_url"] : undefined,
    );
    if (!config) throw new Error("Provider configuration is incomplete.");
    const { tokens, scopes } = await exchangeCode(config, data.code, text(state["code_verifier"]));
    const { error } = await db.from("provider_integrations").upsert(
      {
        user_id: context.userId,
        provider,
        encrypted_tokens: await encryptTokens(tokens),
        scopes,
        instance_url: config.instanceUrl ?? null,
        preferences: {},
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw new Error("Could not securely save provider connection.");
    return { connected: true, provider };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDatabase();
    const { error } = await db
      .from("provider_integrations")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error("Could not disconnect the provider.");
    return { disconnected: true };
  });

export const importLmsContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ provider: z.enum(["google_classroom", "canvas", "moodle"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const provider = data.provider;
    const db = await adminDatabase();
    try {
      const items = await loadLmsItems(provider, userId);
      let importedCourses = 0;
      let importedTasks = 0;
      const courseIds = new Map<string, string>();
      for (const course of items.courses) {
        const id = await localImportId(provider, userId, `course:${course.id}`);
        courseIds.set(course.id, id);
        const { data: inserted, error } = await db
          .from("courses")
          .upsert(
            {
              id,
              user_id: userId,
              name: course.name,
              instructor: course.instructor,
              credits: 0,
              grade: "",
              target_grade: "",
              color: "#315ce5",
            },
            { onConflict: "id", ignoreDuplicates: true },
          )
          .select("id");
        if (error) throw new Error("Could not import LMS courses.");
        importedCourses += asRecords(inserted).length;
      }
      for (const task of items.tasks) {
        const id = await localImportId(provider, userId, `assignment:${task.courseId}:${task.id}`);
        const courseId = courseIds.get(task.courseId) ?? task.courseId;
        const subject =
          items.courses.find((course) => course.id === task.courseId)?.name ?? "LMS assignment";
        const { data: inserted, error } = await db
          .from("study_tasks")
          .upsert(
            {
              id,
              user_id: userId,
              subject,
              topic: `${provider}:${courseId}`,
              title: task.title,
              date: task.date,
              time: task.time,
              minutes: 30,
              priority: "medium",
              done: false,
              is_exam: false,
            },
            { onConflict: "id", ignoreDuplicates: true },
          )
          .select("id");
        if (error) throw new Error("Could not import LMS assignments.");
        importedTasks += asRecords(inserted).length;
      }
      const { error: statusError } = await db
        .from("provider_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("user_id", userId)
        .eq("provider", provider);
      if (statusError) throw new Error("Content imported, but sync status could not be updated.");
      return {
        importedCourses,
        importedTasks,
        alreadyPresent: items.courses.length + items.tasks.length - importedCourses - importedTasks,
      };
    } catch (error) {
      await db
        .from("provider_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: error instanceof Error ? error.message.slice(0, 500) : "Import failed.",
        })
        .eq("user_id", userId)
        .eq("provider", provider);
      throw error;
    }
  });

export const saveCalendarSyncPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => calendarSyncSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await adminDatabase();
    const { data: updated, error } = await db
      .from("provider_integrations")
      .update({
        preferences: { eventTypes: [...new Set(data.types)] },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .select("provider")
      .maybeSingle();
    if (error || !updated) throw new Error("Could not save calendar sync preferences.");
    return { saved: true };
  });

export function localPlannerTimeToUtc(date: string, time: string, timeZone: string) {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeParts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateParts || !timeParts) {
    throw new Error("A planner item has an invalid date or time.");
  }
  const [, yearText, monthText, dayText] = dateParts;
  const [, hourText, minuteText] = timeParts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    normalizedDate.getUTCFullYear() !== year ||
    normalizedDate.getUTCMonth() !== month - 1 ||
    normalizedDate.getUTCDate() !== day
  ) {
    throw new Error("A planner item has an invalid date or time.");
  }
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, Number(value)]),
    );
    const represented = Date.UTC(
      parts["year"]!,
      parts["month"]! - 1,
      parts["day"],
      parts["hour"],
      parts["minute"],
    );
    const difference = target - represented;
    if (!difference) break;
    guess += difference;
  }
  return new Date(guess).toISOString();
}

type CalendarEvent = {
  sourceId: string;
  sourceKind: "task" | "exam" | "study_session";
  title: string;
  description: string;
  start: string;
  end: string;
  timeZone: string;
};

async function calendarCreate(
  provider: "google_calendar" | "outlook_calendar",
  userId: string,
  tokens: TokenSet,
  event: CalendarEvent,
) {
  const { stableCalendarEventId } = await import("@/lib/integrations.crypto.server");
  const idempotencyKey = stableCalendarEventId(userId, event.sourceId);
  const url =
    provider === "google_calendar"
      ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      : "https://graph.microsoft.com/v1.0/me/events";
  const body =
    provider === "google_calendar"
      ? {
          id: idempotencyKey,
          summary: event.title,
          description: event.description,
          start: { dateTime: event.start, timeZone: event.timeZone },
          end: { dateTime: event.end, timeZone: event.timeZone },
          extendedProperties: { private: { studentHubSourceId: event.sourceId } },
        }
      : {
          subject: event.title,
          body: { contentType: "text", content: event.description },
          start: { dateTime: event.start.replace(/Z$/, ""), timeZone: "UTC" },
          end: { dateTime: event.end.replace(/Z$/, ""), timeZone: "UTC" },
          transactionId: idempotencyKey,
        };
  const response = await providerFetch(
    url,
    {
      method: "POST",
      headers: { ...bearer(tokens), "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    { retryable: true, allowStatuses: [409] },
  );
  if (provider === "google_calendar" && response.status === 409) {
    await calendarUpdate(provider, tokens, idempotencyKey, event);
    return idempotencyKey;
  }
  if (!response.ok) {
    if (response.status === 429)
      throw new Error("The provider rate limit was reached. Try again shortly.");
    if (response.status === 401 || response.status === 403)
      throw new Error("Provider authorization expired or was revoked. Reconnect the integration.");
    throw new Error(`The provider returned an error (${response.status}).`);
  }
  const payload = z.object({ id: z.string().min(1) }).parse(await response.json());
  return payload.id;
}

async function calendarUpdate(
  provider: "google_calendar" | "outlook_calendar",
  tokens: TokenSet,
  eventId: string,
  event: CalendarEvent,
) {
  const base =
    provider === "google_calendar"
      ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      : "https://graph.microsoft.com/v1.0/me/events";
  const response = await providerFetch(
    `${base}/${encodeURIComponent(eventId)}`,
    {
      method: provider === "google_calendar" ? "PATCH" : "PATCH",
      headers: { ...bearer(tokens), "content-type": "application/json" },
      body: JSON.stringify(
        provider === "google_calendar"
          ? {
              summary: event.title,
              description: event.description,
              start: { dateTime: event.start, timeZone: event.timeZone },
              end: { dateTime: event.end, timeZone: event.timeZone },
              extendedProperties: { private: { studentHubSourceId: event.sourceId } },
            }
          : {
              subject: event.title,
              body: { contentType: "text", content: event.description },
              start: { dateTime: event.start.replace(/Z$/, ""), timeZone: "UTC" },
              end: { dateTime: event.end.replace(/Z$/, ""), timeZone: "UTC" },
            },
      ),
    },
    { retryable: true, allowStatuses: [404] },
  );
  if (response.status === 404) return false;
  if (!response.ok) {
    if (response.status === 429)
      throw new Error("The provider rate limit was reached. Try again shortly.");
    if (response.status === 401 || response.status === 403)
      throw new Error("Provider authorization expired or was revoked. Reconnect the integration.");
    throw new Error(`The provider returned an error (${response.status}).`);
  }
  return true;
}

async function calendarDelete(
  provider: "google_calendar" | "outlook_calendar",
  tokens: TokenSet,
  eventId: string,
) {
  const base =
    provider === "google_calendar"
      ? "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      : "https://graph.microsoft.com/v1.0/me/events";
  const response = await providerFetch(
    `${base}/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: bearer(tokens),
    },
    { retryable: true, allowStatuses: [404, 410] },
  );
  if (response.status === 404 || response.status === 410) return;
  if (!response.ok) {
    if (response.status === 429)
      throw new Error("The provider rate limit was reached. Try again shortly.");
    if (response.status === 401 || response.status === 403)
      throw new Error("Provider authorization expired or was revoked. Reconnect the integration.");
    throw new Error(`The provider returned an error (${response.status}).`);
  }
}

export const syncCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z.object({ provider: z.enum(["google_calendar", "outlook_calendar"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const provider = data.provider;
    const db = await adminDatabase();
    try {
      const { tokens } = await getValidTokens(provider, userId);
      const { data: integration, error: integrationError } = await db
        .from("provider_integrations")
        .select("preferences")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (integrationError || !integration) throw new Error("Calendar connection not found.");
      const types = z
        .array(z.enum(["task", "exam", "study_session"]))
        .max(3)
        .parse((integration["preferences"] as JsonRecord | undefined)?.["eventTypes"] ?? []);
      const { data: tasksData, error: tasksError } = await db
        .from("study_tasks")
        .select("id,is_exam,date,time,minutes,title,subject,topic")
        .eq("user_id", userId);
      if (tasksError) throw new Error("Could not load planner items for calendar sync.");
      const { data: sessionsData, error: sessionsError } = await db
        .from("study_sessions")
        .select("id,ended_at,minutes")
        .eq("user_id", userId);
      if (sessionsError) throw new Error("Could not load study sessions for calendar sync.");
      const { data: settings, error: settingsError } = await db
        .from("user_settings")
        .select("time_zone")
        .eq("user_id", userId)
        .maybeSingle();
      if (settingsError) throw new Error("Could not load your time-zone preference.");
      const timeZone = text(settings?.["time_zone"]) || "UTC";
      try {
        new Intl.DateTimeFormat("en", { timeZone });
      } catch {
        throw new Error("Your saved time zone is invalid. Update it in Settings before syncing.");
      }

      const desired: CalendarEvent[] = [];
      for (const task of asRecords(tasksData)) {
        const isExam = task["is_exam"] === true;
        const sourceKind = isExam ? "exam" : "task";
        if (!types.includes(sourceKind)) continue;
        const date = text(task["date"]);
        const time = text(task["time"]) || "09:00";
        const start = localPlannerTimeToUtc(date, time, timeZone);
        const duration = Math.max(10, Math.min(600, Number(task["minutes"]) || 30));
        const end = new Date(Date.parse(start) + duration * 60_000).toISOString();
        const title = `${isExam ? "Exam: " : ""}${text(task["title"]) || "Study task"}`;
        desired.push({
          sourceId: `${sourceKind}:${text(task["id"])}`,
          sourceKind,
          title: title.slice(0, 250),
          description: [text(task["subject"]), text(task["topic"])]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 1500),
          start,
          end,
          timeZone,
        });
      }
      if (types.includes("study_session")) {
        for (const session of asRecords(sessionsData)) {
          const endMs = Date.parse(text(session["ended_at"]));
          if (!Number.isFinite(endMs)) continue;
          const startMs = endMs - Math.max(1, Number(session["minutes"]) || 0) * 60_000;
          desired.push({
            sourceId: `study_session:${text(session["id"])}`,
            sourceKind: "study_session",
            title: "Completed Student Hub study session",
            description: `${Number(session["minutes"]) || 0} minutes of focus`,
            start: new Date(startMs).toISOString(),
            end: new Date(endMs).toISOString(),
            timeZone,
          });
        }
      }

      const { data: mappingData, error: mappingError } = await db
        .from("calendar_event_sync")
        .select("source_id,source_kind,remote_event_id")
        .eq("user_id", userId)
        .eq("provider", provider);
      if (mappingError) throw new Error("Could not load calendar event mappings.");
      const mappings = asRecords(mappingData);
      let created = 0;
      let updated = 0;
      let removed = 0;
      const activeIds = new Set(desired.map((event) => event.sourceId));
      for (const event of desired) {
        const existing = mappings.find((row) => row["source_id"] === event.sourceId);
        let remoteId: string;
        if (existing && typeof existing["remote_event_id"] === "string") {
          const didUpdate = await calendarUpdate(
            provider,
            tokens,
            existing["remote_event_id"],
            event,
          );
          if (didUpdate) {
            remoteId = existing["remote_event_id"];
            updated += 1;
          } else {
            remoteId = await calendarCreate(provider, userId, tokens, event);
            created += 1;
          }
        } else {
          remoteId = await calendarCreate(provider, userId, tokens, event);
          created += 1;
        }
        const { error } = await db.from("calendar_event_sync").upsert(
          {
            user_id: userId,
            provider,
            source_id: event.sourceId,
            source_kind: event.sourceKind,
            remote_event_id: remoteId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider,source_id" },
        );
        if (error) throw new Error("Calendar event synced but its mapping could not be saved.");
      }
      for (const mapping of mappings) {
        const sourceId = text(mapping["source_id"]);
        if (activeIds.has(sourceId)) continue;
        await calendarDelete(provider, tokens, text(mapping["remote_event_id"]));
        const { error } = await db
          .from("calendar_event_sync")
          .delete()
          .eq("user_id", userId)
          .eq("provider", provider)
          .eq("source_id", sourceId);
        if (error) throw new Error("Calendar event deleted but its mapping could not be removed.");
        removed += 1;
      }
      const { error: statusError } = await db
        .from("provider_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "success",
          last_sync_error: null,
        })
        .eq("user_id", userId)
        .eq("provider", provider);
      if (statusError) throw new Error("Events synced, but sync status could not be updated.");
      return { created, updated, removed };
    } catch (error) {
      await db
        .from("provider_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: "error",
          last_sync_error: error instanceof Error ? error.message.slice(0, 500) : "Sync failed.",
        })
        .eq("user_id", userId)
        .eq("provider", provider);
      throw error;
    }
  });
