import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

const PAID_PLAN = "ferry";

function randomFeedToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function feedBaseUrl(): string {
  // HTTP actions live on the .convex.site domain. CONVEX_SITE_URL is a Convex
  // built-in env var; FEED_BASE_URL overrides it once a custom domain exists.
  const base = process.env.FEED_BASE_URL ?? process.env.CONVEX_SITE_URL;
  if (!base) throw new Error("FEED_BASE_URL or CONVEX_SITE_URL must be set");
  return base.replace(/\/$/, "");
}

export function hasPlan(planClaim: unknown, plan: string): boolean {
  if (typeof planClaim !== "string") return false;
  const [scope, slug, ...extra] = planClaim.split(":");
  return extra.length === 0 && (scope === "u" || scope === "o") && slug === plan;
}

export async function requirePaidEntitlement(ctx: MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  if (!hasPlan(identity.pla, PAID_PLAN)) {
    throw new Error("A Ferry subscription is required");
  }
}

export async function currentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// Called from mutations (items.add and friends) so a user row exists the first
// time an authenticated person touches the queue.
export async function getOrCreateUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not signed in");
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    feedToken: randomFeedToken(),
    createdAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return { feedUrl: null };
    return { feedUrl: `${feedBaseUrl()}/feed/${encodeURIComponent(user.feedToken)}` };
  },
});
