"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { addDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  ExternalLink,
  Info,
  ListChecks,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ProfileHealthDrawer } from "../components/dialogs";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  FormField,
  Notice,
  PageTitle,
  SelectMenu,
  TagInput,
  gb,
} from "../components/ui";
import { useLocationScope, useProfileHealth } from "../data/hooks";
import { hoursAreComplete } from "../data/selectors";
import { useUnsavedChanges } from "../hooks/use-unsaved-changes";
import { ATTRIBUTE_GROUPS, ATTRIBUTE_GROUP_LABEL, DAY_LABELS, LIMITS, gbRoutes } from "../lib/constants";
import { date as fmtDate, timeLabel } from "../lib/format";
import { useGbp } from "../store/gbp-store";
import type { AttributeDefinition, AttributeValue, Location, LocationProfile, SpecialHour, TimePeriod } from "../types";

const SECTIONS: { id: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "basic", label: "Basic information", icon: Store },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "address", label: "Address & service area", icon: MapPin },
  { id: "hours", label: "Business hours", icon: Clock3 },
  { id: "special-hours", label: "Special hours", icon: CalendarClock },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "attributes", label: "Attributes", icon: ListChecks },
  { id: "services", label: "Services", icon: Wrench },
];

export function ProfilePage() {
  const { locations, status } = useGbp();
  const { selected, location, setLocation } = useLocationScope();

  if (status !== "ready") return null;

  const active = location ?? locations[0] ?? null;
  if (!active) {
    return (
      <Card>
        <EmptyState icon={Store} title="No location to edit" description="Connect a Google Business location to manage its profile." action={<Button variant="primary" href={gbRoutes.locations}>Open locations</Button>} />
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <PageTitle
        title="Business profile"
        description="The information Google shows to customers. Changes are sent to Google when you save."
        actions={
          <>
            {selected === "all" && locations.length > 1 && (
              <SelectMenu
                label="Editing location"
                prefix="Editing:"
                size="md"
                className="max-w-[260px]"
                value={active.locationId}
                onChange={setLocation}
                options={locations.map((item) => ({ value: item.locationId, label: item.profile.title }))}
              />
            )}
            <Button variant="secondary" icon={ExternalLink} href={gbRoutes.mapsSearch(active.placeId)} external>
              View on Google
            </Button>
          </>
        }
      />
      <ProfileEditor key={active.locationId} location={active} />
    </div>
  );
}

export function ProfileEditor({ location }: { location: Location }) {
  const { categories, attributeDefinitions, updateProfile, capabilitiesFor } = useGbp();
  const can = capabilitiesFor(location.locationId);
  const editable = can.canEditProfile.allowed;
  const [draft, setDraft] = useState<LocationProfile>(location.profile);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState("basic");
  const [healthOpen, setHealthOpen] = useState(false);
  const [confirmSpecial, setConfirmSpecial] = useState<SpecialHour | null>(null);
  const health = useProfileHealth(location.locationId);

  const dirty = JSON.stringify(draft) !== JSON.stringify(location.profile);

  const primaryCategory = categories.find((category) => category.categoryId === draft.primaryCategoryId);
  const supportsServices = Boolean(primaryCategory?.supportsServices);

  const errors = {
    title: !draft.title.trim() ? "A business name is required." : draft.title.length > LIMITS.locationTitle ? `Keep the name under ${LIMITS.locationTitle} characters.` : undefined,
    description: draft.description.length > LIMITS.description ? `Google allows ${LIMITS.description} characters.` : undefined,
    phone: draft.phone && !/^[+()\d\s-]{6,}$/.test(draft.phone) ? "Enter a valid phone number." : undefined,
    website: draft.website && !/^https?:\/\/.+\..+/.test(draft.website) ? "Enter a full URL, including https://" : undefined,
    category: !draft.primaryCategoryId ? "Choose a primary category." : undefined,
    address: draft.address.addressLines.length === 0 || !draft.address.locality ? "Street address and city are required." : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = async () => {
    if (invalid) return false;
    setSaving(true);
    const ok = await updateProfile(location.locationId, draft, "Business profile updated");
    setSaving(false);
    return ok;
  };

  useUnsavedChanges(dirty, save, "the business profile");

  // Deep links such as ?location=x#hours scroll to the right section.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    const onHash = () => {
      const next = window.location.hash.slice(1);
      if (next) {
        document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" });
        setActive(next);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const set = <K extends keyof LocationProfile>(key: K, value: LocationProfile[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const setDayPeriods = (day: number, periods: TimePeriod[]) => {
    const others = draft.regularHours.periods.filter((period) => period.day !== day);
    set("regularHours", { ...draft.regularHours, periods: [...others, ...periods].sort((a, b) => a.day - b.day || a.open.localeCompare(b.open)) });
  };

  const attributesByGroup = useMemo(() => {
    const groups = new Map<string, AttributeDefinition[]>();
    attributeDefinitions.forEach((definition) => {
      groups.set(definition.group, [...(groups.get(definition.group) ?? []), definition]);
    });
    return groups;
  }, [attributeDefinitions]);

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pb-16 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Profile sections" className="h-fit min-w-0 lg:sticky lg:top-[76px]">
          <Card className="scrollbar-thin flex gap-1 overflow-x-auto p-1.5 lg:flex-col">
            {SECTIONS.filter((section) => section.id !== "services" || supportsServices).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition",
                  active === section.id ? "bg-[#E8F0FE] text-[#1967D2]" : "text-[#3C4043] hover:bg-[#F8F9FA]",
                  gb.focus,
                )}
              >
                <section.icon className={cn("size-3.5", active === section.id ? "text-[#1A73E8]" : "text-[#80868B]")} />
                {section.label}
              </a>
            ))}
            {health && (
              <button type="button" onClick={() => setHealthOpen(true)} className={cn("mt-1 flex items-center justify-between gap-2 rounded-lg border border-[#E8EAED] px-2.5 py-2 text-[12px] font-medium text-[#3C4043] hover:bg-[#F8F9FA]", gb.focus)}>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#8430CE]" />
                  Profile health
                </span>
                <Badge tone={health.score >= 80 ? "green" : health.score >= 60 ? "amber" : "red"}>{health.score}</Badge>
              </button>
            )}
          </Card>
        </nav>

        <div className="min-w-0 space-y-1">
          {!editable && (
            <Notice tone="amber" icon={AlertTriangle} title="Read-only">
              {can.canEditProfile.reason}
            </Notice>
          )}
          {location.verification !== "verified" && (
            <Notice tone="amber" title="Google rejects edits for unverified locations" actions={<Button size="sm" variant="secondary" icon={ExternalLink} href={gbRoutes.businessProfileManager} external>Verify on Google</Button>}>
              Complete verification in Google Business Profile to edit this location.
            </Notice>
          )}

          <Section id="basic" title="Basic information" icon={Store} description="How the business appears in Search and Maps.">
            <fieldset disabled={!editable} className="space-y-1">
              <FormField label="Business name" required htmlFor="profile-title" counter={{ value: draft.title.length, max: LIMITS.locationTitle }} error={errors.title}>
                <input id="profile-title" className={gb.input} value={draft.title} onChange={(event) => set("title", event.target.value)} />
              </FormField>
              <FormField
                label="Description"
                htmlFor="profile-description"
                counter={{ value: draft.description.length, max: LIMITS.description }}
                error={errors.description}
                hint="Describe what the business does. Google does not allow links or promotional text here."
              >
                <textarea id="profile-description" rows={5} className={gb.textarea} value={draft.description} onChange={(event) => set("description", event.target.value)} />
              </FormField>
              <FormField label="Opening date" htmlFor="profile-opening" hint="The date this location opened. Google shows it on new profiles.">
                <input
                  id="profile-opening"
                  type="date"
                  className={gb.input}
                  value={draft.openingDate ? format(parseISO(draft.openingDate), "yyyy-MM-dd") : ""}
                  onChange={(event) => set("openingDate", event.target.value ? new Date(event.target.value).toISOString() : null)}
                />
              </FormField>
            </fieldset>
          </Section>

          <Section id="contact" title="Contact" icon={Phone} description="How customers reach this location.">
            <fieldset disabled={!editable} className="grid gap-1 sm:grid-cols-2">
              <FormField label="Primary phone" htmlFor="profile-phone" error={errors.phone}>
                <input id="profile-phone" className={gb.input} value={draft.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+91 11 4567 8900" />
              </FormField>
              <FormField label="Website" htmlFor="profile-website" error={errors.website}>
                <input id="profile-website" className={gb.input} value={draft.website} onChange={(event) => set("website", event.target.value)} placeholder="https://" />
              </FormField>
              <FormField label="Additional phones" className="sm:col-span-2" hint="Up to two extra numbers are shown on the profile.">
                <TagInput value={draft.additionalPhones} onChange={(values) => set("additionalPhones", values)} placeholder="Add a number and press Enter" />
              </FormField>
            </fieldset>
          </Section>

          <Section id="address" title="Address and service area" icon={MapPin} description="Where the business is, and where it serves customers.">
            <fieldset disabled={!editable} className="space-y-1">
              <FormField label="Street address" required error={errors.address}>
                <div className="space-y-2">
                  {draft.address.addressLines.map((line, index) => (
                    <input
                      key={index}
                      className={gb.input}
                      value={line}
                      aria-label={`Address line ${index + 1}`}
                      onChange={(event) => {
                        const lines = [...draft.address.addressLines];
                        lines[index] = event.target.value;
                        set("address", { ...draft.address, addressLines: lines });
                      }}
                    />
                  ))}
                  <Button size="xs" variant="ghost" icon={Plus} onClick={() => set("address", { ...draft.address, addressLines: [...draft.address.addressLines, ""] })} disabled={!editable || draft.address.addressLines.length >= 3}>
                    Add address line
                  </Button>
                </div>
              </FormField>
              <div className="grid gap-1 sm:grid-cols-3">
                <FormField label="City" htmlFor="profile-city">
                  <input id="profile-city" className={gb.input} value={draft.address.locality} onChange={(event) => set("address", { ...draft.address, locality: event.target.value })} />
                </FormField>
                <FormField label="State" htmlFor="profile-state">
                  <input id="profile-state" className={gb.input} value={draft.address.administrativeArea} onChange={(event) => set("address", { ...draft.address, administrativeArea: event.target.value })} />
                </FormField>
                <FormField label="Postal code" htmlFor="profile-postal">
                  <input id="profile-postal" className={gb.input} value={draft.address.postalCode} onChange={(event) => set("address", { ...draft.address, postalCode: event.target.value })} />
                </FormField>
              </div>
              <div className="rounded-lg border border-[#E8EAED] p-3.5">
                <label className="flex items-center justify-between gap-1">
                  <span>
                    <span className="block text-[13px] font-medium text-[#202124]">Serves customers outside this address</span>
                    <span className="mt-0.5 block text-[12px] text-[#5F6368]">Turn on for businesses that travel to customers.</span>
                  </span>
                  <Switch
                    checked={draft.serviceArea !== null}
                    disabled={!editable}
                    onCheckedChange={(checked) =>
                      set("serviceArea", checked ? { businessType: "CUSTOMER_AND_BUSINESS_LOCATION", places: [], radiusKm: null } : null)
                    }
                    aria-label="Service area"
                  />
                </label>
                {draft.serviceArea && (
                  <div className="mt-3 space-y-1">
                    <FormField label="Areas served" hint="Cities, districts or postal codes.">
                      <TagInput value={draft.serviceArea.places} onChange={(places) => set("serviceArea", { ...draft.serviceArea!, places })} placeholder="Add an area and press Enter" />
                    </FormField>
                    <FormField label="Business type">
                      <SelectMenu
                        label="Service area business type"
                        size="md"
                        fullWidth
                        disabled={!editable}
                        value={draft.serviceArea.businessType}
                        onChange={(value) => set("serviceArea", { ...draft.serviceArea!, businessType: value as "CUSTOMER_LOCATION_ONLY" | "CUSTOMER_AND_BUSINESS_LOCATION" })}
                        options={[
                          { value: "CUSTOMER_AND_BUSINESS_LOCATION", label: "Customers visit and we travel", description: "Storefront plus service area" },
                          { value: "CUSTOMER_LOCATION_ONLY", label: "We travel to customers only", description: "Address is hidden on Google" },
                        ]}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </fieldset>
          </Section>

          <Section
            id="hours"
            title="Business hours"
            icon={Clock3}
            description="Opening hours shown on Google. Add a second row for split hours."
            badge={!hoursAreComplete(location) ? <Badge tone="amber">Incomplete</Badge> : undefined}
          >
            <fieldset disabled={!editable} className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
              {DAY_LABELS.map((label, day) => {
                const periods = draft.regularHours.periods.filter((period) => period.day === day);
                const open24 = draft.regularHours.open24.includes(day);
                const closed = periods.length === 0 && !open24;
                return (
                  <div key={label} className="flex flex-wrap items-center gap-1 px-3.5 py-2.5">
                    <span className="w-24 shrink-0 text-[12.5px] font-medium text-[#202124]">{label}</span>
                    <Switch
                      checked={!closed}
                      disabled={!editable}
                      aria-label={`${label} open`}
                      onCheckedChange={(checked) => {
                        if (checked) setDayPeriods(day, [{ day, open: "09:00", close: "18:00" }]);
                        else {
                          setDayPeriods(day, []);
                          set("regularHours", { periods: draft.regularHours.periods.filter((period) => period.day !== day), open24: draft.regularHours.open24.filter((value) => value !== day) });
                        }
                      }}
                    />
                    {closed ? (
                      <span className="text-[12.5px] text-[#5F6368]">Closed</span>
                    ) : open24 ? (
                      <span className="flex items-center gap-2 text-[12.5px] text-[#3C4043]">
                        Open 24 hours
                        <Button size="xs" variant="ghost" disabled={!editable} onClick={() => set("regularHours", { ...draft.regularHours, open24: draft.regularHours.open24.filter((value) => value !== day) })}>
                          Set times
                        </Button>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {periods.map((period, index) => (
                          <span key={index} className="flex items-center gap-1.5">
                            <input
                              type="time"
                              aria-label={`${label} opening time ${index + 1}`}
                              className={cn(gb.input, "h-8 w-[104px]")}
                              value={period.open}
                              onChange={(event) => {
                                const next = [...periods];
                                next[index] = { ...period, open: event.target.value };
                                setDayPeriods(day, next);
                              }}
                            />
                            <span className="text-[12px] text-[#5F6368]">to</span>
                            <input
                              type="time"
                              aria-label={`${label} closing time ${index + 1}`}
                              className={cn(gb.input, "h-8 w-[104px]")}
                              value={period.close}
                              onChange={(event) => {
                                const next = [...periods];
                                next[index] = { ...period, close: event.target.value };
                                setDayPeriods(day, next);
                              }}
                            />
                            {periods.length > 1 && (
                              <Button size="iconSm" variant="ghost" aria-label={`Remove ${label} hours row ${index + 1}`} disabled={!editable} onClick={() => setDayPeriods(day, periods.filter((_, i) => i !== index))}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </span>
                        ))}
                        {periods.length < 2 && (
                          <Button size="xs" variant="ghost" icon={Plus} disabled={!editable} onClick={() => setDayPeriods(day, [...periods, { day, open: "17:00", close: "21:00" }])}>
                            Split hours
                          </Button>
                        )}
                        <Button size="xs" variant="ghost" disabled={!editable} onClick={() => set("regularHours", { periods: draft.regularHours.periods.filter((period) => period.day !== day), open24: [...draft.regularHours.open24, day] })}>
                          24 hours
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </Section>

          <Section id="special-hours" title="Special hours" icon={CalendarClock} description="Holiday and one-off hours override the weekly schedule.">
            <fieldset disabled={!editable} className="space-y-1">
              {draft.specialHours.length === 0 ? (
                <p className="text-[12.5px] text-[#5F6368]">No special hours set. Google prompts customers when holiday hours are missing.</p>
              ) : (
                <ul className="divide-y divide-[#F1F3F4] rounded-lg border border-[#E8EAED]">
                  {draft.specialHours.map((special) => (
                    <li key={special.id} className="flex flex-wrap items-center gap-1 px-3.5 py-2.5">
                      <span className="min-w-[160px] flex-1">
                        <span className="block text-[12.5px] font-medium text-[#202124]">{special.label}</span>
                        <span className="block text-[11.5px] text-[#5F6368]">{fmtDate(special.date)}</span>
                      </span>
                      <span className="text-[12.5px] text-[#3C4043]">
                        {special.closed ? "Closed" : `${timeLabel(special.open ?? "09:00")} - ${timeLabel(special.close ?? "18:00")}`}
                      </span>
                      <Button size="iconSm" variant="ghost" aria-label={`Remove ${special.label}`} disabled={!editable} onClick={() => setConfirmSpecial(special)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                size="sm"
                variant="secondary"
                icon={Plus}
                disabled={!editable}
                onClick={() =>
                  set("specialHours", [
                    ...draft.specialHours,
                    { id: `sh-${Math.random().toString(36).slice(2, 8)}`, date: addDays(new Date(), 14).toISOString(), label: "Holiday", closed: true },
                  ])
                }
              >
                Add special hours
              </Button>
            </fieldset>
          </Section>

          <Section id="categories" title="Categories" icon={Tag} description="The primary category has the biggest effect on which searches you appear in.">
            <fieldset disabled={!editable} className="space-y-1">
              <FormField label="Primary category" required error={errors.category}>
                <SelectMenu
                  label="Primary category"
                  size="md"
                  fullWidth
                  disabled={!editable}
                  value={draft.primaryCategoryId}
                  onChange={(value) => set("primaryCategoryId", value)}
                  options={categories.map((category) => ({ value: category.categoryId, label: category.displayName }))}
                />
              </FormField>
              <FormField label="Additional categories" hint="Up to nine more categories. Only add ones that genuinely apply.">
                <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-[#DADCE0] p-1.5">
                  {categories
                    .filter((category) => category.categoryId !== draft.primaryCategoryId)
                    .map((category) => (
                      <label key={category.categoryId} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] text-[#3C4043] hover:bg-[#F8F9FA]">
                        <Checkbox
                          checked={draft.additionalCategoryIds.includes(category.categoryId)}
                          disabled={!editable}
                          onCheckedChange={(checked) =>
                            set(
                              "additionalCategoryIds",
                              checked ? [...draft.additionalCategoryIds, category.categoryId] : draft.additionalCategoryIds.filter((id) => id !== category.categoryId),
                            )
                          }
                          aria-label={category.displayName}
                        />
                        {category.displayName}
                      </label>
                    ))}
                </div>
              </FormField>
            </fieldset>
          </Section>

          <Section
            id="attributes"
            title="Attributes"
            icon={ListChecks}
            description="Google offers different attributes per category. These come from the API, so the list changes with your primary category."
          >
            <fieldset disabled={!editable} className="space-y-1">
              {ATTRIBUTE_GROUPS.map((group) => {
                const definitions = attributesByGroup.get(group) ?? [];
                if (!definitions.length) return null;
                return (
                  <div key={group}>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#80868B]">{ATTRIBUTE_GROUP_LABEL[group]}</p>
                    <div className="space-y-1 rounded-lg border border-[#E8EAED] p-2">
                      {definitions.map((definition) => (
                        <AttributeControl
                          key={definition.attributeId}
                          definition={definition}
                          value={draft.attributes[definition.attributeId]}
                          editable={editable && !definition.readOnly}
                          onChange={(value) => set("attributes", { ...draft.attributes, [definition.attributeId]: value })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </fieldset>
          </Section>

          {supportsServices ? (
            <Section id="services" title="Services" icon={Wrench} description={`Services are supported for the ${primaryCategory?.displayName} category.`}>
              <fieldset disabled={!editable} className="space-y-1">
                {draft.services.length === 0 && <p className="text-[12.5px] text-[#5F6368]">No services listed yet.</p>}
                {draft.services.map((service, index) => (
                  <div key={service.id} className="grid gap-2 rounded-lg border border-[#E8EAED] p-3 sm:grid-cols-[1fr_1fr_120px_auto]">
                    <input
                      className={gb.input}
                      aria-label="Service name"
                      value={service.name}
                      onChange={(event) => {
                        const services = [...draft.services];
                        services[index] = { ...service, name: event.target.value };
                        set("services", services);
                      }}
                    />
                    <input
                      className={gb.input}
                      aria-label="Service description"
                      value={service.description}
                      onChange={(event) => {
                        const services = [...draft.services];
                        services[index] = { ...service, description: event.target.value };
                        set("services", services);
                      }}
                    />
                    <input
                      className={gb.input}
                      aria-label="Service price"
                      value={service.priceLabel}
                      onChange={(event) => {
                        const services = [...draft.services];
                        services[index] = { ...service, priceLabel: event.target.value };
                        set("services", services);
                      }}
                    />
                    <Button size="icon" variant="ghost" aria-label={`Remove ${service.name}`} disabled={!editable} onClick={() => set("services", draft.services.filter((item) => item.id !== service.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  disabled={!editable}
                  onClick={() => set("services", [...draft.services, { id: `svc-${Math.random().toString(36).slice(2, 8)}`, name: "", description: "", priceLabel: "" }])}
                >
                  Add service
                </Button>
              </fieldset>
            </Section>
          ) : (
            <Section id="services" title="Services" icon={Wrench} description="Not available for this category.">
              <Notice tone="neutral" icon={Info} title="Services are not supported for this category">
                Google only accepts service lists for some categories. Change the primary category to one that supports services, or manage them in Business Profile Manager.
              </Notice>
            </Section>
          )}
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[240px]" data-gb-no-print>
          <div role="region" aria-label="Unsaved profile changes" className="flex w-full max-w-[640px] items-center gap-1 rounded-xl border border-[#E8EAED] bg-white px-4 py-2.5 shadow-[0_8px_24px_rgba(60,64,67,0.22)]">
            <AlertTriangle className="size-4 shrink-0 text-[#B06000]" />
            <p className="flex-1 text-[13px] font-medium text-[#202124]">You have unsaved changes</p>
            <Button size="sm" variant="ghost" onClick={() => setDraft(location.profile)} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" variant="primary" loading={saving} disabled={invalid} disabledReason="Fix the highlighted fields" gate={can.canEditProfile} onClick={() => void save()}>
              Save to Google
            </Button>
          </div>
        </div>
      )}

      <ProfileHealthDrawer open={healthOpen} onOpenChange={setHealthOpen} locationId={location.locationId} />
      <ConfirmDialog
        open={confirmSpecial !== null}
        onOpenChange={(open) => !open && setConfirmSpecial(null)}
        title={`Remove "${confirmSpecial?.label ?? ""}"?`}
        description="The special hours entry is removed from this profile when you save."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmSpecial) set("specialHours", draft.specialHours.filter((item) => item.id !== confirmSpecial.id));
        }}
      />
    </>
  );
}

function Section({
  id,
  title,
  description,
  icon,
  badge,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-[84px]">
      <CardHeader title={title} description={description} icon={icon} badge={badge} className="border-b border-[#F1F3F4] pb-3" />
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

function AttributeControl({
  definition,
  value,
  editable,
  onChange,
}: {
  definition: AttributeDefinition;
  value: AttributeValue | undefined;
  editable: boolean;
  onChange: (value: AttributeValue) => void;
}) {
  if (definition.valueType === "BOOL") {
    return (
      <label className={cn("flex items-center justify-between gap-1 rounded-md px-2 py-1.5", editable ? "cursor-pointer hover:bg-[#F8F9FA]" : "opacity-70")}>
        <span className="flex items-center gap-2 text-[12.5px] text-[#3C4043]">
          {definition.displayName}
          {definition.readOnly && <Badge tone="neutral">Managed by Google</Badge>}
        </span>
        <Switch checked={value === true} disabled={!editable} onCheckedChange={(checked) => onChange(checked)} aria-label={definition.displayName} />
      </label>
    );
  }

  if (definition.valueType === "ENUM") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5">
        <span className="flex items-center gap-2 text-[12.5px] text-[#3C4043]">
          {definition.displayName}
          {definition.readOnly && <Badge tone="neutral">Managed by Google</Badge>}
        </span>
        <SelectMenu
          label={definition.displayName}
          disabled={!editable}
          value={typeof value === "string" ? value : ""}
          placeholder="Not set"
          onChange={(next) => onChange(next)}
          options={(definition.options ?? []).map((option) => ({ value: option.value, label: option.displayName }))}
        />
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="rounded-md px-2 py-1.5">
      <p className="text-[12.5px] text-[#3C4043]">{definition.displayName}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {(definition.options ?? []).map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={checked}
              disabled={!editable}
              onClick={() => onChange(checked ? selected.filter((item) => item !== option.value) : [...selected, option.value])}
              className={cn(
                "h-7 rounded-full px-2.5 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                checked ? "bg-[#E8F0FE] text-[#1967D2] ring-1 ring-inset ring-[#D2E3FC]" : "bg-[#F1F3F4] text-[#3C4043] hover:bg-[#E8EAED]",
                gb.focus,
              )}
            >
              {option.displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
