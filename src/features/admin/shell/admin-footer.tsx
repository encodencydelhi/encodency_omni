export function AdminFooter() {
  return (
    <footer className="sticky bottom-0 z-50 flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-5 py-2.5 text-[12px] font-medium text-slate-400 backdrop-blur-md xl:px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="bg-gradient-to-r from-red-500 to-rose-400 bg-clip-text font-bold tracking-wide text-transparent">
            OmniPlatform
          </span>
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <span>&copy; {new Date().getFullYear()} EnCodency Pvt. Ltd.</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 transition-colors hover:text-slate-200 cursor-pointer">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-sm bg-emerald-500"></span>
          </span>
          All systems operational
        </span>
        <span className="h-3 w-px bg-slate-700" />
        <span className="flex gap-3">
          <a href="#" className="transition-colors hover:text-white">Support</a>
          <a href="#" className="transition-colors hover:text-white">Documentation</a>
          <a href="#" className="transition-colors hover:text-white">Terms</a>
        </span>
      </div>
    </footer>
  );
}
