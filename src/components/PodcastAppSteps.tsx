import { PODCAST_APP_STEPS } from "../lib/sampleFeed";

/**
 * Rendered by both the homepage sample-feed dialog and the Support page, from
 * one list, so the two never disagree about how to add a feed.
 */
export function PodcastAppSteps() {
  return (
    <div className="flex flex-col gap-2.5">
      {PODCAST_APP_STEPS.map((app, index) => (
        <div
          key={app.name}
          className={`flex items-center py-3 px-3.5 rounded-sm gap-3 ${
            index === 0 ? "bg-surface" : "border border-border"
          }`}
        >
          <span
            className={`w-9 h-9 flex shrink-0 items-center justify-center rounded-[10px] font-bold text-xs/3.5 ${
              index === 0 ? "bg-ink text-background" : "bg-info-soft text-info"
            }`}
            aria-hidden="true"
          >
            {app.badge}
          </span>
          <span className="flex flex-col grow gap-px">
            <span className="font-semibold text-text text-base/5">{app.name}</span>
            <span className="text-text-muted text-sm/sm">{app.steps}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
