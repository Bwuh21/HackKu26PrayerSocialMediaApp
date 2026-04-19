import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { getSession, signUp } from '../auth.js';
import { toast, setBusy, $ } from '../ui.js';
import { enablePreview, disablePreview, isPreviewMode } from '../preview.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'signup.html' });

$('#skip-preview')?.addEventListener('click', () => {
  enablePreview();
  location.href = 'dashboard.html';
});

if (supabaseConfigured) {
  const existing = await getSession();
  if (existing) location.href = 'dashboard.html';
}

$('#signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseConfigured) {
    toast('Configure Supabase in js/config.js first.', 'error');
    return;
  }

  const displayName = $('#display_name').value.trim();
  const username = $('#username').value.trim();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const passwordConfirm = $('#password_confirm').value;

  if (password !== passwordConfirm) {
    toast('Passwords do not match. Please try again.', 'error');
    $('#password_confirm').focus();
    return;
  }

  const usernameOk = /^[a-zA-Z0-9_]{2,32}$/.test(username);
  if (!usernameOk) {
    toast('Username must be 2–32 characters and use only letters, numbers, and underscores.', 'error');
    $('#username').focus();
    return;
  }

  const btn = $('#submit');
  setBusy(btn, true);
  try {
    const { session } = await signUp({ email, password, displayName, username });
    if (session) {
      disablePreview();
      location.href = 'dashboard.html';
      return;
    }

    toast('Check your email to confirm your account (if confirmations are enabled). Then log in.');
    location.href = 'login.html';
  } catch (err) {
    toast(err.message || 'Sign up failed', 'error');
  } finally {
    setBusy(btn, false);
  }
});
