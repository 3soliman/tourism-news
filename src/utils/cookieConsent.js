const CONSENT_KEY = 'almohit_cookie_consent';

export function hasCookieConsent() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function acceptCookieConsent() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, 'accepted');
  } catch {
    // ignore storage errors
  }
}
