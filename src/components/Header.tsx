import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, useClerk } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../lib/api";
import { LogoMark } from "./icons";
import { Tooltip } from "./Tooltip";

function pillButtonClass(extra = "") {
  return `min-h-9.5 flex items-center px-4.5 rounded-pill [box-shadow:#1B3A5B14_0px_1px_2px] bg-background font-semibold text-text-muted text-sm/4 cursor-pointer hover:text-text transition-colors ${extra}`;
}

function FeedUrlButton() {
  const me = useQuery(api.users.me, {});
  const [copied, setCopied] = useState(false);
  const feedUrl = me?.feedUrl ?? null;

  async function copy() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
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
  const { signOut } = useClerk();
  return (
    <header className="flex items-center justify-between gap-4 py-7.5">
      <Link to="/" className="flex items-center gap-2.75">
        <LogoMark size={38} />
        <span className="font-extrabold tracking-tight text-ink text-xl/8.5">earferry</span>
      </Link>
      <SignedIn>
        <div className="flex flex-wrap justify-end gap-2.5">
          <FeedUrlButton />
          <span className="hidden sm:block">
            <BookmarkletButton />
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center h-9.5 px-4.5 rounded-pill [box-shadow:#10141814_0px_1px_3px] bg-background font-semibold text-text-muted text-sm/4 cursor-pointer hover:text-text transition-colors"
          >
            Log out
          </button>
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="flex items-center h-9.5 px-5 rounded-pill bg-ink font-semibold text-background text-sm/4 cursor-pointer hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
