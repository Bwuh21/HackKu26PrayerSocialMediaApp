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

export function prayerRequestCard({ request, profile, href }) {
  const who = profile?.display_name || profile?.username || 'Friend';
  const handle = profile?.username ? `@${profile.username}` : '';
  const cat = categoryLabel(request.category);
  const answered = request.status === 'answered';

  return `
    <article class="card feed-card ${answered ? 'card--answered' : ''}" style="grid-column: span 12">
      <a class="card__pad feed-card__link" href="${href}">
        <div class="feed-card__head">
          <div class="feed-card__author">
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
        </div>
      </a>
    </article>
  `;
}
