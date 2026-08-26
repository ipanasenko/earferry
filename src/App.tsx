import { Routes, Route } from "react-router-dom";
import { Protect, SignedIn, SignedOut } from "@clerk/clerk-react";
import { LandingPage } from "./pages/Landing";
import { QueuePage } from "./pages/Queue";
import { SubscribePage } from "./pages/Subscribe";
import { PrivacyPage } from "./pages/Privacy";
import { TermsPage } from "./pages/Terms";
import { SupportPage } from "./pages/Support";
import { NotFoundPage } from "./pages/NotFound";

function Home() {
  return (
    <>
      <SignedIn>
        <Protect plan="ferry" fallback={<SubscribePage />}>
          <QueuePage />
        </Protect>
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
