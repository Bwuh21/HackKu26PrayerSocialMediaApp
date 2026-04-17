import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { requireSession } from '../auth.js';
import { toast, setBusy, $ } from '../ui.js';
import { CATEGORIES, createPrayerRequest } from '../api.js';
import { isPreviewMode } from '../preview.js';
import { mountPreviewCreatePrayer } from '../preview-ui.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'create-prayer.html' });

if (isPreviewMode()) {
  mountPreviewCreatePrayer();
} else if (!supabaseConfigured) {
  toast('Configure Supabase in js/config.js first.', 'error');
} else {
  await requireSession();

  const cat = $('#category');
  cat.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');

  $('#create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#submit');
    setBusy(btn, true);
    try {
      const row = await createPrayerRequest({
        title: $('#title').value.trim(),
        description: $('#description').value.trim(),
        category: $('#category').value,
        visibility: $('#visibility').value
      });
      location.href = `prayer.html?id=${encodeURIComponent(row.id)}`;
    } catch (err) {
      toast(err.message || 'Could not create request', 'error');
    } finally {
      setBusy(btn, false);
    }
  });
}
