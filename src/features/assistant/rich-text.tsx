import { Fragment } from "react";
import { cn } from "@/lib/utils/cn";
import { parseBlocks, type Inline } from "./text";

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((inline, index) =>
        inline.kind === "bold" ? (
          <strong key={index} className="font-semibold">{inline.text}</strong>
        ) : inline.kind === "code" ? (
          <code key={index} className="rounded-sm bg-black/5 px-1 py-px font-mono text-[11px]">{inline.text}</code>
        ) : (
          <Fragment key={index}>{inline.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Renders the model's reply as React nodes only (never HTML), so nothing it writes can inject markup or links. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div dir="auto" className={cn("space-y-2 break-words text-[13px] leading-relaxed", className)}>
      {blocks.map((block, index) =>
        block.kind === "p" ? (
          <p key={index} className="whitespace-pre-wrap">
            <Inlines inlines={block.inlines} />
          </p>
        ) : block.kind === "ul" ? (
          <ul key={index} className="list-disc space-y-1 ps-5">
            {block.items.map((item, i) => (
              <li key={i}><Inlines inlines={item} /></li>
            ))}
          </ul>
        ) : (
          <ol key={index} className="list-decimal space-y-1 ps-5">
            {block.items.map((item, i) => (
              <li key={i}><Inlines inlines={item} /></li>
            ))}
          </ol>
        ),
      )}
    </div>
  );
}
