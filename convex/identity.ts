import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Lives in its own module so `billing.ts` can reach it through `internal`
// without referencing its own generated API, which TypeScript cannot infer.
//
// The Polar component narrows the ctx it hands to `getUserInfo` down to
// runQuery/runMutation, so the caller's identity has to be read through a
// function rather than straight off `ctx.auth`.
export const current = internalQuery({
  args: {},
  returns: v.union(v.null(), v.object({ userId: v.string(), email: v.string() })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) return null;
    // Keyed by the Clerk user id rather than a `users` row: checkout happens
    // before the first mutation that would create one.
    return { userId: identity.subject, email: identity.email };
  },
});
