import { supabase, supabaseConfigured } from './supabase.js';
import { isPreviewMode, PREVIEW_USER_ID } from './preview.js';

export async function getSession() {
  if (!supabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requireSession(redirectTo = 'login.html') {
  if (isPreviewMode()) {
    return { preview: true, user: { id: PREVIEW_USER_ID } };
  }

  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    location.href = `${redirectTo}?next=${next}`;
    return null;
  }
  return session;
}

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp({ email, password, displayName, username }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        username: username
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
