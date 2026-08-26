import { StaticPageLayout, StaticSection } from "./StaticPage";

const SECTIONS = [
  {
    title: "Your queue is yours",
    body: "EarFerry keeps a private queue tied to a secret feed URL. There are no accounts, no profiles, and no social layer. Anyone you share the feed URL with can listen, so treat it like a password.",
  },
  {
    title: "What we store",
    body: "For each link you add we store the video's metadata (title, channel, artwork, duration) and the extracted audio file, so your podcast app can play it. Deleting an item removes both.",
  },
  {
    title: "What we don't do",
    body: "No analytics trackers, no ads, no selling data, no reading your listening habits. Server logs are kept only as long as needed to keep extraction working.",
  },
  {
    title: "Third parties",
    body: "Audio is fetched from YouTube on your behalf; YouTube's own terms apply to the source videos. Your feed is served from our infrastructure and is not indexed or listed anywhere.",
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
