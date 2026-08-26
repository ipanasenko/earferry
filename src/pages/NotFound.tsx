import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { DrowningEarMark } from "../components/icons";

export function NotFoundPage() {
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-6 md:px-25 pb-15">
        <Header />
        <section className="flex flex-col items-center pt-11 gap-5">
          <DrowningEarMark />
          <h1 className="font-extrabold tracking-tight text-center text-ink text-[32px]/10 md:text-display/display">
            This page went overboard.
          </h1>
          <p className="max-w-105 text-center text-text-muted text-base/base">
            404 — there's nothing at this address. It may have sunk, or it never sailed at all.
          </p>
          <Link
            to="/"
            className="flex items-center justify-center min-h-11.5 mt-2 px-6.5 rounded-pill bg-ink font-semibold text-background text-base/4.5 hover:opacity-90 transition-opacity"
          >
            Back to your queue
          </Link>
        </section>
      </div>
    </div>
  );
}
