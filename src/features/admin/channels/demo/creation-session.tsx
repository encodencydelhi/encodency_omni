"use client";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useWhatsAppWorkspaceContext } from "./workspace-context";
import { demoAdapter, subscribeDemoWorkspace, type Workspace } from "./mock-service";
import { WorkspaceAccess, useWorkspaceAccess } from "./workspace-access";
import { toast } from "sonner";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nativeWhatsAppApi, nativeWhatsAppEnabled, workspaceChanges, type NativeEnvelope } from "./native-api";
import { Button } from "@/components/ui/button";

const writes = new Map<string, Promise<boolean>>();
const writtenRevisions = new Map<string, number>();
const emptyWorkspace: Workspace = { contacts:[],messages:[],templates:[],campaigns:[],workflows:[],flows:[],media:[],replyDrafts:{},settings:{business:"",description:"",email:"",phone:"",budget:0,notifications:false,twoFactor:false,role:"VIEWER"} };

const subscribe = () => () => {};
export function DraftRecovery({ scope, children, editing=false }: { scope: string; children: ReactNode; editing?:boolean }) {
  const workspace = useCreationWorkspace(scope);
  const access = useWorkspaceAccess();
  const [restored, setRestored] = useState("");
  useEffect(() => {
    let active = true;
    if (!nativeWhatsAppEnabled) demoAdapter.restore?.(scope);
    queueMicrotask(() => { if (active) setRestored(scope); });
    return () => { active = false; };
  }, [scope]);
  if (nativeWhatsAppEnabled) {
    if(workspace.isLoading) return <p role="status" className="p-4 text-xs text-slate-500">Loading WhatsApp Workspace...</p>;
    if(workspace.error) return <div role="alert" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p>{workspace.error instanceof Error?workspace.error.message:"The WhatsApp workspace could not be loaded."}</p><Button size="sm" variant="outline" onClick={()=>void workspace.refresh()}>Retry</Button></div>;
    if(editing&&workspace.envelope&&(!workspace.envelope.access.canManage||workspace.envelope.mode!=="MOCK"))return <p role="alert" className="p-4 text-sm">Template And Campaign Editing Is Available For Authorized Simulated Workspaces. Live Meta Operations Require A Separate Activation Phase.</p>;
    return <WorkspaceAccess value={{...access,...workspace.envelope?.access,...(workspace.envelope?.mode==="META"?{canEdit:false,canManage:false,canSend:false,canConfigure:false,canBill:false}:{})}}>{children}</WorkspaceAccess>;
  }
  return restored === scope ? children : <p role="status" className="p-4 text-xs text-slate-500">Loading Workspace Drafts...</p>;
}
export function CreationSession({ children }: { children: (scope: string) => ReactNode }) {
  const { companyId, clientId, isReady, scope, access } = useWhatsAppWorkspaceContext();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated || !isReady) return <div role="status" className="space-y-2 p-4"><p className="text-xs text-slate-500">Loading WhatsApp Workspace...</p><div className="h-24 animate-pulse rounded-lg bg-slate-100" /></div>;
  if (!companyId || !clientId) return <div role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">{companyId ? "Select A Client From The Sidebar Before Opening This Page." : "Select Your Company In The Existing Workspace To Continue."}</div>;
  if (!nativeWhatsAppEnabled&&!access.canManage) return <div className="space-y-3 rounded-lg border bg-white p-4 text-sm"><p>{access.label}: Campaign And Template Editing Is Not Available For This Role.</p><Link href="/admin/whatsapp" className="text-emerald-700">Back To WhatsApp</Link></div>;
  return <WorkspaceAccess value={access}><DraftRecovery scope={scope} editing>{children(scope)}</DraftRecovery></WorkspaceAccess>;
}
export function useCreationWorkspace(scope: string) {
  const access = useWorkspaceAccess();
  const queryClient = useQueryClient();
  const key = ["whatsapp-native", scope];
  const parsed = JSON.parse(scope) as string[];
  const query = useQuery({queryKey:key,enabled:nativeWhatsAppEnabled&&!!parsed[1]&&!!parsed[2],queryFn:async({signal})=>{await writes.get(scope);return nativeWhatsAppApi.snapshot(scope,signal);},refetchInterval:5000,refetchOnWindowFocus:true});
  const mutation=useMutation({mutationKey:["whatsapp-native-write",scope],mutationFn:async({changes,expectedRevision}:{changes:ReturnType<typeof workspaceChanges>;expectedRevision:number})=>{
    let current=await nativeWhatsAppApi.snapshot(scope);
    if(current.revision!==expectedRevision)throw new Error("This client workspace changed in another session. Reload and review before saving.");
    for(const change of changes.filter(change=>change.entity==="media"&&change.action==="DELETE")){await nativeWhatsAppApi.removeMedia(scope,change.id!);current=await nativeWhatsAppApi.snapshot(scope);}
    const ordinary=changes.filter(change=>!(change.entity==="media"&&change.action==="DELETE"));
    for(let index=0;index<ordinary.length;index+=100)current=await nativeWhatsAppApi.mutate(scope,current.revision,ordinary.slice(index,index+100));
    return current;
  }});
  const listen = useCallback((listener: () => void) => subscribeDemoWorkspace(scope, listener), [scope]);
  const snapshot = useCallback(() => nativeWhatsAppEnabled?emptyWorkspace:demoAdapter.load(scope), [scope]);
  const local = useSyncExternalStore(listen, snapshot, snapshot);
  useEffect(() => { if(!nativeWhatsAppEnabled) demoAdapter.restore?.(scope); }, [scope]);
  const data = nativeWhatsAppEnabled ? query.data?.workspace ?? emptyWorkspace : local;
  const update = async (fn: (data: Workspace) => Workspace):Promise<boolean> => {
    if (!access.canEdit) { toast.error("This Workspace Is Read-only For Your Role."); return false; }
    if(nativeWhatsAppEnabled) {
      const previous=queryClient.getQueryData<NativeEnvelope>(key);if(!previous)return false;
      const next=fn(previous.workspace),changes=workspaceChanges(previous.workspace,next);if(!changes.length)return await (writes.get(scope)??Promise.resolve(true));
      queryClient.setQueryData<NativeEnvelope>(key,{...previous,workspace:next});
      const queued:Promise<boolean>=(writes.get(scope)??Promise.resolve(true)).then(async()=>{
        try{const result=await mutation.mutateAsync({changes,expectedRevision:Math.max(previous.revision,writtenRevisions.get(scope)??0)});writtenRevisions.set(scope,result.revision);if(writes.get(scope)===queued)queryClient.setQueryData(key,result);return true;}
        catch(error){toast.error(error instanceof Error?error.message:"The WhatsApp change could not be saved.");void queryClient.invalidateQueries({queryKey:key});return false;}
      });
      writes.set(scope,queued);return queued;
    }
    const next = fn(demoAdapter.load(scope));
    demoAdapter.save(scope, next);
    return true;
  };
  const refresh=()=>queryClient.invalidateQueries({queryKey:key});
  const action=async(path:string,body:unknown={})=>{try{if(await writes.get(scope)===false)return false;await nativeWhatsAppApi.action(scope,path,body);await refresh();return true;}catch(error){toast.error(error instanceof Error?error.message:"The WhatsApp action failed.");return false;}};
  return { data, update, isLoading:query.isLoading, error:query.error, envelope:query.data, isNative:nativeWhatsAppEnabled, refresh, action, saving:mutation.isPending };
}
