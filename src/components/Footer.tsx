import { Link } from "react-router-dom";
import { FooterMark } from "./icons";

const linkClass = "font-semibold text-text-muted text-xs/3.5 hover:text-text transition-colors";

const LINKS = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/support", label: "Support" },
];

export function Footer() {
  return (
    <footer className="mt-auto flex items-center justify-center pt-12 gap-6">
      <FooterMark />
      {LINKS.map((link) => (
        <Link key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      ))}
    </footer>
  );
}
