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
import { prayerRequestCard, categoryLabel, statusChip } from './render.js';
import { $, escapeHtml, formatDate, toast } from './ui.js';
import { CATEGORIES } from './api.js';
import { APP_NAME } from './brand.js';

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
              `You’re browsing sample content. Nothing is saved. Create an account to use ${APP_NAME} for real.`
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
  const feed = previewRequestsFriend();
  const profiles = new Map([
    [PREVIEW_USER_ID, previewProfileMe()],
    [previewProfileFriend().id, previewProfileFriend()]
  ]);

  const el = $('#feed');
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

export function mountPreviewProfile() {
  injectPreviewBanner();
  document.title = `Profile — ${APP_NAME}`;
  const p = previewProfileMe();
  $('[data-display-name]').textContent = p.display_name;
  $('[data-username]').textContent = p.username;
  $('[data-bio]').textContent = p.bio;

  const form = $('#profile-form');
  if (form) {
    form.innerHTML = `<p class="muted" style="margin:0">Create an account to edit your profile.</p>`;
  }

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
  document.title = `${p.display_name || p.username} — ${APP_NAME}`;
  $('[data-display-name]').textContent = p.display_name;
  $('[data-username]').textContent = p.username;
  $('[data-bio]').textContent = p.bio;

  const btn = $('#follow-toggle');
  btn.hidden = false;
  btn.textContent = 'Following';
  btn.classList.add('button--ghost');
  btn.disabled = true;

  const rows = previewRequestsFriend();
  const profiles = new Map([[p.id, p]]);
  $('#requests').innerHTML = rows
    .map((r) =>
      prayerRequestCard({
        request: r,
        profile: profiles.get(r.user_id),
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
    document.title = `Prayer request — ${APP_NAME}`;
    root.innerHTML = `<div class="empty card card__pad">No preview for this link. Try a card from the dashboard.</div>`;
    $('#owner-tools').hidden = true;
    return;
  }

  const me = PREVIEW_USER_ID;
  const owner = req.user_id === me;
  const ownerProfile = owner ? previewProfileMe() : previewProfileFriend();

  document.title = `${req.title} — ${APP_NAME}`;

  $('#open-profile').hidden = false;
  $('#open-profile').href = `user.html?id=${encodeURIComponent(req.user_id)}`;

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
              <div style="font-weight: 750">${escapeHtml(ownerProfile.display_name)}</div>
              <div class="muted">@${escapeHtml(ownerProfile.username)}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;

  $('#owner-tools').hidden = !owner;

  if (owner) {
    const cat = $('#category');
    if (cat) cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
    $('#title').value = req.title;
    $('#description').value = req.description || '';
    $('#category').value = req.category;
    $('#visibility').value = req.visibility;
    $('#status').value = req.status;
    $('#edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      toast('Preview mode: sign up to edit requests.');
    });
  }
}

export function mountPreviewArchive() {
  injectPreviewBanner();
  const profile = previewProfileMe();
  const rows = previewRequestsArchive();
  const answered = rows.filter((r) => r.status === 'answered');
  const archived = rows.filter((r) => r.status === 'archived');

  const render = (list, el) => {
    el.innerHTML = list
      .map((r) =>
        prayerRequestCard({
          request: r,
          profile,
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
            ? `${friend.display_name} responded`
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

export function mountPreviewFriends() {
  injectPreviewBanner({ message: 'Sample friends below. Sign up to follow people for real.' });
  document.title = `Friends — ${APP_NAME}`;
  const friend = previewProfileFriend();
  $('#search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Preview mode: create an account to search the directory.');
  });
  $('#q').value = friend.username;

  const searchResults = $('#search-results');
  searchResults.innerHTML = `
    <div class="card" style="margin: 0">
      <div class="card__pad">
        <div class="row" style="align-items: flex-start">
          <div style="min-width: 0">
            <div style="font-weight: 700">${escapeHtml(friend.display_name || friend.username)}</div>
            <div class="muted" style="font-size: 0.92rem">@${escapeHtml(friend.username)}</div>
            <div class="muted" style="margin-top: 8px; font-size: 0.92rem">${escapeHtml(friend.bio || '')}</div>
          </div>
          <a class="button button--small" href="user.html?id=${encodeURIComponent(friend.id)}">View</a>
        </div>
      </div>
    </div>
    <p class="muted" style="margin: 0; font-size: 0.9rem">With a real account, search finds everyone who matches.</p>
  `;
  searchResults.hidden = false;

  $('#friends-list').innerHTML = `
    <a class="card friend-tile" href="user.html?id=${encodeURIComponent(friend.id)}" style="text-decoration: none; color: inherit">
      <div class="card__pad">
        <div class="row" style="align-items: center; justify-content: flex-start; gap: 12px">
          <div style="min-width: 0">
            <div style="font-weight: 700; letter-spacing: -0.02em">${escapeHtml(friend.display_name || friend.username)}</div>
            <div class="muted" style="font-size: 0.92rem">@${escapeHtml(friend.username)}</div>
          </div>
        </div>
      </div>
    </a>
  `;
  $('#friends-empty').hidden = true;
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
