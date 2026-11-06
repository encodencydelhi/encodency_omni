import assert from "node:assert/strict";
import test from "node:test";
import { campaignIssues, demoAdapter, parseContactsCsv, seedWorkspace } from "./mock-service";
import { overviewDemo } from "./overview-data";
test("demo changes remain isolated across company and client scopes", () => {
 const first=seedWorkspace("company-a:client-a");first.contacts[0]!.notes="Only In Scope A";
 demoAdapter.save("company-a:client-a",first);
 assert.equal(demoAdapter.load("company-a:client-a").contacts[0]?.notes,"Only In Scope A");
 assert.notEqual(demoAdapter.load("company-b:client-a").contacts[0]?.notes,"Only In Scope A");
 assert.notEqual(demoAdapter.load("company-a:client-b").contacts[0]?.notes,"Only In Scope A");
});
test("campaign validation rejects missing audience and past schedules",()=>{
 assert.equal(campaignIssues({name:"",audience:[],scheduledAt:""},true).length,3);
 assert.equal(campaignIssues({name:"Launch",audience:["c1"],scheduledAt:"2000-01-01T00:00"},true).length,1);
 assert.deepEqual(campaignIssues({name:"Launch",audience:["c1"],scheduledAt:"2999-01-01T00:00"},true),[]);
 assert.deepEqual(campaignIssues({name:"Launch",audience:["c1"],scheduledAt:""},false),[]);
 assert.equal(campaignIssues({name:"Launch",audience:["c1"],scheduledAt:"invalid"},true).length,1);
});
test("CSV import requires explicit consent and valid international phones",()=>{
 const rows=parseContactsCsv("\uFEFFname,phone,consent\r\nAarav,+919000000100,true\r\nMeera,+919000000101,false");
 assert.equal(rows.length,2);assert.equal(rows[0]?.consent,true);assert.equal(rows[1]?.consent,false);
 assert.throws(()=>parseContactsCsv("name,phone,consent\nAarav,900,true"),/Row 2/);
 assert.throws(()=>parseContactsCsv("name,phone,consent\nAarav,+919000000100,yes"),/Row 2/);
 assert.throws(()=>parseContactsCsv("name,phone\nAarav,+919000000100"),/Columns/);
});
test("demo reports reconcile totals and respond to selected periods",()=>{
 const data=seedWorkspace("scope");const short=overviewDemo(data,"scope",{range:"7d"});const long=overviewDemo(data,"scope",{range:"30d"});
 assert.equal(short.timeline.length,7);assert.equal(long.timeline.length,30);assert.ok(long.sent>short.sent);
 assert.equal(short.delivered+short.failed,short.sent);assert.ok(short.read<=short.delivered);
 for(const template of short.templatePerformance){assert.equal(template.delivered+template.failed,template.sent);assert.ok(template.read<=template.delivered);}
 const empty=overviewDemo({...data,contacts:[]},"scope",{range:"7d"});assert.equal(empty.optInStats.optedInPercentage,0);assert.equal(empty.optInStats.optedOutPercentage,0);
 assert.equal(short.optInStats.optedIn+short.optInStats.optedOut,data.contacts.length);
 const custom=overviewDemo(data,"scope",{range:"custom",startDate:"2026-10-01",endDate:"2026-10-03"});
 assert.equal(custom.timeline.length,3);assert.ok(custom.timeline[0]?.date.startsWith("2026-10-01"));
});
