import type { WhatsAppAnalyticsQuery, WhatsAppOverviewAnalytics } from "../live/whatsapp-api";
import type { Workspace } from "./mock-service";
export function overviewDemo(data: Workspace, scope: string, query: WhatsAppAnalyticsQuery): WhatsAppOverviewAnalytics {
 const parsedStart=query.startDate?new Date(query.startDate):null;const parsedEnd=query.endDate?new Date(query.endDate):null;
 const start=parsedStart&&Number.isFinite(parsedStart.getTime())?parsedStart:null;const end=parsedEnd&&Number.isFinite(parsedEnd.getTime())?parsedEnd:null;
 const days=query.range==="custom"&&start&&end?Math.max(1,Math.min(365,Math.floor((end.getTime()-start.getTime())/86400000)+1)):parseInt(query.range||"30")||30;
 const factor=(Array.from(scope).reduce((a,c)=>a+c.charCodeAt(0),0)%7+8)/10;
 const timeline=Array.from({length:days},(_,i)=>{const sent=Math.round((80+(i*37)%90)*factor);const delivered=Math.round(sent*.96);return {date:new Date((end?.getTime() ?? Date.UTC(2026,10,2)) - (days-i-1)*86400000).toISOString(),label:`Day ${i+1}`,sent,delivered,read:Math.round(delivered*.78),failed:sent-delivered};});
 const sent=timeline.reduce((a,p)=>a+p.sent,0),delivered=timeline.reduce((a,p)=>a+p.delivered,0),read=timeline.reduce((a,p)=>a+p.read,0),failed=sent-delivered;
 const optedIn=data.contacts.filter(c=>c.consent).length, optedOut=data.contacts.length-optedIn;
 return {total:sent,sent,delivered,read,failed,deliveryRate:delivered/sent*100,readRate:read/delivered*100,failureRate:failed/sent*100,activeContacts:optedIn,totalCampaigns:data.campaigns.length,timeline,
 deliveryFunnel:{sent,delivered,read,failed,deliveryConversion:delivered/sent*100,readConversion:read/delivered*100,failureConversion:failed/sent*100},
 failureReasons:[{code:"demo_131026",label:"Recipient Unavailable (Demo)",count:failed,percentage:100}],
 platformImpact:{messagesProcessed:sent,campaignsManaged:data.campaigns.length,contactsReached:optedIn,templatesUsed:data.templates.length,failedDetected:failed,failedRecovered:0},
 credits:{available:false,reason:"Demo Preview — No Provider Balance",currency:"INR",currentBalance:null,lastUpdated:null,historical:[],consumption:null,note:"Coming After Meta Integration"},
 campaignPerformance:data.campaigns.map(c=>({id:c.id,name:c.name,status:c.status.toUpperCase(),sent:c.sent,delivered:Math.round(c.sent*.96),read:c.read,failed:c.sent-Math.round(c.sent*.96),deliveryRate:c.sent?96:0,readRate:c.sent?c.read/(c.sent*.96)*100:0,failureRate:c.sent?4:0})),
 campaignStatusDistribution:["Draft","Scheduled","Completed"].map(status=>({status:status.toUpperCase(),count:data.campaigns.filter(c=>c.status===status).length})),
 templatePerformance:data.templates.map((t,i)=>{const sent=100+i*40,delivered=Math.round(sent*.96),read=Math.round(delivered*.78);return ({id:t.id,name:t.name,providerTemplateId:null,providerStatus:t.status.toUpperCase(),language:t.language,category:t.category,templateType:"STANDARD",status:"ENABLED",variables:["1"],parameterCount:1,header:null,body:t.body,footer:t.footer,buttons:null,updatedAt:"2026-11-02T00:00:00Z",sent,delivered,read,failed:sent-delivered,total:sent,deliveryRate:delivered/sent*100,readRate:read/delivered*100,failureRate:(sent-delivered)/sent*100,campaignsUsed:1,lastUsedAt:"2026-11-02T00:00:00Z"});}),
 optInStats:{optedIn,optedOut,optedInPercentage:data.contacts.length?optedIn/data.contacts.length*100:0,optedOutPercentage:data.contacts.length?optedOut/data.contacts.length*100:0,total:data.contacts.length},
 audienceGrowth:timeline.map((p,i)=>({date:p.date,label:p.label,totalContacts:20+i*3,optedIn:18+i*2,optedOut:2+i,activeContacts:18+i*2}))};
}
