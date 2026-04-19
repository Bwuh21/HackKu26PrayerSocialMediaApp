/**
 * Slide-over settings panel. Injected once into the document; opens from any
 * `[data-open-settings]` control (e.g. top nav hamburger).
 */

const SETTINGS_DRAWER_HTML = `
<div id="settings-drawer" class="settings-drawer" hidden aria-hidden="true">
  <div class="settings-drawer__backdrop" data-close-settings tabindex="-1"></div>
  <div class="settings-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title">
    <div class="settings-drawer__header">
      <h2 class="h2" id="settings-drawer-title" style="margin: 0">Settings</h2>
      <button type="button" class="icon-button" data-close-settings aria-label="Close settings">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
        </svg>
      </button>
    </div>
    <div class="settings-drawer__scroll">
      <section class="settings-drawer__section">
        <h3 class="settings-drawer__section-title">Navigate</h3>
        <nav class="settings-drawer__links" aria-label="App pages">
          <a class="settings-drawer__link" href="dashboard.html">Feed</a>
          <a class="settings-drawer__link" href="friends.html">Friends</a>
          <a class="settings-drawer__link" href="profile.html">Profile</a>
          <a class="settings-drawer__link" href="create-prayer.html">New prayer request</a>
        </nav>
      </section>

      <section class="settings-drawer__section">
        <h3 class="settings-drawer__section-title">Profile settings</h3>
        <form class="form" id="profile-form">
          <div class="field">
            <label class="label" for="display_name">Name</label>
            <input class="input" id="display_name" name="display_name" required />
          </div>
          <div class="field">
            <label class="label" for="username">Username</label>
            <input class="input" id="username" name="username" required />
          </div>
          <div class="field">
            <label class="label" for="bio">Short bio</label>
            <textarea class="textarea" id="bio" name="bio" rows="4"></textarea>
          </div>
          <div class="form__actions">
            <button class="button" type="submit" id="save-profile">Save profile</button>
          </div>
        </form>
      </section>

      <section class="settings-drawer__section">
        <h3 class="settings-drawer__section-title">Theme</h3>
        <label class="theme-toggle">
          <span class="theme-toggle__label">Dark mode</span>
          <input type="checkbox" id="theme-dark" class="theme-toggle__input" />
          <span class="theme-toggle__switch" aria-hidden="true"></span>
        </label>
      </section>
    </div>
    <div class="settings-drawer__footer">
      <button type="button" class="button button--ghost settings-drawer__logout" data-sign-out-settings style="width: 100%">Log out</button>
      <button type="button" class="button settings-drawer__exit-preview" data-exit-preview hidden style="width: 100%">Exit preview</button>
    </div>
  </div>
</div>
`.trim();

export function ensureSettingsDrawer() {
  if (document.getElementById('settings-drawer')) return;
  document.body.insertAdjacentHTML('beforeend', SETTINGS_DRAWER_HTML);
}

function setOpenTriggersExpanded(expanded) {
  document.querySelectorAll('[data-open-settings]').forEach((el) => {
    if (el instanceof HTMLButtonElement) el.setAttribute('aria-expanded', String(expanded));
  });
}

let drawerMounted = false;

export function mountSettingsDrawer({ onOpen, onClose } = {}) {
  ensureSettingsDrawer();
  const drawer = document.querySelector('#settings-drawer');
  if (!drawer) return { open() {}, close() {} };

  const open = () => {
    drawer.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => drawer.classList.add('settings-drawer--open'));
    document.body.classList.add('settings-drawer-active');
    setOpenTriggersExpanded(true);
    onOpen?.();
  };

  const close = () => {
    drawer.classList.remove('settings-drawer--open');
    document.body.classList.remove('settings-drawer-active');
    drawer.setAttribute('hidden', '');
    drawer.setAttribute('aria-hidden', 'true');
    setOpenTriggersExpanded(false);
    onClose?.();
  };

  if (!drawerMounted) {
    drawerMounted = true;

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-settings]');
      if (!opener) return;
      e.preventDefault();
      open();
    });

    drawer.querySelectorAll('[data-close-settings]').forEach((el) => {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('settings-drawer--open')) {
        close();
      }
    });
  }

  return { open, close };
}
