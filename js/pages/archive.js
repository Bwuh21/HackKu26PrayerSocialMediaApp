import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, $ } from '../ui.js';
import { listMyPrayerRequests, countPrayersForRequests, getMyProfile } from '../api.js';
import { prayerRequestCard } from '../render.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewArchive } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'archive.html' });

if (isPreviewMode()) {
  mountPreviewArchive();
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  await requireSession();

  try {
    const rows = await listMyPrayerRequests();
    const answered = rows.filter((r) => r.status === 'answered');
    const archived = rows.filter((r) => r.status === 'archived');
    const profile = await getMyProfile();
    const ids = [...answered, ...archived].map((r) => r.id);
    const counts = await countPrayersForRequests(ids);

    const render = (list, el) => {
      if (!list.length) {
        el.innerHTML = `<div class="empty card card__pad">Nothing here yet.</div>`;
        return;
      }
      el.innerHTML = list
        .map((r) =>
          prayerRequestCard({
            request: r,
            profile,
            prayedCount: counts.get(r.id) || 0,
            href: `prayer.html?id=${encodeURIComponent(r.id)}`
          })
        )
        .join('');
    };

    render(answered, $('#answered'));
    render(archived, $('#archived'));
  } catch (err) {
    toast(err.message || 'Failed to load archive', 'error');
  }
}
