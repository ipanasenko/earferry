import { ConvexError, v } from "convex/values";
import { Polar } from "@convex-dev/polar";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query, type ActionCtx, type MutationCtx, type QueryCtx } from "./_generated/server";

// Polar is the merchant of record: it owns checkout, EU VAT, invoices, dunning
// and the customer portal, so EarFerry never touches card data or tax
// registration. Convex mirrors subscription state through the component's
// webhook, which keeps entitlement a server-side check.

// A cancelled subscription stays `active` with cancelAtPeriodEnd until the paid
// period actually ends, so cancelling mid-month does not cut the feed early.
const ENTITLED_STATUSES = new Set(["active", "trialing"]);

export function isEntitled(status: string | null | undefined): boolean {
  return typeof status === "string" && ENTITLED_STATUSES.has(status);
}

interface Identity {
  userId: string;
  email: string;
}

// The explicit annotation breaks a type cycle: `polar.api()` feeds the module's
// exports, which feed the generated `internal`, which this callback reads.
export const polar: Polar<DataModel> = new Polar<DataModel>(components.polar, {
  getUserInfo: async (ctx): Promise<Identity> => {
    const info: Identity | null = await ctx.runQuery(internal.identity.current, {});
    if (!info) throw new ConvexError("You are signed out. Sign in and try again");
    return info;
  },
});

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();

// EarFerry sells a single plan, so any active subscription in the Polar
// organization grants access. Adding a second product would mean checking
// `productKey` here instead of status alone.
export async function isSubscribed(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const subscription = await polar.getCurrentSubscription(ctx, { userId: identity.subject });
  return isEntitled(subscription?.status);
}

export const subscribed = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => await isSubscribed(ctx),
});
