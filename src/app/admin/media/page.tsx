"use client";
import React, { useRef, useState, useEffect } from "react";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, Upload, Grid3X3,
  List, Image as ImageIcon, Video, FileText,
  Palette, Boxes, MoreVertical, Play, FileType2, Folder, CalendarDays,
  ArrowDownUp, ArrowUpRight, Eye, Copy, Download, Trash2, Loader2
} from "lucide-react";
import { useTenancyContext } from "@/lib/api/tenancy-context";
import { mediaApi } from "@/features/admin/content/live/media-api";
import { toast } from "sonner";
import { ApiError } from "@/types/api";

type MediaFile = {
  id?: string;
  name: string;
  meta: string;
  type: string;
  src: string;
  overlay?: string;
  logo?: boolean;
  duration?: string;
};

const sortOptions = ["Newest first", "Oldest first", "Name (A–Z)", "Name (Z–A)", "Largest first", "Smallest first"];

function parseSizeMB(meta: string) {
  const match = meta.match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  return unit === "GB" ? value * 1024 : unit === "MB" ? value : value / 1024;
}

function parseMetaDate(meta: string) {
  const part = meta.split("•")[1]?.trim() ?? "";
  const time = Date.parse(part);
  return Number.isNaN(time) ? 0 : time;
}

