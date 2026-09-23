import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

function getEnv() {
  const w = typeof window !== 'undefined' ? (window.__ENV || {}) : {};
  return {
    url: w.VITE_SUPABASE_URL || w.NEXT_PUBLIC_SUPABASE_URL || 'https://vyojuxtoigpvvjepdimo.supabase.co',
    key: w.VITE_SUPABASE_PUBLISHABLE_KEY || w.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_QnSAYnmh74bPgdTlRF5KMQ_QGAobhug',
  };
}

function isNewSupabaseApiKey(value) {
  return value && (value.startsWith('sb_publishable_') || value.startsWith('sb_secret_'));
}

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const ENV = getEnv();

export const supabase = createClient(ENV.url, ENV.key, {
  global: { fetch: createSupabaseFetch(ENV.key) },
  auth: { persistSession: true, autoRefreshToken: true }
});

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

export const PROFILE_FIELDS = [
  ['first_name', 'firstName'],
  ['last_name', 'lastName'],
  ['email', 'email'],
  ['phone', 'phone'],
  ['dob', 'dob'],
  ['ssn', 'ssn'],
  ['address', 'address'],
  ['city', 'city'],
  ['state', 'state'],
  ['zip', 'zip'],
  ['citizenship', 'citizenship']
];

export function isProfileComplete(profile) {
  if (!profile) return false;
  return PROFILE_FIELDS.every(function (f) {
    const v = profile[f[0]];
    return v !== null && v !== undefined && String(v).trim() !== '';
  });
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data && data.user ? data.user : null;
}

export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data || null;
}

function initials(profile, user) {
  const a = (profile && profile.first_name) || (profile && profile.username) || (user && user.email) || '?';
  const b = (profile && profile.last_name) || '';
  return ((a[0] || '') + (b[0] || '')).toUpperCase();
}

async function renderAccountNav() {
  const slots = document.querySelectorAll('.nav-account');

  const user = await getSessionUser();
  document.body.classList.toggle('is-authed', !!user);

  if (!slots.length) return;
  const profile = user ? await getProfile(user.id) : null;

  slots.forEach(function (slot) {
    if (!user) {
      slot.innerHTML = '<a href="auth.html">Sign In</a>';
      return;
    }
    const avatar = profile && profile.avatar_url
      ? '<img src="' + profile.avatar_url + '" alt="Profile">'
      : '<span>' + initials(profile, user) + '</span>';
    slot.innerHTML =
      '<div class="account-menu">' +
      '<button class="account-avatar" aria-label="Account menu">' + avatar + '</button>' +
      '<div class="account-dropdown">' +
      '<div class="account-name">' + ((profile && profile.username) || user.email) + '</div>' +
      '<a href="profile.html">My Profile</a>' +
      '<a href="application.html">My Application</a>' +
      '<button class="account-signout">Sign Out</button>' +
      '</div></div>';

    const btn = slot.querySelector('.account-avatar');
    const dd = slot.querySelector('.account-dropdown');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', function () { dd.classList.remove('open'); });
    slot.querySelector('.account-signout').addEventListener('click', async function () {
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    });
  });
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    const here = window.location.pathname.split('/').pop() || 'index.html';
    window.location.replace('auth.html?next=' + encodeURIComponent(here));
    return null;
  }
  return user;
}

document.addEventListener('DOMContentLoaded', renderAccountNav);
supabase.auth.onAuthStateChange(function (event) {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') renderAccountNav();
});
