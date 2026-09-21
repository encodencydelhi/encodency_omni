/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Resource Mapping Table Component
 * Displays external accounts/pages discovered under an authorization and their mapped tenant clients
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { ProviderLogo } from "./provider-logo";
import type { ExternalResource } from "../data/types";

interface ResourceMappingTableProps {
  resources: ExternalResource[];
  className?: string;
}

export function ResourceMappingTable({
  resources,
  className,
}: ResourceMappingTableProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Discovered Resource</th>
                <th className="py-3 px-4">Resource Type</th>
                <th className="py-3 px-4">External Identifier</th>
                <th className="py-3 px-4">Mapped Tenant Client</th>
                <th className="py-3 px-4">Mapping Status</th>
                <th className="py-3 px-4">Dependent Modules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No external resources discovered under this authorization.
                  </td>
                </tr>
              ) : (
                resources.map((res) => {
                  return (
                    <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Resource Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <ProviderLogo
                            providerId={
                              res.resourceType.includes("instagram")
                                ? "instagram"
                                : res.resourceType.includes("facebook")
                                ? "facebook"
                                : res.resourceType.includes("linkedin")
                                ? "linkedin"
                                : res.resourceType.includes("google")
                                ? "google_business"
                                : res.resourceType.includes("youtube")
                                ? "youtube"
                                : res.resourceType.includes("whatsapp")
                                ? "whatsapp"
                                : res.resourceType.includes("x_")
                                ? "x"
                                : res.providerId
                            }
                            size="sm"
                          />
                          <div>
                            <div className="font-bold text-slate-900">
                              {res.resourceName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {res.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Resource Type */}
                      <td className="py-3 px-4 capitalize font-medium text-slate-700">
                        {res.resourceType.replace("_", " ")}
                      </td>

                      {/* External ID */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {res.externalResourceId}
                      </td>

                      {/* Mapped Client */}
                      <td className="py-3 px-4">
                        {res.mappedClientName ? (
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>{res.mappedClientName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Unmapped
                          </span>
                        )}
                      </td>

                      {/* Mapping Status */}
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                            res.mappingStatus === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : res.mappingStatus === "conflict"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              res.mappingStatus === "active"
                                ? "bg-emerald-500"
                                : res.mappingStatus === "conflict"
                                ? "bg-rose-500"
                                : "bg-slate-400"
                            )}
                          />
                          <span className="capitalize">{res.mappingStatus}</span>
                        </span>
                      </td>

                      {/* Dependent Modules */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {res.dependentModules.map((mod) => (
                            <span
                              key={mod}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-xs"
                            >
                              {mod}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
