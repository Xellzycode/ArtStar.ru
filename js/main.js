const MAINTENANCE_KEY = 'vibecard_maintenance';
const SITE_RESERVED = new Set([
  '', 'index', 'index.html', 'dashboard', 'dashboard.html', 'premium', 'premium.html',
  'pay', 'pay.html', 'admin', 'admin.html', 'offer', 'offer.html', 'privacy', 'privacy.html',
  'rules', 'rules.html', 'maintenance', 'maintenance.html', 'profile', 'profile.html',
  '404', '404.html', 'css', 'js', 'images', 'api', '_next', 'favicon.ico', 'tools',
  'data', 'server', 'app', 'lib', 'node_modules',
]);

function applyMaintenanceGate() {
  const path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
  if (path.endsWith('admin.html') || path.endsWith('/admin') || path === '/admin') return;
  if (path.endsWith('maintenance.html') || path.endsWith('/maintenance') || path === '/maintenance') return;
  if (sessionStorage.getItem('vibecard_admin') === '1') return;
  if (localStorage.getItem(MAINTENANCE_KEY) !== '1') return;
  window.location.replace('/maintenance');
}

function siteHost() {
  return (window.location && window.location.host) ? window.location.host : 'artstar';
}

function siteCleanUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function siteProfilePath(username) {
  const name = siteCleanUsername(username) || 'username';
  return `/${name}`;
}

function siteProfileHref(username) {
  try {
    return new URL(siteProfilePath(username), window.location.origin).href;
  } catch {
    return siteProfilePath(username);
  }
}

function siteVanityLabel(username) {
  return `${siteHost()}/${siteCleanUsername(username) || 'username'}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  applyMaintenanceGate();
  if (typeof Api !== 'undefined' && Api.ready) await Api.ready;
  initNavbar();
  initMobileMenu();
});

function getUsernameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('u') || params.get('username');
  if (fromQuery) return siteCleanUsername(fromQuery);

  const hash = window.location.hash.replace('#', '');
  if (hash) return siteCleanUsername(hash);

  const path = (window.location.pathname || '/').replace(/\\/g, '/');
  const fromProfile = path.match(/\/profile\/([a-z0-9_-]+)/i);
  if (fromProfile) return siteCleanUsername(fromProfile[1]);

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 1) {
    const raw = parts[0];
    const stem = raw.replace(/\.html$/i, '').toLowerCase();
    if (!SITE_RESERVED.has(raw.toLowerCase()) && !SITE_RESERVED.has(stem)) {
      return siteCleanUsername(stem);
    }
  }

  return null;
}

window.getUsernameFromUrl = getUsernameFromUrl;
window.siteHost = siteHost;
window.siteProfilePath = siteProfilePath;
window.siteProfileHref = siteProfileHref;
window.siteVanityLabel = siteVanityLabel;
