import { StaticPageLayout, StaticSection } from "./StaticPage";
import { usePageMeta } from "../lib/meta";

const SECTIONS = [
  {
    title: "Your queue is yours",
    body: "EarFerry keeps your queue in an account and gives it a secret feed URL. There are no public profiles or social features. Anyone you share the feed URL with can listen, so treat it like a password.",
  },
  {
    title: "What we store",
    body: "For each link you add, we store the video's metadata (title, channel, description, artwork, and duration) and the extracted audio file so your podcast app can play it. Ready items and their files are automatically deleted after 30 days. You can delete an item sooner from your queue.",
  },
  {
    title: "Analytics",
    body: "We use PostHog to measure page visits and product actions such as adding, retrying, and deleting episodes. Events may include your account ID, a YouTube video ID, an item ID, or an extraction error. We do not send your email address, record sessions, track what you play in your podcast app, sell your data, or show ads.",
  },
  {
    title: "Third parties",
    body: "Clerk provides accounts and the waitlist. PostHog provides analytics. Convex stores account and queue data. Cloudflare runs the site and extraction service and stores audio and artwork. Audio is fetched from YouTube on your behalf. Your feed is not indexed or publicly listed.",
  },
  {
    title: "Questions",
    body: "Write to sos@earferry.com and a human will answer.",
  },
];

export function PrivacyPage() {
  usePageMeta({
    title: "Privacy · EarFerry",
    description:
      "What EarFerry stores, which services process it, and why your feed is private and never publicly listed.",
    path: "/privacy",
  });

  return (
    <StaticPageLayout
      title="Privacy"
      meta={<div className="text-text-muted text-sm/4">Last updated August 29, 2026</div>}
    >
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <StaticSection key={s.title} title={s.title} body={s.body} />
        ))}
      </div>
    </StaticPageLayout>
  );
}
