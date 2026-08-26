import { Link } from "react-router-dom";
import { FooterMark } from "./icons";

const linkClass = "font-semibold text-text-muted text-xs/3.5 hover:text-text transition-colors";

export function Footer({
  links = [
    { to: "/privacy", label: "Privacy" },
    { to: "/terms", label: "Terms" },
    { to: "/support", label: "Support" },
  ],
  showMark = true,
}: {
  links?: { to: string; label: string }[];
  showMark?: boolean;
}) {
  return (
    <footer className="flex items-center justify-center pt-12 gap-6">
      {showMark ? <FooterMark /> : null}
      {links.map((link) => (
        <Link key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      ))}
    </footer>
  );
}
