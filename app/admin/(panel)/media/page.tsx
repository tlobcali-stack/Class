import MediaManager from "@/components/admin/MediaManager";
import { requireAdminPage } from "@/lib/admin-auth";
import { listAllMedia } from "@/lib/admin-data";
import { SECTION_LABELS, SECTIONS } from "@/lib/media-validate";

export default async function MediaPage() {
  const { db, user } = await requireAdminPage();
  const media = await listAllMedia(db);
  return (
    <div>
      <h1 className="display text-3xl sm:text-4xl">Photos &amp; videos</h1>
      <p className="mt-2 max-w-2xl text-ink/80">
        Upload photos (up to 15 MB) and short videos (up to 50 MB), or add a YouTube, Vimeo or Instagram link.
        Photos are resized automatically and their hidden location data is removed.
      </p>
      <MediaManager userId={user.id} media={media} sections={SECTIONS.map((s) => ({ id: s, label: SECTION_LABELS[s] }))} />
    </div>
  );
}
