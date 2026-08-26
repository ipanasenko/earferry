import { StaticPageLayout, StaticSection } from "./StaticPage";

const SECTIONS = [
  {
    title: "Your queue is yours",
    body: "EarFerry keeps your queue in an account and gives it a secret feed URL. There are no public profiles or social features. Anyone you share the feed URL with can listen, so treat it like a password.",
  },
  {
    title: "What we store",
    body: "For each link you add we store the video's metadata (title, channel, artwork, duration) and the extracted audio file, so your podcast app can play it. Deleting an item removes both.",
  },
  {
    title: "Analytics",
    body: "We use PostHog to measure page visits and product actions such as adding, retrying, and deleting episodes. Signed-in analytics are linked to your account ID and email. We do not track what you play in your podcast app, sell your data, or show ads.",
  },
  {
    title: "Third parties",
    body: "Clerk provides accounts and billing, PostHog provides analytics, Convex stores queue data, and Cloudflare runs the site, extraction, and media storage. Audio is fetched from YouTube on your behalf. Your feed is not indexed or publicly listed.",
  },
  {
    title: "Questions",
    body: "Write to sos@earferry.com and a human will answer.",
  },
];

export function PrivacyPage() {
  return (
    <StaticPageLayout
      title="Privacy"
      meta={<div className="text-text-muted text-sm/4">Last updated August 26, 2026</div>}
    >
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <StaticSection key={s.title} title={s.title} body={s.body} />
        ))}
      </div>
    </StaticPageLayout>
  );
}
