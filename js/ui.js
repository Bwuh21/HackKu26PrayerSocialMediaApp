export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export function toast(message, variant = 'info') {
  const host = document.createElement('div');
  host.className = `toast toast--${variant}`;
  host.textContent = message;
  document.body.appendChild(host);
  requestAnimationFrame(() => host.classList.add('toast--show'));
  window.setTimeout(() => {
    host.classList.remove('toast--show');
    window.setTimeout(() => host.remove(), 250);
  }, 3200);
}

export function setBusy(button, isBusy, labelWhileBusy = 'Working…') {
  if (!button) return;
  if (isBusy) {
    button.dataset._oldText = button.textContent;
    button.disabled = true;
    button.textContent = labelWhileBusy;
  } else {
    button.disabled = false;
    if (button.dataset._oldText) button.textContent = button.dataset._oldText;
  }
}
