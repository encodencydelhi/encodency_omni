import { redirect } from "next/navigation";

/** The old static SEO pages are gone; the real SEO tools live in the Website module. Kept so bookmarks keep working. */
export default function Page() {
  redirect("/admin/website/pages");
}
