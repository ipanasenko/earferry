import { Link } from "react-router-dom";
import { track } from "../lib/analytics";
import { FooterMark } from "./icons";

const linkClass = "font-semibold text-text-muted text-xs/3.5 hover:text-text transition-colors";

const LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/support", label: "Support" },
];

// Liberapay, not Ko-fi or Buy Me a Coffee: it is the one platform whose model is
// donations only, so nothing here is a promise of recompense. Donating must
// never affect access — that is what keeps this a gift rather than a price, and
// keeps EarFerry outside KVK's "je vraagt een prijs of tarief" test.
//
// A personal profile rather than an earferry one, deliberately: a gift to a
// person reads differently from revenue for a product, and it outlives this
// project. See docs/research/billing-options.md.
const DONATE_URL = "https://liberapay.com/ipanasenko/donate";

/**
 * `donate` is opt-out because one page must never show the link: the waitlist.
 * Money must not look like the way in. See docs/ARCHITECTURE.md.
 */
export function Footer({ donate = true }: { donate?: boolean }) {
  return (
    <footer className="mt-auto flex items-center justify-center pt-8 pb-10 gap-5 sm:pt-12 sm:pb-20 sm:gap-6">
      <FooterMark />
      {LINKS.map((link) => (
        <Link key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      ))}
      {donate && (
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => track("donate_clicked")}
          className={linkClass}
        >
          Donate
        </a>
      )}
    </footer>
  );
}
