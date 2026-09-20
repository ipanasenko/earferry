import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { errorMessage } from "../lib/errors";
import { VideoIcon } from "./icons";

// Best-effort video id for analytics; the backend does the real parsing.
function videoIdForAnalytics(url: string): string | undefined {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/);
  return match?.[1];
}

export function AddForm() {
  const add = useMutation(api.items.add);
  const [url, setUrl] = useState("");
  // Sticky across adds: someone who wants video usually wants it for the
  // next link too, and the backend ignores it for articles anyway.
  const [video, setVideo] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await add({ url: trimmed, video });
      track("item_added", { video_id: videoIdForAnalytics(trimmed), video });
      setUrl("");
    } catch (err) {
      const message = errorMessage(err, "That didn't work. Check the link and try again.");
      track("item_add_failed", { reason: message });
      setError(message);
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
          autoFocus
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="Paste a YouTube or article link"
          aria-label="Paste a YouTube or article link"
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
      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
        <button
          type="button"
          role="switch"
          aria-checked={video}
          onClick={() => setVideo((value) => !value)}
          className={`min-h-9.5 flex items-center gap-2 px-4.5 rounded-pill shadow-pill font-semibold text-sm/4 cursor-pointer transition-colors ${
            video ? "bg-ink text-background" : "bg-background text-text-muted hover:text-text"
          }`}
        >
          <VideoIcon stroke={video ? "var(--color-background)" : "var(--color-text-muted)"} />
          Keep the video too
        </button>
        <div className="max-w-105 text-xs/3.5 text-text-muted">
          Adds a 720p MP4 so podcast apps that play video can show it. Videos take far more storage
          than audio.
        </div>
      </div>
      {error ? <div className="text-sm/4 text-danger">{error}</div> : null}
    </div>
  );
}
