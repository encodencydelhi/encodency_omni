import { apiClient } from '@/lib/api/client';
import { companyScopeHeaders } from '@/lib/api/company-scope';
import { getStoredCompanyId } from '@/lib/api/tenancy-storage';
import type { IntegrationKey, IssueStatus, ScanType, WebsiteDataProvider, WebsiteSettings } from './types';

function headers(clientId:string){return companyScopeHeaders(getStoredCompanyId(),{'x-client-id':clientId});}
function get<T>(clientId:string,section:string,query?:Record<string,string>){return apiClient.request<T>({method:'GET',path:`/website/${section}`,headers:headers(clientId),query});}
export class LiveWebsiteProvider implements WebsiteDataProvider{
 readonly id='live' as const;
 getTarget=(id:string)=>get<any>(id,'target'); getCapabilities=(id:string)=>get<any>(id,'capabilities'); getSummary=(id:string)=>get<any>(id,'summary');
 getTrend=(id:string,days:7|30|90)=>get<any>(id,'trend',{days:String(days)}); getTechnologies=(id:string)=>get<any>(id,'technologies'); getScans=(id:string)=>get<any>(id,'scans'); getPages=(id:string)=>get<any>(id,'pages');
 getPageAudit=(id:string,pageId:string)=>get<any>(id,`pages/${encodeURIComponent(pageId)}`); getIssues=(id:string)=>get<any>(id,'issues'); getFixGuide=(guideId:string)=>get<any>(getStoredClientIdSafe(),`fix-guides/${encodeURIComponent(guideId)}`);
 getSeo=(id:string)=>get<any>(id,'seo'); getPerformance=(id:string)=>get<any>(id,'performance'); getAnalytics=(id:string,period:string)=>get<any>(id,'analytics',{period}); getForms=(id:string)=>get<any>(id,'forms'); getMonitoring=(id:string)=>get<any>(id,'monitoring'); getSettings=(id:string)=>get<any>(id,'settings');
 startScan=(id:string,type:ScanType,pageId?:string)=>apiClient.request<any>({method:'POST',path:'/website/scans/start',headers:headers(id),body:{type,pageId}});
 getScanProgress=(id:string,scanId:string)=>apiClient.request<any>({method:'GET',path:`/website/scans/${encodeURIComponent(scanId)}/progress`,headers:headers(id)});
 saveSettings=(id:string,settings:WebsiteSettings)=>apiClient.request<WebsiteSettings>({method:'PUT',path:'/website/settings/current',headers:headers(id),body:{settings}});
 setIssueStatus=(id:string,issueId:string,status:IssueStatus)=>apiClient.request<any>({method:'PATCH',path:`/website/issues/${encodeURIComponent(issueId)}`,headers:headers(id),body:{status}});
 connectIntegration=(id:string,key:IntegrationKey,property:string)=>apiClient.request<any>({method:'PATCH',path:'/website/integrations/current',headers:headers(id),body:{key,property,connected:true}});
 disconnectIntegration=(id:string,key:IntegrationKey)=>apiClient.request<any>({method:'PATCH',path:'/website/integrations/current',headers:headers(id),body:{key,connected:false}});
 archiveMonitoring=async(id:string,archived:boolean)=>{const current=await this.getSettings(id);return this.saveSettings(id,{...current,monitoringArchived:archived});};
}
function getStoredClientIdSafe(){if(typeof localStorage==='undefined')return'';return localStorage.getItem('omni_active_client_id')??'';}
