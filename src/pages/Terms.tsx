import { StaticPageLayout, StaticSection } from "./StaticPage";
import { usePageMeta } from "../lib/meta";

const SECTIONS = [
  {
    title: "What EarFerry is",
    body: "EarFerry converts YouTube videos you choose into audio episodes in a private RSS feed, for personal, non-commercial listening. It is a tool you point at content; you remain responsible for what you add.",
  },
  {
    title: "Acceptable use",
    body: "Add only content you have the right to listen to. Don't redistribute your feed publicly, resell access, or use EarFerry to mass-download or re-publish other people's work.",
  },
  {
    title: "No warranty",
    body: "Extraction depends on YouTube and can break without notice. The service is provided as-is; episodes and feeds may be unavailable, rate-limited, or removed if a source video disappears.",
  },
  {
    title: "Termination",
    body: "We may suspend feeds that abuse the service or violate these terms. You can stop using EarFerry at any time; deleting your items removes their stored audio and metadata.",
  },
  {
    title: "Contact",
    body: "Questions about these terms: sos@earferry.com.",
  },
];

export function TermsPage() {
  usePageMeta({
    title: "Terms · EarFerry",
    description:
      "The terms of using EarFerry: personal, non-commercial listening, acceptable use, and no warranty.",
    path: "/terms",
  });

  return (
    <StaticPageLayout
      title="Terms"
      meta={<div className="text-text-muted text-sm/4">Last updated August 25, 2026</div>}
    >
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <StaticSection key={s.title} title={s.title} body={s.body} />
        ))}
      </div>
    </StaticPageLayout>
  );
}
