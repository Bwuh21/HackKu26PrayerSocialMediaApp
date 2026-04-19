import { mountAppNav } from '../nav.js';
import { supabaseConfigured } from '../supabase.js';
import { requireSession } from '../auth.js';
import { toast, $, escapeHtml, formatDate } from '../ui.js';
import { getMyProfile, listMyPrayerRequests } from '../api.js';
import { categoryLabel, statusChip } from '../render.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewProfile } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'profile.html', tab: 'profile' });
if (isPreviewMode()) {
  mountPreviewProfile();
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  async function refresh() {
    const p = await getMyProfile();
    if (!p) {
      toast('Profile not found—try logging out and back in.', 'error');
      return;
    }

    $('[data-display-name]').textContent = p.display_name || p.username;
    $('[data-username]').textContent = p.username;
    $('[data-bio]').textContent = p.bio || '';

    const rows = await listMyPrayerRequests();
    const active = rows.filter((r) => r.status === 'active');
    const rest = rows.filter((r) => r.status !== 'active');

    const renderRow = (r) => `
      <div class="card">
        <div class="card__pad">
          <div class="row" style="align-items: flex-start">
            <div style="min-width: 0">
              <div class="card__title" style="margin: 0">${escapeHtml(r.title)}</div>
              <div class="card__meta" style="margin-top: 8px">
                <span class="chip">${escapeHtml(categoryLabel(r.category))}</span>
                ${statusChip(r.status)}
                <span>Updated ${escapeHtml(formatDate(r.updated_at))}</span>
              </div>
            </div>
            <a class="button button--small button--ghost" href="prayer.html?id=${encodeURIComponent(r.id)}">Open</a>
          </div>
        </div>
      </div>
    `;

    const parts = [];
    if (active.length) {
      parts.push(`<div class="h3">Active</div>`, ...active.map(renderRow));
    }
    if (rest.length) {
      parts.push(`<div class="h3" style="margin-top: 10px">Past</div>`, ...rest.map(renderRow));
    }
    $('#requests').innerHTML = parts.length ? parts.join('') : `<div class="empty card card__pad">No requests yet.</div>`;
  }

  document.addEventListener('app:profile-saved', () => {
    refresh();
  });

  await refresh();
}
