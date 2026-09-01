import { useState } from "react";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { api, type QueueItemDoc } from "../lib/api";
import { track } from "../lib/analytics";
import { errorMessage } from "../lib/errors";
import {
  CancelIcon,
  ConfirmIcon,
  FailedThumbMark,
  PlayIcon,
  RetryIcon,
  TrashIcon,
  YoutubeIcon,
} from "./icons";

type UiStatus = "ready" | "extracting" | "waiting" | "failed";

const STATUS_PILL: Record<UiStatus, { label: string; classes: string }> = {
  ready: { label: "Ready", classes: "bg-success-soft text-success" },
  extracting: { label: "Extracting", classes: "bg-info-soft text-info" },
  waiting: { label: "Waiting", classes: "bg-warning-soft text-warning" },
  failed: { label: "Failed", classes: "bg-danger-soft text-danger" },
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

// Keep the card preview at 4:3 while cropping YouTube's native 16:9 image.
const thumbSizeClass = "w-20 sm:w-19 aspect-[4/3]";

function Thumbnail({ item, ui }: { item: QueueItemDoc; ui: UiStatus }) {
  const [broken, setBroken] = useState(false);
  // Generated square artwork belongs in the podcast feed and MP3 metadata.
  // Keep the web queue tied to the original YouTube preview instead.
  const src = item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg` : null;

  if (ui === "failed" && (broken || !src)) {
    return (
      <div
        className={`${thumbSizeClass} shrink-0 flex items-center justify-center rounded-sm overflow-clip bg-surface border border-solid border-border`}
      >
        <FailedThumbMark />
      </div>
    );
  }
  if (broken || !src) {
    return (
      <div
        className={`${thumbSizeClass} shrink-0 rounded-sm bg-surface border border-solid border-border`}
      />
    );
  }
  return (
    <div
      className={`relative ${thumbSizeClass} shrink-0 rounded-sm overflow-clip border border-solid border-border bg-surface`}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

function IconButton({
  title,
  onClick,
  variant = "surface",
  disabled = false,
  children,
}: {
  title: string;
  onClick: () => void;
  variant?: "surface" | "ink" | "accent" | "danger" | "danger-solid";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const look =
    variant === "ink"
      ? "bg-ink hover:opacity-85"
      : variant === "accent"
        ? "bg-accent hover:opacity-85"
        : variant === "danger-solid"
          ? "bg-danger hover:opacity-85"
          : variant === "danger"
            ? "bg-surface hover:bg-danger-soft"
            : "bg-surface hover:opacity-85";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-9.5 h-9.5 flex items-center justify-center rounded-pill shrink-0 cursor-pointer transition-[background-color,opacity] disabled:cursor-wait disabled:opacity-60 ${look}`}
    >
      {children}
    </button>
  );
}

export function QueueItem({ item }: { item: QueueItemDoc }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const remove = useMutation(api.items.remove);
  const retry = useMutation(api.items.retry);
  const ui = uiStatus(item.status);
  const pill = STATUS_PILL[ui];
  const failed = ui === "failed";

  function retryItem() {
    track("item_retried");
    setActionError(null);
    void retry({ id: item._id }).catch((err) =>
      setActionError(errorMessage(err, "The retry didn't go through. Try again")),
    );
  }

  return (
    <div className="flex flex-col rounded-md shadow-card bg-background">
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:py-4.5 sm:px-5.5 sm:gap-4.5">
        <div className="flex items-center gap-3 sm:gap-4.5 grow min-w-0">
          <Thumbnail item={item} ui={ui} />
          <div className="grow basis-0 flex flex-col min-w-0 gap-0.5">
            <div
              className={`font-semibold line-clamp-2 sm:line-clamp-1 text-base/5 sm:text-lg/base ${failed ? "text-text-muted" : "text-text"}`}
            >
              {item.title ?? item.url}
            </div>
            <div className="text-text-muted truncate text-sm/4">{subtitle(item, ui)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4.5 shrink-0">
          <div
            className={`min-h-7.5 font-semibold flex items-center shrink-0 px-3.5 rounded-pill text-xs/3.5 ${pill.classes}`}
          >
            {pill.label}
          </div>
          <div className="grow sm:hidden" />
          <div className="relative w-44 h-9.5 flex shrink-0 justify-end">
            <AnimatePresence initial={false} mode="popLayout">
              {confirmingDelete ? (
                <motion.div
                  key="confirm-delete"
                  className="absolute inset-0 flex justify-end gap-2"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <IconButton
                    title="Confirm delete"
                    variant="danger-solid"
                    disabled={deleting}
                    onClick={() => {
                      setDeleting(true);
                      setActionError(null);
                      track("item_removed");
                      void remove({ id: item._id }).catch((err) => {
                        setDeleting(false);
                        setActionError(
                          errorMessage(err, "The delete didn't go through. Try again"),
                        );
                      });
                    }}
                  >
                    <ConfirmIcon />
                  </IconButton>
                  <IconButton
                    title="Cancel delete"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(false)}
                  >
                    <CancelIcon />
                  </IconButton>
                </motion.div>
              ) : (
                <motion.div
                  key="default-actions"
                  className="absolute inset-0 flex justify-end gap-2"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.12, ease: "easeIn" }}
                >
                  {ui === "ready" ? (
                    <IconButton
                      title="Open MP3"
                      onClick={() => {
                        if (item.mediaUrl) window.open(item.mediaUrl, "_blank", "noopener");
                      }}
                    >
                      <PlayIcon stroke="var(--color-text-muted)" />
                    </IconButton>
                  ) : (
                    <IconButton title="Retry extraction" onClick={retryItem}>
                      <RetryIcon stroke="var(--color-text-muted)" />
                    </IconButton>
                  )}
                  {ui === "ready" ? (
                    <IconButton title="Re-extract audio" onClick={retryItem}>
                      <RetryIcon stroke="var(--color-text-muted)" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    title="Open on YouTube"
                    onClick={() => window.open(item.url, "_blank", "noopener")}
                  >
                    <YoutubeIcon />
                  </IconButton>
                  <IconButton
                    title="Delete"
                    variant="danger"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <TrashIcon stroke="var(--color-danger)" />
                  </IconButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {actionError ? (
        <div className="px-3.5 pb-3.5 sm:px-5.5 sm:pb-4 text-sm/4 text-danger">{actionError}</div>
      ) : null}
    </div>
  );
}
