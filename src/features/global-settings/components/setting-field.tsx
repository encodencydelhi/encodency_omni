"use client";

import { InfoIcon, LockIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { APPROVAL_LABEL, ENFORCEMENT_LABEL, OVERRIDE_LABEL, POLICY_KIND_LABEL, SCOPE_LABEL, TIMING_LABEL, UNIT_LABEL } from "../data/config";
import { formatInZone, formatSettingValue, LOCALE_OPTIONS, TIMEZONE_OPTIONS, type RegionalSample } from "../data/formatting";
import type { ConfigurationChange, GlobalSettingDefinition, SettingOption, SettingValue, SettingValues } from "../data/types";
import { isVisible } from "../data/validators";
import { SettingBadges } from "./badges";

/** What the setting controls, who it affects and how it is enforced, kept out of the way until asked for. */
export function SettingDetails({ definition }: { definition: GlobalSettingDefinition }) {
  const rows: Array<[string, string]> = [
    ["What It Controls", definition.description],
    ["Who It Affects", SCOPE_LABEL[definition.scope].who],
    ["Default or Mandatory", `${POLICY_KIND_LABEL[definition.policyKind].label} - ${POLICY_KIND_LABEL[definition.policyKind].description}`],
    ["Company Override", `${OVERRIDE_LABEL[definition.override].label} - ${OVERRIDE_LABEL[definition.override].description}`],
    ["When It Takes Effect", `${TIMING_LABEL[definition.timing].label} - ${TIMING_LABEL[definition.timing].description}`],
    ["Enforced by", ENFORCEMENT_LABEL[definition.enforcement].label + (ENFORCEMENT_LABEL[definition.enforcement].backend ? " (not enforced by this frontend)" : "")],
    ["Change Needs", APPROVAL_LABEL[definition.approval]],
    ["Edit Capability", definition.editCapability],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`About ${definition.name}`} className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring/40">
          <InfoIcon className="size-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-3" align="start">
        <p className="text-[0.8125rem] font-semibold text-foreground">{definition.name}</p>
        <dl className="space-y-1.5">
          {rows.map(([label, text]) => (
            <div key={label}>
              <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="text-[0.8125rem] text-foreground">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">{definition.key}</p>
      </PopoverContent>
    </Popover>
  );
}

function withCurrent(options: readonly SettingOption[], value: string): readonly SettingOption[] {
  return value && !options.some((option) => option.value === value) ? [{ value, label: value }, ...options] : options;
}

interface ControlProps {
  definition: GlobalSettingDefinition;
  id: string;
  value: SettingValue;
  onChange: (value: SettingValue) => void;
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
  regional: RegionalSample;
}

function Control({ definition, id, value, onChange, disabled, invalid, describedBy, regional }: ControlProps) {
  const common = { id, disabled, "aria-invalid": invalid || undefined, "aria-describedby": describedBy };

  switch (definition.valueType) {
    case "text":
    case "email":
    case "url":
      return <Input {...common} type={definition.valueType === "email" ? "email" : "text"} inputMode={definition.valueType === "url" ? "url" : undefined} value={String(value ?? "")} placeholder={definition.placeholder} maxLength={definition.maxLength ? definition.maxLength + 20 : undefined} onChange={(event) => onChange(event.target.value)} />;
    case "textarea":
      return (
        <div className="space-y-1">
          <Textarea {...common} rows={3} value={String(value ?? "")} placeholder={definition.placeholder} onChange={(event) => onChange(event.target.value)} />
          {definition.maxLength ? <p className="text-right text-2xs tabular text-muted-foreground">{String(value ?? "").length} / {definition.maxLength}</p> : null}
        </div>
      );
    case "number": {
      const unit = definition.unit && definition.unit !== "count" ? UNIT_LABEL[definition.unit].plural : null;
      return (
        <div className="flex items-center gap-2">
          <Input {...common} inputMode="numeric" className="tabular sm:max-w-32" value={value === null || value === undefined ? "" : String(value)} onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, "") === "" ? "" : Number(event.target.value.replace(/[^\d]/g, "")))} />
          {unit ? <span className="text-[0.8125rem] text-muted-foreground">{unit}</span> : null}
        </div>
      );
    }
    case "boolean":
      if (definition.booleanLabels) {
        return (
          <Select value={value === true ? "yes" : "no"} onValueChange={(next) => onChange(next === "yes")} disabled={disabled}>
            <SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">{definition.booleanLabels[1]}</SelectItem>
              <SelectItem value="no">{definition.booleanLabels[0]}</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return (
        <div className="flex items-center gap-2 sm:justify-end">
          <Switch id={id} checked={value === true} onCheckedChange={onChange} disabled={disabled} aria-describedby={describedBy} />
          <span className="w-8 text-[0.8125rem] text-muted-foreground" aria-hidden>{value === true ? "On" : "Off"}</span>
        </div>
      );
    case "select":
    case "timezone":
    case "locale": {
      const base = definition.valueType === "timezone" ? TIMEZONE_OPTIONS : definition.valueType === "locale" ? LOCALE_OPTIONS : (definition.options ?? []);
      const options = withCurrent(base, String(value ?? ""));
      return (
        <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy}><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    case "multiselect": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy} className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(definition.options ?? []).map((option) => (
            <label key={option.value} className={cn("flex cursor-pointer items-center gap-1.5 text-[0.8125rem]", disabled && "cursor-not-allowed opacity-60")}>
              <Checkbox
                checked={selected.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => onChange(checked === true ? [...selected, option.value] : selected.filter((item) => item !== option.value))}
                aria-label={option.label}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    case "datetime": {
      const iso = String(value ?? "");
      const local = iso && !Number.isNaN(Date.parse(iso)) ? iso.slice(0, 16) : "";
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input {...common} type="datetime-local" className="tabular sm:max-w-56" value={local} onChange={(event) => onChange(event.target.value ? new Date(`${event.target.value}:00Z`).toISOString() : "")} />
            <span className="text-[0.8125rem] text-muted-foreground">UTC</span>
          </div>
          {local ? <p className="text-2xs text-muted-foreground">{formatInZone(iso, regional)} in {regional.timezone}</p> : null}
        </div>
      );
    }
    default:
      return <p className="text-[0.8125rem] text-foreground">{formatSettingValue(definition, value)}</p>;
  }
}

export function regionalOf(values: SettingValues): RegionalSample {
  return {
    timezone: String(values["localization.default_timezone"] ?? "Asia/Kolkata"),
    locale: String(values["localization.default_locale"] ?? "en-IN"),
    dateFormat: String(values["localization.date_format"] ?? "DD MMM YYYY"),
    timeFormat: String(values["localization.time_format"] ?? "12h"),
  };
}

export interface SettingRowProps {
  definition: GlobalSettingDefinition;
  /** Current (draft) values of the whole configuration. */
  values: SettingValues;
  saved: SettingValues;
  onChange: (key: string, value: SettingValue) => void;
  error?: string;
  /** Overrides edit access, e.g. for a viewer without permission. */
  readOnly?: boolean;
  pending?: ConfigurationChange;
  focused?: boolean;
  /** Hide the badge row where the surrounding group already states the scope. */
  compact?: boolean;
}

/** One setting: name, description, control, scope badges and details, in a compact divided row. */
export function SettingRow({ definition, values, saved, onChange, error, readOnly = false, pending, focused = false, compact = false }: SettingRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) return;
    const row = ref.current;
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
    row?.classList.add("bg-primary-subtle");
    const focus = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("input, textarea, button[role=combobox], button[role=switch], [role=group] input, button")?.focus({ preventScroll: true }), 350);
    const clear = window.setTimeout(() => row?.classList.remove("bg-primary-subtle"), 2600);
    return () => {
      window.clearTimeout(focus);
      window.clearTimeout(clear);
      row?.classList.remove("bg-primary-subtle");
    };
  }, [focused]);

  if (!isVisible(definition, values)) return null;

  const id = `ctl-${definition.key}`;
  const locked = Boolean(definition.locked) || definition.valueType === "readonly";
  const disabled = readOnly || locked;
  const changed = !locked && JSON.stringify(values[definition.key]) !== JSON.stringify(saved[definition.key]);
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div
      ref={ref}
      id={`setting-${definition.key}`}
      data-setting-key={definition.key}
      className={cn("grid grid-cols-1 gap-x-6 gap-y-2 px-3 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]", changed && "bg-warning-subtle/40")}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <Label id={`${id}-label`} htmlFor={id} className="text-[0.8125rem] font-medium text-foreground">
            {definition.name}
            {definition.required && !locked ? <span className="ml-0.5 text-danger" aria-hidden>*</span> : null}
          </Label>
          <SettingDetails definition={definition} />
          {changed ? <span className="rounded-sm bg-warning-subtle px-1 text-[10px] font-medium text-warning">Edited</span> : null}
        </div>
        <p className="max-w-prose text-2xs leading-relaxed text-muted-foreground">{definition.description}</p>
        {compact ? null : <SettingBadges definition={definition} className="pt-0.5" />}
      </div>

      <div className="min-w-0 space-y-1.5">
        {locked ? (
          <div className="flex items-start gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2">
            <LockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p id={id} className="text-[0.8125rem] font-medium text-foreground">{definition.valueType === "boolean" || definition.valueType === "select" ? formatSettingValue(definition, values[definition.key]) : String(definition.defaultValue)}</p>
              <p className="text-2xs text-muted-foreground">{definition.locked}</p>
            </div>
          </div>
        ) : (
          <Control definition={definition} id={id} value={values[definition.key] ?? definition.defaultValue} onChange={(next) => onChange(definition.key, next)} disabled={disabled} invalid={Boolean(error)} describedBy={describedBy} regional={regionalOf(values)} />
        )}
        {error ? <p id={`${id}-error`} role="alert" className="text-2xs text-danger">{error}</p> : null}
        {changed && !error ? <p className="text-2xs text-muted-foreground">Currently {formatSettingValue(definition, saved[definition.key])}</p> : null}
        {pending ? (
          <p className="rounded-sm border border-warning/25 bg-warning-subtle px-2 py-1 text-2xs text-warning">
            Pending: {formatSettingValue(definition, pending.next)} requested by {pending.actorName}. Not yet effective.
          </p>
        ) : null}
      </div>
    </div>
  );
}
