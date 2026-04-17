import { escapeHtml, formatDate } from './ui.js';
import { CATEGORIES } from './api.js';

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || 'Other';
}

export function statusChip(status) {
  if (status === 'answered') return `<span class="chip chip--gold">Answered</span>`;
  if (status === 'archived') return `<span class="chip">Archived</span>`;
  return `<span class="chip chip--gold">Active</span>`;
}

export function mountAvatar({ imgEl, fallbackEl, name, username, avatarUrl }) {
  const initial = String(name || username || 'G')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  if (!imgEl || !fallbackEl) return;

  fallbackEl.textContent = initial;
  fallbackEl.style.display = 'grid';
  fallbackEl.style.placeItems = 'center';
  fallbackEl.style.fontWeight = '800';
  fallbackEl.style.color = 'var(--ink)';
  fallbackEl.style.background = 'linear-gradient(180deg, #fff6da, #f1d89a)';

  if (avatarUrl) {
    imgEl.hidden = false;
    fallbackEl.hidden = true;
    imgEl.alt = `${name || username || 'User'} avatar`;
    imgEl.src = avatarUrl;
    imgEl.referrerPolicy = 'no-referrer';
    imgEl.onload = () => {
      imgEl.hidden = false;
      fallbackEl.hidden = true;
    };
    imgEl.onerror = () => {
      imgEl.hidden = true;
      fallbackEl.hidden = false;
    };
  } else {
    imgEl.hidden = true;
    fallbackEl.hidden = false;
    imgEl.removeAttribute('src');
  }
}

export function prayerRequestCard({ request, profile, prayedCount, href }) {
  const who = profile?.display_name || profile?.username || 'Friend';
  const handle = profile?.username ? `@${profile.username}` : '';
  const cat = categoryLabel(request.category);
  const answered = request.status === 'answered';
  const initial = String(who).trim().slice(0, 1).toUpperCase();

  return `
    <article class="card feed-card ${answered ? 'card--answered' : ''}" style="grid-column: span 12">
      <a class="card__pad feed-card__link" href="${href}">
        <div class="feed-card__head">
          <div class="feed-card__author">
            <span class="feed-card__avatar" aria-hidden="true">${escapeHtml(initial)}</span>
            <div>
              <div class="feed-card__name">${escapeHtml(who)}</div>
              <div class="feed-card__handle">${escapeHtml(handle)}</div>
            </div>
          </div>
          <span class="feed-card__time">Updated ${escapeHtml(formatDate(request.updated_at))}</span>
        </div>
        <div class="card__title">${escapeHtml(request.title)}</div>
        <p class="feed-card__desc">
          ${escapeHtml((request.description || '').slice(0, 190))}${(request.description || '').length > 190 ? '…' : ''}
        </p>
        <div class="card__meta">
          <span class="chip">${escapeHtml(cat)}</span>
          ${statusChip(request.status)}
          <span class="chip">${Number(prayedCount || 0)} prayed</span>
        </div>
      </a>
    </article>
  `;
}
