import { StaticPageLayout } from "./StaticPage";
import { usePageMeta } from "../lib/meta";

const FAQ = [
  {
    title: "An episode failed to extract",
    body: "Press the retry button on the item. If it keeps failing, include the video link and the status shown in your queue when you write to us.",
  },
  {
    title: "My podcast app doesn't see new episodes",
    body: "Podcast apps poll feeds on their own schedule, so give it a few minutes or refresh the feed manually. Also check that the item shows Ready in your queue first.",
  },
  {
    title: "I leaked my feed URL",
    body: "Write to us and we'll replace your feed URL. We'll send you the new URL to add to your podcast app; the old feed will stop receiving updates.",
  },
];

export function SupportPage() {
  usePageMeta({
    title: "Support · EarFerry",
    description:
      "Fixes for failed extractions, feeds that show no new episodes, and leaked feed URLs.",
    path: "/support",
  });

  return (
    <StaticPageLayout
      title="Support"
      meta={
        <div className="text-text-muted text-base/base">
          Something stuck at the pier? Most crossings can be rescued.
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        {FAQ.map((entry) => (
          <div
            key={entry.title}
            className="flex flex-col py-5 px-5.5 rounded-md gap-1.5 shadow-card bg-background"
          >
            <h2 className="font-semibold text-text text-lg/base">{entry.title}</h2>
            <p className="text-text-muted text-base/base">{entry.body}</p>
          </div>
        ))}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 px-5.5 rounded-md gap-4.5 bg-ink">
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-background text-lg/base">Still stuck?</div>
            <div className="text-wave-soft text-base/base">A human reads every message.</div>
          </div>
          <a
            href="mailto:sos@earferry.com"
            className="flex items-center justify-center min-h-11 shrink-0 px-5.5 rounded-pill bg-accent font-semibold text-ink text-base/4.5 hover:opacity-90 transition-opacity"
          >
            sos@earferry.com
          </a>
        </div>
      </div>
    </StaticPageLayout>
  );
}
