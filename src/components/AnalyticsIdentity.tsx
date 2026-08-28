import { useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { identify, resetIdentity } from "../lib/analytics";
import { api } from "../lib/api";

// Ties the PostHog identity to the Clerk session: identify on sign-in,
// reset back to an anonymous id on sign-out.
export function AnalyticsIdentity() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncProfile = useMutation(api.users.syncProfile);
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      wasSignedIn.current = true;
      identify(user.id);
    } else if (wasSignedIn.current) {
      // Reset only on the sign-out transition so anonymous visitors keep a
      // stable distinct id across loads.
      wasSignedIn.current = false;
      resetIdentity();
    }
  }, [isLoaded, isSignedIn, user]);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const displayName = user.username ?? user.fullName ?? user.firstName;
    if (displayName) void syncProfile({ displayName });
  }, [isLoaded, isSignedIn, syncProfile, user]);
  return null;
}
