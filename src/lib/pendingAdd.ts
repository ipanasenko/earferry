import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * A link that arrived before there was an account to file it under.
 *
 * The share target and the bookmarklet both land on `/?add=<url>`, and both
 * can land there signed out. The URL alone is not a safe place to keep the
 * link until sign-in finishes: signing in with an OAuth provider leaves the
 * page entirely and comes back at an address of Clerk's choosing, without the
 * query string. Session storage survives that round trip and stays scoped to
 * the one tab, so a link never reappears in another window days later.
 */
const KEY = "earferry.pending-add";

// Session storage throws rather than degrades when a browser blocks it, and a
// blocked one must not take the whole page down with it.
function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberPendingAdd(url: string): void {
  try {
    storage()?.setItem(KEY, url);
  } catch {
    // Full or read-only storage: the link is lost, the page still works.
  }
}

export function peekPendingAdd(): string | null {
  return storage()?.getItem(KEY) ?? null;
}

export function takePendingAdd(): string | null {
  const url = peekPendingAdd();
  storage()?.removeItem(KEY);
  return url;
}

/**
 * Moves `?add=<url>` off the address bar and into session storage.
 *
 * The write happens during render, not in an effect, because both readers sit
 * below this hook in the tree: child effects run before parent effects, so an
 * effect here would hand the queue an empty slot on the first commit.
 */
export function useCaptureAddParam(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const url = searchParams.get("add");
  if (url) rememberPendingAdd(url);

  useEffect(() => {
    if (!url) return;
    setSearchParams(
      (current) => {
        current.delete("add");
        return current;
      },
      { replace: true },
    );
  }, [url, setSearchParams]);
}
