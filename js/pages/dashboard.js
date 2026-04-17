import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, $ } from '../ui.js';
import { listMyPrayerRequests, listFeedPrayerRequests, countPrayersForRequests, getProfilesByIds } from '../api.js';
import { prayerRequestCard } from '../render.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewDashboard } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'dashboard.html' });

if (isPreviewMode()) {
  mountPreviewDashboard();
} else if (!supabaseConfigured) {
  $('#mine').innerHTML = `<div class="empty card">Configure Supabase in <code>js/config.js</code> to load your feed.</div>`;
  $('#feed').innerHTML = '';
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  const me = session.user.id;

  try {
    const mine = (await listMyPrayerRequests()).filter((r) => r.status === 'active');
    const allFeed = await listFeedPrayerRequests({ limit: 60 });
    const friendsFeed = allFeed.filter((r) => r.user_id !== me);

    const ids = Array.from(new Set([...mine, ...friendsFeed].map((r) => r.id)));
    const userIds = Array.from(new Set([...mine, ...friendsFeed].map((r) => r.user_id)));
    const [counts, profiles] = await Promise.all([countPrayersForRequests(ids), getProfilesByIds(userIds)]);

    const renderList = (rows, el) => {
      if (!rows.length) {
        el.innerHTML = `<div class="empty card card__pad">Nothing here yet—when you follow friends, their requests will appear.</div>`;
        return;
      }
      el.innerHTML = rows
        .map((r) =>
          prayerRequestCard({
            request: r,
            profile: profiles.get(r.user_id),
            prayedCount: counts.get(r.id) || 0,
            href: `prayer.html?id=${encodeURIComponent(r.id)}`
          })
        )
        .join('');
    };

    renderList(mine, $('#mine'));
    renderList(friendsFeed, $('#feed'));
  } catch (err) {
    console.error(err);
    toast(err.message || 'Failed to load feed', 'error');
  }
}
