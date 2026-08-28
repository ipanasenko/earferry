import { Link } from "react-router-dom";
import { track } from "../lib/analytics";
import { DONATE_URL } from "../lib/links";
import { DonateIconSmall, FooterMark } from "./icons";

const linkClass = "font-semibold text-text-muted text-xs/3.5 hover:text-text transition-colors";

const LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/support", label: "Support" },
];

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
          className={`${linkClass} flex items-center gap-1.25`}
        >
          <DonateIconSmall />
          Donate
        </a>
      )}
    </footer>
  );
}
