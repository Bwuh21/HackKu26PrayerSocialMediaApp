/**
 * Preview-mode UI (static data). Used when localStorage preview flag is set.
 */
import {
  isPreviewMode,
  PREVIEW,
  PREVIEW_USER_ID,
  previewProfileMe,
  previewProfileFriend,
  previewRequestsMine,
  previewRequestsFriend,
  previewRequestsArchive,
  previewPrayerById,
  previewNotifications
} from './preview.js';
import { prayerRequestCard, categoryLabel, statusChip, mountAvatar } from './render.js';
import { $, escapeHtml, formatDate, toast } from './ui.js';
import { CATEGORIES } from './api.js';

export function injectPreviewBanner({ message } = {}) {
  if (!isPreviewMode()) return;
  const main = document.querySelector('main');
  if (!main) return;
  if (main.querySelector('[data-preview-banner]')) return;

  const el = document.createElement('div');
  el.className = 'preview-banner card';
  el.setAttribute('data-preview-banner', '');
  el.innerHTML = `
    <div class="card__pad">
      <div class="row" style="align-items: flex-start">
        <div style="min-width: 0">
          <div class="h3" style="margin: 0">Preview mode</div>
          <div class="muted" style="margin-top: 8px">
            ${
              message ||
              'You’re browsing sample content. Nothing is saved. Create an account to use Gathered for real.'
            }
          </div>
        </div>
        <span class="chip chip--gold">Demo</span>
      </div>
    </div>
  `;
  main.insertBefore(el, main.firstChild);
}

export function mountPreviewDashboard() {
  injectPreviewBanner();
  const mine = previewRequestsMine();
  const feed = previewRequestsFriend();
  const profiles = new Map([
    [PREVIEW_USER_ID, previewProfileMe()],
    [previewProfileFriend().id, previewProfileFriend()]
  ]);
  const counts = new Map([
    [mine[0]?.id, 9],
    [mine[1]?.id, 14],
    [feed[0]?.id, 21]
  ]);

  const renderList = (rows, el) => {
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
  renderList(feed, $('#feed'));
}

export function mountPreviewProfile() {
  injectPreviewBanner();
  document.title = 'Profile — Gathered';
  const p = previewProfileMe();
  $('[data-display-name]').textContent = p.display_name;
  $('[data-username]').textContent = p.username;
  $('[data-bio]').textContent = p.bio;
  $('[data-verse]').textContent = p.favorite_verse;

  const img = document.querySelector('[data-avatar]');
  const fallback = document.querySelector('[data-avatar-fallback]');
  mountAvatar({ imgEl: img, fallbackEl: fallback, name: p.display_name, username: p.username, avatarUrl: p.avatar_url });

  $('#profile-form')?.closest('.card')?.setAttribute('hidden', 'true');
  $('#search-form')?.closest('.card')?.setAttribute('hidden', 'true');

  const rows = [...previewRequestsMine(), ...previewRequestsArchive()];
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
  $('#requests').innerHTML = rows.map(renderRow).join('');
}

export function mountPreviewUser() {
  injectPreviewBanner();
  const p = previewProfileFriend();
  document.title = `${p.display_name || p.username} — Gathered`;
  $('[data-display-name]').textContent = p.display_name;
  $('[data-username]').textContent = p.username;
  $('[data-bio]').textContent = p.bio;
  $('[data-verse]').textContent = p.favorite_verse;

  const img = document.querySelector('[data-avatar]');
  const fallback = document.querySelector('[data-avatar-fallback]');
  mountAvatar({ imgEl: img, fallbackEl: fallback, name: p.display_name, username: p.username, avatarUrl: p.avatar_url });

  const btn = $('#follow-toggle');
  btn.hidden = false;
  btn.textContent = 'Following';
  btn.classList.add('button--ghost');
  btn.disabled = true;

  const rows = previewRequestsFriend();
  const profiles = new Map([[p.id, p]]);
  const counts = new Map([[rows[0]?.id, 21]]);
  $('#requests').innerHTML = rows
    .map((r) =>
      prayerRequestCard({
        request: r,
        profile: profiles.get(r.user_id),
        prayedCount: counts.get(r.id) || 0,
        href: `prayer.html?id=${encodeURIComponent(r.id)}`
      })
    )
    .join('');
}

export function mountPreviewPrayer(id) {
  injectPreviewBanner();
  const req = previewPrayerById(id);
  const root = $('#detail');
  if (!req) {
    document.title = 'Prayer request — Gathered';
    root.innerHTML = `<div class="empty card card__pad">No preview for this link. Try a card from the dashboard.</div>`;
    $('#pray-section').hidden = true;
    $('#owner-tools').hidden = true;
    $('#updates').innerHTML = '';
    return;
  }

  const me = PREVIEW_USER_ID;
  const owner = req.user_id === me;
  const ownerProfile = owner ? previewProfileMe() : previewProfileFriend();

  document.title = `${req.title} — Gathered`;

  $('#open-profile').hidden = false;
  $('#open-profile').href = `user.html?id=${encodeURIComponent(req.user_id)}`;

  const prayedCount =
    req.id === PREVIEW.reqMine1 ? 9 : req.id === PREVIEW.reqMine2 ? 14 : req.id === PREVIEW.reqFriend1 ? 21 : req.id === PREVIEW.reqAnswered ? 31 : 12;

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
                <div style="font-weight: 750">${escapeHtml(ownerProfile.display_name)}</div>
                <div class="muted">@${escapeHtml(ownerProfile.username)}</div>
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
    name: ownerProfile.display_name,
    username: ownerProfile.username,
    avatarUrl: ownerProfile.avatar_url
  });

  $('#owner-tools').hidden = !owner;
  $('#pray-section').hidden = owner || req.status !== 'active';

  if (!owner && req.status === 'active') {
    $('#encouragement-choices').innerHTML = `
      <button class="button button--small button--ghost" type="button" disabled>Praying for you</button>
      <button class="button button--small button--ghost" type="button" disabled>Lifted this up</button>
    `;
    $('#pray-btn').onclick = () => toast('Create an account to log prayers for friends.');
  }

  if (owner) {
    $('#owner-tools').hidden = false;
    $('#update-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      toast('Preview mode: sign up to post real updates.');
    });
    $('#edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      toast('Preview mode: sign up to edit requests.');
    });
  }

  const updates = previewUpdatesFor(req.id);
  if (!updates.length) {
    $('#updates').innerHTML = `<div class="empty card card__pad">No updates yet.</div>`;
  } else {
    $('#updates').innerHTML = updates
      .map((u) => {
        const author = u.user_id === PREVIEW_USER_ID ? previewProfileMe() : previewProfileFriend();
        const who = author.display_name || author.username;
        return `
            <div class="card">
              <div class="card__pad">
                <div class="h3" style="margin: 0">${escapeHtml(who)}</div>
                <div class="muted" style="margin-top: 6px">${escapeHtml(formatDate(u.created_at))}</div>
                <p style="margin-top: 10px; line-height: 1.65; white-space: pre-wrap">${escapeHtml(u.body)}</p>
              </div>
            </div>
          `;
      })
      .join('');
  }
}

