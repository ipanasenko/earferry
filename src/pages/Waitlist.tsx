import { Waitlist } from "@clerk/clerk-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

/**
 * Waitlist page per the "App · Waitlist" Paper artboard.
 *
 * Clerk owns the list itself: the instance runs in `waitlist` sign-up mode, so
 * nobody can create an account until an entry is approved in the dashboard.
 *
 * The card is restyled by the `.waitlist-form` rules in index.css, which strip
 * Clerk's own wordmark, title and subtitle — they would otherwise repeat the
 * page heading and the header logo three times over — and turn the field and
 * button into EarFerry pills. Clerk's "Secured by Clerk" footer stays; only the
 * "Already have access?" row is hidden, since the header already offers Sign in.
 */
export function WaitlistPage() {
  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto w-full min-h-screen max-w-[1180px] flex flex-col px-4 sm:px-6 md:px-25">
        <Header minimal />
        <section className="flex flex-col items-center pt-6 pb-10 gap-4.5 sm:pt-18">
          <h1 className="font-extrabold tracking-tight text-center text-text text-xl/8.5">
            Join the waitlist.
          </h1>
          <p className="text-text-muted text-base/5.5 text-center max-w-115">
            EarFerry is free and invite-only while it is small. Leave your email and I will let
            people in as capacity allows.
          </p>
          <div className="waitlist-form w-full max-w-[360px] pt-2">
            <Waitlist />
          </div>
          <p className="text-text-muted text-sm/4 text-center">
            No payment, now or later. Donations are welcome and change nothing.
          </p>
        </section>
        {/* No donate link here on purpose: money must not look like the way in. */}
        <Footer donate={false} />
      </div>
    </div>
  );
}
