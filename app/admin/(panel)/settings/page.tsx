import SettingsForm from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/admin-auth";
import { settingsFromRows } from "@/lib/settings-source";

export default async function SettingsPage() {
  const { db } = await requireAdminPage();
  const { data } = await db.from("site_settings").select("key, value");
  const s = settingsFromRows(data ?? []);
  return (
    <div className="max-w-2xl">
      <h1 className="display text-3xl sm:text-4xl">Site details</h1>
      <p className="mt-2 text-plum/80">These show across the whole website. Changes go live as soon as you save.</p>
      <SettingsForm initial={s} />
    </div>
  );
}
