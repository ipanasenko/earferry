import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { ConfirmIcon, CopyIcon, FeedIcon, LogoMark } from "./icons";
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
    <>
      <button
        type="button"
        onClick={copy}
        disabled={!feedUrl}
        className={pillButtonClass("hidden sm:flex gap-1.5 disabled:opacity-50")}
        title="Copy your private podcast feed URL"
      >
        {copied ? (
          <>
            Copied
            <ConfirmIcon stroke="var(--color-success)" />
          </>
        ) : (
          <>
            Feed URL
            <CopyIcon />
          </>
        )}
      </button>
      <button
        type="button"
        onClick={copy}
        disabled={!feedUrl}
        aria-label="Copy your private podcast feed URL"
        title="Copy your private podcast feed URL"
        className="sm:hidden w-9.5 h-9.5 flex items-center justify-center rounded-pill shadow-pill bg-background cursor-pointer disabled:opacity-50"
      >
        {copied ? <ConfirmIcon stroke="var(--color-success)" /> : <FeedIcon />}
      </button>
    </>
  );
}

function BookmarkletButton() {
  const code =
    "javascript:(()=>{" +
    'const a=location.hostname.includes("inoreader")?document.querySelector("a.article_title_link"):null;' +
    "const u=a&&a.href?a.href:location.href;" +
    `window.open("${window.location.origin}/?add="+encodeURIComponent(u),"_blank",` +
    '"scrollbars=1,status=0,resizable=1,location=0,toolbar=0,width=700,height=800");' +
    "void 0})()";
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

/**
 * `minimal` drops the feed and bookmarklet pills, per the "App · Subscribe"
 * Paper artboard: neither is usable before there is a subscription.
 */
export function Header({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="flex items-center justify-between gap-4 py-5 sm:py-7.5">
      <Link to="/" className="flex items-center gap-2.25 sm:gap-2.75">
        <span className="sm:hidden flex">
          <LogoMark size={32} />
        </span>
        <span className="hidden sm:flex">
          <LogoMark size={38} />
        </span>
        <span className="font-extrabold tracking-tight text-ink text-[20px]/6.5 sm:text-xl/8.5">
          earferry
        </span>
      </Link>
      <SignedIn>
        <div className="flex items-center justify-end gap-2.5">
          {!minimal && (
            <>
              <FeedUrlButton />
              <span className="hidden sm:block">
                <BookmarkletButton />
              </span>
            </>
          )}
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
            className="flex items-center h-9.5 px-5 rounded-pill shadow-pill bg-ink font-semibold text-background text-sm/4 cursor-pointer hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
