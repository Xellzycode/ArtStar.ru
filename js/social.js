const POST_TEXT_LIMIT = 400;
const POSTS_VISIBLE_BY_DEFAULT = 2;

const ProfileStats = {
  PREFIX: 'vibecard_stats_',
  LIKE_PREFIX: 'vibecard_liked_',
  VIEW_PREFIX: 'vibecard_viewed_',

  get(username) {
    if (!username) return { views: 0, likes: 0 };

    try {
      const raw = localStorage.getItem(this.PREFIX + username);
      const data = raw ? JSON.parse(raw) : {};
      return { views: Number(data.views) || 0, likes: Number(data.likes) || 0 };
    } catch {
      return { views: 0, likes: 0 };
    }
  },

  save(username, stats) {
    try {
      localStorage.setItem(this.PREFIX + username, JSON.stringify(stats));
    } catch {

    }
  },

  registerView(username) {
    if (!username) return { views: 0, likes: 0 };

    const stats = this.get(username);
    const seenKey = this.VIEW_PREFIX + username;

    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      stats.views += 1;
      this.save(username, stats);
    }

    return stats;
  },

  hasLiked(username) {
    return localStorage.getItem(this.LIKE_PREFIX + username) === '1';
  },

  toggleLike(username) {
    const stats = this.get(username);
    const liked = this.hasLiked(username);

    if (liked) {
      stats.likes = Math.max(0, stats.likes - 1);
      localStorage.removeItem(this.LIKE_PREFIX + username);
    } else {
      stats.likes += 1;
      localStorage.setItem(this.LIKE_PREFIX + username, '1');
    }

    this.save(username, stats);
    return { ...stats, liked: !liked };
  },
};

function createPost(id = crypto.randomUUID()) {
  return { id, text: '', image: '', created_at: new Date().toISOString() };
}

function formatPostDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дн назад`;

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function renderPostsHTML(posts = []) {
  const items = posts.filter((post) => post.text || post.image);
  if (!items.length) return '';

  const hidden = Math.max(0, items.length - POSTS_VISIBLE_BY_DEFAULT);

  const cards = items.map((post, index) => `
    <article class="vcard-post${index >= POSTS_VISIBLE_BY_DEFAULT ? ' is-extra' : ''}">
      ${post.image ? `<div class="vcard-post-media"><img src="${escapeHtml(post.image)}" alt=""></div>` : ''}
      ${post.text ? `<p class="vcard-post-text">${escapeHtml(post.text)}</p>` : ''}
      <time class="vcard-post-date">${escapeHtml(formatPostDate(post.created_at))}</time>
    </article>
  `).join('');

  const toggle = hidden
    ? `<button type="button" class="vcard-posts-more" data-posts-more>Показать ещё ${hidden}</button>`
    : '';

  return `
    <div class="vcard-posts">
      <span class="vcard-posts-title">Посты</span>
      ${cards}
      ${toggle}
    </div>
  `;
}

function renderStatsHTML(profile, stats) {
  if (profile.show_stats === false) return '';

  const liked = ProfileStats.hasLiked(profile.username);

  return `
    <div class="vcard-stats">
      <span class="vcard-stat" title="Просмотры">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span data-stat-views>${stats.views}</span>
      </span>
      <button type="button" class="vcard-stat vcard-like${liked ? ' is-liked' : ''}"
        data-like-btn aria-pressed="${liked}" title="${liked ? 'Убрать лайк' : 'Поставить лайк'}">
        <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>
        </svg>
        <span data-stat-likes>${stats.likes}</span>
      </button>
    </div>
  `;
}

function initSocialUI(root, profile, options = {}) {
  root.querySelectorAll('[data-posts-more]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const wrap = btn.closest('.vcard-posts');
      wrap?.classList.add('is-expanded');
      btn.remove();
    });
  });

  root.querySelectorAll('[data-like-btn]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
      const username = profile?.username;
      if (!username) return;

      if (!options.readOnly) {
        const { likes, liked } = ProfileStats.toggleLike(username);
        btn.querySelector('[data-stat-likes]').textContent = likes;
        btn.classList.toggle('is-liked', liked);
        btn.setAttribute('aria-pressed', String(liked));
        btn.title = liked ? 'Убрать лайк' : 'Поставить лайк';
      }

      btn.classList.remove('is-bumping');

      void btn.offsetWidth;
      btn.classList.add('is-bumping');
    });
  });
}

window.POST_TEXT_LIMIT = POST_TEXT_LIMIT;
window.ProfileStats = ProfileStats;
window.createPost = createPost;
window.formatPostDate = formatPostDate;
window.renderPostsHTML = renderPostsHTML;
window.renderStatsHTML = renderStatsHTML;
window.initSocialUI = initSocialUI;
