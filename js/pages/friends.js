import { mountAppNav } from '../nav.js';
import { supabaseConfigured } from '../supabase.js';
import { requireSession } from '../auth.js';
import { toast, $, escapeHtml } from '../ui.js';
import { searchProfiles, listFollowingProfiles } from '../api.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewFriends } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'friends.html', tab: 'friends' });
if (isPreviewMode()) {
  mountPreviewFriends();
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  const friendsListEl = $('#friends-list');
  const friendsEmptyEl = $('#friends-empty');
  const searchResultsEl = $('#search-results');

  function friendTile(p) {
    const who = p.display_name || p.username;
    return `
      <a class="card friend-tile" href="user.html?id=${encodeURIComponent(p.id)}" style="text-decoration: none; color: inherit">
        <div class="card__pad">
          <div class="row" style="align-items: center; justify-content: flex-start; gap: 12px">
            <div style="min-width: 0">
              <div style="font-weight: 700; letter-spacing: -0.02em">${escapeHtml(who)}</div>
              <div class="muted" style="font-size: 0.92rem">@${escapeHtml(p.username)}</div>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  async function refreshFollowing() {
    try {
      const profiles = await listFollowingProfiles();
      if (!profiles.length) {
        friendsListEl.innerHTML = '';
        friendsEmptyEl.hidden = false;
        return;
      }
      friendsEmptyEl.hidden = true;
      friendsListEl.innerHTML = profiles.map(friendTile).join('');
    } catch (err) {
      toast(err.message || 'Could not load friends', 'error');
      friendsListEl.innerHTML = '';
      friendsEmptyEl.hidden = false;
    }
  }

  let searchTimer;
  async function runSearch(q) {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      searchResultsEl.innerHTML = '';
      searchResultsEl.hidden = true;
      return;
    }
    try {
      const results = await searchProfiles(trimmed);
      if (!results.length) {
        searchResultsEl.innerHTML = `<p class="muted" style="margin: 0">No one matches that search.</p>`;
        searchResultsEl.hidden = false;
        return;
      }
      searchResultsEl.innerHTML = results
        .map(
          (u) => `
        <div class="card" style="margin: 0">
          <div class="card__pad">
            <div class="row" style="align-items: flex-start">
              <div style="min-width: 0">
                <div style="font-weight: 700">${escapeHtml(u.display_name || u.username)}</div>
                <div class="muted" style="font-size: 0.92rem">@${escapeHtml(u.username)}</div>
                ${u.bio ? `<div class="muted" style="margin-top: 8px; font-size: 0.92rem">${escapeHtml(u.bio)}</div>` : ''}
              </div>
              <a class="button button--small" href="user.html?id=${encodeURIComponent(u.id)}">View</a>
            </div>
          </div>
        </div>
      `
        )
        .join('');
      searchResultsEl.hidden = false;
    } catch (err) {
      toast(err.message || 'Search failed', 'error');
    }
  }

  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(searchTimer);
    runSearch($('#q').value);
  });

  $('#q').addEventListener(
    'input',
    () => {
      clearTimeout(searchTimer);
      const v = $('#q').value;
      if (v.trim().length < 2) {
        searchResultsEl.innerHTML = '';
        searchResultsEl.hidden = true;
        return;
      }
      searchTimer = setTimeout(() => runSearch(v), 400);
    },
    { passive: true }
  );

  document.getElementById('add-friend-fab')?.addEventListener('click', () => {
    requestAnimationFrame(() => $('#q')?.focus());
  });

  if (location.hash === '#find') {
    requestAnimationFrame(() => $('#q')?.focus());
  }

  await refreshFollowing();
}
