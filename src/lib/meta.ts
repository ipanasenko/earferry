import { useEffect } from "react";

/**
 * Per-route document title, description and canonical URL.
 *
 * EarFerry is a client-rendered SPA, so everything set here only reaches
 * consumers that run JavaScript: browser tabs, bookmarks, history entries, and
 * Google's rendered pass. Social unfurlers (Slack, iMessage, WhatsApp, X) read
 * the raw HTML and never execute the bundle, which is why the Open Graph card
 * lives statically in `index.html` and describes the landing page, the link
 * people actually share. Updating `og:*` from here would look thorough and do
 * nothing, so this hook deliberately leaves those tags alone.
 *
 * There is no search strategy behind this file. EarFerry is free, invite-only
 * and capacity-limited, and the queries it could rank for are the ones it must
 * stay away from (see docs/plans/sellable-product.md). This is hygiene only.
 */

/**
 * Apex host, not `www`. Both are custom domains on the same Worker
 * (wrangler.jsonc), so every page answers on two hostnames and needs a
 * canonical to name the one that counts.
 */
export const SITE_ORIGIN = "https://earferry.com";

type PageMeta = {
  /** Complete document title, brand included. */
  title: string;
  description: string;
  /** Route path for the canonical URL. Omit where a canonical makes no sense. */
  path?: string;
  /**
   * `not_found_handling: single-page-application` answers unknown paths with
   * index.html and status 200, so a 404 has to say noindex out loud.
   */
  noindex?: boolean;
};

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string | null) {
  const selector = `link[rel="${rel}"]`;
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  if (!href) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement("link");
  element.rel = rel;
  element.href = href;
  if (!existing) document.head.appendChild(element);
}

export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    setLink("canonical", path && !noindex ? `${SITE_ORIGIN}${path}` : null);

    if (noindex) {
      upsertMeta("name", "robots", "noindex, follow");
      return;
    }
    document.head.querySelector('meta[name="robots"]')?.remove();
  }, [title, description, path, noindex]);
}
