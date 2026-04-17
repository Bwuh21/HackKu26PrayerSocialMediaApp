import { supabaseConfigured } from '../supabase.js';
import { mountAppNav } from '../nav.js';
import { enablePreview, isPreviewMode } from '../preview.js';

const banner = document.querySelector('[data-config-banner]');
if (banner && !supabaseConfigured && !isPreviewMode()) banner.hidden = false;

await mountAppNav({ active: 'index.html' });

document.getElementById('preview-app')?.addEventListener('click', () => {
  enablePreview();
  location.href = 'dashboard.html';
});
