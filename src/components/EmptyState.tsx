import { EmptyStateMark } from "./icons";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center py-18 rounded-md gap-4 bg-background [border-width:1.5px] border-dashed border-border">
      <EmptyStateMark />
      <div className="font-semibold tracking-tight text-text text-lg/base">
        Nothing to hear yet?
      </div>
      <div className="text-center max-w-105 text-text-muted text-base/base px-4">
        Paste a YouTube or article link above and EarFerry will carry the audio to your podcast
        feed.
      </div>
    </div>
  );
}
