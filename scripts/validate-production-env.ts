const errors: string[] = [];

const clerkKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
if (!clerkKey.startsWith("pk_live_")) {
  errors.push("VITE_CLERK_PUBLISHABLE_KEY must be a Clerk production key (pk_live_).");
}

const posthogKey = process.env.VITE_POSTHOG_KEY ?? "";
if (!posthogKey.startsWith("phc_")) {
  errors.push("VITE_POSTHOG_KEY must be a PostHog project key (phc_).");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Production configuration error: ${error}`);
  process.exit(1);
}

console.log("Production environment variables are valid.");
