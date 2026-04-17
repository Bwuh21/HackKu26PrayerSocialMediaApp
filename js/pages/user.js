import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, $ } from '../ui.js';
import { getProfileById, listPrayerRequestsForUser, isFollowing, followUser, unfollowUser, countPrayersForRequests } from '../api.js';
import { mountAvatar, prayerRequestCard } from '../render.js';
import { isPreviewMode, PREVIEW_USER_ID } from '../preview.js';
import { mountPreviewUser } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: '' });

if (isPreviewMode()) {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    $('#requests').innerHTML = `<div class="empty card card__pad">Open this page from the nav link “Friend demo”.</div>`;
  } else if (id === PREVIEW_USER_ID) {
    location.href = 'profile.html';
  } else {
    mountPreviewUser();
  }
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  const session = await requireSession();
  if (!session) throw new Error('Not authenticated');

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    $('#requests').innerHTML = `<div class="empty card card__pad">Missing user id.</div>`;
  } else {
    if (id === session.user.id) {
      location.href = 'profile.html';
      throw new Error('redirect');
    }

    const img = document.querySelector('[data-avatar]');
    const fallback = document.querySelector('[data-avatar-fallback]');

    const profile = await getProfileById(id);
    if (!profile) {
      $('#requests').innerHTML = `<div class="empty card card__pad">User not found.</div>`;
    } else {
      document.title = `${profile.display_name || profile.username} — Gathered`;
      $('[data-display-name]').textContent = profile.display_name || profile.username;
      $('[data-username]').textContent = profile.username;
      $('[data-bio]').textContent = profile.bio || '';
      $('[data-verse]').textContent = profile.favorite_verse || '—';

      mountAvatar({
        imgEl: img,
        fallbackEl: fallback,
        name: profile.display_name,
        username: profile.username,
        avatarUrl: profile.avatar_url
      });

      const btn = $('#follow-toggle');
      btn.hidden = false;

      async function refreshFollow() {
        const f = await isFollowing(profile.id);
        btn.textContent = f ? 'Following' : 'Follow';
        btn.classList.toggle('button--dark', !f);
        btn.classList.toggle('button--ghost', f);
        btn.dataset.following = String(f);
      }

      btn.addEventListener('click', async () => {
        try {
          const f = btn.dataset.following === 'true';
          if (f) await unfollowUser(profile.id);
          else await followUser(profile.id);
          await refreshFollow();
          await refreshRequests();
        } catch (err) {
          toast(err.message || 'Could not update follow', 'error');
        }
      });

      async function refreshRequests() {
        const rows = await listPrayerRequestsForUser(profile.id);
        const ids = rows.map((r) => r.id);
        const counts = await countPrayersForRequests(ids);
        if (!rows.length) {
          $('#requests').innerHTML = `<div class="empty card card__pad">No visible requests yet (or follow them to see follower-only requests).</div>`;
          return;
        }
        $('#requests').innerHTML = rows
          .map((r) =>
            prayerRequestCard({
              request: r,
              profile,
              prayedCount: counts.get(r.id) || 0,
              href: `prayer.html?id=${encodeURIComponent(r.id)}`
            })
          )
          .join('');
      }

      await refreshFollow();
      await refreshRequests();
    }
  }
}
