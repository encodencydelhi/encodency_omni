import Link from "next/link";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EntityCell } from "@/components/shared/entity-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { INTEGRATION_PROVIDER } from "@/types/domain/integration";
import { PROJECT_STATUS, SEO_HEALTH_BAND, type Project } from "@/types/domain/project";

/** Connected channel count, with the broken ones called out. */
function ChannelCell({ project }: { project: Project }) {
  const connected = project.connectedChannels.length;
  const broken = project.disconnectedChannels.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-2">
          <span className="text-[0.8125rem] tabular text-foreground">{connected}</span>
          {broken > 0 ? <span className="text-2xs font-medium text-danger">{broken} down</span> : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {connected > 0
          ? project.connectedChannels.map((provider) => INTEGRATION_PROVIDER[provider].label).join(", ")
          : "No channels connected"}
      </TooltipContent>
    </Tooltip>
  );
}

/** The proprietary SEO score, coloured by the band it falls into. */
function SeoCell({ project }: { project: Project }) {
  if (project.seoScore === null) {
    return <span className="text-2xs text-muted-foreground">Not crawled</span>;
  }

  const tone =
    project.seoHealth === "good"
      ? "text-success"
      : project.seoHealth === "fair"
        ? "text-warning"
        : "text-danger";

  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("text-[0.8125rem] font-medium tabular", tone)}>{project.seoScore}</span>
      {project.openSeoIssues > 0 ? (
        <span className="text-2xs text-muted-foreground">{project.openSeoIssues} issues</span>
      ) : null}
    </span>
  );
}

interface ProjectColumnOptions {
  renderActions: (project: Project) => React.ReactNode;
  /** Omitted when the table already sits inside one company. */
  includeCompany?: boolean;
}

export function buildProjectColumns({
  renderActions,
  includeCompany = true,
}: ProjectColumnOptions): Array<DataTableColumn<Project>> {
  const columns: Array<DataTableColumn<Project>> = [
    {
      id: "project",
      header: "Project",
      sortField: "name",
      hideable: false,
      width: "min-w-52",
      cell: (project) => (
        <EntityCell
          name={project.name}
          shape="square"
          meta={project.websiteUrl?.replace(/^https?:\/\//, "") ?? "No website"}
        />
      ),
    },
  ];

  if (includeCompany) {
    columns.push({
      id: "company",
      header: "Organization",
      sortField: "company",
      cell: (project) => (
        <Link
          href={ROUTES.superAdmin.company(project.company.id)}
          onClick={(event) => event.stopPropagation()}
          className="truncate text-[0.8125rem] text-foreground underline-offset-4 hover:underline"
        >
          {project.company.name}
        </Link>
      ),
    });
  }

  columns.push(
    {
      id: "status",
      header: "Status",
      sortField: "status",
      cell: (project) => <StatusBadge registry={PROJECT_STATUS} status={project.status} withDot />,
    },
    {
      id: "channels",
      header: "Channels",
      cell: (project) => <ChannelCell project={project} />,
    },
    {
      id: "leads",
      header: "Leads (30d)",
      sortField: "leadsLast30Days",
      align: "right",
      cell: (project) => <span className="tabular">{formatNumber(project.leadsLast30Days)}</span>,
    },
    {
      id: "seo",
      header: "SEO health",
      sortField: "seoScore",
      cell: (project) => <SeoCell project={project} />,
    },
    {
      id: "seoBand",
      header: "SEO band",
      defaultHidden: true,
      cell: (project) => <StatusBadge registry={SEO_HEALTH_BAND} status={project.seoHealth} />,
    },
    {
      id: "createdAt",
      header: "Created",
      sortField: "createdAt",
      defaultHidden: true,
      cell: (project) => (
        <span className="whitespace-nowrap text-muted-foreground">{formatDate(project.createdAt)}</span>
      ),
    },
    {
      id: "lastActivityAt",
      header: "Last activity",
      sortField: "lastActivityAt",
      cell: (project) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatRelativeTime(project.lastActivityAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      width: "w-12",
      cell: renderActions,
    },
  );

  return columns;
}
