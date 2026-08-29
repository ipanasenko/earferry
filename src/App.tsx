import { Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useCaptureAddParam } from "./lib/pendingAdd";
import { LandingPage } from "./pages/Landing";
import { QueuePage } from "./pages/Queue";
import { WaitlistPage } from "./pages/Waitlist";
import { PrivacyPage } from "./pages/Privacy";
import { TermsPage } from "./pages/Terms";
import { SupportPage } from "./pages/Support";
import { SharePage } from "./pages/Share";
import { NotFoundPage } from "./pages/NotFound";

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
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/join" element={<WaitlistPage />} />
      <Route path="/share" element={<SharePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
