import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../lib/api";
import { track } from "../lib/analytics";

// Best-effort video id for analytics; the backend does the real parsing.
function videoIdForAnalytics(url: string): string | undefined {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/);
  return match?.[1];
}

export function AddForm() {
  const add = useMutation(api.items.add);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await add({ url: trimmed });
      track("item_added", { video_id: videoIdForAnalytics(trimmed) });
      setUrl("");
    } catch {
      track("item_add_failed", { reason: "invalid_url" });
      setError("That doesn't look like a YouTube link EarFerry can carry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 self-stretch">
      <form
        onSubmit={submit}
        className="flex items-center w-full max-w-165 min-h-14 sm:min-h-15 justify-between gap-2 sm:gap-3 pr-1.75 sm:pr-2 pl-4.5 sm:pl-6 rounded-pill shadow-float bg-background"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…"
          aria-label="YouTube URL"
          className="grow min-w-0 bg-transparent outline-none text-text placeholder:text-text-muted text-base/4.5"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center min-h-10.5 px-5.5 sm:min-h-11.5 sm:px-6.5 rounded-pill bg-ink font-semibold text-background text-base/4.5 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {error ? <div className="text-sm/4 text-danger">{error}</div> : null}
    </div>
  );
}
