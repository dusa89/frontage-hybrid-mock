export const FX = {
  shop: { name: 'Desert Flow Plumbing', location: 'Las Vegas, NV', oss: 'Your week-one listing review is ready. Nothing is live until you approve it.' },
  action: { title: 'Approve your week-one listing changes', due: 'No deadline — pause anytime', summary: 'We drafted hours, services, and two photos from what\'s already public. Review before anything posts.', cta: 'Review approval', href: '/owner/receipt.html' },
  spine: [
    { l: 'State', v: 'Pending approval', h: '/owner/index.html' },
    { l: 'Approval', v: '1 item waiting', h: '/owner/receipt.html' },
    { l: 'Ad cap', v: '$0 / $500 weekly', h: '/owner/settings.html#cap' },
    { l: 'Payment', v: 'Not started', h: '/owner/settings.html#payment' },
    { l: 'Access', v: 'No manager access granted', h: '/owner/settings.html#access' },
    { l: 'Pause', v: 'Available', h: '/owner/settings.html#pause' },
    { l: 'Activity', v: '3 entries this week', h: '/owner/activity.html' },
    { l: 'Help', v: 'Text your person', h: '/owner/settings.html#help' },
  ],
  admin: { pending: 1, active: 0, paused: 0, exceptions: 0, kill: 'OFF', digest: '2026-09-06', calm: true },
};

const THEME_KEY = 'frontage-dash-theme';
const GH_PAGES_MARKER = '/frontage-hybrid-mock';

/** '' on local :8791; '/frontage-hybrid-mock' on GitHub Pages project site */
export function siteBase() {
  const idx = location.pathname.indexOf(GH_PAGES_MARKER);
  return idx >= 0 ? location.pathname.slice(0, idx + GH_PAGES_MARKER.length) : '';
}

export function siteHref(path) {
  if (!path || !path.startsWith('/')) return path;
  return `${siteBase()}${path}`;
}

function fixRootLinks(root = document) {
  const base = siteBase();
  if (!base) return;
  root.querySelectorAll('a[href^="/"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith(base)) return;
    a.setAttribute('href', base + href);
  });
}

function applyDashTheme(theme) {
  const light = theme === 'light';
  if (light) document.documentElement.dataset.dashTheme = 'light';
  else document.documentElement.removeAttribute('data-dash-theme');
  try { localStorage.setItem(THEME_KEY, light ? 'light' : 'dark'); } catch (_) {}
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    if (btn.classList.contains('dash-icon-btn')) btn.textContent = light ? '◐' : '☀';
  });
}

export function initDash() {
  fixRootLinks();

  const bare = location.pathname.replace(/\/$/, '');
  const ownerBare = bare.endsWith('/owner') || bare.endsWith(`${siteBase()}/owner`);
  const adminBare = bare.endsWith('/admin') || bare.endsWith(`${siteBase()}/admin`);
  if (ownerBare) location.replace(siteHref('/owner/index.html') + location.search + location.hash);
  if (adminBare) location.replace(siteHref('/admin/index.html') + location.search + location.hash);

  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (_) {}
  applyDashTheme(saved === 'light' ? 'light' : 'dark');

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const light = document.documentElement.dataset.dashTheme === 'light';
      applyDashTheme(light ? 'dark' : 'light');
    });
  });

  if (location.pathname.includes('/owner/')) {
    ensureOwnerMenu();
    fixRootLinks();
  }
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-menu]');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
    });
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== menuBtn) {
        menuBtn.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
      }
    });
  }
}

export function spineHtml(items) {
  return `<section class="dash-spine"><h2>Control spine</h2><ul>${items.map((i) => `<li><a href="${i.h}"><span class="lbl">${i.l}</span><span class="val">${i.v}</span></a></li>`).join('')}</ul></section>`;
}

function ensureOwnerMenu() {
  const actions = document.querySelector('.dash-bar__actions');
  if (!actions || actions.querySelector('[data-menu-btn]')) return;
  const path = location.pathname;
  const wrap = document.createElement('div');
  wrap.className = 'dash-menu-wrap';
  const h = (p, cur) => `<a href="${siteHref(p)}"${cur ? ' aria-current="page"' : ''}>`;
  wrap.innerHTML = `<button type="button" class="dash-icon-btn" data-menu-btn aria-expanded="false" aria-label="Menu">☰</button>
<ul class="dash-menu" data-menu hidden>
<li>${h('/owner/index.html', path.endsWith('/owner/') || path.endsWith('/owner/index.html'))}Home</a></li>
<li>${h('/owner/receipt.html', path.includes('receipt'))}Approvals</a></li>
<li>${h('/owner/activity.html', path.includes('activity'))}Activity</a></li>
<li>${h('/owner/settings.html', path.includes('settings'))}Settings</a></li>
<li>${h('/owner/record.html', path.includes('record'))}Records</a></li>
</ul>`;
  const settings = actions.querySelector('a[href*="settings"]');
  if (settings) actions.insertBefore(wrap, settings);
  else actions.appendChild(wrap);
}
