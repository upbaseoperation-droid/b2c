import type { ParsedLink } from './types.ts';

function toUrl(raw: string): URL | null {
  let text = raw.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text.replace(/^\/+/, '')}`;
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Nhận diện nền tảng, ID bài đăng và handle từ một link air.
 * Trả null khi link không thuộc 4 nền tảng được hỗ trợ.
 */
export function parseLink(raw: string): ParsedLink | null {
  const url = toUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (hostMatches(host, 'tiktok.com')) {
    if (host === 'vt.tiktok.com' || host === 'vm.tiktok.com' || /^\/t\/[\w-]+/.test(path)) {
      return { platform: 'tiktok', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: true };
    }
    const m = path.match(/^\/@([^/]+)\/(video|photo)\/(\d{15,22})/);
    if (m) {
      return {
        platform: 'tiktok',
        url: `https://www.tiktok.com/@${m[1]}/${m[2]}/${m[3]}`,
        contentId: m[3],
        contentType: m[2] === 'photo' ? 'photo' : 'video',
        handle: decodeURIComponent(m[1]).toLowerCase(),
        isShortLink: false,
      };
    }
    const handleOnly = path.match(/^\/@([^/]+)\/?$/);
    return {
      platform: 'tiktok',
      url: url.toString(),
      contentId: null,
      contentType: null,
      handle: handleOnly ? decodeURIComponent(handleOnly[1]).toLowerCase() : null,
      isShortLink: false,
    };
  }

  if (hostMatches(host, 'instagram.com') || host === 'instagr.am') {
    const m = path.match(/^\/(?:([\w.]+)\/)?(p|reel|reels|tv)\/([\w-]{5,})/);
    if (m && !['p', 'reel', 'reels', 'tv', 'stories'].includes(m[1] ?? '')) {
      const kind = m[2] === 'p' ? 'post' : 'reel';
      return {
        platform: 'instagram',
        url: `https://www.instagram.com/${m[2] === 'reels' ? 'reel' : m[2]}/${m[3]}/`,
        contentId: m[3],
        contentType: kind,
        handle: m[1] ? m[1].toLowerCase() : null,
        isShortLink: false,
      };
    }
    return { platform: 'instagram', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: false };
  }

  if (hostMatches(host, 'facebook.com') || host === 'fb.watch' || host === 'fb.com' || hostMatches(host, 'fb.com')) {
    if (host === 'fb.watch' || /^\/share\//.test(path)) {
      return { platform: 'facebook', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: true };
    }
    const canonical = new URL(url.toString());
    canonical.hostname = 'www.facebook.com';
    const reel = path.match(/^\/reel\/(\d{6,})/);
    if (reel) return fbLink(canonical, reel[1], 'reel', null);
    const video = path.match(/^\/([^/]+)\/videos\/(?:[^/]+\/)?(\d{6,})/);
    if (video) return fbLink(canonical, video[2], 'video', video[1]);
    const watchId = url.searchParams.get('v');
    if (/^\/watch\/?$/.test(path) && watchId) return fbLink(canonical, watchId, 'video', null);
    const post = path.match(/^\/([^/]+)\/posts\/([\w]+)/);
    if (post) return fbLink(canonical, post[2], 'post', post[1]);
    const storyId = url.searchParams.get('story_fbid') || url.searchParams.get('fbid');
    if (storyId) return fbLink(canonical, storyId, 'post', url.searchParams.get('id'));
    return { platform: 'facebook', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: false };
  }

  if (host === 'shp.ee' || hostMatches(host, 'shp.ee')) {
    return { platform: 'shopee', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: true };
  }

  if (/(^|\.)shopee\.[a-z.]+$/.test(host)) {
    const m = path.match(/\/share-video\/([\w-]+)/);
    if (m) {
      return {
        platform: 'shopee',
        url: `https://${host}/share-video/${m[1]}`,
        contentId: m[1],
        contentType: 'video',
        handle: null,
        isShortLink: false,
      };
    }
    return { platform: 'shopee', url: url.toString(), contentId: null, contentType: null, handle: null, isShortLink: false };
  }

  return null;
}

function fbLink(canonical: URL, id: string, contentType: 'reel' | 'video' | 'post', owner: string | null): ParsedLink {
  canonical.search = '';
  canonical.hash = '';
  return {
    platform: 'facebook',
    url: canonical.toString(),
    contentId: id,
    contentType,
    handle: owner && !/^\d+$/.test(owner) ? owner.toLowerCase() : null,
    isShortLink: false,
  };
}

/** Tách danh sách link từ ô nhập (xuống dòng, dấu phẩy, khoảng trắng). */
export function splitLinks(raw: string | string[]): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(/[\s,;]+/);
  return [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
}
