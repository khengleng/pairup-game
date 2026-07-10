/**
 * Maker-checker approval workflow. High-risk actions raised by a requester
 * without direct authority become pending approval requests; an Approver (or
 * Super Admin) approves them, which executes the stored action.
 */

import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { approvalRequests } from "../drizzle/schema";
import * as scratch from "./scratch/service";
import { writeAudit } from "./scratch/service";
import type { ApprovalAction } from "@shared/rbac";

export type Actor = { id: number; role: string; ip?: string };

export async function createApproval(
  params: {
    action: ApprovalAction;
    entity: string;
    entityId?: string;
    payload: unknown;
    summary: string;
  },
  actor: Actor & { name?: string }
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  await db.insert(approvalRequests).values({
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    payload: params.payload as any,
    summary: params.summary,
    requestedBy: actor.id,
    requestedByName: actor.name ?? null,
  });
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "approval.request",
    entity: params.entity,
    entityId: params.entityId ?? null,
    after: { action: params.action, summary: params.summary },
    ip: actor.ip ?? null,
  });
  return { pendingApproval: true as const };
}

export async function listApprovals(status?: "pending" | "approved" | "rejected" | "cancelled") {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(approvalRequests)
    .where(status ? eq(approvalRequests.status, status) : undefined)
    .orderBy(desc(approvalRequests.createdAt))
    .limit(200);
}

/** Apply a request's stored action. */
async function execute(action: string, payload: any, actor: Actor) {
  switch (action as ApprovalAction) {
    case "campaign.publish":
      return scratch.setCampaignStatus(payload.campaignId, "active", actor);
    case "campaign.probability":
      return scratch.updateCampaign(
        payload.campaignId,
        { winProbabilityBps: payload.winProbabilityBps },
        actor
      );
    case "campaign.budget":
      return scratch.createPrizeTier(payload.tier, actor);
    default:
      throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown approval action." });
  }
}

export async function approveRequest(id: number, actor: Actor & { name?: string }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [req] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
  if (!req) throw new TRPCError({ code: "NOT_FOUND" });
  if (req.status !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This request is already resolved." });
  }
  // JSON columns parse on MySQL but can be a string on MariaDB — coerce.
  const payload =
    typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
  // Execute the stored action as the approver.
  await execute(req.action, payload, actor);
  await db
    .update(approvalRequests)
    .set({
      status: "approved",
      reviewedBy: actor.id,
      reviewedByName: actor.name ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(approvalRequests.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "approval.approve",
    entity: req.entity,
    entityId: req.entityId,
    before: { action: req.action },
    approvalRef: String(id),
    ip: actor.ip ?? null,
  });
  return { success: true };
}

export async function rejectRequest(id: number, reason: string | undefined, actor: Actor & { name?: string }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [req] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
  if (!req) throw new TRPCError({ code: "NOT_FOUND" });
  if (req.status !== "pending") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This request is already resolved." });
  }
  await db
    .update(approvalRequests)
    .set({
      status: "rejected",
      reviewedBy: actor.id,
      reviewedByName: actor.name ?? null,
      reason: reason ?? null,
      resolvedAt: new Date(),
    })
    .where(eq(approvalRequests.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "approval.reject",
    entity: req.entity,
    entityId: req.entityId,
    reason: reason ?? null,
    approvalRef: String(id),
    ip: actor.ip ?? null,
  });
  return { success: true };
}
