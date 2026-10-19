/**
 * Kiểm tra nhanh từ dòng lệnh, không cần bật server:
 *   npm run check -- https://www.tiktok.com/@abc/video/123... https://www.facebook.com/reel/456...
 */
import { checkLinks } from './check-link.ts';

const links = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (links.length === 0) {
  console.error('Cách dùng: npm run check -- <link 1> <link 2> ...');
  process.exit(1);
}

const results = await checkLinks(links.map((url) => ({ url })));
for (const r of results) {
  console.log(
    JSON.stringify(
      {
        inputUrl: r.inputUrl,
        platform: r.platform,
        status: r.status,
        statusDetail: r.statusDetail,
        verdict: r.verdict,
        canonicalUrl: r.canonicalUrl,
        author: r.author,
        publishedAt: r.publishedAt,
        caption: r.caption.slice(0, 120),
        metrics: r.metrics,
        hasProductLink: r.hasProductLink,
        source: r.source,
        ms: r.durationMs,
      },
      null,
      2
    )
  );
}
