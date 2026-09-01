import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useCaptureAddParam } from "./lib/pendingAdd";

const LandingPage = lazy(() =>
  import("./pages/Landing").then(({ LandingPage }) => ({ default: LandingPage })),
);
const QueuePage = lazy(() =>
  import("./pages/Queue").then(({ QueuePage }) => ({ default: QueuePage })),
);
const WaitlistPage = lazy(() =>
  import("./pages/Waitlist").then(({ WaitlistPage }) => ({ default: WaitlistPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/Privacy").then(({ PrivacyPage }) => ({ default: PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("./pages/Terms").then(({ TermsPage }) => ({ default: TermsPage })),
);
const SupportPage = lazy(() =>
  import("./pages/Support").then(({ SupportPage }) => ({ default: SupportPage })),
);
const SharePage = lazy(() =>
  import("./pages/Share").then(({ SharePage }) => ({ default: SharePage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFound").then(({ NotFoundPage }) => ({ default: NotFoundPage })),
);

function Home() {
  // Above the auth split on purpose: a shared link has to survive landing here
  // signed out, and both branches below read only what this has stored.
  useCaptureAddParam();

  return (
    <>
      {/* Clerk runs in `waitlist` sign-up mode, so an account only exists
          once it has been approved. Signed in therefore means invited, and
          there is nothing further to gate on. */}
      <SignedIn>
        <QueuePage />
      </SignedIn>
      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/join" element={<WaitlistPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
