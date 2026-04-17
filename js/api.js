import { supabase } from './supabase.js';

export const CATEGORIES = [
  { id: 'health', label: 'Health' },
  { id: 'family', label: 'Family' },
  { id: 'school', label: 'School' },
  { id: 'work', label: 'Work' },
  { id: 'spiritual', label: 'Spiritual growth' },
  { id: 'other', label: 'Other' }
];

export const ENCOURAGEMENT_PRESETS = [
  { id: 'praying_for_you', label: 'Praying for you' },
  { id: 'lifted_up', label: 'Lifted this up' },
  { id: 'not_alone', label: "You're not alone" }
];

export async function getMyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfileById(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getProfilesByIds(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  if (!unique.length) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', unique);
  if (error) throw error;

  const map = new Map();
  for (const p of data || []) map.set(p.id, p);
  return map;
}

export async function updateMyProfile(patch) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not signed in');

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select('*').single();
  if (error) throw error;
  return data;
}

export async function searchProfiles(query, { limit = 12 } = {}) {
  const q = String(query || '').trim().replaceAll('%', '').replaceAll('_', '');
  if (q.length < 2) return [];

  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio')
    .ilike('username', `%${q}%`)
    .limit(limit);

  if (error) throw error;
  return (data || []).filter((p) => p.id !== me);
}

export async function listFollowingIds() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) return [];

  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', me);
  if (error) throw error;
  return (data || []).map((r) => r.following_id);
}

export async function isFollowing(followingId) {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', me)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function followUser(followingId) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');
  if (me === followingId) throw new Error('You cannot follow yourself');

  const { error } = await supabase.from('follows').insert({ follower_id: me, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followingId) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');

  const { error } = await supabase.from('follows').delete().eq('follower_id', me).eq('following_id', followingId);
  if (error) throw error;
}

export async function createPrayerRequest(payload) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: me,
      title: payload.title,
      description: payload.description ?? '',
      category: payload.category ?? 'other',
      visibility: payload.visibility ?? 'friends',
      status: 'active'
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrayerRequest(requestId, patch) {
  const { data, error } = await supabase.from('prayer_requests').update(patch).eq('id', requestId).select('*').single();
  if (error) throw error;
  return data;
}

export async function getPrayerRequest(requestId) {
  const { data, error } = await supabase.from('prayer_requests').select('*').eq('id', requestId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPrayerRequestsForUser(userId, { statuses } = {}) {
  let q = supabase.from('prayer_requests').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (statuses?.length) q = q.in('status', statuses);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listMyPrayerRequests() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) return [];
  return listPrayerRequestsForUser(me);
}

export async function listFeedPrayerRequests({ limit = 40 } = {}) {
  const following = await listFollowingIds();
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  const ids = Array.from(new Set([...(following || []), ...(me ? [me] : [])]));
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*')
    .in('user_id', ids)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function listPrayerUpdates(requestId) {
  const { data, error } = await supabase
    .from('prayer_updates')
    .select('*')
    .eq('prayer_request_id', requestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addPrayerUpdate(requestId, body) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_updates')
    .insert({ prayer_request_id: requestId, user_id: me, body })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function countPrayersForRequests(requestIds) {
  const ids = (requestIds || []).filter(Boolean);
  if (!ids.length) return new Map();

  const { data, error } = await supabase.from('prayer_interactions').select('prayer_request_id').in('prayer_request_id', ids);
  if (error) throw error;

  const map = new Map();
  for (const id of ids) map.set(id, 0);
  for (const row of data || []) {
    const k = row.prayer_request_id;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

export async function getMyInteraction(requestId) {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return null;

  const { data, error } = await supabase
    .from('prayer_interactions')
    .select('*')
    .eq('prayer_request_id', requestId)
    .eq('user_id', me)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPrayed(requestId, messageKey) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_interactions')
    .upsert(
      {
        prayer_request_id: requestId,
        user_id: me,
        message_key: messageKey || null
      },
      { onConflict: 'prayer_request_id,user_id' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listNotifications({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const now = new Date().toISOString();
  const { error } = await supabase.from('notifications').update({ read_at: now }).is('read_at', null);
  if (error) throw error;
}

export async function countUnreadNotifications() {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw error;
  return count || 0;
}
