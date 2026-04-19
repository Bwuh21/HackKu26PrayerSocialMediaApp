import { mountAppNav } from '../nav.js';
import { supabaseConfigured } from '../supabase.js';
import { requireSession } from '../auth.js';
import { toast, $ } from '../ui.js';
import { listFollowingFeedPrayerRequests, getProfilesByIds } from '../api.js';
import { prayerRequestCard } from '../render.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewDashboard } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'dashboard.html', tab: 'feed' });

if (isPreviewMode()) {
  mountPreviewDashboard();
} else if (!supabaseConfigured) {
  $('#feed').innerHTML = `<div class="empty card card__pad">Configure Supabase in <code>js/config.js</code> to load your feed.</div>`;
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  try {
    const feed = await listFollowingFeedPrayerRequests({ limit: 60 });
    const userIds = Array.from(new Set(feed.map((r) => r.user_id)));
    const profiles = await getProfilesByIds(userIds);

    const el = $('#feed');
    if (!feed.length) {
      el.innerHTML = `<div class="empty card card__pad">
        <p style="margin:0">Nothing here yet—follow friends to see their prayer requests.</p>
        <p class="muted" style="margin: 12px 0 0"><a class="link" href="friends.html">Find friends</a></p>
      </div>`;
    } else {
      el.innerHTML = feed
        .map((r) =>
          prayerRequestCard({
            request: r,
            profile: profiles.get(r.user_id),
            href: `prayer.html?id=${encodeURIComponent(r.id)}`
          })
        )
        .join('');
    }
  } catch (err) {
    console.error(err);
    toast(err.message || 'Failed to load feed', 'error');
  }
}
