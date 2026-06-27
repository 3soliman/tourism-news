import { getPublicHostContext } from './publicHost';
import { buildApiCacheKey } from '../api/client';

describe('public hotel host detection', () => {
  test.each([
    ['hilton.almohit.com', 'hotel', 'hilton'],
    ['admin.almohit.com', 'admin', null],
    ['almohit.com', 'apex', null],
    ['localhost', 'local', null],
  ])('%s is classified safely', (hostname, type, subdomain) => {
    expect(getPublicHostContext(hostname)).toEqual({ type, subdomain });
  });

  test('cache keys are isolated by hotel subdomain', () => {
    const hilton = buildApiCacheKey('/properties/', null, { type: 'hotel', subdomain: 'hilton' });
    const radisson = buildApiCacheKey('/properties/', null, { type: 'hotel', subdomain: 'radisson' });
    expect(hilton).not.toBe(radisson);
  });
});
