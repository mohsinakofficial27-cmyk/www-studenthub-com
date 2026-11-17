import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const scopes = z.object({ progress: z.literal(true) }).strict();
const snapshot = z
  .record(z.string(), z.unknown())
  .refine((value) => JSON.stringify(value).length <= 500_000, "Shared material is too large.");

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create-group"),
    name: z.string().trim().min(2).max(80),
    subject: z.string().max(120),
    description: z.string().max(1000),
  }),
  z.object({
    action: z.literal("invite-group"),
    groupId: uuid,
    expiresHours: z.number().int().min(1).max(720),
  }),
  z.object({ action: z.literal("accept-group"), token: z.string().regex(/^[0-9a-f]{64}$/i) }),
  z.object({ action: z.literal("revoke-group-invitation"), invitationId: uuid }),
  z.object({ action: z.literal("leave-group"), groupId: uuid }),
  z.object({ action: z.literal("remove-member"), groupId: uuid, memberId: uuid }),
  z.object({
    action: z.literal("set-member-role"),
    groupId: uuid,
    memberId: uuid,
    role: z.enum(["admin", "member"]),
  }),
  z.object({ action: z.literal("delete-group"), groupId: uuid }),
  z.object({
    action: z.literal("create-session"),
    groupId: uuid,
    title: z.string().trim().min(2).max(120),
    startsAt: z.string().datetime(),
    durationMinutes: z.number().int().min(10).max(600),
  }),
  z.object({ action: z.literal("join-session"), sessionId: uuid }),
  z.object({ action: z.literal("leave-session"), sessionId: uuid }),
  z.object({
    action: z.literal("save-tutor-profile"),
    displayName: z.string().trim().min(1).max(80),
    subjects: z.array(z.string().trim().min(1).max(80)).max(20),
    bio: z.string().max(1000),
    format: z.enum(["online", "in_person", "either"]),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("request-tutor"),
    listingId: uuid,
    message: z.string().trim().min(1).max(1000),
  }),
  z.object({ action: z.literal("respond-tutoring"), requestId: uuid, accept: z.boolean() }),
  z.object({
    action: z.literal("invite-progress"),
    email: z.string().trim().email().max(254),
    scopes,
    expiresHours: z.number().int().min(1).max(720),
  }),
  z.object({ action: z.literal("accept-progress"), token: z.string().regex(/^[0-9a-f]{64}$/i) }),
  z.object({ action: z.literal("revoke-progress"), shareId: uuid }),
  z.object({ action: z.literal("revoke-progress-invitation"), invitationId: uuid }),
  z.object({ action: z.literal("get-progress"), shareId: uuid }),
  z.object({
    action: z.literal("share-resource"),
    groupId: uuid,
    resourceType: z.enum(["note", "flashcard_deck"]),
    resourceId: z.string().min(1).max(128),
    permission: z.enum(["view", "edit"]),
  }),
  z.object({ action: z.literal("edit-resource"), shareId: uuid, value: snapshot }),
  z.object({ action: z.literal("import-resource"), shareId: uuid }),
  z.object({ action: z.literal("revoke-resource"), shareId: uuid }),
]);

export type CommunityAction = z.infer<typeof actionSchema>;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type RpcContext = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: JsonValue; error: { message: string } | null }>;
};

const rpcByAction: Record<
  CommunityAction["action"],
  (data: CommunityAction) => { name: string; args: Record<string, unknown> }
