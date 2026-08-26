import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { LogoMark } from "./icons";
import { Tooltip } from "./Tooltip";

function pillButtonClass(extra = "") {
  return `min-h-9.5 flex items-center px-4.5 rounded-pill shadow-pill bg-background font-semibold text-text-muted text-sm/4 cursor-pointer hover:text-text transition-colors ${extra}`;
}

function FeedUrlButton() {
  const me = useQuery(api.users.me, {});
  const [copied, setCopied] = useState(false);
  const feedUrl = me?.feedUrl ?? null;

  async function copy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    track("feed_url_copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!feedUrl}
      className={pillButtonClass("disabled:opacity-50")}
      title="Copy your private podcast feed URL"
    >
      {copied ? "Copied ✓" : "Feed URL ⎘"}
    </button>
  );
}

function RotateFeedButton() {
  const rotate = useMutation(api.users.rotateFeedToken);
  const [rotating, setRotating] = useState(false);

  async function confirmRotation() {
    if (
      !window.confirm(
        "Replace your private feed URL? Podcast apps using the old URL will stop receiving updates.",
      )
    )
      return;
    setRotating(true);
    try {
      const result = await rotate({});
      await navigator.clipboard.writeText(result.feedUrl);
      track("feed_url_rotated");
    } finally {
      setRotating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void confirmRotation()}
      disabled={rotating}
      className={pillButtonClass("disabled:opacity-50")}
      title="Replace a leaked private feed URL and copy the new one"
    >
      {rotating ? "Rotating…" : "Rotate feed"}
    </button>
  );
}

function BookmarkletButton() {
  const code = `javascript:location.href='${window.location.origin}/?add='+encodeURIComponent(location.href)`;
  return (
    <Tooltip
      label="Drag me to your bookmarks bar"
      hint="Then click it on any YouTube page to ferry the video straight into your feed."
    >
      <a
        // React blocks javascript: URLs set via props; the bookmarklet needs one.
        ref={(el) => {
          if (el) el.setAttribute("href", code);
        }}
        onClick={(e) => e.preventDefault()}
        className={pillButtonClass()}
      >
        Bookmarklet
      </a>
    </Tooltip>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 py-7.5">
      <Link to="/" className="flex items-center gap-2.75">
        <LogoMark size={38} />
        <span className="font-extrabold tracking-tight text-ink text-xl/8.5">earferry</span>
      </Link>
      <SignedIn>
        <div className="flex flex-wrap justify-end gap-2.5">
          <FeedUrlButton />
          <span>
            <RotateFeedButton />
          </span>
          <span className="hidden sm:block">
            <BookmarkletButton />
          </span>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9.5 h-9.5 shadow-pill",
                // Clerk's default focus ring hugs the trigger box, which reads
                // as an oval around the round avatar. Use a round brand ring.
                userButtonTrigger:
                  "rounded-pill focus:[box-shadow:none] focus-visible:[outline:2px_solid_var(--color-wave)] focus-visible:[outline-offset:2px]",
              },
            }}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            onClick={() => track("signin_clicked")}
            className="flex items-center h-9.5 px-5 rounded-pill bg-ink font-semibold text-background text-sm/4 cursor-pointer hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
