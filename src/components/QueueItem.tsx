import { useState } from "react";
import { useMutation } from "convex/react";
import { api, type QueueItemDoc } from "../lib/api";
import { FailedThumbMark, PlayIcon, RetryIcon, TrashIcon, YoutubeIcon } from "./icons";

type UiStatus = "ready" | "extracting" | "waiting" | "failed";

const STATUS_PILL: Record<UiStatus, { label: string; bg: string; text: string }> = {
  ready: { label: "Ready", bg: "#DDF3EA", text: "#0E7C5B" },
  extracting: { label: "Extracting", bg: "#E2EFF8", text: "#2C6E9E" },
  waiting: { label: "Waiting", bg: "#FBF0CC", text: "#8A6D1E" },
  failed: { label: "Failed", bg: "#F9E2E5", text: "#B03A48" },
};

function uiStatus(status: QueueItemDoc["status"]): UiStatus {
  if (status === "ready") return "ready";
  if (status === "waiting") return "waiting";
  if (status === "failed") return "failed";
  return "extracting";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `${h} h ${minutes % 60} min`;
}

function subtitle(item: QueueItemDoc, ui: UiStatus): string {
  const channel = item.channel ?? "Unknown channel";
  if (ui === "ready") {
    const parts = [channel];
    if (item.durationSeconds) parts.push(formatDuration(item.durationSeconds));
    parts.push(formatDate(item.publishedAt ?? item.addedAt));
    return parts.join(" · ");
  }
  if (ui === "failed") return `${channel} · ${item.error ?? "extraction failed"}`;
  return `${channel} · ${item.phase ?? (ui === "waiting" ? "waiting to go live" : "getting ready…")}`;
}

function Thumbnail({ item, ui }: { item: QueueItemDoc; ui: UiStatus }) {
  const [broken, setBroken] = useState(false);
  const src =
    item.artworkUrl ??
    (item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg` : null);

  if (ui === "failed" && (broken || !src)) {
    return (
      <div className="w-19 h-14.25 shrink-0 flex items-center justify-center rounded-sm overflow-clip bg-surface border border-solid border-border">
        <FailedThumbMark />
      </div>
    );
  }
  if (broken || !src) {
    return (
      <div className="w-19 h-14.25 shrink-0 rounded-sm bg-surface border border-solid border-border" />
    );
  }
  return (
    <div className="relative w-19 h-14.25 shrink-0 rounded-sm overflow-clip border border-solid border-border bg-surface">
      {/* Blurred cover backdrop behind a contained image, per the design's blurred-cover treatment. */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-[6px] scale-125"
      />
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="relative w-full h-full object-contain"
      />
    </div>
  );
}

function IconButton({
  title,
  onClick,
  variant = "surface",
  children,
}: {
  title: string;
  onClick: () => void;
  variant?: "surface" | "ink" | "accent";
  children: React.ReactNode;
}) {
  const bg = variant === "ink" ? "bg-ink" : variant === "accent" ? "bg-accent" : "bg-surface";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`w-9.5 h-9.5 flex items-center justify-center rounded-pill shrink-0 cursor-pointer hover:opacity-85 transition-opacity ${bg}`}
    >
      {children}
    </button>
  );
}

export function QueueItem({ item }: { item: QueueItemDoc }) {
  const remove = useMutation(api.items.remove);
  const retry = useMutation(api.items.retry);
  const ui = uiStatus(item.status);
  const pill = STATUS_PILL[ui];
  const failed = ui === "failed";

  return (
    <div className="flex items-center py-4.5 px-5.5 rounded-md gap-4.5 [box-shadow:#1B3A5B14_0px_2px_12px] bg-background">
      <Thumbnail item={item} ui={ui} />
      <div className="grow basis-0 flex flex-col min-w-0 gap-0.5">
        <div
          className={`font-semibold truncate text-lg/base ${failed ? "text-text-muted" : "text-text"}`}
        >
          {item.title ?? item.url}
        </div>
        <div className="text-text-muted truncate text-sm/4">{subtitle(item, ui)}</div>
      </div>
      <div
        className="min-h-7.5 font-semibold hidden sm:flex items-center shrink-0 px-3.5 rounded-pill text-xs/3.5"
        style={{ backgroundColor: pill.bg, color: pill.text }}
      >
        {pill.label}
      </div>
      <div className="flex shrink-0 gap-2">
        {ui === "ready" ? (
          <IconButton
            title="Open MP3"
            onClick={() => {
              if (item.mediaUrl) window.open(item.mediaUrl, "_blank", "noopener");
            }}
          >
            <PlayIcon stroke="var(--color-text-muted)" />
          </IconButton>
        ) : ui === "failed" ? (
          <IconButton
            title="Retry extraction"
            onClick={() => void retry({ id: item._id })}
            variant="accent"
          >
            <RetryIcon />
          </IconButton>
        ) : (
          // Not ready yet: a disabled play button keeps the action lanes
          // aligned and signals what the slot will become.
          <button
            type="button"
            disabled
            aria-label="Not ready to play yet"
            title="Not ready to play yet"
            className="w-9.5 h-9.5 flex items-center justify-center rounded-pill shrink-0 bg-surface opacity-55 cursor-not-allowed"
          >
            <PlayIcon stroke="var(--color-text-muted)" />
          </button>
        )}
        <IconButton
          title="Open on YouTube"
          onClick={() => window.open(item.url, "_blank", "noopener")}
        >
          <YoutubeIcon />
        </IconButton>
        <IconButton title="Delete" onClick={() => void remove({ id: item._id })}>
          <TrashIcon />
        </IconButton>
      </div>
    </div>
  );
}
