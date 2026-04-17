import { APP_NAME } from './brand.js';
import { getSession, signOut } from './auth.js';
import { supabaseConfigured } from './supabase.js';
import { countUnreadNotifications } from './api.js';
import { disablePreview, isPreviewMode } from './preview.js';

function navLink(href, label, activeHref) {
  const isActive = activeHref && href.endsWith(activeHref);
  return `<a class="nav__link ${isActive ? 'is-active' : ''}" href="${href}">${label}</a>`;
}

export async function mountAppNav({ active } = {}) {
  const el = document.querySelector('[data-app-nav]');
  if (!el) return;

  if (isPreviewMode()) {
    el.innerHTML = `
      <div class="nav">
        <a class="nav__brand" href="dashboard.html">${APP_NAME}</a>
        <button class="icon-button nav__menu-toggle" type="button" aria-expanded="false" aria-controls="app-nav-drawer" data-nav-toggle>
          Menu
        </button>
        <div class="nav__links" id="app-nav-drawer" data-nav-drawer>
          <span class="chip chip--gold">Preview</span>
          ${navLink('dashboard.html', 'Feed', active)}
          ${navLink('create-prayer.html', 'New request', active)}
          ${navLink('archive.html', 'Answered', active)}
          ${navLink('notifications.html', 'Notifications', active)}
          ${navLink('profile.html', 'Profile', active)}
          ${navLink('user.html?id=00000000-0000-0000-0000-000000000002', 'Friend demo', active)}
          <button class="button button--ghost" type="button" data-exit-preview>Exit preview</button>
          ${navLink('signup.html', 'Sign up', active)}
          ${navLink('login.html', 'Log in', active)}
        </div>
      </div>
    `;

    const toggle = el.querySelector('[data-nav-toggle]');
    const drawer = el.querySelector('[data-nav-drawer]');
    toggle?.addEventListener('click', () => {
      const open = drawer?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(Boolean(open)));
    });

    el.querySelector('[data-exit-preview]')?.addEventListener('click', () => {
      disablePreview();
      location.href = 'index.html';
    });
    return;
  }

  const session = supabaseConfigured ? await getSession() : null;
  const unread = session ? await countUnreadNotifications().catch(() => 0) : 0;

  if (!session) {
    el.innerHTML = `
      <div class="nav">
        <a class="nav__brand" href="index.html">${APP_NAME}</a>
        <div class="nav__actions">
          ${navLink('login.html', 'Log in', active)}
          ${navLink('signup.html', 'Sign up', active)}
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="nav">
      <a class="nav__brand" href="dashboard.html">${APP_NAME}</a>
      <button class="icon-button nav__menu-toggle" type="button" aria-expanded="false" aria-controls="app-nav-drawer" data-nav-toggle>
        Menu
      </button>
      <div class="nav__links" id="app-nav-drawer" data-nav-drawer>
        ${navLink('dashboard.html', 'Feed', active)}
        ${navLink('create-prayer.html', 'New request', active)}
        ${navLink('archive.html', 'Answered', active)}
        ${navLink('notifications.html', `Notifications${unread ? ` <span class="pill">${unread > 99 ? '99+' : unread}</span>` : ''}`, active)}
        ${navLink('profile.html', 'Profile', active)}
        <button class="button button--ghost" type="button" data-sign-out>Log out</button>
      </div>
    </div>
  `;

  const toggle = el.querySelector('[data-nav-toggle]');
  const drawer = el.querySelector('[data-nav-drawer]');
  toggle?.addEventListener('click', () => {
    const open = drawer?.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(Boolean(open)));
  });

  el.querySelector('[data-sign-out]')?.addEventListener('click', async () => {
    await signOut();
    location.href = 'index.html';
  });
}
