import { LoadingMark } from "./icons";

/** Queue loading state per the "App · Loading playlist" Paper artboard. */
export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-70 gap-5">
      <LoadingMark size={96} />
      <div className="text-text-muted text-sm/4.5">Ferrying your queue in…</div>
    </div>
  );
}
