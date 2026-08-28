import { Link } from "react-router-dom";
import { CustomerPortalLink } from "@convex-dev/polar/react";
import { useQuery } from "convex/react";
import { api, polarApi } from "../lib/api";
import { track } from "../lib/analytics";
import { FooterMark } from "./icons";

const linkClass = "font-semibold text-text-muted text-xs/3.5 hover:text-text transition-colors";

const LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/support", label: "Support" },
];

/**
 * Polar hosts the customer portal, so cancelling and updating a card live
 * there. This is the only entry point to it, which is why it sits in the
 * footer of every page rather than behind the queue.
 */
function BillingLink() {
  const subscribed = useQuery(api.billing.subscribed, {});
  if (!subscribed) return null;
  return (
    <span onClick={() => track("subscription_managed")}>
      <CustomerPortalLink polarApi={polarApi} className={`${linkClass} cursor-pointer`}>
        Billing
      </CustomerPortalLink>
    </span>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto flex items-center justify-center pt-8 pb-10 gap-5 sm:pt-12 sm:pb-20 sm:gap-6">
      <FooterMark />
      {LINKS.map((link) => (
        <Link key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      ))}
      <BillingLink />
    </footer>
  );
}
