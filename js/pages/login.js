import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { getSession, signInWithPassword } from '../auth.js';
import { toast, setBusy, $ } from '../ui.js';
import { enablePreview, disablePreview, isPreviewMode } from '../preview.js';

function safeNext(next) {
  if (!next) return 'dashboard.html';
  try {
    const u = decodeURIComponent(next);
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('//') || u.startsWith('/')) return 'dashboard.html';
    return u;
  } catch {
    return 'dashboard.html';
  }
}

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'login.html' });

$('#skip-preview')?.addEventListener('click', () => {
  enablePreview();
  location.href = 'dashboard.html';
});

if (supabaseConfigured) {
  const existing = await getSession();
  if (existing) location.href = 'dashboard.html';
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabaseConfigured) {
    toast('Configure Supabase in js/config.js first.', 'error');
    return;
  }

  const btn = $('#submit');
  setBusy(btn, true);
  try {
    const email = $('#email').value.trim();
    const password = $('#password').value;
    await signInWithPassword(email, password);
    disablePreview();
    const params = new URLSearchParams(location.search);
    location.href = safeNext(params.get('next'));
  } catch (err) {
    toast(err.message || 'Login failed', 'error');
  } finally {
    setBusy(btn, false);
  }
});
