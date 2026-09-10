"use client";
import React from "react";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight, Upload, Grid3X3,
  List, SlidersHorizontal, Image as ImageIcon, Video, FileText,
  Palette, Boxes, MoreVertical, Play, File, FileImage, FileVideo,
  FileType2, Folder, RotateCcw, CalendarDays, Tag, Users, X,
  ArrowDownUp, ArrowUpRight
} from "lucide-react";

export default function MediaLibrary() {
  const files = [
    { name:"ganga-river-hero.jpg", meta:"2.4 MB • Apr 14, 2025", type:"image", src:"https://images.unsplash.com/photo-1774177612601-e283e2f2cbd3?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"campaign-banner.png", meta:"1.8 MB • Apr 12, 2025", type:"image", src:"https://images.unsplash.com/photo-1758599668509-60f367e8fa16?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay:"CLEANER\\nRIVERS\\nBRIGHTER\\nTOMORROW" },
    { name:"sustainability.jpg", meta:"1.2 MB • Apr 10, 2025", type:"image", src:"https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"volunteer-video.mp4", meta:"12.4 MB • Apr 9, 2025", type:"video", src:"https://images.unsplash.com/photo-1593113616828-6f22bca04804?auto=format&fit=crop&fm=jpg&q=85&w=900", duration:"00:32" },
    { name:"logo-moksha.png", meta:"512 KB • Apr 8, 2025", type:"image", src:"https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&fm=jpg&q=85&w=900", logo:true },
    { name:"cremation-service.jpg", meta:"1.6 MB • Apr 7, 2025", type:"image", src:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"ambulance-service.jpg", meta:"2.1 MB • Apr 6, 2025", type:"image", src:"https://images.unsplash.com/photo-1780570349003-f698592df551?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"support-banner.png", meta:"1.3 MB • Apr 5, 2025", type:"image", src:"https://images.unsplash.com/photo-1666038481038-d9478a4a426e?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay:"Serve\\nSupport\\nSpread Humanity" },
    { name:"impact-story.mp4", meta:"25.6 MB • Apr 3, 2025", type:"video", src:"https://images.unsplash.com/photo-1772688572801-7be96f82f3fd?auto=format&fit=crop&fm=jpg&q=85&w=900", duration:"00:45" },
    { name:"ngt-overview.pdf", meta:"1.1 MB • Apr 2, 2025", type:"pdf", src:"https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"sunset-ganga.jpg", meta:"1.4 MB • Apr 1, 2025", type:"image", src:"https://images.unsplash.com/photo-1771313018650-254f6b5f2c91?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"donate-banner.png", meta:"1.5 MB • Mar 30, 2025", type:"image", src:"https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay:"A SMALL\\nHELP\\nBIG IMPACT" },
    { name:"varanasi-ghat.jpg", meta:"2.8 MB • Mar 28, 2025", type:"image", src:"https://images.unsplash.com/photo-1771313018650-254f6b5f2c91?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"humanity.jpg", meta:"1.7 MB • Mar 26, 2025", type:"image", src:"https://images.unsplash.com/photo-1772688572801-7be96f82f3fd?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"quote-card.png", meta:"980 KB • Mar 24, 2025", type:"design", src:"https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&fm=jpg&q=85&w=900", overlay:"Kindness\\nlives forever" },
    { name:"drone-ganga.mp4", meta:"48.2 MB • Mar 22, 2025", type:"video", src:"https://images.unsplash.com/photo-1774177612601-e283e2f2cbd3?auto=format&fit=crop&fm=jpg&q=85&w=900", duration:"01:20" },
    { name:"team-volunteers.jpg", meta:"2.3 MB • Mar 20, 2025", type:"image", src:"https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&fm=jpg&q=85&w=900" },
    { name:"press-release.docx", meta:"420 KB • Mar 18, 2025", type:"doc", src:"https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&fm=jpg&q=85&w=900" },
  ];

  const tabs = [
    ["All Files","248","all",Boxes],
    ["Images","186","image",ImageIcon],
    ["Videos","32","video",Video],
    ["Documents","18","document",FileText],
    ["Designs","8","design",Palette],
    ["Other","4","other",Boxes],
  ];

  const tags = ["Ganga","Volunteer","Awareness","Donation","Event","Social Media","Banner","Video","Website","Press"];

  return (
    <div className="w-full h-screen overflow-hidden bg-[#f7f9fc] text-[#15203d]  flex flex-col">


      <header className="grid h-[94px] grid-cols-[minmax(0,1fr)_554px] items-start gap-[18px] max-[1200px]:grid-cols-[minmax(0,1fr)_430px] max-[820px]:h-auto max-[820px]:grid-cols-1">
        <div>
          <div className="flex gap-2 items-center text-[10px] text-[#66738a] my-0.5 mb-1"><span>Dashboard</span><ChevronRight size={10}/><b className="text-[#1b2743]">Media Library</b></div>
          <h1 className="m-0 text-[25px] leading-[1.05] tracking-[-0.7px] font-[780]">Media Library</h1>
          <p className="mt-1.5 mb-0 text-xs text-[#68758d]">Store, organize and manage all your images, videos and files in one place.</p>
        </div>
        <div className="relative h-[91px] overflow-hidden rounded-[7px] border border-[#e9edf2] bg-[linear-gradient(100deg,#fff_0%,#fff_43%,#fff4f5_100%)] px-[19px] py-[13px] max-[820px]:hidden after:absolute after:right-[-2px] after:top-0 after:h-full after:w-1/2 after:bg-[radial-gradient(circle_at_42%_24%,rgba(231,44,54,.12)_0_5px,transparent_6px),radial-gradient(circle_at_70%_50%,rgba(231,44,54,.10)_0_7px,transparent_8px),linear-gradient(140deg,transparent_30%,rgba(229,35,45,.10)_31%,transparent_33%),linear-gradient(160deg,transparent_55%,rgba(229,35,45,.08)_56%,transparent_58%)]">
          <div className="relative z-[1]">
            <b className="block text-[13px] leading-[1.15]">Beautiful content<br/>builds stronger brands.</b>
            <span className="block text-[9px] text-[#718098] mt-1.5 relative z-[1]">Organize today. Create tomorrow.</span>
            <i className="block w-12 h-[3px] bg-[#e5222c] rounded mt-2 not-italic relative z-[1]"/>
          </div>
          <div className="absolute right-6 top-[10px] z-[1] flex items-center gap-[10px] text-[#e52a35]"><ImageIcon size={46}/><div className="grid h-12 w-[76px] place-items-center rounded-[7px] border-2 border-[#e9a0a4] bg-white"><Folder size={32}/></div></div>
        </div>
      </header>

      <div className="flex h-[53px] items-center gap-[9px] rounded-t-[7px] border border-[#e4e8ef] bg-white px-[10px] max-[820px]:overflow-x-auto">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {tabs.map(([label,count,key,Icon],i)=>(
            <button className={`flex h-[38px] items-center gap-[7px] whitespace-nowrap rounded-[6px] border border-[#e2e7ee] bg-white px-3 text-[10px] font-[650] text-[#34415b] ${i===0?"border-0 border-b-2 border-[#e2252f] rounded-none text-[#df252e] [&_svg]:text-[#e2252f]":""}`} key={label}>
              <Icon size={15}/><span>{label}</span><span className="bg-[#eef2f8] text-[#394761] rounded-[10px] px-[7px] py-[3px] text-[9px]">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-[5px] ml-auto">
          <button className="flex h-[38px] w-[39px] items-center justify-center gap-[7px] rounded-[6px] border border-[#e41f28] bg-[#e41f28] text-[#fff]"><Grid3X3 size={15}/></button>
          <button className="flex h-[38px] w-[39px] items-center justify-center gap-[7px] rounded-[6px] border border-[#e1e6ed] bg-white text-[#293650]"><List size={16}/></button>
          <button className="h-[38px] border border-[#e1e6ed] bg-white rounded-md flex items-center justify-center gap-[7px] text-[#293650] px-3 text-[10px] font-[650]"><ArrowDownUp size={12}/> Sort <ChevronDown size={12}/></button>
          <button className="h-[38px] bg-[#e41f28] border border-[#e41f28] text-white rounded-md flex items-center justify-center gap-[7px] px-[18px] text-[10px] font-bold"><Upload size={15}/> Upload</button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_258px] gap-[10px] max-[1200px]:grid-cols-[minmax(0,1fr)_230px] max-[820px]:grid-cols-1">
        <main className="flex min-h-0 min-w-0 flex-col rounded-b-[7px] border border-t-0 border-[#e4e8ef] bg-white px-[10px] pb-2 pt-[10px]">
          <div className="grid min-h-0 flex-1 grid-cols-4 content-start gap-[10px] overflow-y-auto [grid-auto-rows:min-content] max-[1200px]:grid-cols-3 max-[820px]:grid-cols-2 max-[480px]:gap-[7px]">
            <div className="relative min-w-0 overflow-hidden rounded-[6px] border border-dashed border-[#e0e5ec] bg-white shadow-[0_1px_3px_rgba(20,35,60,.025)] flex min-h-[180px] items-center justify-center text-center">
              <div className="flex flex-col items-center gap-[5px]"><Upload className="text-[#e5222d]" size={29}/><b className="text-[11px]">Upload Files</b><span className="text-[9px] text-[#718098] leading-[1.45]">Drag & drop files here<br/>or click to browse</span><small className="text-[9px] text-[#758198] mt-1">Supports: JPG, PNG, MP4, PDF etc.</small></div>
            </div>

            {files.slice(0,17).map((file,i)=>(
              <article className="relative min-w-0 overflow-hidden rounded-[6px] border border-[#e0e5ec] bg-white shadow-[0_1px_3px_rgba(20,35,60,.025)]" key={file.name}>
                <div className="relative h-[130px] overflow-hidden bg-[#e8edf2]">
                  <span className="absolute left-[7px] top-[7px] z-[4] h-[14px] w-[14px] rounded-[3px] border border-[#d4dbe5] bg-white/90"></span>
                  <button className="absolute right-[6px] top-[6px] z-[4] grid h-[23px] w-[23px] place-items-center rounded-[4px] border-0 bg-black/35 text-white"><MoreVertical size={14}/></button>
                  <div className="relative h-full w-full overflow-hidden bg-[#e8edf2]">
                    <img
                      src={file.src}
                      alt={file.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.opacity = "0"; }}
                    />
                    {file.overlay && <span className="absolute left-3 top-[11px] z-[2] text-[16px] font-[850] leading-[.96] tracking-[.2px] text-white drop-shadow-[0_2px_7px_rgba(0,0,0,.42)]">{file.overlay.split("\\n").map((line,idx)=><React.Fragment key={idx}>{idx>0 && <br/>}{line}</React.Fragment>)}</span>}
                    {file.logo && <span className="absolute bottom-3 left-0 right-0 z-[2] text-center text-[13px] font-[850] tracking-[.6px] text-[#16445d] drop-shadow-[0_1px_1px_rgba(255,255,255,.8)]">MOKSHA SEWA<small className="mt-0.5 block text-[6px] tracking-[1px]">DIGNITY FOR EVERY LIFE</small></span>}
                    {file.type==="pdf" && <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white px-[9px] py-3 text-[17px] font-[850] text-[#e12630] shadow-[0_3px_10px_rgba(20,30,45,.12)]">PDF</span>}
                    {file.type==="doc" && <span className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-[4px] bg-white px-[9px] py-3 text-[17px] font-[850] text-[#1e6cc4] shadow-[0_3px_10px_rgba(20,30,45,.12)]">DOC</span>}
                    {file.type==="video" && <><span className="absolute left-1/2 top-1/2 z-[3] grid h-7 w-[39px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[7px] bg-black/75 text-white"><Play size={15} fill="currentColor"/></span><span className="absolute bottom-[6px] left-[6px] z-[3] rounded-[3px] bg-black/80 px-[5px] py-[3px] text-[8px] text-white">{file.duration}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 flex-row">
                  <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[3px] bg-[#e7f3ff] text-[#2a85d9]">{file.type==="video"?<Video size={11}/>:file.type==="pdf"?<FileText size={11}/>:file.type==="doc"?<FileType2 size={11}/>:<ImageIcon size={11}/>}</span>
                  <div className="min-w-0 flex-1"><b className="block text-[8.5px] text-[#34405a] whitespace-nowrap overflow-hidden text-ellipsis">{file.name}</b><small className="block text-[7.5px] text-[#8791a3] mt-0.5">{file.meta}</small></div>
                  <button className="border-0 bg-transparent text-[#68748a] p-0 shrink-0"><MoreVertical size={13}/></button>
                </div>
              </article>
            ))}
          </div>
          <div className="h-[31px] flex items-center justify-end gap-1 mt-[5px]">
            <span className="mr-auto text-[9px] text-[#526079]">Showing 1–16 of 248 files</span>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]"><ChevronLeft size={12}/></button>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e4232c] bg-[#e4232c] text-[9px] text-white">1</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">2</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">3</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">…</button><button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]">16</button>
            <button className="grid h-[27px] w-[27px] place-items-center rounded-[5px] border border-[#e0e5ec] bg-white text-[9px] text-[#40506a]"><ChevronRight size={12}/></button>
          </div>
        </main>

        <aside className="flex min-w-0 flex-col gap-[11px] overflow-hidden rounded-[7px] border border-[#e4e8ef] bg-white p-[10px] max-[820px]:order-[-1]">
          <section className="border-b border-[#eef1f5] pb-[11px] last:border-0">
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Storage Usage</h3></div>
            <div className="text-[9px] text-[#556178]"><b className="text-[10px] text-[#28354f]">2.8 GB</b> of 10 GB used <strong className="float-right text-[9px] text-[#5d6880]">28%</strong></div>
            <div className="mt-2 h-[10px] overflow-hidden rounded-[8px] bg-[#e9edf3]"><i/></div>
          </section>

          <section className="border-b border-[#eef1f5] pb-[11px] last:border-0">
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Filters</h3><button className="border-0 bg-transparent text-[#dd2932] text-[8px] font-bold">Reset</button></div>
            {[
              ["Project","Moksha Sewa"],["File Type","All Types"],["Channel","All Channels"],["Campaign","All Campaigns"],["Tags","All Tags"],["Uploaded By","All Users"],["Date Range","Any Date"]
            ].map(([label,value])=>(
              <div key={label} className="mt-2 first:mt-0"><label className="block text-[8px] text-[#647088] mb-1">{label}</label><div className="flex h-[28px] items-center justify-between rounded-[5px] border border-[#dfe5ed] bg-white px-2 text-[8.5px] text-[#39455e]"><span>{value}</span>{label==="Date Range"?<CalendarDays size={12}/>:<ChevronDown size={11}/>}</div></div>
            ))}
            <label className="mt-2 flex h-[31px] items-center gap-[6px] rounded-[6px] border border-[#dfe5ed] px-2 text-[#8b95a7]"><Search size={13}/><input placeholder="Search files by name..." /></label>
          </section>

          <section>
            <div className="mb-[7px] flex items-center justify-between"><h3 className="m-0 text-xs font-[750]">Popular Tags</h3><button className="border-0 bg-transparent text-[#dd2932] text-[8px] font-bold flex items-center gap-1">View all <ArrowUpRight size={9}/></button></div>
            <div className="flex flex-wrap gap-[5px]">{tags.map(tag=><span className="bg-[#eef3f9] rounded-[9px] px-2 py-[5px] text-[8px] text-[#33415d]" key={tag}>{tag}</span>)}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
