import { Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "./lib/api";
import { LandingPage } from "./pages/Landing";
import { QueuePage } from "./pages/Queue";
import { SubscribePage } from "./pages/Subscribe";
import { PrivacyPage } from "./pages/Privacy";
import { TermsPage } from "./pages/Terms";
import { SupportPage } from "./pages/Support";
import { NotFoundPage } from "./pages/NotFound";
import { LoadingState } from "./components/LoadingState";

// Entitlement lives in Convex, mirrored from Polar by webhook. The same check
// guards every mutation, so this only decides which screen to render.
function Subscribed() {
  const subscribed = useQuery(api.billing.subscribed, {});
  if (subscribed === undefined) return <LoadingState />;
  return subscribed ? <QueuePage /> : <SubscribePage />;
}

function Home() {
  return (
    <>
      <SignedIn>
        <Subscribed />
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
