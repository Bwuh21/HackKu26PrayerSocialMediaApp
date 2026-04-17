import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, setBusy, $, escapeHtml, formatDate } from '../ui.js';
import { getMyProfile, updateMyProfile, listMyPrayerRequests, searchProfiles } from '../api.js';
import { mountAvatar, categoryLabel, statusChip } from '../render.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewProfile } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'profile.html' });
if (isPreviewMode()) {
  mountPreviewProfile();
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  const img = document.querySelector('[data-avatar]');
  const fallback = document.querySelector('[data-avatar-fallback]');

  async function refresh() {
    const p = await getMyProfile();
    if (!p) {
      toast('Profile not found—try logging out and back in.', 'error');
      return;
    }

    $('[data-display-name]').textContent = p.display_name || p.username;
    $('[data-username]').textContent = p.username;
    $('[data-bio]').textContent = p.bio || '';
    $('[data-verse]').textContent = p.favorite_verse || '—';

    $('#display_name').value = p.display_name || '';
    $('#username').value = p.username || '';
    $('#avatar_url').value = p.avatar_url || '';
    $('#bio').value = p.bio || '';
    $('#favorite_verse').value = p.favorite_verse || '';

    mountAvatar({
      imgEl: img,
      fallbackEl: fallback,
      name: p.display_name,
      username: p.username,
      avatarUrl: p.avatar_url
    });

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

  $('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#save-profile');
    setBusy(btn, true);
    try {
      await updateMyProfile({
        display_name: $('#display_name').value.trim(),
        username: $('#username').value.trim().toLowerCase(),
        avatar_url: $('#avatar_url').value.trim() || null,
        bio: $('#bio').value.trim() || null,
        favorite_verse: $('#favorite_verse').value.trim() || null
      });
      toast('Profile saved');
      await refresh();
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  $('#search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#q').value.trim();
    const box = $('#search-results');
    if (q.length < 2) {
      box.innerHTML = `<div class="muted">Type at least 2 characters.</div>`;
      return;
    }
    try {
      const results = await searchProfiles(q);
      if (!results.length) {
        box.innerHTML = `<div class="muted">No matches.</div>`;
        return;
      }
      box.innerHTML = results
        .map(
          (u) => `
          <div class="card">
            <div class="card__pad">
              <div class="row">
                <div>
                  <div class="h3" style="margin: 0">${escapeHtml(u.display_name || u.username)}</div>
                  <div class="muted">@${escapeHtml(u.username)}</div>
                  <div class="muted" style="margin-top: 8px">${escapeHtml(u.bio || '')}</div>
                </div>
                <a class="button button--small" href="user.html?id=${encodeURIComponent(u.id)}">View</a>
              </div>
            </div>
          </div>
        `
        )
        .join('');
    } catch (err) {
      toast(err.message || 'Search failed', 'error');
    }
  });

  await refresh();
}
