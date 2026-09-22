"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Plus, MoreHorizontal, Eye, Pencil, Trash2, ArrowRightLeft, Target,
  CheckCircle2, XCircle, GripVertical, ChevronDown, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AdminPageTitle } from "@/features/admin/shared/admin-page-title";
import { PipelineMetricCards } from "./components/crm-metric-cards";
import { FunnelChart } from "./components/crm-funnel-chart";
import { deals as initialDeals, activities, pipelines, teamMembers } from "./data/crm-data";
import type { Deal, DealStage } from "./types";
import { DEAL_STAGE_REGISTRY } from "./types";
import { formatDate } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const STAGE_LABELS: Record<DealStage, string> = {
  new: "New", qualified: "Qualified", discovery: "Discovery",
  proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost",
};

const STAGE_COLORS: Record<DealStage, string> = {
  new: "border-t-[#2563EB]", qualified: "border-t-[#4285F4]", discovery: "border-t-[#F59E0B]",
  proposal: "border-t-[#8B5CF6]", negotiation: "border-t-[#F97316]", won: "border-t-[#078359]", lost: "border-t-[#DC2626]",
};

const STAGE_BADGE: Record<DealStage, string> = {
  new: "bg-[#E8F0FE] text-[#2563EB]",
  qualified: "bg-[#DBEAFE] text-[#1D4ED8]",
  discovery: "bg-[#FEF3CD] text-[#92700C]",
  proposal: "bg-[#F3E8FF] text-[#8B5CF6]",
  negotiation: "bg-[#FFF7ED] text-[#EA580C]",
  won: "bg-[#E5F7EF] text-[#078359]",
  lost: "bg-[#FEE2E2] text-[#DC2626]",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-[#FEE2E2] text-[#DC2626]",
  medium: "bg-[#FEF3CD] text-[#92700C]",
  low: "bg-[#F3F4F6] text-[#6B7280]",
};

/* ------------------------------------------------------------------ */
/* Funnel data                                                          */
/* ------------------------------------------------------------------ */

function computeFunnel(deals: Deal[]) {
  const stageCounts: Record<string, number> = {};
  const pipelineStages = ["new", "qualified", "discovery", "proposal", "negotiation", "won"];
  pipelineStages.forEach((s) => { stageCounts[s] = 0; });
  deals.filter((d) => d.stage !== "lost").forEach((d) => { if (d.stage in stageCounts) stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + 1; });
  const total = deals.filter((d) => d.stage !== "lost").length || 1;
  return pipelineStages.map((s) => ({
    label: STAGE_LABELS[s as DealStage],
    count: stageCounts[s] ?? 0,
    value: `${stageCounts[s] ?? 0} deals`,
    conversionRate: Math.round(((stageCounts[s] ?? 0) / total) * 100),
  }));
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [pipelineId, setPipelineId] = useState("pipeline_1");
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  const pipeline = useMemo(() => pipelines.find((p) => p.id === pipelineId) ?? pipelines[0] ?? { id: "", name: "", stages: [] as DealStage[] }, [pipelineId]);
  const activeStages = useMemo(() => pipeline.stages.filter((s) => s !== "won" && s !== "lost"), [pipeline]);
  const displayStages = pipeline.stages;

  /* ---- Derived data ---- */
  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    displayStages.forEach((s) => { map[s] = []; });
    deals.filter((d) => d.pipelineId === pipelineId).forEach((d) => {
      if (!map[d.stage]) map[d.stage] = [];
      map[d.stage]!.push(d);
    });
    return map;
  }, [deals, pipelineId, displayStages]);

  const funnel = useMemo(() => computeFunnel(deals.filter((d) => d.pipelineId === pipelineId)), [deals, pipelineId]);

  /* ---- Drag handlers ---- */
  const handleDragStart = useCallback((dealId: string) => {
    setDraggedDeal(dealId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetStage: DealStage) => {
    if (!draggedDeal) return;
    setDeals((prev) => prev.map((d) =>
      d.id === draggedDeal ? { ...d, stage: targetStage, updatedAt: new Date().toISOString() } : d
    ));
    const deal = deals.find((d) => d.id === draggedDeal);
    if (deal) {
      toast.success(`"${deal.name}" moved to ${STAGE_LABELS[targetStage]}`);
    }
    setDraggedDeal(null);
  }, [draggedDeal, deals]);

  const handleMarkWon = (dealId: string) => {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: "won" as DealStage, probability: 100 } : d));
    toast.success("Deal marked as Won!");
    setDetailDeal(null);
  };

  const handleMarkLost = (dealId: string) => {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: "lost" as DealStage, probability: 0 } : d));
    toast.success("Deal marked as Lost");
    setDetailDeal(null);
  };

  const handleDelete = (dealId: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    toast.success("Deal deleted");
    setDetailDeal(null);
  };

  const format = (n: number) => n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;

  return (
    <div className="space-y-2">
      <AdminPageTitle
        eyebrow="CRM / Pipeline"
        title="Sales Pipeline"
        description="Track and manage your sales deals through every stage."
        action={
          <div className="flex items-center gap-2">
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm"><Settings className="size-3.5" /> Settings</Button>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="size-3.5" /> Create Deal</Button>
          </div>
        }
      />

      <PipelineMetricCards deals={deals.filter((d) => d.pipelineId === pipelineId)} />

      {/* ---- Kanban Board ---- */}
      <div className="scrollbar-thin overflow-x-auto">
        <div className="flex gap-2 min-w-[1200px]">
          {displayStages.map((stage) => {
            const stageDeals = dealsByStage[stage] ?? [];
            const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const weightedValue = stageDeals.reduce((sum, d) => sum + (d.value * d.probability) / 100, 0);

            return (
              <div
                key={stage}
                className={`flex-1 min-w-[200px] rounded-sm border border-[#DDE4ED] bg-[#F8FAFD] border-t-2 ${STAGE_COLORS[stage]}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage)}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8EDF3]">
                  <div>
                    <h3 className="text-[12px] font-semibold text-[#27375D]">{STAGE_LABELS[stage]}</h3>
                    <p className="text-[12px] text-[#75829D]">{stageDeals.length} deals · ₹{format(totalValue)}</p>
                  </div>
                  <span className="flex size-6 items-center justify-center rounded-sm bg-white text-[12px] font-semibold text-[#27375D] border border-[#E8EDF3]">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-thin">
                  {stageDeals.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-[12px] text-[#75829D]">No deals</div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => handleDragStart(deal.id)}
                        onClick={() => setDetailDeal(deal)}
                        className="rounded-sm border border-[#DDE4ED] bg-white p-2.5 shadow-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <p className="text-[12px] font-semibold text-[#172044] leading-tight">{deal.name}</p>
                          <GripVertical className="size-3 text-[#AAB5C6] shrink-0" />
                        </div>
                        <p className="text-[12px] text-[#75829D] mb-2">{deal.companyName}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-[#27375D]">₹{format(deal.value)}</span>
                          <span className="text-[12px] text-[#75829D]">{deal.probability}%</span>
                        </div>
                        {deal.priority && (
                          <div className="mt-1.5">
                            <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${PRIORITY_BADGE[deal.priority]}`}>
                              {deal.priority}
                            </span>
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[12px] text-[#75829D]">{deal.ownerName.split(" ")[0]}</span>
                          <span className="text-[12px] text-[#75829D]">Close: {new Date(deal.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Analytics Section ---- */}
      <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">Pipeline Funnel</h2>
          <div className="p-4"><FunnelChart stages={funnel} /></div>
        </section>
        <section className="overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-xs">
          <h2 className="border-b border-[#E8EDF3] px-3 py-2.5 text-[12px] font-semibold">Stage Breakdown</h2>
          <div className="p-3">
            <div className="space-y-2">
              {displayStages.filter((s) => s !== "lost").map((stage) => {
                const stageDeals = dealsByStage[stage] ?? [];
                const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
                return (
                  <div key={stage} className="flex items-center gap-3 rounded-sm border border-[#E8EDF3] p-2">
                    <span className={`size-2 rounded-sm ${STAGE_COLORS[stage]?.replace("border-t-", "bg-")}`} />
                    <span className="flex-1 text-[12px] font-medium text-[#27375D]">{STAGE_LABELS[stage]}</span>
                    <span className="text-[12px] text-[#75829D]">{stageDeals.length} deals</span>
                    <span className="text-[12px] font-semibold text-[#27375D]">₹{format(totalVal)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ---- Deal Detail Sheet ---- */}
      <Sheet open={!!detailDeal} onOpenChange={() => setDetailDeal(null)}>
        <SheetContent side="right" className="w-full max-w-lg">
          <SheetHeader>
            <SheetTitle>{detailDeal?.name}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {detailDeal && (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-3 mt-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${STAGE_BADGE[detailDeal.stage]}`}>{STAGE_LABELS[detailDeal.stage]}</span>
                    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[12px] font-semibold ${PRIORITY_BADGE[detailDeal.priority]}`}>{detailDeal.priority}</span>
                  </div>
                  <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-2">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Deal Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Value:</span> <span className="text-[#354568] font-semibold">₹{detailDeal.value.toLocaleString()}</span></div>
                      <div><span className="text-[#75829D]">Probability:</span> <span className="text-[#354568]">{detailDeal.probability}%</span></div>
                      <div><span className="text-[#75829D]">Weighted:</span> <span className="text-[#354568]">₹{Math.round(detailDeal.value * detailDeal.probability / 100).toLocaleString()}</span></div>
                      <div><span className="text-[#75829D]">Cost:</span> <span className="text-[#354568]">₹{detailDeal.cost.toLocaleString()}</span></div>
                      <div><span className="text-[#75829D]">Profit:</span> <span className="text-[#354568]">₹{(detailDeal.value - detailDeal.cost).toLocaleString()}</span></div>
                      <div><span className="text-[#75829D]">Margin:</span> <span className="text-[#354568]">{Math.round(((detailDeal.value - detailDeal.cost) / detailDeal.value) * 100)}%</span></div>
                    </div>
                  </div>
                  <div className="rounded-sm border border-[#DDE4ED] p-3 space-y-2">
                    <h3 className="text-[12px] font-semibold text-[#27375D]">Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-[#75829D]">Company:</span> <span className="text-[#354568]">{detailDeal.companyName}</span></div>
                      <div><span className="text-[#75829D]">Contact:</span> <span className="text-[#354568]">{detailDeal.primaryContactName}</span></div>
                      <div><span className="text-[#75829D]">Owner:</span> <span className="text-[#354568]">{detailDeal.ownerName}</span></div>
                      <div><span className="text-[#75829D]">Close Date:</span> <span className="text-[#354568]">{formatDate(detailDeal.expectedCloseDate)}</span></div>
                      <div><span className="text-[#75829D]">Source:</span> <span className="text-[#354568]">{detailDeal.source}</span></div>
                      <div><span className="text-[#75829D]">Products:</span> <span className="text-[#354568]">{detailDeal.products}</span></div>
                    </div>
                  </div>
                  {detailDeal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detailDeal.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {detailDeal.stage !== "won" && detailDeal.stage !== "lost" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleMarkWon(detailDeal.id)}><CheckCircle2 className="size-3.5" /> Mark Won</Button>
                        <Button size="sm" variant="outline" onClick={() => handleMarkLost(detailDeal.id)}><XCircle className="size-3.5" /> Mark Lost</Button>
                      </>
                    )}
                    <Button size="sm" onClick={() => toast.info("Task created")}>Add Task</Button>
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-3">
                  <ActivityTimeline
                    entries={activities.filter((a) => a.entityId === detailDeal.id || a.entityType === "deal").map((a) => ({
                      id: a.id, actor: a.actor, action: a.description, target: "", createdAt: a.createdAt,
                    }))}
                  />
                </TabsContent>
                <TabsContent value="notes" className="mt-3">
                  {detailDeal.notes ? (
                    <div className="rounded-sm border border-[#DDE4ED] p-3">
                      <p className="text-[12px] text-[#354568]">{detailDeal.notes}</p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#75829D]">No notes yet.</p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* ---- Create Deal Modal ---- */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Deal</DialogTitle>
            <DialogDescription>Add a new deal to your pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Deal Name" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Company" />
              <Input placeholder="Contact" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Value (₹)" type="number" />
              <Input placeholder="Probability (%)" type="number" />
            </div>
            <Input placeholder="Expected Close Date" type="date" />
            <Textarea placeholder="Notes" rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { toast.success("Deal created"); setShowCreate(false); }}>Save Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
