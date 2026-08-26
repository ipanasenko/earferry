// The Convex runtime exposes deployment environment variables on process.env,
// but the convex tsconfig does not include Node types. Declare just the shape
// that is actually available.
declare const process: {
  env: Record<string, string | undefined>;
};
