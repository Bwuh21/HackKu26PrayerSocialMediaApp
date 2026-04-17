/**
 * Offline UI preview (no Supabase session). Lets judges/teammates click through the app.
 * Clear with disablePreview() or the nav "Exit preview" control.
 */
const STORAGE_KEY = 'gathered_preview';

/** Phantom "current user" id (only used for comparisons in preview UI). */
export const PREVIEW_USER_ID = '00000000-0000-0000-0000-000000000001';

export const PREVIEW = {
  friendUserId: '00000000-0000-0000-0000-000000000002',
  reqMine1: '00000000-0000-0000-0000-000000000101',
  reqMine2: '00000000-0000-0000-0000-000000000102',
  reqFriend1: '00000000-0000-0000-0000-000000000201',
  reqAnswered: '00000000-0000-0000-0000-000000000301',
  reqArchived: '00000000-0000-0000-0000-000000000302'
};

export function isPreviewMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function enablePreview() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

export function disablePreview() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function iso(hoursAgo) {
  const d = new Date(Date.now() - hoursAgo * 3600_000);
  return d.toISOString();
}

export function previewProfileMe() {
  return {
    id: PREVIEW_USER_ID,
    display_name: 'River Avery',
    username: 'river_demo',
    avatar_url: null,
    bio: 'Campus ministry + night classes. Grateful for community that prays with specificity.',
    favorite_verse: 'Philippians 4:6 — “Do not be anxious about anything…”'
  };
}

export function previewProfileFriend() {
  return {
    id: PREVIEW.friendUserId,
    display_name: 'Sam Kim',
    username: 'samkim',
    avatar_url: null,
    bio: 'Husband & dad. Learning to rest in God’s timing.',
    favorite_verse: 'Isaiah 41:10'
  };
}

export function previewRequestsMine() {
  const me = PREVIEW_USER_ID;
  return [
    {
      id: PREVIEW.reqMine1,
      user_id: me,
      title: 'Peace before finals week',
      description: 'Pray for steady sleep and focus. I’ll post an update after my hardest exam on Thursday.',
      category: 'school',
      status: 'active',
      visibility: 'friends',
      created_at: iso(72),
      updated_at: iso(3)
    },
    {
      id: PREVIEW.reqMine2,
      user_id: me,
      title: 'Grandma’s recovery',
      description: 'Thank you for praying—she’s stable. Please keep praying for strength for my mom as she coordinates care.',
      category: 'family',
      status: 'active',
      visibility: 'friends',
      created_at: iso(200),
      updated_at: iso(10)
    }
  ];
}

export function previewRequestsFriend() {
  return [
    {
      id: PREVIEW.reqFriend1,
      user_id: PREVIEW.friendUserId,
      title: 'New job transition',
      description: 'Interviewing while finishing a project at my current role. Pray I can leave well and enter generously.',
      category: 'work',
      status: 'active',
      visibility: 'friends',
      created_at: iso(40),
      updated_at: iso(6)
    }
  ];
}

export function previewRequestsArchive() {
  const me = PREVIEW_USER_ID;
  return [
    {
      id: PREVIEW.reqAnswered,
      user_id: me,
      title: 'Housing came through',
      description: 'We found a place within budget. Thank you for praying—God provided right on time.',
      category: 'family',
      status: 'answered',
      visibility: 'friends',
      created_at: iso(900),
      updated_at: iso(120)
    },
    {
      id: PREVIEW.reqArchived,
      user_id: me,
      title: 'Travel logistics (archived)',
      description: 'Trip completed safely—archiving this request.',
      category: 'other',
      status: 'archived',
      visibility: 'friends',
      created_at: iso(2000),
      updated_at: iso(800)
    }
  ];
}

export function previewUpdatesFor(requestId) {
  if (requestId === PREVIEW.reqMine1) {
    return [
      {
        id: 'u1',
        prayer_request_id: requestId,
        user_id: PREVIEW_USER_ID,
        body: 'Update: I finished two big assignments today. Still anxious about the lab practical—thank you for carrying this with me.',
        created_at: iso(8)
      },
      {
        id: 'u2',
        prayer_request_id: requestId,
        user_id: PREVIEW_USER_ID,
        body: 'Original post: asking for peace and focus through finals week.',
        created_at: iso(70)
      }
    ];
  }
  if (requestId === PREVIEW.reqFriend1) {
    return [
      {
        id: 'u3',
        prayer_request_id: requestId,
        user_id: PREVIEW.friendUserId,
        body: 'Had a good conversation with my manager. Please keep praying for clarity on the offer timeline.',
        created_at: iso(12)
      }
    ];
  }
  return [];
}

export function previewPrayerById(id) {
  const all = [...previewRequestsMine(), ...previewRequestsFriend(), ...previewRequestsArchive()];
  return all.find((r) => r.id === id) || null;
}

export function previewNotifications() {
  return [
    {
      id: 'n1',
      user_id: PREVIEW_USER_ID,
      type: 'prayer_update',
      payload: { request_id: PREVIEW.reqFriend1, actor_id: PREVIEW.friendUserId, is_new_request: false },
      read_at: null,
      created_at: iso(5)
    },
    {
      id: 'n2',
      user_id: PREVIEW_USER_ID,
      type: 'prayer_received',
      payload: { request_id: PREVIEW.reqMine1, actor_id: PREVIEW.friendUserId, message_key: null },
      read_at: iso(1),
      created_at: iso(20)
    }
  ];
}
