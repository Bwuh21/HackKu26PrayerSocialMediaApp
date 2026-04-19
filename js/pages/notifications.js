import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, escapeHtml, formatDate, $, $all } from '../ui.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead, getProfilesByIds } from '../api.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewNotifications } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'notifications.html' });

if (isPreviewMode()) {
  mountPreviewNotifications();
  $('#mark-all').addEventListener('click', () => toast('Preview mode: sign up to use notifications.'));
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  await requireSession();

  async function refresh() {
    const items = await listNotifications({ limit: 80 });
    const actorIds = Array.from(new Set(items.map((n) => n.payload?.actor_id).filter(Boolean)));
    const profiles = await getProfilesByIds(actorIds);

    const describe = (n) => {
      const actor = n.payload?.actor_id ? profiles.get(n.payload.actor_id) : null;
      const who = actor?.display_name || actor?.username || 'Someone';
      const rid = n.payload?.request_id;

      if (n.type === 'prayer_update') {
        const isNew = Boolean(n.payload?.is_new_request);
        return {
          title: isNew ? `${who} posted a new prayer request` : `${who} posted an update`,
          href: rid ? `prayer.html?id=${encodeURIComponent(rid)}` : 'dashboard.html'
        };
      }
      if (n.type === 'prayer_received') {
        return { title: `${who} responded to your request`, href: rid ? `prayer.html?id=${encodeURIComponent(rid)}` : 'dashboard.html' };
      }
      if (n.type === 'encouragement') {
        return { title: `Update from ${who}`, href: rid ? `prayer.html?id=${encodeURIComponent(rid)}` : 'dashboard.html' };
      }
      return { title: 'Notification', href: 'dashboard.html' };
    };

    if (!items.length) {
      $('#list').innerHTML = `<div class="empty card card__pad">You’re all caught up.</div>`;
      return;
    }

    $('#list').innerHTML = items
      .map((n) => {
        const { title, href } = describe(n);
        const unread = !n.read_at;
        return `
          <a class="card ${unread ? 'card--glow' : ''}" href="${href}" data-notification="${n.id}" style="text-decoration: none; color: inherit">
            <div class="card__pad">
              <div class="row" style="align-items: flex-start">
                <div style="min-width: 0">
                  <div class="h3" style="margin: 0">${escapeHtml(title)}</div>
                  <div class="muted" style="margin-top: 8px">${escapeHtml(formatDate(n.created_at))}</div>
                </div>
                ${unread ? `<span class="chip chip--gold">New</span>` : `<span class="chip">Read</span>`}
              </div>
            </div>
          </a>
        `;
      })
      .join('');

    $all('[data-notification]').forEach((el) => {
      const id = el.getAttribute('data-notification');
      el.addEventListener('mousedown', () => {
        markNotificationRead(id).catch(() => {});
      });
    });
  }

  $('#mark-all').addEventListener('click', async () => {
    try {
      await markAllNotificationsRead();
      toast('Marked read');
      await refresh();
      await mountAppNav({ active: 'notifications.html' });
    } catch (err) {
      toast(err.message || 'Could not mark read', 'error');
    }
  });

  await refresh();
}
