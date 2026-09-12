export function AdminFooter() {
  return (
    <footer className="sticky bottom-0 z-10 flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-[#1a2533] bg-[#0B1121] px-4 py-2 text-[10px] text-[#8C949A] sm:px-5 xl:px-7">
      <span className="flex items-center gap-2">
        <span className="bg-gradient-to-r from-[#e20611] to-[#ff4d4d] bg-clip-text font-bold tracking-wider text-transparent">OmniPlatform</span>
        <b className="px-1 text-[#C9C4C0]">|</b>
        <span>© EnCodency Pvt. Ltd.</span>
      </span>
      <span>
        People <b className="px-1 text-[#C9C4C0]">·</b> Platforms <b className="px-1 text-[#C9C4C0]">·</b> Possibilities <b className="px-1 text-[#C9C4C0]">·</b> <strong className="font-semibold text-[#68747C]">Raise the Bar</strong>
      </span>
    </footer>
  );
}
