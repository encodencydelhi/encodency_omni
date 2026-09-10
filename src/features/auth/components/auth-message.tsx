import { CircleAlertIcon } from "lucide-react";

/** Form-level failure, styled to sit inside the sign-in card. */
export function AuthErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger"
    >
      <CircleAlertIcon className="mt-px size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
