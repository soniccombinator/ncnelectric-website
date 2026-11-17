// Permanent (301) redirects from old website addresses to the new pages, so old links and Google results keep working.
const exact = {
  '/index.html': '/',
  '/about-ncn-2': '/about',
  '/about-ncn-2/testimonial': '/about',
  '/our-team': '/team',
  '/careers/apply-today': '/careers#apply',
  '/contact-2': '/contact',
  '/sectors-2': '/sectors',
  '/sectors-2/project-gallery': '/projects',
  '/2021/03/29/hello-world': '/about',
  '/test-carousel': '/',
  '/calculator.html': '/generators#planner',
  '/sectors/industrial-and-commercial': '/sectors/industrial-commercial',
};
const sectorMap = {
  'airports': 'airports', 'education': 'education', 'healthcare': 'healthcare', 'industrial-and-commercial': 'industrial-commercial',
  'institutional': 'institutional', 'multifamily-hospitality-sector': 'multifamily-hospitality', 'municipalities': 'municipalities',
  'office-buildings': 'office-buildings', 'parks-and-recreation': 'parks-recreation', 'religious-structures': 'religious',
  'retail': 'retail', 'sports-complexes': 'sports-complexes',
};

function redirectFor(pathname) {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (exact[p]) return exact[p];
  const m = p.match(/^\/sectors-2\/([^/]+)$/);
  if (m) return sectorMap[m[1]] ? `/sectors/${sectorMap[m[1]]}` : '/sectors';
  if (p === '/portal' || p.startsWith('/portal/')) return '/';   // old employee portal was retired
  if (p.startsWith('/wp-') || p === '/feed' || p === '/comments/feed' || p === '/xmlrpc.php') return '/';
  return null;
}

module.exports = { redirectFor };
