import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import {
  decryptProviderTokens,
  encryptProviderTokens,
  stableCalendarEventId,
  stableLmsImportId,
} from "@/lib/integrations.crypto.server";
import {
  localPlannerTimeToUtc,
  parseProviderCallback,
  validateProviderInstanceUrl,
} from "@/lib/integrations.functions";

describe("provider instance URL validation", () => {
  it("accepts an explicitly allowlisted HTTPS origin", () => {
    assert.equal(
      validateProviderInstanceUrl("https://canvas.school.example", ["canvas.school.example"]),
      "https://canvas.school.example",
    );
  });

  it("rejects hosts that are not allowlisted", () => {
    assert.throws(
      () => validateProviderInstanceUrl("https://attacker.example", ["canvas.school.example"]),
      /not on the server's integration allowlist/,
    );
  });

  it("rejects nonstandard ports even when the hostname is allowlisted", () => {
    assert.throws(
      () =>
        validateProviderInstanceUrl("https://canvas.school.example:8443", [
          "canvas.school.example",
        ]),
      /default HTTPS port/,
    );
  });

  it("rejects insecure, credentialed, and path-based origins", () => {
    assert.throws(
      () => validateProviderInstanceUrl("http://canvas.school.example", ["canvas.school.example"]),
      /must use HTTPS/,
    );
    assert.throws(
      () =>
        validateProviderInstanceUrl("https://user:pass@canvas.school.example", [
          "canvas.school.example",
        ]),
      /must use HTTPS/,
    );
    assert.throws(
      () =>
        validateProviderInstanceUrl("https://canvas.school.example/login", [
          "canvas.school.example",
        ]),
      /origin only/,
    );
  });
});

describe("calendar planner time conversion", () => {
  it("converts local planner time to the correct summer UTC instant", () => {
    assert.equal(
      localPlannerTimeToUtc("2026-07-01", "09:00", "America/New_York"),
      "2026-07-01T13:00:00.000Z",
    );
  });

  it("normalizes a nonexistent daylight-saving wall time forward", () => {
    assert.equal(
      localPlannerTimeToUtc("2026-03-08", "02:30", "America/New_York"),
      "2026-03-08T07:30:00.000Z",
    );
  });

  it("keeps an ambiguous daylight-saving wall time at its first occurrence", () => {
    assert.equal(
      localPlannerTimeToUtc("2026-11-01", "01:30", "America/New_York"),
      "2026-11-01T05:30:00.000Z",
    );
  });

  it("rejects invalid calendar dates and wall times", () => {
    assert.throws(
      () => localPlannerTimeToUtc("2026-02-30", "09:00", "America/New_York"),
      /invalid date or time/,
    );
    assert.throws(
      () => localPlannerTimeToUtc("2026-02-28", "24:00", "America/New_York"),
      /invalid date or time/,
    );
  });
});

describe("OAuth callback validation", () => {
  it("accepts a correctly shaped authorization code and state", () => {
    assert.deepEqual(parseProviderCallback({ code: "authorization-code", state: "A".repeat(43) }), {
      code: "authorization-code",
      state: "A".repeat(43),
    });
  });

  it("rejects malformed or missing OAuth state", () => {
    assert.throws(() => parseProviderCallback({ code: "authorization-code", state: "bad" }));
    assert.throws(() => parseProviderCallback({ code: "authorization-code" }));
  });
});

describe("provider token storage", () => {
  it("encrypts tokens without storing readable token text and decrypts with the same key", async () => {
    const key = randomBytes(32);
    const tokens = {
      access_token: "unit-test-access-token",
      refresh_token: "unit-test-refresh-token",
      expires_at: 1_800_000_000_000,
      token_type: "Bearer",
    };
    const encrypted = await encryptProviderTokens(tokens, key);
    assert.equal(JSON.stringify(encrypted).includes(tokens.access_token), false);
    assert.equal(JSON.stringify(encrypted).includes(tokens.refresh_token), false);
    assert.deepEqual(await decryptProviderTokens(encrypted, key), tokens);
    await assert.rejects(decryptProviderTokens(encrypted, randomBytes(32)));
  });
});

describe("provider import and calendar idempotency", () => {
  it("keeps stable IDs for repeats while isolating users and provider namespaces", () => {
    assert.equal(
      stableLmsImportId("canvas", "user-1", "course:course-1"),
      stableLmsImportId("canvas", "user-1", "course:course-1"),
    );
    assert.notEqual(
      stableLmsImportId("canvas", "user-1", "course:course-1"),
      stableLmsImportId("canvas", "user-2", "course:course-1"),
    );
    assert.notEqual(
      stableLmsImportId("canvas", "user-1", "course:course-1"),
      stableLmsImportId("moodle", "user-1", "course:course-1"),
    );
    assert.equal(
      stableCalendarEventId("user-1", "task:task-1"),
      stableCalendarEventId("user-1", "task:task-1"),
    );
    assert.notEqual(
      stableCalendarEventId("user-1", "task:task-1"),
      stableCalendarEventId("user-2", "task:task-1"),
    );
  });
});
