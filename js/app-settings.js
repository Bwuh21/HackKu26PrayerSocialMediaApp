/**
 * One-time wiring for the global settings drawer (profile form, theme, log out).
 * Called from nav after the shell mounts for signed-in or preview sessions.
 */
import { ensureSettingsDrawer, mountSettingsDrawer } from './settings-drawer.js';
import { getMyProfile, updateMyProfile } from './api.js';
import { signOut } from './auth.js';
import { applyTheme, getStoredTheme } from './theme.js';
import { toast, setBusy, $ } from './ui.js';
import { supabaseConfigured } from './supabase.js';
import { isPreviewMode, disablePreview } from './preview.js';

let initialized = false;

function syncThemeToggle() {
  const themeCheckbox = document.querySelector('#theme-dark');
  if (themeCheckbox) themeCheckbox.checked = getStoredTheme() === 'dark';
}

async function syncProfileFormFromServer() {
  if (isPreviewMode() || !supabaseConfigured) return;
  const p = await getMyProfile();
  if (!p) return;
  const dn = $('#display_name');
  const un = $('#username');
  const bio = $('#bio');
  if (dn) dn.value = p.display_name || '';
  if (un) un.value = p.username || '';
  if (bio) bio.value = p.bio || '';
}

export function initAppSettings() {
  ensureSettingsDrawer();

  if (initialized) return;
  initialized = true;

  mountSettingsDrawer({
    onOpen: () => {
      syncThemeToggle();
      syncProfileFormFromServer();
    }
  });

  const themeCheckbox = document.querySelector('#theme-dark');
  themeCheckbox?.addEventListener('change', () => {
    applyTheme(themeCheckbox.checked ? 'dark' : 'light');
  });

  document.querySelector('[data-sign-out-settings]')?.addEventListener('click', async () => {
    if (isPreviewMode()) return;
    try {
      await signOut();
      location.href = 'index.html';
    } catch (err) {
      toast(err.message || 'Sign out failed', 'error');
    }
  });

  $('#profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isPreviewMode() || !supabaseConfigured) return;
    const btn = $('#save-profile');
    setBusy(btn, true);
    try {
      await updateMyProfile({
        display_name: $('#display_name').value.trim(),
        username: $('#username').value.trim().toLowerCase(),
        avatar_url: null,
        bio: $('#bio').value.trim() || null
      });
      toast('Profile saved');
      document.dispatchEvent(new CustomEvent('app:profile-saved'));
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setBusy(btn, false);
    }
  });

  if (isPreviewMode()) {
    const signOutBtn = document.querySelector('[data-sign-out-settings]');
    const exitBtn = document.querySelector('[data-exit-preview]');
    if (signOutBtn) signOutBtn.hidden = true;
    if (exitBtn) {
      exitBtn.hidden = false;
      exitBtn.addEventListener('click', () => {
        disablePreview();
        location.href = 'index.html';
      });
    }
  }

  syncThemeToggle();
}
