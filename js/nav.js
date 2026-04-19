import { initTheme } from './theme.js';
import { APP_NAME } from './brand.js';

initTheme();
import { getSession } from './auth.js';
import { supabaseConfigured } from './supabase.js';
import { isPreviewMode } from './preview.js';
import { initAppSettings } from './app-settings.js';

function navLink(href, label, activeHref) {
  const isActive = activeHref && href.endsWith(activeHref);
  return `<a class="nav__link ${isActive ? 'is-active' : ''}" href="${href}">${label}</a>`;
}

const MENU_DRAWER_ICON = `<svg class="nav__menu-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`;

const TAB_ICONS = {
  feed: `<svg class="app-bottom-nav__svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  friends: `<svg class="app-bottom-nav__svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  profile: `<svg class="app-bottom-nav__svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

function bottomTabItem(href, label, tabKey, activeTab) {
  const isActive = activeTab === tabKey;
  return `<a class="app-bottom-nav__item${isActive ? ' is-active' : ''}" href="${href}"${isActive ? ' aria-current="page"' : ''}>
    <span class="app-bottom-nav__icon">${TAB_ICONS[tabKey]}</span>
    <span class="app-bottom-nav__label">${label}</span>
  </a>`;
}

function clearBottomNav() {
  const bottomEl = document.querySelector('[data-app-bottom-nav]');
  if (bottomEl) {
    bottomEl.innerHTML = '';
    bottomEl.hidden = true;
  }
  document.body.classList.remove('app-shell--tabs');
}

function renderBottomNav(activeTab) {
  const bottomEl = document.querySelector('[data-app-bottom-nav]');
  if (!bottomEl) return;
  bottomEl.removeAttribute('hidden');
  bottomEl.hidden = false;
  document.body.classList.add('app-shell--tabs');
  bottomEl.innerHTML = `
    <nav class="app-bottom-nav" aria-label="Primary">
      ${bottomTabItem('dashboard.html', 'Home', 'feed', activeTab)}
      ${bottomTabItem('friends.html', 'Friends', 'friends', activeTab)}
      ${bottomTabItem('profile.html', 'Profile', 'profile', activeTab)}
    </nav>
  `;
}

export async function mountAppNav({ active, tab } = {}) {
  const el = document.querySelector('[data-app-nav]');
  if (!el) return;

  if (isPreviewMode()) {
    el.innerHTML = `
      <div class="nav">
        <a class="nav__brand" href="dashboard.html">${APP_NAME}</a>
        <button class="icon-button nav__menu-toggle" type="button" data-open-settings aria-expanded="false" aria-controls="settings-drawer">
          <span class="sr-only">Open settings</span>
          ${MENU_DRAWER_ICON}
        </button>
      </div>
    `;

    initAppSettings();
    renderBottomNav(tab ?? null);
    return;
  }

  const session = supabaseConfigured ? await getSession() : null;

  if (!session) {
    clearBottomNav();
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
      <button class="icon-button nav__menu-toggle" type="button" data-open-settings aria-expanded="false" aria-controls="settings-drawer">
        <span class="sr-only">Open settings</span>
        ${MENU_DRAWER_ICON}
      </button>
    </div>
  `;

  initAppSettings();
  renderBottomNav(tab ?? null);
}