function extToType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "doc";
  if (["psd", "ai", "fig", "sketch"].includes(ext)) return "design";
  return "other";
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([
    { name: "ganga-river-hero.jpg", meta: "2.4 MB • Apr 14, 2025", type: "image", src: "https://images.unsplash.com/photo-1774177612601-e283e2f2cbd3?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "campaign-banner.png", meta: "1.8 MB • Apr 12, 2025", type: "image", src: "https://images.unsplash.com/photo-1758599668509-60f367e8fa16?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay: "CLEANER\\nRIVERS\\nBRIGHTER\\nTOMORROW" },
    { name: "sustainability.jpg", meta: "1.2 MB • Apr 10, 2025", type: "image", src: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "volunteer-video.mp4", meta: "12.4 MB • Apr 9, 2025", type: "video", src: "https://images.unsplash.com/photo-1593113616828-6f22bca04804?auto=format&fit=crop&fm=jpg&q=85&w=900", duration: "00:32" },
    { name: "logo-moksha.png", meta: "512 KB • Apr 8, 2025", type: "image", src: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&fm=jpg&q=85&w=900", logo: true },
    { name: "cremation-service.jpg", meta: "1.6 MB • Apr 7, 2025", type: "image", src: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "ambulance-service.jpg", meta: "2.1 MB • Apr 6, 2025", type: "image", src: "https://images.unsplash.com/photo-1780570349003-f698592df551?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "support-banner.png", meta: "1.3 MB • Apr 5, 2025", type: "image", src: "https://images.unsplash.com/photo-1666038481038-d9478a4a426e?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay: "Serve\\nSupport\\nSpread Humanity" },
    { name: "impact-story.mp4", meta: "25.6 MB • Apr 3, 2025", type: "video", src: "https://images.unsplash.com/photo-1772688572801-7be96f82f3fd?auto=format&fit=crop&fm=jpg&q=85&w=900", duration: "00:45" },
    { name: "ngt-overview.pdf", meta: "1.1 MB • Apr 2, 2025", type: "pdf", src: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "sunset-ganga.jpg", meta: "1.4 MB • Apr 1, 2025", type: "image", src: "https://images.unsplash.com/photo-1771313018650-254f6b5f2c91?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "donate-banner.png", meta: "1.5 MB • Mar 30, 2025", type: "image", src: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay: "A SMALL\\nHELP\\nBIG IMPACT" },
    { name: "varanasi-ghat.jpg", meta: "2.8 MB • Mar 28, 2025", type: "image", src: "https://images.unsplash.com/photo-1771313018650-254f6b5f2c91?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "humanity.jpg", meta: "1.7 MB • Mar 26, 2025", type: "image", src: "https://images.unsplash.com/photo-1772688572801-7be96f82f3fd?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "quote-card.png", meta: "980 KB • Mar 24, 2025", type: "design", src: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay: "Kindness\\nlives forever" },
    { name: "drone-ganga.mp4", meta: "48.2 MB • Mar 22, 2025", type: "video", src: "https://images.unsplash.com/photo-1774177612601-e283e2f2cbd3?auto=format&fit=crop&fm=jpg&q=85&w=900", duration: "01:20" },
    { name: "team-volunteers.jpg", meta: "2.3 MB • Mar 20, 2025", type: "image", src: "https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name: "press-release.docx", meta: "420 KB • Mar 18, 2025", type: "doc", src: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&q=85&w=900" },
  ]);

  const tabs: [string, string, string, React.ComponentType<{ size?: number }>][] = [
    ["All Files", "248", "all", Boxes],
    ["Images", "186", "image", ImageIcon],
    ["Videos", "32", "video", Video],
    ["Documents", "18", "document", FileText],
    ["Designs", "8", "design", Palette],
    ["Other", "4", "other", Boxes],
  ];

  const [activeTab, setActiveTab] = useState("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("Newest first");
  const [sortOpen, setSortOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matchesTab = (type: string, tabKey: string) => {
    if (tabKey === "all") return true;
    if (tabKey === "document") return type === "pdf" || type === "doc";
    if (tabKey === "other") return !["image", "video", "pdf", "doc", "design"].includes(type);
    return type === tabKey;
  };

  const filteredFiles = files.filter((file) => matchesTab(file.type, activeTab));
  const activeCount = tabs.find(([, , key]) => key === activeTab)?.[1] ?? String(files.length);

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sort) {
      case "Oldest first":
        return parseMetaDate(a.meta) - parseMetaDate(b.meta);
      case "Name (A–Z)":
        return a.name.localeCompare(b.name);
      case "Name (Z–A)":
        return b.name.localeCompare(a.name);
      case "Largest first":
        return parseSizeMB(b.meta) - parseSizeMB(a.meta);
      case "Smallest first":
        return parseSizeMB(a.meta) - parseSizeMB(b.meta);
      default:
        return parseMetaDate(b.meta) - parseMetaDate(a.meta);
    }
  });

  const { companyId, clientId } = useTenancyContext();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    if (!companyId || !clientId) return;
    let cancelled = false;

    async function loadLiveMedia() {
      setIsLoadingMedia(true);
      try {
        const res = await mediaApi.list(companyId, clientId);
        if (!cancelled && res?.items && res.items.length > 0) {
          const liveFiles: MediaFile[] = res.items.map((asset) => {
            const isImg = asset.kind === "IMAGE";
            const ext = asset.format?.toLowerCase() || (isImg ? "jpg" : "mp4");
            return {
              id: asset.id,
              name: `asset-${asset.id.slice(0, 8)}.${ext}`,
              meta: `${(asset.bytes / (1024 * 1024)).toFixed(1)} MB • ${new Date(asset.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
              type: isImg ? "image" : "video",
              src: asset.url,
              duration: asset.durationMs ? `${Math.floor(asset.durationMs / 60000)}:${Math.floor((asset.durationMs % 60000) / 1000).toString().padStart(2, "0")}` : undefined,
            };
          });
          setFiles((prev) => {
            const liveIds = new Set(liveFiles.map((f) => f.id));
            const existingNonLive = prev.filter((f) => !f.id || !liveIds.has(f.id));
            return [...liveFiles, ...existingNonLive];
          });
        }
      } catch (err) {
        console.warn("Could not load live media library:", err);
      } finally {
        if (!cancelled) setIsLoadingMedia(false);
      }
    }

    loadLiveMedia();
    return () => { cancelled = true; };
  }, [companyId, clientId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    if (chosen.length === 0) return;

    if (companyId && clientId) {
      setIsUploading(true);
      for (const file of chosen) {
        try {
          const asset = await mediaApi.upload(companyId, clientId, file);
          const isImg = asset.kind === "IMAGE";
          const ext = asset.format?.toLowerCase() || (isImg ? "jpg" : "mp4");
          const newFile: MediaFile = {
            id: asset.id,
            name: file.name || `asset-${asset.id.slice(0, 8)}.${ext}`,
            meta: `${(asset.bytes / (1024 * 1024)).toFixed(1)} MB • ${new Date(asset.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
            type: isImg ? "image" : "video",
            src: asset.url,
            duration: asset.durationMs ? `${Math.floor(asset.durationMs / 60000)}:${Math.floor((asset.durationMs % 60000) / 1000).toString().padStart(2, "0")}` : undefined,
          };
          setFiles((prev) => [newFile, ...prev]);
          toast.success(`Uploaded ${file.name}`);
        } catch (err: unknown) {
          const msg = ApiError.isApiError(err) ? err.message : (err instanceof Error ? err.message : "Upload failed");
          toast.error(`Failed to upload ${file.name}`, { description: msg });
        }
      }
      setIsUploading(false);
      event.target.value = "";
      return;
    }

    const uploaded: MediaFile[] = chosen.map((file) => {
      const type = extToType(file.name);
      const previewable = type === "image" || type === "video" || type === "design";
      return {
        name: file.name,
        meta: `${(file.size / (1024 * 1024)).toFixed(1)} MB • ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        type,
        src: previewable ? URL.createObjectURL(file) : "",
        duration: type === "video" ? "--:--" : undefined,
      };
    });

    setFiles((current) => [...uploaded, ...current]);
    event.target.value = "";
  };

  const [cardMenu, setCardMenu] = useState<{ key: string; anchor: "image" | "footer" } | null>(null);
  const [copied, setCopied] = useState(false);

  const copyLink = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.src || `${window.location.origin}/media/${encodeURIComponent(file.name)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const deleteFile = async (file: MediaFile) => {
    if (file.id && companyId && clientId) {
      try {
        await mediaApi.remove(companyId, clientId, file.id);
        toast.success(`Deleted ${file.name}`);
      } catch (err: unknown) {
        const msg = ApiError.isApiError(err) && err.status === 409
          ? "Cannot delete: Media is in use by drafts or scheduled posts."
          : (err instanceof Error ? err.message : "Failed to delete file.");
        toast.error(msg);
        return;
      }
    }
    setFiles((current) => current.filter((item) => item !== file));
    setCardMenu(null);
  };

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-[5px] px-2.5 py-[7px] text-left text-[11px] text-[#34415b] hover:bg-[#f8fafc]";

  const renderFileMenu = (file: MediaFile, anchor: "image" | "footer") => (
    <>
      <div className="fixed inset-0 z-[40]" onClick={() => setCardMenu(null)} />
      <div
        className={`absolute right-[8px] z-[50] w-[152px] rounded-[7px] border border-[#e4e8ef] bg-white p-1 shadow-[0_8px_24px_rgba(19,32,62,0.16)] ${
          anchor === "image" ? "top-[34px]" : "bottom-[36px]"
        }`}
      >
        <button
          onClick={() => {
            if (file.src) window.open(file.src, "_blank", "noopener");
            setCardMenu(null);
          }}
          className={menuItemClass}
        >
          <Eye size={12} /> Preview
        </button>
        <button onClick={() => copyLink(file)} className={menuItemClass}>
          <Copy size={12} /> {copied ? "Copied!" : "Copy link"}
        </button>
        <a
          href={file.src || undefined}
          download={file.name}
          target="_blank"
          rel="noreferrer"
          onClick={() => setCardMenu(null)}
          className={`${menuItemClass} ${file.src ? "" : "pointer-events-none opacity-50"}`}
        >
          <Download size={12} /> Download
        </a>
        <button
          onClick={() => deleteFile(file)}
          className="flex w-full items-center gap-2 rounded-[5px] px-2.5 py-[7px] text-left text-[11px] text-[#e12630] hover:bg-[#fff0f1]"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </>
  );

  const tags = ["Ganga", "Volunteer", "Awareness", "Donation", "Event", "Social Media", "Banner", "Video", "Website", "Press"];

  return (
    <div className="w-full h-screen overflow-hidden bg-[#f7f9fc] text-[#15203d]  flex flex-col">


      <header className="grid h-[94px] grid-cols-[minmax(0,1fr)_554px] items-start gap-[18px] max-[1200px]:grid-cols-[minmax(0,1fr)_430px] max-[820px]:h-auto max-[820px]:grid-cols-1">
        <div>
          <div className="flex gap-2 items-center text-[10px] text-[#66738a] my-0.5 mb-1"><span>Dashboard</span><ChevronRight size={10} /><b className="text-[#1b2743]">Media Library</b></div>
          <h1 className="m-0 text-[25px] leading-[1.05] tracking-[-0.7px] font-[780]">Media Library</h1>
          <p className="mt-1.5 mb-0 text-xs text-[#68758d]">Store, organize and manage all your images, videos and files in one place.</p>
        </div>
        <div className="relative h-[91px] overflow-hidden rounded-[7px] border border-[#e9edf2] bg-[linear-gradient(100deg,#fff_0%,#fff_43%,#fff4f5_100%)] px-[19px] py-[13px] max-[820px]:hidden after:absolute after:right-[-2px] after:top-0 after:h-full after:w-1/2 after:bg-[radial-gradient(circle_at_42%_24%,rgba(231,44,54,.12)_0_5px,transparent_6px),radial-gradient(circle_at_70%_50%,rgba(231,44,54,.10)_0_7px,transparent_8px),linear-gradient(140deg,transparent_30%,rgba(229,35,45,.10)_31%,transparent_33%),linear-gradient(160deg,transparent_55%,rgba(229,35,45,.08)_56%,transparent_58%)]">
          <div className="relative z-[1]">
            <b className="block text-[13px] leading-[1.15]">Beautiful content<br />builds stronger brands.</b>
            <span className="block text-[9px] text-[#718098] mt-1.5 relative z-[1]">Organize today. Create tomorrow.</span>
            <i className="block w-12 h-[3px] bg-[#e5222c] rounded mt-2 not-italic relative z-[1]" />
          </div>
          <div className="absolute right-6 top-[10px] z-[1] flex items-center gap-[10px] text-[#e52a35]"><ImageIcon size={46} /><div className="grid h-12 w-[76px] place-items-center rounded-[7px] border-2 border-[#e9a0a4] bg-white"><Folder size={32} /></div></div>
        </div>
      </header>

      <div className="flex h-[53px] items-center gap-[9px] rounded-t-[7px] border border-[#e4e8ef] bg-white px-[10px] max-[820px]:overflow-x-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {tabs.map(([label, count, tabKey, Icon]) => (
            <button
              onClick={() => setActiveTab(tabKey)}
              key={tabKey}
              className={`flex h-[38px] items-center gap-[7px] whitespace-nowrap rounded-[6px] border px-3 text-[10px] font-[650] ${
                activeTab === tabKey
                  ? "border-0 border-b-2 border-[#e2252f] rounded-none bg-white text-[#df252e] [&_svg]:text-[#e2252f]"
                  : "border-[#e2e7ee] bg-white text-[#34415b] hover:bg-[#f8fafc]"
              }`}
            >
              <Icon size={15} /><span>{label}</span>
              <span className={`rounded-[10px] px-[7px] py-[3px] text-[9px] ${activeTab === tabKey ? "bg-[#fdeced] text-[#df252e]" : "bg-[#eef2f8] text-[#394761]"}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-[5px] ml-auto">
          <button
            onClick={() => setLayout("grid")}
            title="Grid view"
            className={`flex h-[38px] w-[39px] items-center justify-center gap-[7px] rounded-[6px] border ${layout === "grid" ? "border-[#e41f28] bg-[#e41f28] text-[#fff]" : "border-[#e1e6ed] bg-white text-[#293650] hover:bg-[#f8fafc]"}`}
          >
            <Grid3X3 size={15} />
          </button>
          <button
            onClick={() => setLayout("list")}
            title="List view"
            className={`flex h-[38px] w-[39px] items-center justify-center gap-[7px] rounded-[6px] border ${layout === "list" ? "border-[#e41f28] bg-[#e41f28] text-[#fff]" : "border-[#e1e6ed] bg-white text-[#293650] hover:bg-[#f8fafc]"}`}
          >
            <List size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setSortOpen((open) => !open)}
              className={`h-[38px] rounded-sm border flex items-center justify-center gap-[7px] px-3 text-[10px] font-[650] ${sortOpen ? "border-[#e41f28] text-[#e41f28] bg-white" : "border-[#e1e6ed] bg-white text-[#293650] hover:bg-[#f8fafc]"}`}
            >
              <ArrowDownUp size={12} /> Sort <ChevronDown size={12} />
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-[20]" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-[42px] z-[30] w-[170px] rounded-[7px] border border-[#e4e8ef] bg-white p-1 shadow-[0_8px_24px_rgba(19,32,62,0.14)]">
                  {sortOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSort(option);
                        setSortOpen(false);
                      }}
                      className={`block w-full rounded-[5px] px-2.5 py-[7px] text-left text-[11px] ${sort === option ? "bg-[#fdeced] font-[650] text-[#df252e]" : "text-[#34415b] hover:bg-[#f8fafc]"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-[38px] bg-[#e41f28] border border-[#e41f28] text-white rounded-sm flex items-center justify-center gap-[7px] px-[18px] text-[10px] font-semibold hover:bg-[#c91b24] transition-colors"
          >
            <Upload size={15} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_258px] gap-[10px] max-[1200px]:grid-cols-[minmax(0,1fr)_230px] max-[820px]:grid-cols-1">
        <main className="flex min-h-0 min-w-0 flex-col rounded-b-[7px] border border-t-0 border-[#e4e8ef] bg-white px-[10px] pb-2 pt-[10px]">
          {layout === "grid" && (
          <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-[10px] overflow-y-auto [grid-auto-rows:min-content] max-[1200px]:grid-cols-3 max-[820px]:grid-cols-2 max-[480px]:gap-[7px]">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative min-w-0 overflow-hidden rounded-[6px] border border-dashed border-[#e0e5ec] bg-white shadow-[0_1px_3px_rgba(20,35,60,.025)] flex min-h-[180px] items-center justify-center text-center cursor-pointer hover:border-[#e5222d] transition-colors"
            >
              <div className="flex flex-col items-center gap-[5px]"><Upload className="text-[#e5222d]" size={29} /><b className="text-[11px]">Upload Files</b><span className="text-[9px] text-[#718098] leading-[1.45]">Drag & drop files here<br />or click to browse</span><small className="text-[9px] text-[#758198] mt-1">Supports: JPG, PNG, MP4, PDF etc.</small></div>
            </div>

            {filteredFiles.length === 0 && (
              <div className="col-span-full flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-[#e0e5ec] bg-white text-center">
                <Boxes className="text-[#a5b0c2]" size={28} />
                <b className="text-[12px] text-[#34405a]">No files in this category</b>
                <span className="text-[10px] text-[#718098]">Try another tab or upload new files.</span>
              </div>
            )}

            {sortedFiles.map((file, index) => {
              const menuKey = `${file.name}::${index}`;
              const menuOpen = cardMenu?.key === menuKey;

              return (
              <article className="relative min-w-0 rounded-[6px] border border-[#e0e5ec] bg-white shadow-[0_1px_3px_rgba(20,35,60,.025)]" key={menuKey}>
                <div className="relative h-[130px] overflow-hidden rounded-t-[6px] bg-[#e8edf2]">
                  <span className="absolute left-[7px] top-[7px] z-[4] h-[14px] w-[14px] rounded-[3px] border border-[#d4dbe5] bg-white/90"></span>
                  <button
                    onClick={() => setCardMenu(menuOpen && cardMenu?.anchor === "image" ? null : { key: menuKey, anchor: "image" })}
                    aria-label="File actions"
                    className="absolute right-[6px] top-[6px] z-[4] grid h-[23px] w-[23px] place-items-center rounded-[4px] border-0 bg-black/35 text-white hover:bg-black/55"
                  >
                    <MoreVertical size={14} />
                  </button>
                  <div className="relative h-full w-full overflow-hidden bg-[#e8edf2]">
                    <img
                      src={file.src}
                      alt={file.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                    />
                    {file.overlay && <span className="absolute left-3 top-[11px] z-[2] text-[16px] font-[850] leading-[.96] tracking-[.2px] text-white drop-shadow-[0_2px_7px_rgba(0,0,0,.42)]">{file.overlay.split("\\n").map((line, idx) => <React.Fragment key={idx}>{idx > 0 && <br />}{line}</React.Fragment>)}</span>}
                    {file.logo && <span className="absolute bottom-3 left-0 right-0 z-[2] text-center text-[13px] font-[850] tracking-[.6px] text-[#16445d] drop-shadow-[0_1px_1px_rgba(255,255,255,.8)]">MOKSHA SEWA<small className="mt-0.5 block text-[9px] tracking-[1px]">DIGNITY FOR EVERY LIFE</small></span>}
                    {file.type === "pdf" && <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white px-[9px] py-3 text-[17px] font-[850] text-[#e12630] shadow-[0_3px_10px_rgba(20,30,45,.12)]">PDF</span>}
                    {file.type === "doc" && <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white px-[9px] py-3 text-[17px] font-[850] text-[#1e6cc4] shadow-[0_3px_10px_rgba(20,30,45,.12)]">DOC</span>}
                    {file.type === "video" && <><span className="absolute left-1/2 top-1/2 z-[3] grid h-7 w-[39px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[7px] bg-black/75 text-white"><Play size={15} fill="currentColor" /></span><span className="absolute bottom-[6px] left-[6px] z-[3] rounded-[3px] bg-black/80 px-[5px] py-[3px] text-[9px] text-white">{file.duration}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 flex-row">
                  <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[3px] bg-[#e7f3ff] text-[#2a85d9]">{file.type === "video" ? <Video size={11} /> : file.type === "pdf" ? <FileText size={11} /> : file.type === "doc" ? <FileType2 size={11} /> : <ImageIcon size={11} />}</span>
                  <div className="min-w-0 flex-1"><b className="block text-[9px] text-[#34405a] whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</b><small className="block text-[9px] text-[#8791a3] mt-0.5">{file.meta}</small></div>
                  <button
                    onClick={() => setCardMenu(menuOpen && cardMenu?.anchor === "footer" ? null : { key: menuKey, anchor: "footer" })}
                    aria-label="File actions"
                    className="border-0 bg-transparent text-[#68748a] p-0 shrink-0 hover:text-[#e12630]"
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>

                {menuOpen && renderFileMenu(file, cardMenu!.anchor)}
              </article>
              );
            })}
          </div>
          )}

          {layout === "list" && (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[6px] border border-[#e0e5ec]">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-[1]">
                  <tr className="bg-[#f8fafc] text-[10px] font-[700] text-[#24304b]">
                    <th className="border-b border-[#e8ecf2] px-3 py-2">File</th>
                    <th className="border-b border-[#e8ecf2] px-3 py-2">Type</th>
                    <th className="border-b border-[#e8ecf2] px-3 py-2">Info</th>
                    <th className="border-b border-[#e8ecf2] px-3 py-2">Duration</th>
                    <th className="w-[50px] border-b border-[#e8ecf2] px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-b border-[#eef1f5] hover:bg-[#f8fafc]"
                  >
                    <td colSpan={5} className="px-3 py-3 text-center text-[10px] font-[650] text-[#e5222d]">
                      <span className="inline-flex items-center gap-1.5"><Upload size={13} /> Upload files</span>
                    </td>
                  </tr>

                  {sortedFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-[11px] text-[#718098]">
                        No files in this category. Try another tab or upload new files.
                      </td>
                    </tr>
                  )}

                  {sortedFiles.map((file, index) => (
                    <tr key={`${file.name}::${index}`} className="border-b border-[#eef1f5] text-[11px] hover:bg-[#f8fafc]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[4px] border border-[#e0e5ec] bg-[#e8edf2]">
                            {file.src && ["image", "video", "design"].includes(file.type) ? (
                              <img
                                src={file.src}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                              />
                            ) : (
                              <FileText size={14} className="text-[#7a869c]" />
                            )}
                          </span>
                          <b className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#34405a]">{file.name}</b>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-[9px] bg-[#eef2f8] px-2 py-[3px] text-[9px] font-[650] uppercase text-[#394761]">{file.type}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[#526079]">{file.meta}</td>
                      <td className="px-3 py-2 text-[#526079]">{file.duration ?? "—"}</td>
                      <td className="relative px-3 py-2 text-right">
                        <button
                          onClick={() =>
                            setCardMenu(
                              cardMenu?.key === `${file.name}::${index}`
                                ? null
                                : { key: `${file.name}::${index}`, anchor: "image" }
                            )
                          }
                          aria-label="File actions"
                          className="border-0 bg-transparent text-[#68748a] p-0 hover:text-[#e12630]"
                        >
                          <MoreVertical size={13} />
                        </button>
                        {cardMenu?.key === `${file.name}::${index}` && renderFileMenu(file, "image")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="h-[31px] flex items-center justify-end gap-1 mt-[5px]">
            <span className="mr-auto text-[9px] text-[#526079]">Showing {filteredFiles.length ? 1 : 0}–{filteredFiles.length} of {activeCount} files</span>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]"><ChevronLeft size={12} /></button>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e4232c] bg-[#e4232c] text-[9px] text-white">1</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">2</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">3</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">…</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">16</button>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]"><ChevronRight size={12} /></button>
          </div>
        </main>

        <aside className="flex min-w-0 flex-col gap-[11px] overflow-hidden rounded-[7px] border border-[#e4e8ef] bg-white p-[10px] max-[820px]:order-[-1]">
          <section className="border-b border-[#eef1f5] pb-[11px] last:border-0">
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Storage Usage</h3></div>
            <div className="text-[9px] text-[#556178]"><b className="text-[10px] text-[#28354f]">2.8 GB</b> of 10 GB used <strong className="float-right text-[9px] text-[#5d6880]">28%</strong></div>
            <div className="mt-2 h-[10px] overflow-hidden rounded-[8px] bg-[#e9edf3]"><i /></div>
          </section>

          <section className="border-b border-[#eef1f5] pb-[11px] last:border-0">
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Filters</h3><button className="border-0 bg-transparent text-[#dd2932] text-[9px] font-semibold">Reset</button></div>
            {[
              ["Project", "Moksha Sewa"], ["File Type", "All Types"], ["Channel", "All Channels"], ["Campaign", "All Campaigns"], ["Tags", "All Tags"], ["Uploaded By", "All Users"], ["Date Range", "Any Date"]
            ].map(([label, value]) => (
              <div key={label} className="mt-2 first:mt-0"><label className="block text-[9px] text-[#647088] mb-1">{label}</label><div className="flex h-[28px] items-center justify-between rounded-[5px] border border-[#dfe5ed] bg-white px-2 text-[9px] text-[#39455e]"><span>{value}</span>{label === "Date Range" ? <CalendarDays size={12} /> : <ChevronDown size={11} />}</div></div>
            ))}
            <label className="mt-2 flex h-[31px] items-center gap-[6px] rounded-[6px] border border-[#dfe5ed] px-2 text-[#8b95a7]"><Search size={13} /><input placeholder="Search files by name..." /></label>
          </section>

          <section>
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Popular Tags</h3><button className="border-0 bg-transparent text-[#dd2932] text-[9px] font-semibold flex items-center gap-1">View all <ArrowUpRight size={9} /></button></div>
            <div className="flex flex-wrap gap-[5px]">{tags.map(tag => <span className="bg-[#eef3f9] rounded-[9px] px-2 py-[5px] text-[9px] text-[#33415d]" key={tag}>{tag}</span>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
