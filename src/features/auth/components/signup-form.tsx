"use client";

import { ArrowLeftIcon, Building2Icon, MailCheckIcon, MailIcon, PhoneIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ROUTES } from "@/config/routes";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import { AUTH_INPUT_CLASS, AuthField } from "./auth-field";
import { AuthCard, AuthPanelFooter } from "./auth-card";
import { AuthErrorMessage } from "./auth-message";
import { AuthSubmitButton } from "./auth-submit-button";

/**
 * Self-signup: company name, your name and email (phone optional). The email gets a link that confirms the address and
 * lets the person set a password; the first sign-in then asks for two-step verification and opens the setup guide.
 */
interface SignupSettings { enabled: boolean; trial: { plan: string; days: number } | null }

export function SignupForm() {
  const [settings, setSettings] = useState<SignupSettings | null>(null);
  const [form, setForm] = useState({ companyName: "", name: "", email: "", phone: "", website: "" });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient.request<SignupSettings>({ method: "GET", path: "/auth/signup" }).then((value) => { if (alive) setSettings(value); }).catch(() => { if (alive) setSettings({ enabled: true, trial: null }); });
    return () => { alive = false; };
  }, []);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valid = form.companyName.trim().length >= 2 && form.name.trim().length >= 2 && emailOk && accept;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!valid) { setError("Fill in the company name, your name and a valid email, and accept the privacy policy."); return; }
    setPending(true); setError("");
    try {
      await apiClient.request({ method: "POST", path: "/auth/signup", body: { companyName: form.companyName.trim(), name: form.name.trim(), email: form.email.trim(), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), acceptTerms: true, ...(form.website ? { website: form.website } : {}) } });
      setSentTo(form.email.trim());
    } catch (caught) {
      setError(ApiError.isApiError(caught) ? caught.message : "We could not create your workspace. Please try again.");
    } finally { setPending(false); }
  };

  return (
    <>
      <AuthCard>
        {sentTo ? (
          <>
            <span className="flex size-11 items-center justify-center rounded-sm bg-success-subtle text-success"><MailCheckIcon size={22} /></span>
            <h1 className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Check your inbox</h1>
            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              We sent a link to <span className="font-medium text-foreground">{sentTo}</span>. Open it to confirm your email and set your password. The link works for 7 days. After that, sign in and we will help you set up your workspace step by step.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">No email after a few minutes? Check spam, or try again tomorrow with the same email.</p>
            <Link href={ROUTES.login} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-card font-semibold text-foreground transition hover:bg-accent"><ArrowLeftIcon size={19} aria-hidden /> Back to sign in</Link>
          </>
        ) : settings && !settings.enabled ? (
          <>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Sign-ups are closed</h1>
            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">New workspaces are created by our team right now. Contact us and we will set one up for you.</p>
            <Link href={ROUTES.login} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-border-strong bg-card font-semibold text-foreground transition hover:bg-accent"><ArrowLeftIcon size={19} aria-hidden /> Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">CREATE YOUR WORKSPACE</p>
            <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">Start in two minutes</h1>
            <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-muted-foreground">
              {settings?.trial ? `Free ${settings.trial.days}-day trial of the ${settings.trial.plan} plan. ` : ""}Just the basics now; you can complete your profile anytime later.
            </p>
            <form onSubmit={submit} noValidate className="mt-6 space-y-1">
              <AuthField id="signup-company" label="Company or brand name" icon={Building2Icon}>
                <input id="signup-company" autoComplete="organization" placeholder="Acme Marketing" disabled={pending} className={AUTH_INPUT_CLASS} value={form.companyName} maxLength={200} onChange={set("companyName")} />
              </AuthField>
              <AuthField id="signup-name" label="Your name" icon={UserIcon}>
                <input id="signup-name" autoComplete="name" placeholder="Your full name" disabled={pending} className={AUTH_INPUT_CLASS} value={form.name} maxLength={120} onChange={set("name")} />
              </AuthField>
              <AuthField id="signup-email" label="Work email" icon={MailIcon} error={form.email && !emailOk ? "Enter a valid email address." : undefined}>
                <input id="signup-email" type="email" autoComplete="email" placeholder="you@company.com" disabled={pending} className={AUTH_INPUT_CLASS} value={form.email} maxLength={254} onChange={set("email")} />
              </AuthField>
              <AuthField id="signup-phone" label="Phone (optional)" icon={PhoneIcon}>
                <input id="signup-phone" type="tel" autoComplete="tel" placeholder="+91 98xxxxxxxx" disabled={pending} className={AUTH_INPUT_CLASS} value={form.phone} maxLength={30} onChange={set("phone")} />
              </AuthField>
              {/* Honeypot for bots: hidden from people and screen readers. */}
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={set("website")} name="website" />
              <label className="flex items-start gap-2 pt-2 text-sm text-muted-foreground">
                <input type="checkbox" className="mt-1" checked={accept} onChange={(event) => setAccept(event.target.checked)} />
                <span>I agree to the <Link href="/privacy-policy" className="font-medium text-foreground underline" target="_blank">privacy policy</Link> and the use of my details to run this workspace.</span>
              </label>
              {error ? <AuthErrorMessage message={error} /> : null}
              <AuthSubmitButton isPending={pending} pendingLabel="Creating...">Create workspace</AuthSubmitButton>
              <p className="pt-3 text-center text-sm text-muted-foreground">Already have an account? <Link href={ROUTES.login} className="font-medium text-foreground underline">Sign in</Link></p>
            </form>
          </>
        )}
      </AuthCard>
      <AuthPanelFooter />
    </>
  );
}