> = {
  "create-group": (data) => {
    if (data.action !== "create-group") throw new Error("Invalid action.");
    return {
      name: "create_study_group",
      args: { _name: data.name, _subject: data.subject, _description: data.description },
    };
  },
  "invite-group": (data) => {
    if (data.action !== "invite-group") throw new Error("Invalid action.");
    return {
      name: "create_group_invitation",
      args: { _group_id: data.groupId, _expires_hours: data.expiresHours },
    };
  },
  "accept-group": (data) => {
    if (data.action !== "accept-group") throw new Error("Invalid action.");
    return { name: "accept_group_invitation", args: { _token: data.token } };
  },
  "revoke-group-invitation": (data) => {
    if (data.action !== "revoke-group-invitation") throw new Error("Invalid action.");
    return { name: "revoke_group_invitation", args: { _invitation_id: data.invitationId } };
  },
  "leave-group": (data) => {
    if (data.action !== "leave-group") throw new Error("Invalid action.");
    return { name: "leave_study_group", args: { _group_id: data.groupId } };
  },
  "remove-member": (data) => {
    if (data.action !== "remove-member") throw new Error("Invalid action.");
    return {
      name: "remove_group_member",
      args: { _group_id: data.groupId, _member_id: data.memberId },
    };
  },
  "set-member-role": (data) => {
    if (data.action !== "set-member-role") throw new Error("Invalid action.");
    return {
      name: "set_group_member_role",
      args: { _group_id: data.groupId, _member_id: data.memberId, _role: data.role },
    };
  },
  "delete-group": (data) => {
    if (data.action !== "delete-group") throw new Error("Invalid action.");
    return { name: "delete_study_group", args: { _group_id: data.groupId } };
  },
  "create-session": (data) => {
    if (data.action !== "create-session") throw new Error("Invalid action.");
    return {
      name: "create_group_study_session",
      args: {
        _group_id: data.groupId,
        _title: data.title,
        _starts_at: data.startsAt,
        _duration_minutes: data.durationMinutes,
      },
    };
  },
  "join-session": (data) => {
    if (data.action !== "join-session") throw new Error("Invalid action.");
    return { name: "join_group_study_session", args: { _session_id: data.sessionId } };
  },
  "leave-session": (data) => {
    if (data.action !== "leave-session") throw new Error("Invalid action.");
    return { name: "leave_group_study_session", args: { _session_id: data.sessionId } };
  },
  "save-tutor-profile": (data) => {
    if (data.action !== "save-tutor-profile") throw new Error("Invalid action.");
    return {
      name: "save_tutoring_profile",
      args: {
        _display_name: data.displayName,
        _subjects: data.subjects,
        _bio: data.bio,
        _format: data.format,
        _active: data.active,
      },
    };
  },
  "request-tutor": (data) => {
    if (data.action !== "request-tutor") throw new Error("Invalid action.");
    return {
      name: "request_tutoring",
      args: { _listing_id: data.listingId, _message: data.message },
    };
  },
  "respond-tutoring": (data) => {
    if (data.action !== "respond-tutoring") throw new Error("Invalid action.");
    return {
      name: "respond_tutoring_request",
      args: { _request_id: data.requestId, _accept: data.accept },
    };
  },
  "invite-progress": (data) => {
    if (data.action !== "invite-progress") throw new Error("Invalid action.");
    return {
      name: "create_progress_share_invitation",
      args: {
        _recipient_email: data.email,
        _scopes: data.scopes,
        _expires_hours: data.expiresHours,
      },
    };
  },
  "accept-progress": (data) => {
    if (data.action !== "accept-progress") throw new Error("Invalid action.");
    return { name: "accept_progress_share_invitation", args: { _token: data.token } };
  },
  "revoke-progress": (data) => {
    if (data.action !== "revoke-progress") throw new Error("Invalid action.");
    return { name: "revoke_progress_share", args: { _share_id: data.shareId } };
  },
  "revoke-progress-invitation": (data) => {
    if (data.action !== "revoke-progress-invitation") throw new Error("Invalid action.");
    return {
      name: "revoke_progress_share_invitation",
      args: { _invitation_id: data.invitationId },
    };
  },
  "get-progress": (data) => {
    if (data.action !== "get-progress") throw new Error("Invalid action.");
    return { name: "get_shared_progress", args: { _share_id: data.shareId } };
  },
  "share-resource": (data) => {
    if (data.action !== "share-resource") throw new Error("Invalid action.");
    return {
      name: "share_group_resource",
      args: {
        _group_id: data.groupId,
        _resource_type: data.resourceType,
        _resource_id: data.resourceId,
        _permission: data.permission,
      },
    };
  },
  "edit-resource": (data) => {
    if (data.action !== "edit-resource") throw new Error("Invalid action.");
    return {
      name: "edit_group_shared_resource",
      args: { _share_id: data.shareId, _snapshot: data.value },
    };
  },
  "import-resource": (data) => {
    if (data.action !== "import-resource") throw new Error("Invalid action.");
    return { name: "import_group_shared_resource", args: { _share_id: data.shareId } };
  },
  "revoke-resource": (data) => {
    if (data.action !== "revoke-resource") throw new Error("Invalid action.");
    return { name: "revoke_group_shared_resource", args: { _share_id: data.shareId } };
  },
};

export const runCommunityAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => actionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const request = rpcByAction[data.action](data);
    const { data: result, error } = await (context.supabase as unknown as RpcContext).rpc(
      request.name,
      request.args,
    );
    if (error) {
      console.error(`Community operation ${request.name} failed`, error.message);
      throw new Error(
        "That community action could not be completed. Check your access and try again.",
      );
    }
    return result;
  });

export const getCommunitySnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as unknown as RpcContext).rpc(
      "community_snapshot",
    );
    if (error) {
      console.error("Could not load community records", error.message);
      throw new Error(
        "Could not load community data. Apply the community database migration and try again.",
      );
    }
    return data;
  });

export const getTutorListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as unknown as RpcContext).rpc("browse_tutors");
    if (error) {
      console.error("Could not load opt-in tutor listings", error.message);
      throw new Error("Could not load tutor listings.");
    }
    return data;
  });

export const getLmsSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(() => {
    return {
      googleClassroom: {
        credentialsPresent: Boolean(
          process.env["GOOGLE_CLASSROOM_CLIENT_ID"] &&
          process.env["GOOGLE_CLASSROOM_CLIENT_SECRET"] &&
          process.env["GOOGLE_CLASSROOM_REDIRECT_URI"] &&
          process.env["LMS_TOKEN_ENCRYPTION_KEY"],
        ),
      },
      canvas: {
        credentialsPresent: Boolean(
          process.env["CANVAS_CLIENT_ID"] &&
          process.env["CANVAS_CLIENT_SECRET"] &&
          process.env["CANVAS_BASE_URL"] &&
          process.env["CANVAS_REDIRECT_URI"] &&
          process.env["LMS_TOKEN_ENCRYPTION_KEY"],
        ),
      },
      moodle: {
        credentialsPresent: Boolean(
          process.env["MOODLE_CLIENT_ID"] &&
          process.env["MOODLE_CLIENT_SECRET"] &&
          process.env["MOODLE_BASE_URL"] &&
          process.env["MOODLE_REDIRECT_URI"] &&
          process.env["LMS_TOKEN_ENCRYPTION_KEY"],
        ),
      },
    };
  });
