// The frontend TS program pulls in convex/*.ts transitively through
// convex/_generated/api.d.ts. Those files run on Convex and use process.env,
// but tsconfig.app.json pins types to ["vite/client"], so Node globals are
// missing here. This minimal ambient declaration covers that usage without
// widening the app's type environment.
declare var process: {
  env: Record<string, string | undefined>;
};
