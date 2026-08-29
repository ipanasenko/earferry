import { SignInButton } from "@clerk/clerk-react";
import { track } from "../lib/analytics";
import { shortenUrl } from "../lib/shareUrl";

/**
 * Shown on the landing page when a shared link arrived before sign-in.
 *
 * Without it the share is silent: the app opens on marketing copy, the link is
 * nowhere on screen, and the only honest reading is that it was dropped.
 */
export function SharedLinkNotice({ url }: { url: string }) {
  return (
    <div className="flex items-center w-full gap-3 sm:gap-6 py-3 pr-3 pl-4.5 sm:pl-5.5 rounded-md shadow-card bg-background">
      <div className="flex flex-col grow min-w-0 gap-0.75">
        <div className="font-semibold text-text text-base/5">Your link is on the dock.</div>
        <div className="truncate text-text-muted text-sm/sm">{shortenUrl(url)}</div>
      </div>
      <SignInButton mode="modal">
        <button
          type="button"
          onClick={() => track("signin_clicked")}
          className="flex items-center shrink-0 h-10 px-5.5 rounded-pill bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </SignInButton>
    </div>
  );
}
