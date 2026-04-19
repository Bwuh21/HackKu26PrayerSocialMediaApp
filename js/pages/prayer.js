import { mountAppNav } from '../nav.js';
import { APP_NAME } from '../brand.js';
import { supabaseConfigured } from '../supabase.js';
import { requireSession } from '../auth.js';
import { toast, setBusy, escapeHtml, formatDate, $ } from '../ui.js';
import { isPreviewMode, PREVIEW } from '../preview.js';
import { mountPreviewPrayer } from '../preview-ui.js';
import { CATEGORIES, getPrayerRequest, getProfileById, updatePrayerRequest } from '../api.js';
import { categoryLabel, statusChip } from '../render.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: '' });

const params = new URLSearchParams(location.search);
let id = params.get('id');

if (isPreviewMode()) {
  if (!id) id = PREVIEW.reqMine1;
  mountPreviewPrayer(id);
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  const root = $('#detail');

  if (!id) {
    root.innerHTML = `<div class="empty card card__pad">Missing request id.</div>`;
  } else {
    async function load() {
      const req = await getPrayerRequest(id);
      if (!req) {
        root.innerHTML = `<div class="empty card card__pad">This request is not available (or you don’t have access yet).</div>`;
        $('#open-profile').hidden = true;
        $('#owner-tools').hidden = true;
        return;
      }

      const me = session.user.id;
      const owner = req.user_id === me;
      const ownerProfile = await getProfileById(req.user_id);

      document.title = `${req.title} — ${APP_NAME}`;

      const open = $('#open-profile');
      open.hidden = false;
      open.href = `user.html?id=${encodeURIComponent(req.user_id)}`;

      const answered = req.status === 'answered';
      root.innerHTML = `
        <article class="card ${answered ? 'card--answered' : 'card--glow'}">
          <div class="card__pad">
            <div class="row" style="align-items: flex-start">
              <div style="min-width: 0">
                <div class="h1" style="font-size: clamp(1.6rem, 2vw + 1rem, 2.35rem); margin: 0 0 10px">${escapeHtml(req.title)}</div>
                <div class="card__meta">
                  <span class="chip">${escapeHtml(categoryLabel(req.category))}</span>
                  ${statusChip(req.status)}
                  <span class="chip">${escapeHtml(req.visibility === 'public' ? 'Public' : 'Followers only')}</span>
                  <span>Updated ${escapeHtml(formatDate(req.updated_at))}</span>
                </div>
                <p style="margin-top: 14px; line-height: 1.65; white-space: pre-wrap">${escapeHtml(req.description || '')}</p>
              </div>
              <div class="stack" style="gap: 10px; align-items: flex-end; min-width: 200px">
                <div style="text-align: right">
                  <div style="font-weight: 750">${escapeHtml(ownerProfile?.display_name || ownerProfile?.username || 'Friend')}</div>
                  <div class="muted">@${escapeHtml(ownerProfile?.username || '')}</div>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;

      $('#owner-tools').hidden = !owner;

      if (owner) {
        const cat = $('#category');
        cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
        $('#title').value = req.title;
        $('#description').value = req.description || '';
        $('#category').value = req.category;
        $('#visibility').value = req.visibility;
        $('#status').value = req.status;

        $('#edit-form').onsubmit = async (e) => {
          e.preventDefault();
          const btn = $('#save-request');
          setBusy(btn, true);
          try {
            await updatePrayerRequest(id, {
              title: $('#title').value.trim(),
              description: $('#description').value.trim(),
              category: $('#category').value,
              visibility: $('#visibility').value,
              status: $('#status').value
            });
            toast('Saved');
            await load();
          } catch (err) {
            toast(err.message || 'Could not save', 'error');
          } finally {
            setBusy(btn, false);
          }
        };
      }
    }

    await load();
  }
}
