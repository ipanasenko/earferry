import type { DefaultFunctionArgs, FunctionReference } from "convex/server";
import { api as generatedApi } from "../../convex/_generated/api";

export type ItemStatus =
  | "queued"
  | "probing"
  | "waiting"
  | "extracting"
  | "uploading"
  | "ready"
  | "failed"
  | "deleting";

export interface QueueItemDoc {
  _id: string;
  _creationTime: number;
  url: string;
  videoId: string;
  addedAt: number;
  position: number;
  status: ItemStatus;
  phase?: string;
  error?: string;
  title?: string;
  channel?: string;
  description?: string;
  durationSeconds?: number;
  publishedAt?: number;
  artworkUrl?: string;
  /** Signed Worker media URL, present once the item is ready. */
  mediaUrl?: string;
}

type PublicQuery<Args extends DefaultFunctionArgs, Ret> = FunctionReference<
  "query",
  "public",
  Args,
  Ret
>;
type PublicMutation<Args extends DefaultFunctionArgs, Ret> = FunctionReference<
  "mutation",
  "public",
  Args,
  Ret
>;
type PublicAction<Args extends DefaultFunctionArgs, Ret> = FunctionReference<
  "action",
  "public",
  Args,
  Ret
>;

interface EarferryApi {
  items: {
    list: PublicQuery<Record<string, never>, QueueItemDoc[]>;
    add: PublicMutation<{ url: string }, string>;
    remove: PublicMutation<{ id: string }, null>;
    retry: PublicMutation<{ id: string }, null>;
  };
  extractor: {
    diagnostics: PublicAction<{ id: string }, unknown>;
  };
  users: {
    me: PublicQuery<Record<string, never>, { feedUrl: string | null }>;
  };
}

/**
 * Typed view of the Convex API per docs/ARCHITECTURE.md. The cast keeps the
 * frontend compiling even while convex/_generated is a pre-codegen stub.
 */
export const api = generatedApi as unknown as EarferryApi;