export function mountPreviewArchive() {
  injectPreviewBanner();
  const profile = previewProfileMe();
  const rows = previewRequestsArchive();
  const answered = rows.filter((r) => r.status === 'answered');
  const archived = rows.filter((r) => r.status === 'archived');
  const counts = new Map([
    [answered[0]?.id, 31],
    [archived[0]?.id, 12]
  ]);

  const render = (list, el) => {
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
}

export function mountPreviewNotifications() {
  injectPreviewBanner();
  const items = previewNotifications();
  const friend = previewProfileFriend();
  $('#list').innerHTML = items
    .map((n) => {
      const unread = !n.read_at;
      const title =
        n.type === 'prayer_update'
          ? `${friend.display_name} posted an update`
          : n.type === 'prayer_received'
            ? `${friend.display_name} prayed for you`
            : 'Notification';
      return `
        <div class="card ${unread ? 'card--glow' : ''}">
          <div class="card__pad">
            <div class="row" style="align-items: flex-start">
              <div style="min-width: 0">
                <div class="h3" style="margin: 0">${escapeHtml(title)}</div>
                <div class="muted" style="margin-top: 8px">${escapeHtml(formatDate(n.created_at))}</div>
              </div>
              ${unread ? `<span class="chip chip--gold">New</span>` : `<span class="chip">Sample</span>`}
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function mountPreviewCreatePrayer() {
  injectPreviewBanner({ message: 'This form is disabled in preview. Sign up to publish a real request.' });
  const cat = $('#category');
  cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
  $('#title').disabled = true;
  $('#description').disabled = true;
  $('#category').disabled = true;
  $('#visibility').disabled = true;
  $('#submit').disabled = true;
  $('#create-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Preview mode: sign up to publish.');
  });
}
