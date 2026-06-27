/** localStorage keys for API authentication */
export const TOKEN_KEY = 'almohit_token';
export const REFRESH_KEY = 'almohit_refresh';

/** DRF Token auth uses `Token`; JWT uses `Bearer` */
export const AUTH_SCHEME = process.env.NEXT_PUBLIC_AUTH_SCHEME || 'Token';
