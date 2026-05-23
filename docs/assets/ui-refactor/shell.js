/* TimeSand · shared shell injector
   Renders left rail + bottom player into pages that contain
   <div id="shell-rail"></div> and <div id="shell-player"></div>.
*/

const NAV = [
  {
    section: '回忆',
    items: [
      { id: 'draw',     label: '抽卡',     href: 'draw.html',     icon: 'spark' },
      { id: 'albums',   label: '相册',     href: 'albums.html',   icon: 'album' },
      { id: 'slideshow',label: '幻灯片',   href: 'slideshow.html',icon: 'film' }
    ]
  },
  {
    section: '内容',
    items: [
      { id: 'upload',   label: '上传',     href: 'upload.html',   icon: 'upload' },
      { id: 'music',    label: '音乐盒',   href: 'music.html',    icon: 'music' }
    ]
  },
  {
    section: '其他',
    items: [
      { id: 'settings', label: '设置',     href: 'settings.html', icon: 'gear' },
      { id: 'landing',  label: '关于',     href: 'landing.html',  icon: 'info' }
    ]
  }
];

const ICONS = {
  spark: '<path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/><circle cx="12" cy="12" r="3"/>',
  album: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 14l4-4 5 5 3-3 6 6"/>',
  film:  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  upload:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  gear:  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  info:  '<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/>'
};

function brandSvg() {
  // Hourglass — sand running through
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
         stroke-linecap="round" stroke-linejoin="round" style="color:var(--bg-deep)">
      <path d="M6 3h12M6 21h12"/>
      <path d="M7 3c0 4 5 5.5 5 9s-5 5-5 9"/>
      <path d="M17 3c0 4-5 5.5-5 9s5 5 5 9"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
    </svg>`;
}

function railHtml(activeId) {
  let html = '';
  html += `
    <div class="brand">
      <div class="brand-mark">${brandSvg()}</div>
      <div>
        <div class="brand-text">TimeSand</div>
        <div class="brand-sub">memory · drift</div>
      </div>
    </div>
    <nav class="rail-nav">`;
  NAV.forEach(group => {
    html += `<div class="rail-section">${group.section}</div>`;
    group.items.forEach(item => {
      const cls = item.id === activeId ? ' is-active' : '';
      html += `
        <a class="rail-link${cls}" href="${item.href}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round">${ICONS[item.icon] || ''}</svg>
          <span>${item.label}</span>
        </a>`;
    });
  });
  html += `</nav>
    <div class="rail-foot">
      <div class="lang-toggle">
        <button class="is-on">中</button>
        <button>EN</button>
      </div>
    </div>`;
  return html;
}

function playerHtml() {
  return `
    <div class="player-now">
      <div class="player-cover"></div>
      <div class="player-meta">
        <div class="player-title">夜窗微光 · Window Drift</div>
        <div class="player-artist">TimeSand · 默认音乐盒</div>
      </div>
    </div>
    <div class="player-ctl">
      <div class="player-ctl-row">
        <button class="player-btn" aria-label="上一首">
          <svg viewBox="0 0 24 24"><path d="M19 20L9 12l10-8v16zM5 19V5"/></svg>
        </button>
        <button class="player-btn play" aria-label="播放">
          <svg viewBox="0 0 24 24"><path d="M6 4l14 8L6 20V4z"/></svg>
        </button>
        <button class="player-btn" aria-label="下一首">
          <svg viewBox="0 0 24 24"><path d="M5 4l10 8L5 20V4zM19 5v14"/></svg>
        </button>
        <button class="player-btn" aria-label="循环">
          <svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </button>
      </div>
      <div class="player-progress">
        <span class="num">01:24</span>
        <div class="player-bar"><div class="player-bar-fill"></div></div>
        <span class="num">03:42</span>
      </div>
    </div>
    <div class="player-tools">
      <div class="player-vol">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
          <path d="M19 12c0-2-1-4-3-5"/>
        </svg>
        <div class="player-vol-bar"></div>
      </div>
    </div>`;
}

function makeMotes(host, count = 24) {
  for (let i = 0; i < count; i++) {
    const m = document.createElement('div');
    m.className = 'mote';
    m.style.left = (Math.random() * 100) + '%';
    m.style.bottom = (-Math.random() * 30 - 5) + '%';
    m.style.animationDuration = (12 + Math.random() * 18) + 's';
    m.style.animationDelay = (-Math.random() * 18) + 's';
    m.style.opacity = (0.3 + Math.random() * 0.5);
    m.style.transform = `scale(${0.4 + Math.random() * 1.4})`;
    host.appendChild(m);
  }
}

function mountShell(activeId) {
  const rail = document.getElementById('shell-rail');
  const player = document.getElementById('shell-player');
  if (rail) rail.innerHTML = railHtml(activeId);
  if (player) player.innerHTML = playerHtml();
  document.querySelectorAll('[data-motes]').forEach(host => {
    const n = parseInt(host.getAttribute('data-motes'), 10) || 24;
    makeMotes(host, n);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const id = document.body.getAttribute('data-page');
  mountShell(id);
});
