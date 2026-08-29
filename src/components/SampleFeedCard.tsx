import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { track } from "../lib/analytics";
import {
  SAMPLE_EPISODE_COUNT,
  SAMPLE_EPISODE_PREVIEW,
  sampleFeedDisplayUrl,
  sampleFeedUrl,
} from "../lib/sampleFeed";
import { CancelIcon, ConfirmIcon } from "./icons";
import { PodcastAppSteps } from "./PodcastAppSteps";

function CopyFeedUrlRow() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sampleFeedUrl());
    track("sample_feed_url_copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-center py-1.75 pl-4 pr-1.75 rounded-sm gap-3 border border-border bg-surface">
      <span className="grow min-w-0 truncate text-text-muted text-sm/sm">
        {sampleFeedDisplayUrl()}
      </span>
      <button
        type="button"
        onClick={copy}
        className="flex items-center h-9.5 shrink-0 px-4 rounded-pill gap-1.5 bg-ink font-semibold text-background text-sm/sm cursor-pointer hover:opacity-90 transition-opacity"
      >
        {copied ? (
          <>
            Copied
            <ConfirmIcon stroke="var(--color-accent)" />
          </>
        ) : (
          "Copy URL"
        )}
      </button>
    </div>
  );
}

function AddSampleFeedDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape and a returning focus ring are the two things a hand-rolled dialog
  // most often drops; the trigger is unmounted-safe because it outlives this.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 bg-[#1014187a]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-feed-dialog-title"
        className="flex flex-col w-full max-w-140 max-h-full overflow-y-auto rounded-md shadow-float bg-background"
      >
        <div className="flex items-start justify-between pt-7 px-5 sm:px-7 pb-5 gap-6">
          <div className="flex flex-col gap-1.5">
            <h2
              id="sample-feed-dialog-title"
              className="font-extrabold tracking-tight text-text text-xl/8.5"
            >
              Add the sample feed
            </h2>
            <p className="max-w-107.5 text-text-muted text-base/base">
              Paste this public demo feed into your podcast app. It contains {SAMPLE_EPISODE_COUNT}{" "}
              AI-narrated sample episodes.
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex shrink-0 items-center justify-center rounded-pill bg-surface cursor-pointer hover:opacity-80 transition-opacity"
          >
            <CancelIcon stroke="var(--color-ink)" />
          </button>
        </div>
        <div className="px-5 sm:px-7">
          <CopyFeedUrlRow />
        </div>
        <div className="flex flex-col pt-5.5 px-5 sm:px-7 pb-7 gap-2.5">
          <div className="font-semibold uppercase tracking-caps text-text-muted text-xs/4">
            Quick instructions
          </div>
          <PodcastAppSteps />
        </div>
      </div>
    </div>
  );
}

/**
 * Evidence for the waitlist CTA, not a competing one: a visitor can hear a real
 * EarFerry feed in their own podcast app before deciding to sign up.
 */
export function SampleFeedCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <section className="flex flex-col md:flex-row gap-2.5 md:gap-0 md:overflow-clip md:rounded-md">
        <div className="flex flex-col justify-center py-7 px-6 md:px-8.5 rounded-md md:rounded-none gap-3 md:w-[54%] bg-ink">
          <div className="flex flex-col gap-2">
            <div className="font-semibold uppercase tracking-caps text-accent text-xs/4">
              A public demo crossing
            </div>
            <h2 className="font-extrabold tracking-tight text-background text-xl/8.5">
              Try EarFerry while you wait.
            </h2>
            <p className="max-w-107.5 text-wave-soft text-base/base">
              Add ten short episodes to your podcast app and see how EarFerry looks and plays.
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => {
                track("sample_feed_opened");
                setDialogOpen(true);
              }}
              className="flex grow md:grow-0 items-center justify-center h-11 px-5 rounded-pill bg-accent font-semibold text-ink text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
            >
              Add sample feed
            </button>
            <Link
              to="/support"
              className="hidden md:block font-semibold underline text-background text-sm/sm hover:opacity-80 transition-opacity"
            >
              Adding a feed
            </Link>
          </div>
        </div>
        <div className="flex items-center p-6 rounded-md md:rounded-none gap-4.5 md:w-[46%] bg-background">
          <img
            src="/podcast-cover.png"
            alt=""
            className="w-19 h-19 md:w-29 md:h-29 shrink-0 rounded-sm object-cover"
          />
          <div className="flex flex-col grow min-w-0 justify-center gap-1.75">
            <div className="font-semibold uppercase tracking-caps text-success text-xs/4">
              {SAMPLE_EPISODE_COUNT} sample episodes
            </div>
            <div className="font-semibold text-text text-lg/base">
              {SAMPLE_EPISODE_PREVIEW.title}
            </div>
            <div className="text-text-muted text-sm/sm">{SAMPLE_EPISODE_PREVIEW.meta}</div>
            <div className="flex items-center pt-0.75 gap-1.75">
              <span className="w-2 h-2 shrink-0 rounded-pill bg-accent" aria-hidden="true" />
              <span className="font-semibold text-ink text-sm/sm">
                {SAMPLE_EPISODE_PREVIEW.disclaimer}
              </span>
            </div>
          </div>
        </div>
      </section>
      {dialogOpen && <AddSampleFeedDialog onClose={() => setDialogOpen(false)} />}
    </>
  );
}
