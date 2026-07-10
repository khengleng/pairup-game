/**
 * Role-based access control for the admin portal.
 *
 * 8 roles, each granted a set of permissions. The single ADMIN_PASSWORD login
 * acts as a Super Admin bootstrap; Super Admins create individual admin
 * accounts with specific roles. A few high-risk actions are maker-checker:
 * a requester without direct authority raises an approval request that an
 * Approver (or Super Admin) must approve before it executes.
 */

export type AdminRole =
  | "super_admin"
  | "campaign_manager"
  | "approver"
  | "operator"
  | "prize_manager"
  | "compliance_officer"
  | "fraud_analyst"
  | "auditor";

export const ADMIN_ROLES: AdminRole[] = [
  "super_admin",
  "campaign_manager",
  "approver",
  "operator",
  "prize_manager",
  "compliance_officer",
  "fraud_analyst",
  "auditor",
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  campaign_manager: "Campaign Manager",
  approver: "Approver",
  operator: "Operator",
  prize_manager: "Prize Manager",
  compliance_officer: "Compliance Officer",
  fraud_analyst: "Fraud Analyst",
  auditor: "Auditor",
};

export function isAdminRole(v: string): v is AdminRole {
  return (ADMIN_ROLES as string[]).includes(v);
}

export type Permission =
  | "campaigns.view"
  | "campaigns.create"
  | "campaigns.edit"
  | "campaigns.publish" // activate/publish a campaign (maker-checker)
  | "campaigns.probability" // change win probability (maker-checker)
  | "campaigns.budget" // raise prize budget / add high-value prize (maker-checker)
  | "prizes.manage" // prize tiers + voucher inventory
  | "claims.view"
  | "claims.manage" // approve/fulfil/reject claims
  | "fraud.view"
  | "fraud.block" // block/unblock players
  | "compliance.review"
  | "reports.view"
  | "reports.export"
  | "analytics.view"
  | "audit.view"
  | "team.manage" // create/deactivate admin accounts
  | "approvals.review"; // approve/reject maker-checker requests

const ALL: Permission[] = [
  "campaigns.view", "campaigns.create", "campaigns.edit", "campaigns.publish",
  "campaigns.probability", "campaigns.budget", "prizes.manage", "claims.view",
  "claims.manage", "fraud.view", "fraud.block", "compliance.review",
  "reports.view", "reports.export", "analytics.view", "audit.view",
  "team.manage", "approvals.review",
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL,
  campaign_manager: [
    "campaigns.view", "campaigns.create", "campaigns.edit", "prizes.manage",
    "reports.view", "analytics.view",
  ],
  approver: [
    "campaigns.view", "approvals.review", "campaigns.publish",
    "campaigns.probability", "campaigns.budget", "reports.view",
    "analytics.view", "audit.view",
  ],
  operator: [
    "campaigns.view", "claims.view", "claims.manage", "reports.view",
    "analytics.view",
  ],
  prize_manager: [
    "campaigns.view", "prizes.manage", "claims.view", "claims.manage",
    "reports.view",
  ],
  compliance_officer: [
    "campaigns.view", "compliance.review", "claims.view", "claims.manage",
    "reports.view", "reports.export", "audit.view",
  ],
  fraud_analyst: ["fraud.view", "fraud.block", "reports.view"],
  auditor: ["campaigns.view", "reports.view", "audit.view", "analytics.view"],
};

export function hasPermission(role: AdminRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

/** Maker-checker action kinds (need approval when the actor lacks authority). */
export type ApprovalAction =
  | "campaign.publish"
  | "campaign.probability"
  | "campaign.budget";

export const APPROVAL_LABELS: Record<ApprovalAction, string> = {
  "campaign.publish": "Publish / activate campaign",
  "campaign.probability": "Change win probability",
  "campaign.budget": "Raise prize budget",
};

/** Permission that lets an actor perform (or approve) each maker-checker action. */
export const APPROVAL_PERMISSION: Record<ApprovalAction, Permission> = {
  "campaign.publish": "campaigns.publish",
  "campaign.probability": "campaigns.probability",
  "campaign.budget": "campaigns.budget",
};
