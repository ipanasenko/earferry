export type HomeView = "landing" | "queue" | "loading";

export function homeViewForAuth(isLoaded: boolean, isSignedIn: boolean | undefined): HomeView {
  if (!isLoaded) return "loading";
  return isSignedIn ? "queue" : "landing";
}
