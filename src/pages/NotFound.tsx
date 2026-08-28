import { Header } from "../components/Header";
import { DrowningEarMark } from "../components/icons";
import { usePageMeta } from "../lib/meta";

export function NotFoundPage() {
  // Cloudflare answers unknown paths with index.html and status 200, so this
  // page has to declare itself unindexable; nothing else marks it as a 404.
  usePageMeta({
    title: "Page not found · EarFerry",
    description: "There is nothing at this address.",
    noindex: true,
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-11 gap-5">
          <DrowningEarMark />
          <h1 className="font-extrabold tracking-tight text-center text-ink text-[32px]/10 md:text-display/display">
            This page went overboard.
          </h1>
          <p className="max-w-105 text-center text-text-muted text-base/base">
            404: there's nothing at this address. It may have sunk, or it never sailed at all.
          </p>
        </section>
      </div>
    </div>
  );
}
