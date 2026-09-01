// Brand marks extracted from the Paper file "EarFerry".
// UI icons come from the Hugeicons package.

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon as HugeCopy,
  PlayIcon as HugePlay,
  PauseIcon as HugePause,
  YoutubeIcon as HugeYoutube,
  Delete02Icon as HugeDelete,
  Cancel01Icon as HugeCancel,
  ReloadIcon as HugeReload,
  RssIcon as HugeRss,
  Tick01Icon as HugeTick,
  HandHeartIcon as HugeHandHeart,
} from "@hugeicons/core-free-icons";

export function LogoMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M76 46 C78 28 62 20 49 26 C35 33 32 51 40 63 C45 70 51 73 53 78"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M63 44 C63 37 55 35 50 39"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M20 78 Q30 70 40 78 T60 78 T80 78 T100 78"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M28 90 Q38 84 48 90 T68 90 T88 90"
        fill="none"
        stroke="var(--color-wave)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Simplified two-stroke mark used at small sizes (legal page headers). */
export function LogoMarkSmall({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M76 46 C78 28 62 20 49 26 C35 33 32 51 40 63 C45 70 51 73 53 78"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M18 84 Q32 72 46 84 T74 84 T102 84"
        fill="none"
        stroke="var(--color-wave)"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Muted footer mark. */
export function FooterMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 opacity-60"
      aria-hidden="true"
    >
      <path
        d="M76 46 C78 28 62 20 49 26 C35 33 32 51 40 63 C45 70 51 73 53 78"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M18 84 Q32 72 46 84 T74 84 T102 84"
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Empty-state mark: the brand ear with the waves removed and a dot added. */
export function EmptyStateMark() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="18 12 88 96"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M76 46 C78 28 62 20 49 26 C35 33 32 51 40 63 C45 70 51 73 53 78"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M63 44 C63 37 55 35 50 39"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="54" cy="97" r="7" fill="var(--color-ink)" />
    </svg>
  );
}

/** Failed state · drowning ear, small variant used in queue thumbnails. */
export function FailedThumbMark() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M14 30 Q28 18 42 30 T70 30 T98 30"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <g transform="rotate(14 60 84)">
        <path
          d="M76 82 C78 64 62 56 49 62 C35 69 32 87 40 99 C45 106 51 109 53 114"
          fill="none"
          stroke="var(--color-wave)"
          strokeWidth="13"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** Large drowning-ear illustration for the 404 page. */
export function DrowningEarMark() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M14 26 Q26 16 38 26 T62 26 T86 26 T110 26"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M22 40 Q32 32 42 40 T62 40 T82 40 T102 40"
        fill="none"
        stroke="var(--color-wave)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <g transform="rotate(14 60 82)">
        <path
          d="M76 80 C78 62 62 54 49 60 C35 67 32 85 40 97 C45 104 51 107 53 112"
          fill="none"
          stroke="var(--color-wave)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M63 78 C63 71 55 69 50 73"
          fill="none"
          stroke="var(--color-wave)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <circle cx="80" cy="56" r="3.4" fill="none" stroke="var(--color-wave)" strokeWidth="3.2" />
      <circle cx="94" cy="54" r="4.8" fill="none" stroke="var(--color-wave)" strokeWidth="3.2" />
      <circle cx="76" cy="16" r="3.2" fill="none" stroke="var(--color-wave)" strokeWidth="3.2" />
    </svg>
  );
}

interface IconProps {
  stroke?: string;
}

function UiIcon({ icon, stroke }: { icon: typeof HugePlay; stroke: string }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={18}
      color={stroke}
      strokeWidth={1.5}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}

export function PlayIcon({ stroke = "var(--color-background)" }: IconProps) {
  return <UiIcon icon={HugePlay} stroke={stroke} />;
}

export function PauseIcon({ stroke = "var(--color-background)" }: IconProps) {
  return <UiIcon icon={HugePause} stroke={stroke} />;
}

export function YoutubeIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return <UiIcon icon={HugeYoutube} stroke={stroke} />;
}

export function TrashIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return <UiIcon icon={HugeDelete} stroke={stroke} />;
}

export function RetryIcon({ stroke = "var(--color-ink)" }: IconProps) {
  return <UiIcon icon={HugeReload} stroke={stroke} />;
}

export function ConfirmIcon({ stroke = "var(--color-background)" }: IconProps) {
  return <UiIcon icon={HugeTick} stroke={stroke} />;
}

export function CancelIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return <UiIcon icon={HugeCancel} stroke={stroke} />;
}

export function FeedIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return <UiIcon icon={HugeRss} stroke={stroke} />;
}

/**
 * A hand offering a heart, not a coin: the donation is a gift rather than a
 * price, and the header should not imply otherwise.
 */
export function DonateIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return <UiIcon icon={HugeHandHeart} stroke={stroke} />;
}

/** The same mark at footer-link size, next to the 11px label. */
export function DonateIconSmall({ stroke = "var(--color-text-muted)" }: IconProps) {
  return (
    <HugeiconsIcon
      icon={HugeHandHeart}
      size={13}
      color={stroke}
      strokeWidth={2}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}

/** Inline copy glyph sized to sit next to 13px button labels. */
export function CopyIcon({ stroke = "var(--color-text-muted)" }: IconProps) {
  return (
    <HugeiconsIcon
      icon={HugeCopy}
      size={14}
      color={stroke}
      strokeWidth={2}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}

/**
 * The normal logo mark with drifting waves, used as the queue loading state.
 * The ear stays static; each wave is drawn one wavelength (40px) wider than
 * its visible window and loops via translateX (see .wave-drift-* in index.css).
 */
export function LoadingMark({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M76 46 C78 28 62 20 49 26 C35 33 32 51 40 63 C45 70 51 73 53 78"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M63 44 C63 37 55 35 50 39"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <clipPath id="loading-wave-top">
        <rect x="17" y="68" width="86" height="16" />
      </clipPath>
      <clipPath id="loading-wave-bottom">
        <rect x="25" y="82" width="66" height="14" />
      </clipPath>
      <g clipPath="url(#loading-wave-top)">
        <path
          className="wave-drift-slow"
          d="M-60 78 Q-50 70 -40 78 T-20 78 T0 78 T20 78 T40 78 T60 78 T80 78 T100 78 T120 78 T140 78"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g clipPath="url(#loading-wave-bottom)">
        <path
          className="wave-drift-fast"
          d="M-52 90 Q-42 84 -32 90 T-12 90 T8 90 T28 90 T48 90 T68 90 T88 90 T108 90 T128 90"
          fill="none"
          stroke="var(--color-wave)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
