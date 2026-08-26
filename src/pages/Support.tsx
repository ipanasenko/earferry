import { StaticPageLayout } from "./StaticPage";

const FAQ = [
  {
    title: "An episode failed to extract",
    body: "Press the retry button on the item. If it keeps failing, open the details (bug icon) and include the status text from the item when you write to us. It tells us exactly where it sank.",
  },
  {
    title: "My podcast app doesn't see new episodes",
    body: "Podcast apps poll feeds on their own schedule, so give it a few minutes or refresh the feed manually. Also check the item shows Ready in your queue first.",
  },
  {
    title: "I leaked my feed URL",
    body: "Use Rotate feed in the header and confirm the change. EarFerry copies the replacement URL for you. Add it to your podcast app; the old feed stops receiving updates.",
  },
];

export function SupportPage() {
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
            <div className="text-wave-soft text-base/base">
              A human reads every message, usually within a day.
            </div>
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
