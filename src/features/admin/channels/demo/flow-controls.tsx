"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useWorkspaceAccess } from "./workspace-access";
import { useCreationWorkspace } from "./creation-session";
import { Field, control } from "./ui";
import { type Flow, type FlowScreen, newId } from "./mock-service";
import type { UpdateWorkspace } from "./marketing";

export function FlowRouteControls({flow,screen,edit}:{flow:Flow;screen:FlowScreen;edit:(patch:Partial<FlowScreen>)=>void}){
 return <div className="space-y-2 rounded border p-3"><label className="flex gap-2 text-xs"><input type="checkbox" checked={!!screen.route} disabled={!screen.fields.length||flow.screens.length<2} onChange={e=>edit({route:e.target.checked?{fieldId:screen.fields[0]!.id,equals:"",matchScreenId:flow.screens.find(s=>s.id!==screen.id)!.id,fallbackScreenId:flow.screens.find(s=>s.id!==screen.id)!.id}:undefined})}/>Conditional Match / Fallback</label>{screen.route&&<><Field label="Condition Field"><select className={control} value={screen.route.fieldId} onChange={e=>edit({route:{...screen.route!,fieldId:e.target.value}})}>{screen.fields.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></Field><Field label="Equals"><Input value={screen.route.equals} onChange={e=>edit({route:{...screen.route!,equals:e.target.value}})}/></Field>{(["matchScreenId","fallbackScreenId"] as const).map(key=><Field key={key} label={key==="matchScreenId"?"Match Screen":"Fallback Screen"}><select className={control} value={screen.route![key]} onChange={e=>edit({route:{...screen.route!,[key]:e.target.value}})}>{flow.screens.filter(s=>s.id!==screen.id).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>)}</>}</div>;
}
export function FlowLifecycle({scope,flow,update}:{scope:string;flow:Flow;update:UpdateWorkspace}){
 const access=useWorkspaceAccess(),{action}=useCreationWorkspace(scope);const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 return <div className="space-y-2">{flow.providerFailure&&<p role="alert" className="text-xs text-rose-700">{flow.providerFailure}</p>}<p className="text-xs text-slate-500">Status: {flow.status||"Draft"}. Published versions are frozen; duplicate before editing.</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={!access.canConfigure||busy} onClick={async()=>{setBusy(true);try{if(await action("/flows/endpoint-encryption"))toast.success("Flow Endpoint Encryption Configured");}finally{setBusy(false);}}}>Configure Endpoint Encryption</Button><Button size="sm" disabled={!access.canSend||busy||!!flow.status&&flow.status!=="Draft"} onClick={()=>setOpen(true)}>Publish Flow</Button><Button size="sm" variant="outline" disabled={!access.canEdit||busy} onClick={async()=>{const id=newId();if(await update(d=>({...d,flows:[...d.flows,{...flow,id,name:flow.name+" Copy",status:"Draft",version:undefined}]})))toast.success("Flow Copy Created — Select It Above To Edit");}}>Duplicate As Draft</Button></div><ConfirmDialog open={open} onOpenChange={setOpen} title="Publish Simulated Flow?" description="Validate and freeze this Flow version. MOCK publication is stored locally in the backend and does not contact Meta." confirmLabel="Publish Simulation" isPending={busy} onConfirm={async()=>{if(busy)return;setBusy(true);try{if(await update(current=>current)&&await action(`/flows/${flow.id}/publish`,{confirm:true})){setOpen(false);toast.success("Flow Published In Simulation");}}finally{setBusy(false);}}}/></div>;
}
