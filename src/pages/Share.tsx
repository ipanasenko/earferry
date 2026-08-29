import { useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { DrowningEarMark } from "../components/icons";
import { track } from "../lib/analytics";
import { usePageMeta } from "../lib/meta";
import { firstYouTubeUrl } from "../lib/shareUrl";

/**
 * The Android share sheet lands here, through the `share_target` entry in the
 * web app manifest. Chrome only offers an installed app in the share sheet, so
 * this route is reached by a full page load and never by a link inside the app.
 *
 * The fields are scanned in the order Android fills them: the URL almost always
 * arrives inside `text`, because Android's share system has no URL extra at
 * all. Anything that is not a YouTube link stops here rather than reaching the
 * queue, which is the one place a person can see why nothing happened.
 */
export function SharePage() {
  const [searchParams] = useSearchParams();
  const shared = firstYouTubeUrl(
    searchParams.get("text"),
    searchParams.get("url"),
    searchParams.get("title"),
  );

  useEffect(() => {
    track(shared ? "share_received" : "share_rejected");
  }, [shared]);

  // Handing the link back as `?add=` keeps one capture point for the share
  // target, the bookmarklet and anything else that arrives from outside.
  if (shared) return <Navigate to={`/?add=${encodeURIComponent(shared)}`} replace />;

  return <NotAYouTubeLink />;
}

function NotAYouTubeLink() {
  usePageMeta({
    title: "Shared link · EarFerry",
    description: "EarFerry only ferries YouTube videos.",
    noindex: true,
  });

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-11 gap-5">
          <DrowningEarMark />
          <h1 className="font-extrabold tracking-tight text-center text-ink text-[32px]/10 md:text-display/display">
            That link isn't from YouTube.
          </h1>
          <p className="max-w-105 text-center text-text-muted text-base/base">
            EarFerry only ferries YouTube videos. Share one from YouTube and we'll pull the audio
            out for you.
          </p>
          <Link
            to="/"
            className="flex items-center h-13 px-7 rounded-pill shrink-0 shadow-cta bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            Back to your queue
          </Link>
        </section>
      </div>
    </div>
  );
}
