export interface ParentReportData {
  displayName: string;
  createdAt: string;
  expiresAt: string;
  todayMinutes: number;
  totalHours: number;
  quizAverage: number | null;
  quizCount: number;
  streak: number;
  tasksCompleted: number;
  tasksCompletedToday: number;
}

function encodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBytes(encoded: string) {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isReportData(value: unknown): value is ParentReportData {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report["displayName"] === "string" &&
    report["displayName"].length <= 100 &&
    typeof report["createdAt"] === "string" &&
    Number.isFinite(Date.parse(report["createdAt"])) &&
    typeof report["expiresAt"] === "string" &&
    Number.isFinite(Date.parse(report["expiresAt"])) &&
    typeof report["todayMinutes"] === "number" &&
    Number.isFinite(report["todayMinutes"]) &&
    report["todayMinutes"] >= 0 &&
    typeof report["totalHours"] === "number" &&
    Number.isFinite(report["totalHours"]) &&
    report["totalHours"] >= 0 &&
    (report["quizAverage"] === null ||
      (typeof report["quizAverage"] === "number" &&
        Number.isFinite(report["quizAverage"]) &&
        report["quizAverage"] >= 0 &&
        report["quizAverage"] <= 100)) &&
    typeof report["quizCount"] === "number" &&
    Number.isInteger(report["quizCount"]) &&
    report["quizCount"] >= 0 &&
    typeof report["streak"] === "number" &&
    Number.isInteger(report["streak"]) &&
    report["streak"] >= 0 &&
    typeof report["tasksCompleted"] === "number" &&
    Number.isInteger(report["tasksCompleted"]) &&
    report["tasksCompleted"] >= 0 &&
    typeof report["tasksCompletedToday"] === "number" &&
    Number.isInteger(report["tasksCompletedToday"]) &&
    report["tasksCompletedToday"] >= 0
  );
}

export async function createParentReportLink(report: ParentReportData, origin: string) {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(report)),
  );
  const fragment = ["v1", encodeBytes(keyBytes), encodeBytes(iv), encodeBytes(new Uint8Array(ciphertext))].join(".");
  return `${origin}/shared-progress#${fragment}`;
}

export async function decryptParentReport(fragment: string): Promise<ParentReportData | null> {
  const [version, encodedKey, encodedIv, encodedCiphertext, ...extra] = fragment.replace(/^#/u, "").split(".");
  if (version !== "v1" || !encodedKey || !encodedIv || !encodedCiphertext || extra.length) return null;

  try {
    const key = await crypto.subtle.importKey("raw", decodeBytes(encodedKey), "AES-GCM", false, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBytes(encodedIv) },
      key,
      decodeBytes(encodedCiphertext),
    );
    const value: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!isReportData(value) || Date.parse(value.expiresAt) <= Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}
