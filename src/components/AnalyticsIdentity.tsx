import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { identify, resetIdentity } from "../lib/analytics";

// Ties the PostHog identity to the Clerk session: identify on sign-in,
// reset back to an anonymous id on sign-out.
export function AnalyticsIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      wasSignedIn.current = true;
      identify(user.id, { email: user.primaryEmailAddress?.emailAddress });
    } else if (wasSignedIn.current) {
      // Reset only on the sign-out transition so anonymous visitors keep a
      // stable distinct id across loads.
      wasSignedIn.current = false;
      resetIdentity();
    }
  }, [isLoaded, isSignedIn, user]);
  return null;
}
