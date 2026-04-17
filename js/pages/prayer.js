import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, setBusy, escapeHtml, formatDate, $ } from '../ui.js';
import { isPreviewMode, PREVIEW } from '../preview.js';
import { mountPreviewPrayer } from '../preview-ui.js';
import {
  CATEGORIES,
  ENCOURAGEMENT_PRESETS,
  getPrayerRequest,
  getProfileById,
  listPrayerUpdates,
  addPrayerUpdate,
  updatePrayerRequest,
  countPrayersForRequests,
  getMyInteraction,
  upsertPrayed,
  getProfilesByIds
} from '../api.js';
import { categoryLabel, statusChip, mountAvatar } from '../render.js';

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
    let selectedMessageKey = null;

    async function loadUpdates() {
      const updates = await listPrayerUpdates(id);
      const authors = await getProfilesByIds(updates.map((u) => u.user_id));
      if (!updates.length) {
        $('#updates').innerHTML = `<div class="empty card card__pad">No updates yet.</div>`;
        return;
      }
      $('#updates').innerHTML = updates
        .map((u) => {
          const a = authors.get(u.user_id);
          const who = a?.display_name || a?.username || 'Friend';
          return `
            <div class="card">
              <div class="card__pad">
                <div class="row" style="align-items: flex-start">
                  <div style="min-width: 0">
                    <div class="h3" style="margin: 0">${escapeHtml(who)}</div>
                    <div class="muted" style="margin-top: 6px">${escapeHtml(formatDate(u.created_at))}</div>
                    <p style="margin-top: 10px; line-height: 1.65; white-space: pre-wrap">${escapeHtml(u.body)}</p>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }

    async function load() {
      const req = await getPrayerRequest(id);
      if (!req) {
        root.innerHTML = `<div class="empty card card__pad">This request is not available (or you don’t have access yet).</div>`;
        $('#open-profile').hidden = true;
        $('#pray-section').hidden = true;
        $('#owner-tools').hidden = true;
        $('#updates').innerHTML = '';
        return;
      }

      const me = session.user.id;
      const owner = req.user_id === me;
      const ownerProfile = await getProfileById(req.user_id);

      document.title = `${req.title} — Gathered`;

      const open = $('#open-profile');
      open.hidden = false;
      open.href = `user.html?id=${encodeURIComponent(req.user_id)}`;

      const counts = await countPrayersForRequests([req.id]);
      const prayedCount = counts.get(req.id) || 0;
      const interaction = owner ? null : await getMyInteraction(req.id).catch(() => null);

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
              <div class="stack" style="gap: 10px; align-items: flex-end; min-width: 220px">
                <div class="row" style="justify-content: flex-end; gap: 10px">
                  <img class="avatar avatar--sm" alt="" data-owner-avatar hidden />
                  <div data-owner-avatar-fallback class="avatar avatar--sm" aria-hidden="true"></div>
                  <div style="text-align: right">
                    <div style="font-weight: 750">${escapeHtml(ownerProfile?.display_name || ownerProfile?.username || 'Friend')}</div>
                    <div class="muted">@${escapeHtml(ownerProfile?.username || '')}</div>
                  </div>
                </div>
                <span class="chip chip--gold">${prayedCount} prayed</span>
              </div>
            </div>
          </div>
        </article>
      `;

      mountAvatar({
        imgEl: document.querySelector('[data-owner-avatar]'),
        fallbackEl: document.querySelector('[data-owner-avatar-fallback]'),
        name: ownerProfile?.display_name,
        username: ownerProfile?.username,
        avatarUrl: ownerProfile?.avatar_url
      });

      $('#owner-tools').hidden = !owner;
      $('#pray-section').hidden = owner || req.status !== 'active';

      const prayState = $('#pray-state');
      if (!owner) {
        prayState.textContent = interaction ? 'You’ve already marked this one—tap again to refresh your encouragement.' : '';
      }

      // Encouragement choices
      const choices = $('#encouragement-choices');
      choices.innerHTML = ENCOURAGEMENT_PRESETS.map(
        (p) => `
          <button class="button button--small button--ghost" type="button" data-msg="${p.id}">${escapeHtml(p.label)}</button>
        `
      ).join('');
      choices.querySelectorAll('button[data-msg]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-msg');
          selectedMessageKey = selectedMessageKey === key ? null : key;
          choices.querySelectorAll('button[data-msg]').forEach((b) => b.classList.toggle('button--dark', b.getAttribute('data-msg') === selectedMessageKey));
        });
      });

      $('#pray-btn').onclick = async () => {
        const b = $('#pray-btn');
        setBusy(b, true);
        try {
          await upsertPrayed(req.id, selectedMessageKey);
          toast('Thank you for praying.');
          await load();
        } catch (err) {
          toast(err.message || 'Could not save', 'error');
        } finally {
          setBusy(b, false);
        }
      };

      // Owner forms
      if (owner) {
        const cat = $('#category');
        cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
        $('#title').value = req.title;
        $('#description').value = req.description || '';
        $('#category').value = req.category;
        $('#visibility').value = req.visibility;
        $('#status').value = req.status;

        $('#update-form').onsubmit = async (e) => {
          e.preventDefault();
          const btn = $('#post-update');
          setBusy(btn, true);
          try {
            await addPrayerUpdate(req.id, $('#update_body').value.trim());
            $('#update_body').value = '';
            toast('Update posted');
            await loadUpdates();
          } catch (err) {
            toast(err.message || 'Could not post update', 'error');
          } finally {
            setBusy(btn, false);
          }
        };

        $('#edit-form').onsubmit = async (e) => {
          e.preventDefault();
          const btn = $('#save-request');
          setBusy(btn, true);
          try {
            await updatePrayerRequest(req.id, {
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

      await loadUpdates();
    }

    await load();
  }
}
