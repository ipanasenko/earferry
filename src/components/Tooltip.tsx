import * as RadixTooltip from "@radix-ui/react-tooltip";

/**
 * Brand-styled tooltip: ink surface, optional muted hint line, soft
 * fade-and-rise animation (see .tooltip-content in index.css).
 */
export function Tooltip({
  label,
  hint,
  side = "bottom",
  children,
}: {
  label: string;
  hint?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={10}
            collisionPadding={12}
            className="tooltip-content z-50 max-w-66 rounded-[10px] bg-ink px-4 py-3 [box-shadow:#1B3A5B3D_0px_10px_30px_-6px]"
          >
            <div className="font-semibold text-background text-sm/4.5">{label}</div>
            {hint ? <div className="pt-1.5 text-[#A9C6DB] text-xs/4">{hint}</div> : null}
            <RadixTooltip.Arrow width={12} height={6} className="fill-ink" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
