import { SignUpButton } from "@clerk/clerk-react";
import { track } from "../lib/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const FEATURES = [
  {
    title: "Paste a link",
    body: "Drop in any YouTube URL, or save it in one click with the bookmarklet.",
  },
  {
    title: "We extract the audio",
    body: "EarFerry pulls clean audio from the video, ready in minutes.",
  },
  {
    title: "Listen in your app",
    body: "Subscribe once with your private feed URL in any podcast player.",
  },
];

export function LandingPage() {
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5">
          <h1 className="font-extrabold tracking-tight text-center max-w-160 text-text text-[32px]/10 md:text-display/display">
            YouTube for your ears, delivered to your podcast app.
          </h1>
          <p className="text-center max-w-115 text-text-muted text-base/base">
            Save any YouTube video and EarFerry ferries the audio into a private podcast feed you
            can play anywhere.
          </p>
          <div className="flex flex-col items-center gap-3">
            <SignUpButton mode="modal">
              <button
                type="button"
                onClick={() => track("signup_clicked")}
                className="flex items-center h-13 px-7 rounded-pill shrink-0 shadow-cta bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity"
              >
                Get started · $9/month
              </button>
            </SignUpButton>
            <div className="text-text-muted text-sm/4">One plan. Cancel anytime.</div>
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col p-7 rounded-md gap-2.5 bg-background">
              <div className="font-semibold text-text text-base/4.5">{feature.title}</div>
              <div className="text-text-muted text-sm/sm">{feature.body}</div>
            </div>
          ))}
        </section>
        <Footer />
      </div>
    </div>
  );
}
