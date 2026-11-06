"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WhatsappProviderPage } from "./whatsapp-provider-page";
import { WhatsAppDemoSuite } from "../demo/suite";
import { Modal } from "../demo/ui";
export function WhatsappChannelPage({ initialSection }: { initialSection?: string } = {}){
 const [provider,setProvider]=useState(false);const [confirm,setConfirm]=useState(false);
 return provider?<><div className="mb-6 flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><p>Existing Provider Workspace · Existing Actions Can Affect Provider Data.</p><Button size="sm" variant="outline" onClick={()=>setProvider(false)}>Return To Safe Demo</Button></div><WhatsappProviderPage/></>:<><WhatsAppDemoSuite onProvider={()=>setConfirm(true)} initialSection={initialSection}/><Modal title="Open Existing Provider Workspace?" open={confirm} onClose={()=>setConfirm(false)}><p className="text-sm">This Opens The Existing Provider Integration. Its Original Sync, Messaging And Configuration Actions Remain Available And Can Affect Real Data. The New Demo Suite Is Separate.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setConfirm(false)}>Stay In Demo</Button><Button onClick={()=>{setConfirm(false);setProvider(true);}}>Open Existing Workspace</Button></div></Modal></>;
}
