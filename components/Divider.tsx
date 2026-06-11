/** Full-width hairline broken by a centered mono caption: ◆ 04 · LEADERSHIP ◆ */
export default function Divider({
  index,
  label,
  accent = "#9C9080",
}: {
  index: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-6" aria-hidden>
      <span className="h-px flex-1 bg-bone/12" />
      <span className="font-mono text-[10px] tracking-[0.25em] text-dim uppercase">
        <span style={{ color: accent }}>◆</span> {index} · {label}{" "}
        <span style={{ color: accent }}>◆</span>
      </span>
      <span className="h-px flex-1 bg-bone/12" />
    </div>
  );
}
