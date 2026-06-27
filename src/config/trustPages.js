export const TRUST_PAGE_LINKS = [
  { id: 'privacy', path: '/privacy' },
  { id: 'terms', path: '/terms' },
  { id: 'cookies', path: '/cookies' },
  { id: 'cancellation', path: '/cancellation' },
  { id: 'faq', path: '/faq' }
];

const SECTION_PAGES = {
  privacy: ['s1', 's2', 's3', 's4', 's5'],
  terms: ['s1', 's2', 's3', 's4', 's5'],
  cookies: ['s1', 's2', 's3', 's4'],
  cancellation: ['s1', 's2', 's3', 's4', 's5']
};

const FAQ_COUNT = 5;

export function getTrustPageSections(pageId) {
  if (pageId === 'faq') {
    return Array.from({ length: FAQ_COUNT }, (_, i) => ({
      type: 'faq',
      index: i + 1
    }));
  }
  return (SECTION_PAGES[pageId] || []).map((id) => ({
    type: 'section',
    id
  }));
}
