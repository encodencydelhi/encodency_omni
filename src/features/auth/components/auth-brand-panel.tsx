import { BarChart3Icon, ShieldCheckIcon, UsersRoundIcon, type LucideIcon } from "lucide-react";
import { EnCodencyWordmark } from "@/components/layout/brand-mark";
import { APP } from "@/config/app";

const CAPABILITIES: Array<{ icon: LucideIcon; title: string; subtitle: string }> = [
  {
    icon: BarChart3Icon,
    title: "Streamline Operations",
    subtitle: "Unify your workflow and teams.",
  },
  {
    icon: UsersRoundIcon,
    title: "Drive Better Collaboration",
    subtitle: "Connect people, data and ideas.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Built for What’s Next",
    subtitle: "Secure. Scalable. Future-ready.",
  },
];

/**
 * The brand half of the sign-in screen.
 *
 * This is the one place in the product where the corporate red covers a full
 * surface. Everywhere behind the login it returns to being an accent on a warm
 * neutral ground, so the panel stays a control console rather than a brochure.
 */
export function AuthBrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-linear-to-br from-brand-from via-brand-via to-brand-to px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">
      {/* Soft light bloom, kept low-contrast so type stays the focus. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-48 size-96 rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 size-[27.5rem] rounded-tl-[11.25rem] bg-white/[0.035]"
      />

      {/* Ascending bars — the growth motif from the corporate collateral. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 flex h-[55%] w-[20rem] items-end justify-end gap-6 pr-8 opacity-20"
      >
        <div className="h-[38%] w-11 bg-white" />
        <div className="h-[66%] w-11 bg-white" />
        <div className="h-[94%] w-11 bg-white" />
      </div>

      <div className="relative z-10">
        <EnCodencyWordmark height={44} priority />
      </div>

      <div className="relative z-10 max-w-xl py-8">
        <div className="mb-8 h-[3px] w-14 rounded-full bg-white/60" aria-hidden />

        <p className="text-xl font-medium text-white/80">{APP.name}</p>

        <h1 className="mt-2 text-4xl font-semibold tracking-tight xl:text-5xl">Welcome back.</h1>

        <p className="mt-3 text-xl text-white/75 xl:text-2xl">Manage your platform with confidence.</p>

        <ul className="mt-10 space-y-5 xl:space-y-6">
          {CAPABILITIES.map((capability) => (
            <li key={capability.title} className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                <capability.icon size={20} />
              </span>
              <span>
                <span className="block text-base font-semibold">{capability.title}</span>
                <span className="mt-1 block text-sm text-white/65">{capability.subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 -rotate-6 text-2xl italic text-white/55 xl:text-3xl">Raise the Bar</p>
    </section>
  );
}
