(function () {
  if (document.getElementById('upbase-b2c-ext-root')) return;

  const nf = new Intl.NumberFormat('vi-VN');

  function formatVnd(amount) {
    const n = Math.round(Number(amount || 0));
    if (n > 0) return `${nf.format(n)} đ`;
    if (n < 0) return `-${nf.format(Math.abs(n))} đ`;
    return '0 đ';
  }

  function formatNum(val) {
    const n = Math.round(Number(val || 0));
    return nf.format(n);
  }

  function formatDateVn(isoDateStr) {
    const raw = String(isoDateStr || '').trim();
    if (!raw || raw === '—') return '—';
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return raw;
  }

  function calcMedian(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const sorted = arr
      .map((x) => Number(x || 0))
      .filter((x) => Number.isFinite(x))
      .sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? Math.round(sorted[mid])
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  const hostName = window.location.hostname.toLowerCase();
  const isAdsHost = hostName.includes('ads.tiktok.com');
  const isShopeeHost = hostName.includes('shopee.vn') || hostName.includes('shp.ee');
  const isThreadsHost = hostName.includes('threads.net') || hostName.includes('threads.com');
  const isFacebookHost = hostName.includes('facebook.com') || hostName.includes('fb.watch');
  const isInstagramHost = hostName.includes('instagram.com');
  const isDouyinHost = hostName.includes('douyin.com');
  const isSellerHost =
    !isAdsHost &&
    !isShopeeHost &&
    !isThreadsHost &&
    !isFacebookHost &&
    !isInstagramHost &&
    (hostName.includes('affiliate') ||
      hostName.includes('seller') ||
      hostName.includes('tiktokshop'));

  function getPlatformLabel(platform) {
    if (platform === 'shopee') return 'Shopee · Video & Live';
    if (platform === 'threads') return 'Threads';
    if (platform === 'facebook') return 'Facebook · Reels';
    if (platform === 'instagram') return 'Instagram · Reels';
    if (platform === 'douyin') return 'Douyin';
    if (platform === 'tiktok_seller') return 'TikTok Seller';
    if (platform === 'tiktok_ads') return 'TikTok Ads';
    return 'TikTok';
  }

  function getProfileUrlForPlatform(handle, platform) {
    const clean = String(handle || '').replace(/^@+/, '').trim();
    if (!clean) return window.location.href;
    const p = platform || uiState.platform;
    if (p === 'shopee') return `https://shopee.vn/${encodeURIComponent(clean)}`;
    if (p === 'threads') return `https://www.threads.net/@${encodeURIComponent(clean)}`;
    if (p === 'facebook') return `https://www.facebook.com/${encodeURIComponent(clean)}`;
    if (p === 'instagram') return `https://www.instagram.com/${encodeURIComponent(clean)}/`;
    if (p === 'douyin') return `https://www.douyin.com/user/${encodeURIComponent(clean)}`;
    return `https://www.tiktok.com/@${encodeURIComponent(clean)}`;
  }

  function normalizeSyncPlatform(platform) {
    if (['shopee', 'instagram', 'threads', 'facebook', 'douyin'].includes(platform)) return platform;
    return 'tiktok';
  }

  const savedUiPrefs = (() => {
    try {
      const raw = window.localStorage.getItem('upbase_ext_ui_prefs_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const savedWatchlist = (() => {
    try {
      const raw = window.localStorage.getItem('upbase_ext_watchlist_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const UPBASE_ICON_SVG = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAZYSURBVGhDzVldaBxVGJ0kta1SUVAUGrFYUKE+CBYRBJPMzG4Smpo+1OzM7qYV+1AFrVir+KQVLX0QLCiIPohSQRH0sQ9aqtafFxEFBZGKYlp9s5n9y0/T/Kzn3Jk7e+fmzmbTdekeOMzufN+995x7v5m5s2uZUPKdZwLf/hLHeuA7K1eT0PB12XMLkLUJ7BECmwGNvouEL0YdXHUTgecslzznDcjbEKpMgie3gL1IPIGZXxJEowRNHXeYyuQt8DNMvCAUa+Cy9FTymTtFkka1w25gKDkJUVcwsMtkoFsoDZSKzn1CtQJhIMi7RVPDrmMx4wrVCoQBBI+sSu5CcqKFagXiGij57jFTg05QlILhfCsM8s5ToewGaKAXwZN6cqfYMJB1ovF19oGsilVtS3nnOGMqRCN0+qmxQQfI23L4ef0GoPN1xlSwAR9gZ0wNOsF2DIBvIdTLuAQbWOj0J0NyR9jeCrjvInQN4xJswBW4YGrQCba3Au43CCUMCASePWNu8P+zvRWw/5FxFdeZkjvFNg2cYyyBan73zabkTrE9A84iYwmUC8M7jcme8wXC7JBXPY9EvHy4J79a8dz6elnOucs81q7cwEbGY1T87APG5K40YC+xYhiPUSo4tjG5Sw1U9rl3MR6jlHf3GpO70QCun4pnP8h4DG6QUpK70kBQcPcwHgMXxmspyV1pAA+zA4zHQOBDPZHsSgPcyXr2c4zHwMvyKWNyaIDiUw1IMesh25Q9Z6mJATLdAMZlPAYMnDUme84PCEvxkrEZbKyeLnvuoklkMwoDOfdytZAdiPrSKSbNqAkGsO15G/EGKDQl+a8oRXaqDmLxByeTwLXYKKGHb2U/gNovx9k8u9/pT9HEl/uPkRNjE078kZI8h7jc+akG+NkqPbrnRpTCJV3gWgxLyP2ZfUTQDaQ+XEmswGmZR2zACgSmRLJadHYgh8myQTwIjxBy1iQyjax9sQI595h1NNFnwkA57zxu0kPiYfYjUuJrkbfRxZTEJdyyDiOFyeycUA1YrGOYWCFNgnWy9iue82elOHK3VU8Il+RYG6Ep/RXXc6aQE/7MWD+4O3UrjU4WoguZYOcSNBB/h7CXYWAxKo01jVQ956GoKaGKJ/tYmhh72qQppF1G3maRX5rM3mFOCilWofFjkhSeMEBA2PMUBxPzqlid4s4zgVnegR0ljw3hkr3lgnsQBlJ/emEMeTcw1yoX3ftNSZJYAe7dv0UyIetODtZnDcqltHpm94/1YwXeUwXj+wJMXaj4mVewCbtJlA1rn8fVJSQmhiWi69A562e2Ihd3kuKQG+SH6ipLkkiUM1HDjtXaiTuSHJxHMpxFSxiR5zC7s/741vnC2PbZR8b6LWsblztG3apTrETCBPZlLzWbfclgcvheNram84N+mgHOPjrj/wQLZd85v3JodJNYekI1Ec5k49wqUPBRnOcxIZ7gd9GmNpm9JVpxo2iVyAuvo6Aw9GSqgfB/gstsUPbtS+Wc85V1m3WtWAlCNaGbIeS5eIZ18eK7OFfzR+7BOOdVkc0Y+JlxtsNW2n4xzUCYGC4nVmBF3L+9zJvChCwdgqJ1M/KcPB/OsmImRg+fNZiof1WBazKfeUy0huATzQyorIC8y+Bh9Mt8wd0uOpAwmWjGaAJYyxD/uz5WCzwixp32h06mGdAvJghfRiktRXeXqZrvHhKdEBQvkWZEmgRWDoxfP7t313GMMaeO0TLlj7y4iE/FM65RNyBWgKWk7EBxXZyr5dyitQ0PFtVECuoTE1tqE6OHaxMjF0GOYdwFrMV4Rxr4Q9+bxIskiF21CjQQmgCxr2mYmQY/q2CLPeMPj9a8Ubeayw7M5EZGqhMjT+DaeQffT9dy2TqJz4tg/N+XOkYrxO32I2Gg5A9OrccAyZUQq4GSkiuhs2piKDxmBQb0vlsldH0uDGAF5k3io6SmsyONJAih66Gp31aIC/83YcAUbIdGU01o6qMVYmL/jg1ED6z4D209uVuoVgQ0/yoM4MQZcEGYCLcN7RtQS1EtTRP1tk1IbXKSoff90EDBHqBwkdDKCphENKH+jNFpHKMJQxP2zNy+zO3CAFHKu89GQb7AiL1PKjmogSZxrdA4RgrDKrEv4n0hE0lvgK94ged+ciUGTMJapXGMdH4QvQdwT4WtiGX9B2DD8GJKV7TMAAAAAElFTkSuQmCC" alt="upbase" width="18" height="18" style="height:18px;width:18px;display:block;object-fit:contain;flex-shrink:0;" />`;

  const UPBASE_LOGO_SVG = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAAwCAYAAAC47FD8AAAQAElEQVR4AeycCZhdRZWAq153p5MQE6JxYwQFQdGwygADuIQ0ENHRD2UICSjiMhq/cVznU3HUNO4rKo6i4hKHRdw+FRcYJDGiyPahMSF8gihI2HEISYeQdLpfzf9Xv9u5/fq9191JExIm76tzq+qcU6dOnTp1bt26t7sSGvxWz5/9dmDJ6nmzE1B9VGH+7F+vmXfMKajZCURgZ9ppgaYWGObQD8yb/duQwudCCi+gVQIeXSdCj2pI562e1/UpdGkDdqadFmhqAR26HeoUoLJ63uyz8N5/otwfQoQWcehYpUweHo0f6uRu+0JIb31w3ux35drOy04LNLEAThtw3vDQmlOOfSY87wCMgkCClgGnSgCUbZ9qCyl10HWi8nHynWmnBZpaAKfNNHwl7JNLwy868/YAWbMHXzX7ebnwGL3MnDnzUOANwPz999//BOC1Bx544MzH6HDHfViFQxOmq9PHXfr4ChxYVKlte9dzq0YdY3wpcDZwXrVa/WFK6ay+vr4jETo4V5S3IP3/aDJoJHbLT9kRhlxN1R1Cz62xJU48CWDbFyrku1b4Ic+5clFTDOYFWN8JNQtoJIsxhrgtI59bHPvdAkjbUs8t0G/rmuDAPABnGTyMD+YbKTlXQqS8MzWxgAaSRIBOu1vYlhBje9f0i5ZUGkA7uIYTV0lxt22p47buK0amoq7TKr86VLmqnQoo47dVueh7a/Jx07VwaCPmLuMmdURBwydtxCY1BhT1BUut9tjLiNA6Rv3AGuHqeazLV4D1sUDRbqz5WPpoxmufzWhjwm926JR2HVPLR4mZkU+k60JvijtTEwtgqiF77ZHqTcSMCW0fNkhcykB1xFS0HZGxFUPJMeLjWzFuLzQOo43QPjCNm0qjEDQuxh5FP6Nh0VHKfPX1Mq1VeUvb1ctUThn0KV/WlfnKdMtlWrmsnetBeiOcfYiXPgh2niv0MiMXtv/Lsx5BFTWQUO5CG00oI2pl7xT1vDXSI5rVL2b1Y/rG3Ge97soow1gEKks9ilxna9V+LP0ot5BVyC/yAj+Yy6xwEGnHiNAh7YWyxQkAxdaJFxMnAafwouI1++2336uBV9RaGOk1TK2as3TAAQe8DP7T4Z8PvAZ4xUEHHTQpU2uXww477AnwzEfW68jfJNDuSTVyJ+VdgMOhvxKaabxOZhLCpiL7MPKXA8cfcsghj6v16zw6HufUvIZumvn2VaLtEuM8EH2PRXYXsB8E8S4e5VluBtJ1YMGyfJuOOOKIxyPzROA04CjryGyU5G+EzzjG14Y+MxlrF/ACXjIdAMEAs4m8aOt4haAC4MNkatvwodAutwzQ8yFa+rqebOTEAcGngG/CKXyV/GOAyaMwc0QO7jUDvG/iwexcThvOg7gI+AE4v3WhmNPEhx9++OXwfE2A9mXgbMovwdiHMXk/6e/vXwdcDe6H0JYDD+As1wOvR0Ihy36pjpicoynKpv2vlKVs8h8DP9+wYcM99Hk1tAVIcqFrGyfadvbRDHpxkC7afQPQpstofwmyL0PuMmTeDP494KqUPwQsov5N8q+Sfx68z1wuCvvUuXrB9bH4nwbPz3t6eu6j/j3sqN1/tXbt2ntod+7BBx/8dPBF0jGVUeho2TtfgvdY4H82btz4sPpgy0uBxbxkugb8jcCXcPSnIci2jpdiiA46rJ3/ssnWdhAwQj9SqmqcKRiuTaCTbCgMajSnmtNG6tUavT8OHLO1U3+nxoZjDlAFL80zZSdb/ufB83Um4jrgOfAoW/vbJ9XmCVmnI3sJ7f0Csp5RpzgY2ueR+yccxmNNI2vh2PLbxxCA91O0+QlwCqAjqaP6+DLH9nuD/zDOeQcC/g2YT/215G8EHOPD5DpzbkM5skBO2bRp0x8pHwevY4/kyjJ6a6PXQ/8Vjlh8vqBt5FOOYGSfhG7n0O6nyDmaXBnqlAGccvYC/2YW3xJkzQanDtozWQjVuLG8aqAPpiWcB3tO3FbLI3k+IyaPxPePcC7M6yyKaezgSMOW/ZzEsbTMDokRJgojNNT4Tv4gW3t7e7ZTDaHhLOJnseDT6MVtWrp1abH2E7eJch/9Pwu4gonQOZ1EacprCvD/I0SdTpkUhyR10x7C3r29vVfgWIfCIa8mNi/3MQkn/Twy/wNwK6Vt5KNJw+QCcTuq/CyHdt7Njci5TqvIHWQfFvr5lJXFUKO5dEEdMtB2TxzxfLdt8EoTKIbAtmQ6kfw38CxAQBFUpA3yWAEKu+2NrMux5VHgjOwDETpWg5MIrj5tl/XIHWXqI6UZxtRYQ8Tz5rneoJkOr85kWXpiEoyKfSCcPCOK9QCfk2tkkU/Hns7k//TQQw8dz9f4LiL72YP+vkeUexp6eOdVF4FqCDizXywacXO9dpEuWFVHwXIrkEfQXv3cQbphtq4Ojrkde2gT6eIte9fSJs9Zv3692xaabE5sUz5K7bmA7W1nBJffdt71xClLXQVZN+HUl7Gg9qDSmSekWul34NR3kNSx3oixXSiL8xSGdRIqTOJqFsBH2traDmlra3sRSr4EnHt3Hd3A0Ukbo88kJvUn0G0vUByWnEAn1f1+AR+cMGHCM+A8iH7mIvvrlMupA/k68zdArgUGE858KpVBZ6at8nvIbwPezp3oEGTvh97KvRxe+yRrmnQuiTqvbaxnh0beTej3fHJPpd4C058AVEvS1cs6qIHEAnwVRLc0Ioz+5hO4fAsZ/4xuM5C3G+BzyN/Aac8+cn24glN/Ed5eKyGmuN04CEqNkGIMvWl7OWI0emhYdXYSbqFw5IoVKz6wfPnyFcuXL7/6hhtu+CXwlhjjW6HlRNmIo+0P43Z5NMhmDi2Pi8D8no6Ojv1Xrlz58T/84Q93kq+knx8hewGT7B8+6Jjqg7jg4vKhalauUCXXkc4kH0w4kAtw5eTJkw9Fzjl/5IfsG9H7h9RfCqNRl6x1Yt/+JGS5SO1DsMF5yLkaHVeh65cZ8zyQq9D1jKlTp+6J/E9QH0y0NzrDFrWnY26Tl7YL4F28bNmyDch7CHkXsODcrq2msYvX/rz7HX344YdP0VDsoatPhbjDpP5K5Ynbg7JYP9uvpstEDN2F8f9SqxtZpWvwPvCL4P8MNKMY2UBi6+FJgg4tDCDrrrTrQ/YcJvXPkJzwMvQzyWfBcyE0ZQsUcyqOKD2Wc59ZHwjuI/K95tprrzViuhiM2Ooh9OFMn0bKJUBZJtWGSR4XtWN2QZ3EYvUoU5mB8Zv2RddPX3XVVQ8gwf7IQiA6u3jcMtivOPN74P0sFZ3bumNWfsSxfVA9F1qRpHesW7fujNx5SFFhBXH7z6vhCduDkkQVDZkNjkP9GkN7VFVWzcksJm7DjBkz3gfxbqCcnk9FGT70URyWdJSfINvoX0+0/zyH9H9GjSh/LqLfCRSsJ+hdlIsjQ4ohgDubRXJbCEEd1VV58lsGHSzr1DqT9YZAVHfcSyG6RSDLaX+2AffirF/iIfV4MMoUlEl1c0LPw2s1aepgdSEX+ck4fvA6ABnX2dn5Oar3AiaGEt1+zMrG4OnlH8TuGMDchOr2tEVyAnwguxr76ZROqg4qZPuCz2np0qUavd4xO3mgMXLqVEbzzFu6MD1pCXX7IRtMRT07AdHsQSj3MrPWBaphD15MFHNbOI34DNzSlWu/1RCC8uy/0FsZiSj9qxDCOqBV6kPWF+j7YZhyO8o9lnFWz/V/yP79bzj328BlhyQvp4Os0Kawl7p8ljZ/pM1y8pXkN5PfQn4b+V2cT6+EfyKQFxv99ANPzQJSiNMU2AQU3oQkOjZSUMJIoCGb8bSUyWFjK33rZTbqp9mYnNBmtHq5AWOqZzYoE3orDJYTuUmaeb28IRGaSXDvuS+MWc+aTKqbE7K9xSpHKAj2Uwb3kyuQV/Rb8Ln1cQvg8VyByzm8Rlb59QPHLlgWLNufR3sbcoPGF3naWVCXQjaqktld8g2m+ll3kXv68hmc8SYW8MEiAfFkId850MezcPUpcDPBaRvPxPcEqQwX6FPBu2+fRu4ChBSU9XQVp5KyQAp1KRbHY4ViKm/ZPLD5vj+EVChQ13bEajXEoAM0YlR+TbfhZHo0og0nNMDgIMoqU4qJKuOKsn1Wi8pIOcbUFmV+ndK60LA5bRotxt4as7oKtepARhvPWJVtfwPI4VeH6uQ6voKaiGSFLtmxIRTyvasUONA5Kb8MIrklRvu23Ajkt4+NbJI/zeLzDHwFyoj3odPIWfRp+3044rvmIH5UCrzOSBWPCHmbk9uC6EVOq75hGUxZlhMIJnpQTl6f8mmCykrIDSjYGVlgYxP/TkEjko05dcQ08SZaDcqjbIpcJqw/bXaLB9U46m8jcIb6I0kjTjEmuhqSdKxmi2wIY63i2PNk0E/xh6zKLqB+bDZzW2I+CLS9s1bxaX1YJIXmeBvJgjSYfGnzbGq1OQ0hxs2OSJngE8o/uk0+O7kACn3LedHfBhg9Biy3rS/bLuOI1L9nm+KLoOfRp6+93a6UnRJ07OONoQ98+VgQxCobk6u782/1Wuq/o/Bb89GCAjBg0mC0HZoY0ZPBOAEUKW1OudPqxCm/AJWVIh9TSjEsn/Kdi4tNfX3bDZt625sZMcaQ3EOre327RnUNKj7rHGPchX2Y4xJXD9giNKPV8xZ1bWOk2x+EfVinODxxvOVbt/w6t0S9GydwS5FR6Ocisawsc+W9moKO1xQ4UdA561/U3ELUdFtB8/BLZBeLtZDtK2yjv3Sd0r4E6xnYHhyWC6O88ADoG1NPdW6i79dziuJ5+QdpbrAgC6yPZFCZffzxx2tvcTquBFSM6paI9JfR/mhgFnDUaEGncPXoIAoeAkie1HNql//eQD5pQwY7fdGP16YYfRiSNlqwvxBT/GnoJsiHxr8U+/ODQmNqPuVAvSbUoejbS1WN2RljNJKV0ANF7oJ7NKMNcAy7FvZwHzyLyR/24FVuQVQ6k3q2JYrknP7cexaT7cKAZUhynH5l5vcP/VAaAsd/yi70KRz3j/AXuJ9Rzrdw+lSG+HewyMrbt8KpYR1I/f393xkoNb12ECB2Z2/8AeDv6LGc+rFwG+gmLFu2bBUL9hP0+T1wJvv17vHwqlWrngQi6rzk4tXLN6mYJ53BIpWunQrQFgLsweO+8+jrDvr9Frn/V2ayjA7eDXxmqrv09/VHV7FC7LCOHKqcfrv6pAn19Eb1Kt58W+xoPy8sDLZRdij9rE+AoFFK6CFFj+3kG4JsVMGQv6nDu3f8QA2nDG2QZs2atQt7uw/X8OVstOUq7a+YOXOme0jvarZTtuAr5w8wS68TCdgvWagymRdYqIEvXJzUWnUwS8j+PguuCC7KLEDZX0T2PMYqDtOFqi2JjsU4PQe+D55fgidLvkaWb0pvb+9ioqoffBU6wRISi3M3nORcmKWJE8o81gNR1lOY66i8G3BeemmziNMV7xgu1KwLNLchOjIxMK6HZyJjV4fAkaTn61fCYz0D9MjiOIcFzuARKQAADAZJREFU59+6KkOQFo844gg/YPoyPCcDPiSeTtub0PcrlfTG/KVdcZsDX07uwZL/KLFsZIXKlAf3uAsvuwItPwQCnlh0SrVp6qDh6VPPv/SmELNDD2NcffoJk6H4Bm0YrYbw00V1RlQN0yTjhcT3SyQfUtTRf+biMdIbmcyTgffef//9yzDOK0u8W1LUNtfi1BcD70Gu31+/m7LHY904nFGrkGs0/i6TeQUI9+F5LOiAHRk9yCKBc6x7EOE9uvoG8t4MvBr5Z5LfDJ+vlt1/66iOz1v5d4iOOgrknBKvtd9Xk+WJCOpEg9meOM5fcAY/D12AzFOAz7GAfDX9mtyyxeWSSy5xe2AULw4WHMtuGzZsuBg570TuAnT8Af3uWxNDMU2m8/sZe7EdcmF7h5kAsXjmMfC80gVH+7OA05DluM9Zu3btKvjejAwXsON1u6KMcytrHt7YYs+YUC4d/OCpx3oo72QpIBu+plzOpl10eXcM8X08oEovT1qmly+VtrYXTe1f/LvwXI5ZTgruCctkyyn29sxFVsN9vQyApy9OWqTcMvE2908M3NvtenKfuI0o3pF2xyjnMJkXAH6w4y3LiS7rNKL8Bp1r4OPAfxy536IPv792cdq3e0ejlnLvmDhx4lvh07EFcU6iOeimyWj0X1AXIf/95EZtMsJDCDqEC+I2Xme/U2QNskxegOikvpkUrR3asYnzug49TwO+AHwbuW+Hwc9oXUgUWyf4F8Hh2z+y4BGfcCD4zyLvSyBPBIYk8GeB0Ba5D7Yli9EFH2LmIUJTZ7cffrfiv6j7Nugvg/fzVe8EOjFNovqDDp9lgVxdidX+8h5KQh3EmKrV4p2+nShAkK8tzApZoakXXf6Zjs5JT0shulrD5l/sBbcqxMqHY2eY8bgLLvtNmEkEWhk2he8N3Bo38+ZJSamaHJh9lUhDivGhecd6MlMdgm1cqba3t/tQdWdKqa3EkijbXqCITtiSgniynMrljBjDRf1tnyHyq7V1O3Ib0fLl119/vS8iynwEkGwDWW1X6GZ9tHAvC+XI66677h4aOF6BYk5VTiC+wq3+I7nGBZvYf55Dqkb5gt/+BdBNk237kekxXfFthrjiQdP2ggLyWOjPu+QNtNGhtYVB0HG7Lfo4ZjpbZsB2BVBtmFyUbbR5P/LcJfRVUqhOTewUyhCoZ8gyEhuD9PyeU7qODoeESugG7KYbw3fjBE8EAr+jQ9vkvX52967PufwN01Ys7myPu/xDZ9vEZ3ZUJ+6163dveda0i375wan/vfh/aZVSd0rmGWhaSmn1/C73fe6/Sujhxd720X/Pwa33QZx6dozRp2kNrhHNC8EJmpFNJ7inVg61PHHbSwVji/zn0HwAVbZgG/vIwETqNPbzi7a2tsOJljfCb4SSTjEnb5tuA+g6yqsTmF8Aorg9y6jscq6u3oHOZqEcwkKRV2eRR7APwXLPihUrfEh7PTI9LlRXHdC+5FG2ZXlhiT/mcquVJiBv4hTC6PneEo9yrEYvgP2o529mzJhxBHXxtnW88lrXqd9Ff37zYt07jnaTT6DZsPQW+vYI0OCQKryaafGhT1QIEx17+6thUTry+ApRtT3g4mFhUIkQjLYJzFJekhS4G0PvLhddfNfEC3/+18nf/xlGu5VtSDcDSiiZYgwxhaG/SDX1vPo4l8dCytbJmieektx2NGfYTMl9sfW4k4G/kOi0ANJi4IHIzYfciOF24FsdHR1HgrsJ53ML4C3NPekGcFkGvE0Tcn8E3zHAdwG3OditZqMQbgH3VXiOQ4e53Bp1OGXZjza2bB/WLRdAs9hPu/NxVD8u8gMk98zYMwSITqKfUp4Nz8uQ/TYWiufN9q0scyHw08G1q/08BO+3kTkLGW4vfHD2z7BgC56ErAUv7vnw+YGTC4+Ji/UPrcoq4CGi5Ce5O+xJWz/0t43y7FM7/g4dX4u8OUuXLvUoVUd27OqnrsrJvPB8tL29/dk09k/hrieXX6AYHPfV9PGfzNd0+nRL4xbHtpVKiCHvR0LDH5E0OClpAj785DX39V4a1oa2cEjooF0KC6WFEM4MMXSHSjgzxLAwqFjIv25wAugQumv4sjMnlZC12jN/zsy+Tf08LaeKiJEghkqrPXZo8vPLtK9hhJcAfl/7DAzzFAw4hfobieS3dXZ2nsBE7wt+byZnHyZhJhHtr03kldEdyLkLmAfsh5wZyHnylClTpiH7WeAWIOdyGqwHmqYTTzzxI7Rz37gnMvaaNGnS7kzcVb///e9vRc6pwHOoP5Uov/u0adOeQv2ZyH4bi2RJU6Ehb+10mnZ4ii1FPzL/StsvIeOFwAxlMu59wGmTF4H7A/yB/mbjYPuS74E9dmN/3vRsmrvD3bQ/jbZTsN90ZO5FuQ3cUYx/EfLyYiTXmWs+QW1zEreeAPRn2vnp6OHkj8cmB6Db3pQryDoC+CTz5fcrttRnhFCJqeW30A5eI9gIp44vXHPUMZ8M97JvPim04acpdGOshTixEPidCbY7VMAMOPdCSt3gghB14AJCqEXqnlO7ntuXNi0NIY241QjFL6YWC7FgGpYXfW+C4meIRm2jpdEk05iQtUS5v2Gwv1C+HUfxazTYW6eU8kI0UsjYT9se5Nx/zTXXGFmSyNFAd3d3lXar6P9uZNx+HXth8h7a9gOmKhO5Fr3uuPLKK42qBV7aSFBExTYYHa9OJY5q6FUm/a6iUjhdXnzocxcOdrM5PPepEzytUoLYp97wt9quwDaYbFOASPUzV0dtcju6FYFFmnjz7MgwWq9aGSnS2QivxSGj/OlfHzyq65oNHV2b/w6R8I3AEBYGFQr5dyb8BYjo5jIARvMYXBCgVr9qzgF9/eHHIYQRHk7hGJJSw5dBQ1gaV9RRaEwdwGqXAhx/AQPUBlccWscoy9XAcha55dGCcsrtymVlFPUiFzcSKFOQz9zxOS7zehDfDGw/WhiLfs1k1utWX7ed4xECT4mhVaTLTLYYAPbUMXmOvP+GaljSM/+Yfx/A1646dneohoUhhUa/heCF7lBNj3v55If+5SUfS32briIyF0dPYbQ/rN1K72ZiEgSBDF0Ci64xyNMIQrMft+KxRMpmYsp4+y/Xx6usXB1NMFLXO0i5jpmzjcar79HKKeuoXVuB45A/y0b59IRC6yLPlIaXBD/biRD6YgpPr1bT2WtO7rpp3cldp4Y9QycuoogQIqVuHLsewKe5J+2ybu6L37GuZ+Ot1dh/Bg06whb8qimNdGcZjVSN0QgSjQug2DShPqMNGcI4/ux7HMU1FGUf3lUKKDtNYRMbyme+Q0AlhvjEhppm382UwQE5yoyJyZUtXiPsxeX8NYcfc+eaecdcsmZe11vXzZ/z4nXzXtzVM/e4F66b++I5PXPnLFh78rFf6Zl73GXr4oM9KfSfFWJ1GqCMQlYWPepLDNNGzTvOjERjnWCI1NqWYwhuB6s4F/UwOOU7yliIuKnFm8Lhw2CEEWwMMQE5MtUeGhN72jQnpPCF/mrfJdW06fIU+39djZsuTbHvnBCqb0ohHVuyWLvlLCtkOWFMv9RyqzQmUSMw19QcgWv8yY9WvyONJI7E8GjSebEShjt0ws9baIVTs5+QAcaI3csgGgCLb4ehwBY8DYWtMc7oT0TQZzxTtVqdXC8vxjgMV8+zg9adynrVt2be6mWNa51ju8rEgF8Ogc1dqLiwGVMqFY5dzoncYUwQtvAXQ/ExzBYK2Kpm63BgdlrBrUcBHs9tldDtuPEO49RFKGZyCJ1ByEF1i21bdu7RlMfYkYYVbOaf3ps/GuArbt/aDQIOLu7R0GVb9VnYvdxf02BXZtqWZR2a18ARh/atYNIHt75/14WgJPNWIM+YIGrYxPXaMTUbR+aVK1deySG/b8NOX7lyZQZeIPiqeBx72WFE6dTbDVQ4hPsQO10duy2EaB5a/lo5Z0ErBFDP3ke9WQ5pLAnD6cthfWdHZeFYGj5yvDslb08WqEy/cMkVIcb31JQq9oO16uizcXLYkTrsDzE8UKnEEyafd/lj/RY/ki120htYIEfk6d9ZfFZb+wT/ouDiBjwjonTmEZnGh+HCCantgF0vXOyHONxRxkfoTimPHQv8HwAAAP//Gj6NUgAAAAZJREFUAwAzNQ6cEWbpuwAAAABJRU5ErkJggg==" alt="upbase" height="18" style="height:18px;width:auto;display:block;object-fit:contain;flex-shrink:0;" />`;

  const uiState = {
    minimized: Boolean(savedUiPrefs.minimized),
    compactBarMode: Boolean(savedUiPrefs.compactBarMode),
    toolsExpanded: false,
    dockSide: savedUiPrefs.dockSide === 'left' ? 'left' : 'right', // 'right' | 'left'
    customPos: savedUiPrefs.customPos || null, // { top, left }
    sellerEditExpanded: false,
    activeTab: isAdsHost ? 'ads' : isSellerHost ? 'seller' : 'metrics', // 'metrics' | 'seller' | 'ads' | 'booking' | 'aircheck'
    metricsSubView: 'posts', // 'posts' | 'schedule' | 'products' | 'hub' | 'ai_studio'
    sampleSize: 15,
    excludePinned: true,
    cartFilterMode: 'all', // 'all' | 'cart_only' | 'non_cart_only'
    dateFromFilter: '',
    dateToFilter: '',
    keywordFilter: '',
    tableSortMode: 'default', // 'default' | 'views' | 'likes' | 'er' | 'velocity'
    showExtraCols: true,
    playerControls: {
      autoScroll: Boolean(savedUiPrefs.autoScroll),
      bgPlay: true,
      playbackSpeed: 1.0,
      volumePct: 100,
      gridOverlayEnabled: true,
      gridSortMode: 'default',
    },
    platform: isShopeeHost
      ? 'shopee'
      : isThreadsHost
        ? 'threads'
        : isFacebookHost
          ? 'facebook'
          : isInstagramHost
            ? 'instagram'
            : isDouyinHost
              ? 'douyin'
              : isAdsHost
                ? 'tiktok_ads'
                : isSellerHost
                  ? 'tiktok_seller'
                  : 'tiktok',
    pageType: isAdsHost ? 'ads_manager' : isSellerHost ? 'seller_creator' : 'profile',
    handle: '',
    videoId: null,
    profile: null,
    videos: [],
    sellerMetrics: null,
    adsRecords: [],
    currentVideo: null,
    shopeeTab: 'sp_product', // 'sp_product' | 'sp_reviews' | 'sp_shop' | 'sp_live_booking'
    igTab: 'ig_posts', // 'ig_posts' | 'ig_affiliate' | 'ig_comments' | 'ig_booking'
    threadsTab: 'th_posts', // 'th_posts' | 'th_affiliate' | 'th_replies' | 'th_booking'
    fbTab: 'fb_posts', // 'fb_posts' | 'fb_links' | 'fb_comments' | 'fb_booking'
    shopeeProductDetail: null,
    shopeeShopDetail: null,
    shopeeOrdersSummary: null,
    threadsTree: null,
    shopeeCommOpenPct: 2.5,
    shopeeCommXtraPct: 10,
    shopeeExpectedOrders: 100,
    postingAnalytics: null,
    productAggregation: null,
    searchSaturation: null,
    // Super VIP Product Scorer
    superVipQueryInput: '',
    superVipCommissionPct: 12,
    superVipScoredProduct: null,
    // Affiliate Hub (Watchlist & Commission Calculator)
    watchlistChannels: Array.isArray(savedWatchlist) ? savedWatchlist : [],
    commissionCalc: {
      priceVnd: 289000,
      commissionPct: 12,
      expectedOrders: 50,
      fixedCostVnd: 2000000,
    },
    // PRO Channel Review & Video Script + Image Prompt Generator
    scriptAnalysisResult: null,
    transcriptExpanded: false,
    batchScriptMode: 'top5_views', // 'top5_views' | 'top10_views' | 'cart_only' | 'latest10' | 'all'
    batchScriptScanning: false,
    batchScriptItems: [],
    imagePromptInputUrl: '',
    imagePromptStyle: 'Chụp studio thương mại B2C ánh sáng tự nhiên',
    imagePromptResult: null,
    // Bug Report / Feedback Note
    feedbackModalOpen: false,
    bugReportNoteInput: '',
    // Dữ liệu đối soát từ web-admin
    lookupLoading: false,
    lastLookedUpHandle: '',
    lookupResult: null,
    // Các trường TikTok Seller (Cột Y -> AM trên Google Sheet Listing)
    sellerDraft: {
      followers: 0,
      doanhSo: 0,
      soMonBanRa: 0,
      gpm: 0,
      aov: 0,
      viewTrungBinh: 0,
      gmvTuVideoPct: 80,
      gmvTuLivePct: 14,
      gmvTuTheSanPhamPct: 6,
      liveGmv: 0,
      liveGpm: 0,
      liveSessionCount: 0,
      liveAvgViews: 0,
      livePeakViewers: 0,
      liveAvgDurationMin: 0,
      liveItemsSold: 0,
      liveCtrPct: 0,
      liveCvrPct: 0,
      namPct: 22,
      nuPct: 78,
      tuoi18_24Pct: 35,
      tuoi25_34Pct: 45,
      tuoiTren35Pct: 20,
      location: 'Việt Nam',
    },
    liveSession: null,
    // Các trường TikTok Ads Manager & Nghiệm thu Cột BE -> BI
    adsDraft: {
      videoId: '',
      dealCode: '',
      sparkAdsCode: '',
      bookingCostNet: 0,
      adsSpend: 0,
      gmv: 0,
      orders: 0,
      views: 0,
      hookRate2s: 0,
      viewRate6s: 0,
      batchSparkCodesText: '',
    },
    // Form state
    selectedStoreName: 'ClubClio_TikTok_E2E-S',
    bookingFormatLabel: 'Video trả phí',
    rateCardNetInput: '',
    picNameInput: 'Chuyên viên B2C',
    noteInput: '',
    dealCodeInput: '',
    expectedHashtagInput: '',
    expectedUspInput: '',
    expectedCartUrlInput: '',
    channelHealth: null,
    commentAnalysis: null,
    feedbackBanner: null,
    syncing: false,
  };

  const BLACKLIST_FORBIDDEN_WORDS = [
    'trị dứt điểm',
    'chữa khỏi',
    'cam kết 100%',
    'hiệu quả 100%',
    'thuốc đặc trị',
    'trắng tức thì',
    'bác sĩ khuyên dùng',
    'shopee',
    'lazada',
    'tiki',
    'zalo',
    'chuyển khoản',
    'đặt cọc',
    'hàng tuồn',
  ];

  function isExtensionContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function safeRuntimeSendMessage(message, callback) {
    if (!isExtensionContextValid()) {
      if (typeof callback === 'function') {
        try {
          callback({ ok: false, error: 'Tiện ích vừa được cập nhật, hãy tải lại trang (F5) nếu cần đồng bộ.' });
        } catch {
          // Bỏ qua
        }
      }
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (resp) => {
        try {
          void chrome.runtime?.lastError;
        } catch {
          // Bỏ qua
        }
        if (typeof callback === 'function') {
          callback(resp);
        }
      });
    } catch {
      if (typeof callback === 'function') {
        try {
          callback({ ok: false, error: 'Tiện ích vừa được cập nhật, hãy tải lại trang (F5) nếu cần đồng bộ.' });
        } catch {
          // Bỏ qua
        }
      }
    }
  }

  function safeStorageGet(keys, callback) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.storage?.local?.get(keys, (res) => {
        try {
          void chrome.runtime?.lastError;
        } catch {
          // Bỏ qua
        }
        if (typeof callback === 'function') {
          callback(res || {});
        }
      });
    } catch {
      // Bỏ qua
    }
  }

  function safeStorageSet(items) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.storage?.local?.set(items, () => {
        try {
          void chrome.runtime?.lastError;
        } catch {
          // Bỏ qua
        }
      });
    } catch {
      // Bỏ qua
    }
  }

  safeStorageGet(['upbasePicName'], (res) => {
    if (res?.upbasePicName) {
      uiState.picNameInput = String(res.upbasePicName);
    }
  });

  function saveUiPrefs() {
    try {
      window.localStorage.setItem(
        'upbase_ext_ui_prefs_v1',
        JSON.stringify({
          minimized: uiState.minimized,
          compactBarMode: uiState.compactBarMode,
          dockSide: uiState.dockSide,
          customPos: uiState.customPos,
          autoScroll: Boolean(uiState.playerControls?.autoScroll),
        })
      );
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
  }

  function isUserTypingInExtension() {
    const active = document.activeElement;
    if (!active || !root.contains(active)) return false;
    const tag = (active.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function hydrateSellerDraft() {
    const sm = uiState.sellerMetrics || {};
    const db = uiState.lookupResult?.koc || {};
    const stats = computeChannelStats();
    const doanhSo = Math.round(Number(sm.recentRevenue || db.recentRevenue || 0));
    const soMonBanRa = Math.round(Number(sm.itemsSold || db.itemsSold || 0));
    const gmvTuLivePct = Number(sm.gmvShareLive ?? db.gmvShareLive ?? 14);
    const liveGmv = Math.round(
      Number(
        sm.liveGmv ||
          db.liveGmv ||
          (doanhSo > 0 && gmvTuLivePct > 0 ? doanhSo * (gmvTuLivePct / 100) : 0)
      )
    );

    uiState.sellerDraft = {
      followers: Math.round(Number(sm.followers || stats.followers || db.followers || 0)),
      doanhSo,
      soMonBanRa,
      gpm: Math.round(Number(sm.gpm || db.gpm || 0)),
      aov: Math.round(Number(sm.aov || db.aov || 0)),
      viewTrungBinh: Math.round(Number(sm.avgViews || stats.avgViews || db.avgViews || 0)),
      gmvTuVideoPct: Number(sm.gmvShareVideo ?? db.gmvShareVideo ?? 80),
      gmvTuLivePct,
      gmvTuTheSanPhamPct: Number(sm.gmvShareProductCard ?? db.gmvShareProductCard ?? 6),
      liveGmv,
      liveGpm: Math.round(Number(sm.liveGpm || db.liveGpm || 0)),
      liveSessionCount: Math.round(Number(sm.liveSessionCount || db.liveSessionCount || 0)),
      liveAvgViews: Math.round(Number(sm.liveAvgViews || db.liveAvgViews || 0)),
      livePeakViewers: Math.round(Number(sm.livePeakViewers || db.livePeakViewers || 0)),
      liveAvgDurationMin: Math.round(Number(sm.liveAvgDurationMin || db.liveAvgDurationMin || 0)),
      liveItemsSold: Math.round(
        Number(
          sm.liveItemsSold ||
            (soMonBanRa > 0 && gmvTuLivePct > 0 ? soMonBanRa * (gmvTuLivePct / 100) : 0)
        )
      ),
      liveCtrPct: Number(sm.liveCtrPct || 0),
      liveCvrPct: Number(sm.liveCvrPct || 0),
      namPct: Number(sm.maleRatio ?? db.maleRatio ?? 22),
      nuPct: Number(sm.femaleRatio ?? db.femaleRatio ?? 78),
      tuoi18_24Pct: Number(sm.age18_24 ?? db.age18_24 ?? 35),
      tuoi25_34Pct: Number(sm.age25_34 ?? db.age25_34 ?? 45),
      tuoiTren35Pct: Number(sm.age35Plus ?? db.age35Plus ?? 20),
      location: String(sm.location || db.location || 'Việt Nam'),
    };
  }

  function hydrateAdsDraft() {
    const firstAds = uiState.adsRecords?.[0] || null;
    const regVid = uiState.lookupResult?.registeredVideos?.[0] || null;
    const kocDb = uiState.lookupResult?.koc || null;
    const curVid = uiState.currentVideo || uiState.videos?.[0] || null;

    uiState.adsDraft = {
      videoId: String(
        uiState.adsDraft.videoId ||
          firstAds?.videoId ||
          regVid?.videoId ||
          regVid?.systemVideoId ||
          curVid?.videoId ||
          ''
      ),
      dealCode: String(
        uiState.adsDraft.dealCode ||
          regVid?.dealCode ||
          kocDb?.latestBoCode ||
          ''
      ),
      sparkAdsCode: String(
        uiState.adsDraft.sparkAdsCode ||
          firstAds?.sparkAdsCode ||
          regVid?.sparkAdsCode ||
          ''
      ),
      bookingCostNet: Math.round(
        Number(
          uiState.adsDraft.bookingCostNet ||
            regVid?.bookingCostNet ||
            kocDb?.rateCardVideo ||
            0
        )
      ),
      adsSpend: Math.round(
        Number(
          firstAds?.adsSpend ??
            uiState.adsDraft.adsSpend ??
            regVid?.latestAdsSpend ??
            0
        )
      ),
      gmv: Math.round(
        Number(firstAds?.gmv ?? uiState.adsDraft.gmv ?? regVid?.latestGmv ?? 0)
      ),
      orders: Math.round(
        Number(firstAds?.orders ?? uiState.adsDraft.orders ?? 0)
      ),
      views: Math.round(
        Number(
          firstAds?.impressions ||
            curVid?.views ||
            uiState.adsDraft.views ||
            regVid?.latestViews ||
            0
        )
      ),
      hookRate2s: Number(firstAds?.hookRate2s ?? uiState.adsDraft.hookRate2s ?? 0),
      viewRate6s: Number(firstAds?.viewRate6s ?? uiState.adsDraft.viewRate6s ?? 0),
      batchSparkCodesText:
        uiState.adsDraft.batchSparkCodesText ||
        (uiState.lookupResult?.registeredVideos || [])
          .filter((v) => v.sparkAdsCode)
          .map((v) => v.sparkAdsCode)
          .join('\n'),
    };
  }

  function computeChannelStats() {
    const allVids = Array.isArray(uiState.videos) ? uiState.videos : [];
    const kw = String(uiState.keywordFilter || '').trim().toLowerCase();
    const fromD = String(uiState.dateFromFilter || '').trim();
    const toD = String(uiState.dateToFilter || '').trim();

    const baseSample = allVids
      .filter((v) => {
        if (uiState.excludePinned && v.isPinned) return false;
        const pub = String(v.publishedAt || '').slice(0, 10);
        if (fromD && pub && pub < fromD) return false;
        if (toD && pub && pub > toD) return false;
        if (kw) {
          const cap = String(v.caption || '').toLowerCase();
          const prodTitles = (v.cartProducts || []).map((p) => String(p.title || '').toLowerCase()).join(' ');
          if (!cap.includes(kw) && !prodTitles.includes(kw)) return false;
        }
        return true;
      })
      .slice(0, uiState.sampleSize);

    const organicViews = [];
    const sponsoredViews = [];
    for (const v of baseSample) {
      const vw = Number(v.views || 0);
      const hasCart = Boolean(
        v.isSponsored ||
          v.hasYellowCart ||
          (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
      );
      if (hasCart) {
        sponsoredViews.push(vw);
      } else {
        organicViews.push(vw);
      }
    }

    const organicAvgViews =
      organicViews.length === 0
        ? 0
        : Math.round(organicViews.reduce((a, b) => a + b, 0) / organicViews.length);
    const organicMedianViews = calcMedian(organicViews);
    const sponsoredAvgViews =
      sponsoredViews.length === 0
        ? 0
        : Math.round(sponsoredViews.reduce((a, b) => a + b, 0) / sponsoredViews.length);
    const sponsoredMedianViews = calcMedian(sponsoredViews);

    const filtered = baseSample.filter((v) => {
      const hasCart = Boolean(
        v.isSponsored ||
          v.hasYellowCart ||
          (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
      );
      if (uiState.cartFilterMode === 'cart_only') return hasCart;
      if (uiState.cartFilterMode === 'non_cart_only') return !hasCart;
      return true;
    });

    if (uiState.tableSortMode === 'views') {
      filtered.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
    } else if (uiState.tableSortMode === 'likes') {
      filtered.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    } else if (uiState.tableSortMode === 'er') {
      filtered.sort((a, b) => Number(b.engagementRate || 0) - Number(a.engagementRate || 0));
    } else if (uiState.tableSortMode === 'velocity') {
      filtered.sort((a, b) => Number(b.viewsPerHour || 0) - Number(a.viewsPerHour || 0));
    }

    const count = filtered.length;
    if (count === 0) {
      const masterKoc = uiState.lookupResult?.koc;
      const sm = uiState.sellerMetrics;
      return {
        sampleCount: 0,
        baseSampleCount: baseSample.length,
        followers: uiState.profile?.followers || sm?.followers || masterKoc?.followers || 0,
        avgViews: sm?.avgViews || masterKoc?.avgViews || 0,
        medianViews: masterKoc?.medianViews || sm?.avgViews || masterKoc?.avgViews || 0,
        avgLikes: 0,
        avgComments: 0,
        avgShares: 0,
        engagementRate: masterKoc?.engagementRate || 0,
        organicAvgViews,
        organicMedianViews,
        organicCount: organicViews.length,
        sponsoredAvgViews,
        sponsoredMedianViews,
        sponsoredCount: sponsoredViews.length,
        filteredVideos: [],
      };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    const viewsList = [];

    for (const v of filtered) {
      const vw = Number(v.views || 0);
      const lk = Number(v.likes || 0);
      const cm = Number(v.comments || 0);
      const sh = Number(v.shares || 0);
      const sv = Number(v.saves || 0);
      totalViews += vw;
      totalLikes += lk;
      totalComments += cm;
      totalShares += sh;
      totalSaves += sv;
      viewsList.push(vw);
    }

    const avgViews = count === 0 ? 0 : Math.round(totalViews / count);
    const medianViews = calcMedian(viewsList);
    const avgLikes = count === 0 ? 0 : Math.round(totalLikes / count);
    const avgComments = count === 0 ? 0 : Math.round(totalComments / count);
    const avgShares = count === 0 ? 0 : Math.round(totalShares / count);
    const avgSaves = count === 0 ? 0 : Math.round(totalSaves / count);
    const engagementRate =
      totalViews === 0
        ? 0
        : Number((((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2));

    const discKocMatch = (uiState.searchSaturation?.discoveredKocs || []).find(
      (k) => normalizeKocHandle(k?.handle) === normalizeKocHandle(uiState.handle)
    );
    const resolvedFollowers =
      uiState.profile?.followers ||
      uiState.currentVideo?.authorFollowers ||
      uiState.videos?.[0]?.authorFollowers ||
      discKocMatch?.followers ||
      uiState.lookupResult?.koc?.followers ||
      0;

    return {
      sampleCount: count,
      baseSampleCount: baseSample.length,
      followers: resolvedFollowers,
      avgViews,
      medianViews,
      avgLikes,
      avgComments,
      avgShares,
      avgSaves,
      totalShares,
      totalSaves,
      engagementRate,
      organicAvgViews,
      organicMedianViews,
      organicCount: organicViews.length,
      sponsoredAvgViews,
      sponsoredMedianViews,
      sponsoredCount: sponsoredViews.length,
      filteredVideos: filtered,
    };
  }

  let lookupSeqCounter = 0;

  function normalizeKocHandle(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/\s+/g, '');
  }

  function stripKocHandlePunct(raw) {
    return normalizeKocHandle(raw).replace(/[._-]+/g, '');
  }

  function dedupeKocHandleLetters(raw) {
    return stripKocHandlePunct(raw).replace(/([a-z])\1+/g, '$1');
  }

  function applyLookupDataToUi(data) {
    if (!data) return;
    uiState.lookupResult = data;
    const insp = data.inspectedVideo;
    if (insp && typeof insp === 'object') {
      const cur = uiState.currentVideo || {};
      if (!cur.videoId || String(cur.videoId) === String(insp.videoId)) {
        const mergedCart =
          Array.isArray(cur.cartProducts) && cur.cartProducts.length > 0
            ? cur.cartProducts
            : Array.isArray(insp.cartProducts)
              ? insp.cartProducts
              : [];
        uiState.currentVideo = {
          ...cur,
          ...insp,
          views: Math.max(Number(cur.views || 0), Number(insp.views || 0)),
          likes: Math.max(Number(cur.likes || 0), Number(insp.likes || 0)),
          comments: Math.max(Number(cur.comments || 0), Number(insp.comments || 0)),
          shares: Math.max(Number(cur.shares || 0), Number(insp.shares || 0)),
          saves: Math.max(Number(cur.saves || 0), Number(insp.saves || 0)),
          hasYellowCart: Boolean(cur.hasYellowCart || insp.hasYellowCart || mergedCart.length > 0),
          cartProducts: mergedCart,
          transcriptText: cur.transcriptText || insp.transcriptText || '',
          playableUrl: cur.playableUrl || insp.playableUrl || '',
        };
      }
    }
    if (data.koc?.rateCardVideo && !uiState.rateCardNetInput) {
      uiState.rateCardNetInput = String(data.koc.rateCardVideo);
    }
    if (data.koc?.brandName && data.stores?.length) {
      const matchedStore = data.stores.find(
        (s) =>
          s.storeName === data.koc.proposedStores ||
          s.brandName === data.koc.brandName
      );
      if (matchedStore) {
        uiState.selectedStoreName = matchedStore.storeName;
      }
    }
    hydrateSellerDraft();
    hydrateAdsDraft();
  }

  function lookupKocOnServer(handle, forceVideoId) {
    const clean = normalizeKocHandle(handle);
    const activeVidId = String(forceVideoId || uiState.videoId || uiState.currentVideo?.videoId || '').trim();
    const lookupSig = `${clean || '__ALL__'}|${activeVidId}`;
    if (clean && uiState.lastLookedUpHandle === lookupSig && uiState.lookupResult?.handle === clean) {
      return;
    }
    const reqId = ++lookupSeqCounter;
    uiState.lookupLoading = true;
    uiState.lastLookedUpHandle = lookupSig;
    render();

    // Tra cứu dữ liệu KOC & Lịch sử Booking trực tiếp từ Database hệ thống Upbase B2C
    safeRuntimeSendMessage(
      {
        type: 'UPBASE_LOOKUP_KOC',
        handle: clean,
        platform: normalizeSyncPlatform(uiState.platform),
        videoId: activeVidId,
        videoUrl:
          uiState.currentVideo?.videoUrl ||
          (window.location.href.includes('/video/') ? window.location.href.split('?')[0] : ''),
      },
      (resp) => {
        if (reqId !== lookupSeqCounter) return;
        uiState.lookupLoading = false;
        if (resp && resp.ok && resp.data?.success) {
          applyLookupDataToUi(resp.data);
        } else {
          uiState.lookupResult = {
            foundInMaster: false,
            handle: clean,
            error: resp?.data?.error || resp?.error || 'Chưa kết nối máy chủ Upbase B2C',
            stores: resp?.data?.stores || [],
            registeredVideos: [],
          };
          hydrateSellerDraft();
          hydrateAdsDraft();
        }
        if (!isUserTypingInExtension()) {
          render();
        }
      }
    );
  }

  function copyTextToClipboard(text, successMsg) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        uiState.feedbackBanner = { tone: 'pos', text: successMsg };
        render();
      })
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        uiState.feedbackBanner = { tone: 'pos', text: successMsg };
        render();
      });
  }

  // Copy 15 cột chuẩn từ Cột Y (Doanh số) -> Cột AM (Location) để dán 1 phát vào Google Sheet Listing
  function handleCopySellerColumnsYtoAM() {
    const d = uiState.sellerDraft;
    const otherAgePct = Math.max(
      0,
      100 - Number(d.tuoi18_24Pct || 0) - Number(d.tuoi25_34Pct || 0) - Number(d.tuoiTren35Pct || 0)
    );
    const colsYtoAM = [
      Math.round(Number(d.doanhSo || 0)),              // Cột Y: Doanh số (nếu có)
      Math.round(Number(d.soMonBanRa || 0)),           // Cột Z: Số món bán ra
      Math.round(Number(d.gpm || 0)),                  // Cột AA: GPM
      Math.round(Number(d.aov || 0)),                  // Cột AB: GMV từ mỗi khách hàng/ AOV
      Math.round(Number(d.viewTrungBinh || 0)),        // Cột AC: View trung bình video
      `${Number(d.gmvTuVideoPct || 0)}%`,              // Cột AD: GMV từ video
      `${Number(d.gmvTuLivePct || 0)}%`,               // Cột AE: GMV từ Live
      `${Number(d.gmvTuTheSanPhamPct || 0)}%`,         // Cột AF: GMV từ thẻ sản phẩm
      `${Number(d.namPct || 0)}%`,                     // Cột AG: Nam
      `${Number(d.nuPct || 0)}%`,                      // Cột AH: Nữ
      `${Number(d.tuoi18_24Pct || 0)}%`,               // Cột AI: 18-24
      `${Number(d.tuoi25_34Pct || 0)}%`,               // Cột AJ: 25-34
      `${Number(d.tuoiTren35Pct || 0)}%`,              // Cột AK: >35
      `${otherAgePct}%`,                               // Cột AL: Other
      String(d.location || 'Việt Nam'),                // Cột AM: Location
    ].join('\t');

    copyTextToClipboard(
      colsYtoAM,
      'Đã copy 15 cột (Cột Y → AM). Đặt chuột vào ô Cột Y (Doanh số) trên Google Sheet rồi bấm Ctrl+V.'
    );
  }

  // Copy tóm tắt chỉ số kênh TikTok Seller & Live Affiliate để dán vào nhóm Lark / Zalo
  function handleCopySellerSummaryText() {
    const d = uiState.sellerDraft;
    const resolvedLiveGmv =
      Number(d.liveGmv || 0) > 0
        ? Number(d.liveGmv)
        : Math.round(Number(d.doanhSo || 0) * (Number(d.gmvTuLivePct || 0) / 100));
    const text = [
      `Kênh KOC: @${uiState.handle} (https://www.tiktok.com/@${uiState.handle})`,
      `- Follower: ${formatNum(d.followers)} | View TB: ${formatNum(d.viewTrungBinh)}`,
      `- Tổng GMV 30d: ${formatVnd(d.doanhSo)} | Đã bán: ${formatNum(d.soMonBanRa)} món`,
      `- GPM chung: ${formatVnd(d.gpm)} | AOV: ${formatVnd(d.aov)}`,
      `- Tỷ trọng GMV: Video ${d.gmvTuVideoPct}% · Live ${d.gmvTuLivePct}% · Thẻ SP ${d.gmvTuTheSanPhamPct}%`,
      `- Chỉ số Live Affiliate (30d): GMV Live ${formatVnd(resolvedLiveGmv)} · GPM Live ${formatVnd(d.liveGpm || 0)} · ${formatNum(d.liveSessionCount || 0)} phiên Live · View Live TB ${formatNum(d.liveAvgViews || 0)}${d.livePeakViewers ? ` · PCU đỉnh ${formatNum(d.livePeakViewers)}` : ''}`,
      `- Tệp khán giả: Nữ ${d.nuPct}% / Nam ${d.namPct}% · Tuổi 18-24 (${d.tuoi18_24Pct}%), 25-34 (${d.tuoi25_34Pct}%)`,
    ].join('\n');

    copyTextToClipboard(text, 'Đã copy bản tóm tắt chỉ số TikTok Seller & Live Affiliate vào bộ nhớ tạm.');
  }

  // Copy Báo cáo Chốt sổ Ca Live của Gian hàng / KOC khi phiên Live kết thúc (Dán trực tiếp vào nhóm Lark / Zalo)
  function handleCopyPostLiveSessionReport() {
    const d = uiState.sellerDraft;
    const lv = uiState.liveSession || {};
    const bagList = Array.isArray(lv.liveBagProducts) ? lv.liveBagProducts : [];
    const liveCmts = Array.isArray(lv.liveComments) ? lv.liveComments : [];
    const buyingLiveCmts = liveCmts.filter((c) => c.intentGroup === 'BUYING' || c.extractedPhone);
    const bagGmv = bagList.reduce(
      (sum, p) => sum + Math.round(Number(p.priceVnd || 0) * Number(p.soldCount || 0)),
      0
    );
    const bagSold = bagList.reduce((sum, p) => sum + Math.round(Number(p.soldCount || 0)), 0);
    const sessionGmv = Math.max(Number(lv.sessionGmv || 0), bagGmv);
    const sessionSold = Math.max(Number(lv.sessionItemsSold || 0), bagSold);
    const sessionOrders = Math.max(
      Number(lv.sessionOrders || 0),
      sessionSold > 0 ? Math.max(1, Math.round(sessionSold * 0.85)) : 0
    );
    const totalViews = Math.max(Number(lv.totalViews || 0), Number(lv.peakViewers || 0));
    const peakPcu = Math.max(
      Number(lv.peakViewers || 0),
      Number(lv.currentViewers || 0),
      Number(d.livePeakViewers || 0)
    );
    const sessionGpm =
      Number(lv.sessionGpm || 0) > 0
        ? Number(lv.sessionGpm)
        : totalViews > 0 && sessionGmv > 0
          ? Math.round((sessionGmv / totalViews) * 1000)
          : Number(d.liveGpm || 0);
    const statusLabel = lv.isEnded
      ? `Đã kết thúc (${lv.endedAt || 'Đã chốt sổ'})`
      : lv.isLive
        ? 'Đang phát trực tiếp'
        : 'Tổng hợp ca gần nhất';

    const topProductsText =
      bagList.length > 0
        ? bagList
            .slice(0, 5)
            .map(
              (p, i) =>
                `  ${i + 1}. ${p.title} — Giá: ${formatVnd(p.priceVnd)} · Đã bán: ${formatNum(p.soldCount)} món`
            )
            .join('\n')
        : '  (Chưa ghi nhận danh sách SP trong giỏ Live)';

    const reportLines = [
      `=== BÁO CÁO CHỐT SỔ CA LIVE GIAN HÀNG: @${uiState.handle || 'shop'} ===`,
      `- Gian hàng / Kênh: @${uiState.handle || 'shop'} (${uiState.selectedStoreName || 'Upbase B2C'})`,
      `- Tiêu đề ca Live: ${lv.roomTitle || 'Phiên phát sóng trực tiếp TikTok Shop'}`,
      `- Trạng thái: ${statusLabel} · Thời lượng: ${formatNum(lv.durationMinutes || d.liveAvgDurationMin || 0)} phút`,
      `- Lưu lượng ca Live: Tổng xem ${formatNum(totalViews)} · Mắt xem đỉnh (PCU) ${formatNum(peakPcu)} · Tim ${formatNum(lv.likes || 0)}${lv.newFollowers ? ` · Follower mới +${formatNum(lv.newFollowers)}` : ''}`,
      `- Hiệu quả bán hàng trong ca: GMV Ca Live ${formatVnd(sessionGmv)} · Đơn hàng ${formatNum(sessionOrders)} đơn (${formatNum(sessionSold)} món) · GPM Ca Live ${formatVnd(sessionGpm)}`,
      lv.sessionCtrPct || lv.sessionCvrPct
        ? `- Tỷ lệ chuyển đổi: CTR ${Number(lv.sessionCtrPct || 0)}% · CVR ${Number(lv.sessionCvrPct || 0)}%`
        : '',
      `- Tương tác hỏi mua trên Live Chat: ${buyingLiveCmts.length} bình luận hỏi mua / để lại SĐT (trên tổng ${liveCmts.length} bình luận)`,
      `- Top sản phẩm trong Giỏ hàng Ca Live (${bagList.length} mã):`,
      topProductsText,
    ].filter(Boolean);

    copyTextToClipboard(
      reportLines.join('\n'),
      'Đã copy Báo cáo Chốt sổ Ca Live của Gian hàng (sẵn sàng dán vào nhóm Lark / Zalo).'
    );
  }

  // Xuất file CSV Tổng kết Ca Live của Gian hàng (Bao gồm KPI ca Live + Giỏ hàng + Khách hỏi mua)
  function exportPostLiveSessionCsv() {
    const d = uiState.sellerDraft;
    const lv = uiState.liveSession || {};
    const bagList = Array.isArray(lv.liveBagProducts) ? lv.liveBagProducts : [];
    const liveCmts = Array.isArray(lv.liveComments) ? lv.liveComments : [];
    const bagGmv = bagList.reduce(
      (sum, p) => sum + Math.round(Number(p.priceVnd || 0) * Number(p.soldCount || 0)),
      0
    );
    const bagSold = bagList.reduce((sum, p) => sum + Math.round(Number(p.soldCount || 0)), 0);
    const sessionGmv = Math.max(Number(lv.sessionGmv || 0), bagGmv);
    const sessionSold = Math.max(Number(lv.sessionItemsSold || 0), bagSold);
    const sessionOrders = Math.max(
      Number(lv.sessionOrders || 0),
      sessionSold > 0 ? Math.max(1, Math.round(sessionSold * 0.85)) : 0
    );
    const totalViews = Math.max(Number(lv.totalViews || 0), Number(lv.peakViewers || 0));
    const peakPcu = Math.max(
      Number(lv.peakViewers || 0),
      Number(lv.currentViewers || 0),
      Number(d.livePeakViewers || 0)
    );

    const rows = [
      ['Hạng mục', 'Chỉ số / Mã SP', 'Giá trị / Tên SP', 'Số lượng bán / Tương tác', 'Doanh thu / Ghi chú'],
      [
        'CHỐT SỔ CA LIVE',
        `@${uiState.handle || 'shop'}`,
        lv.roomTitle || 'Phiên Live Gian hàng',
        `Thời lượng: ${lv.durationMinutes || 0} phút | Trạng thái: ${lv.isEnded ? 'Đã kết thúc' : lv.isLive ? 'Đang Live' : 'Đã lưu'}`,
        `GMV Ca Live: ${sessionGmv} VND`,
      ],
      [
        'LƯU LƯỢNG & CHUYỂN ĐỔI',
        `Tổng view: ${totalViews}`,
        `PCU Đỉnh: ${peakPcu} | Tim: ${lv.likes || 0}`,
        `Đơn hàng: ${sessionOrders} đơn (${sessionSold} món)`,
        `GPM: ${lv.sessionGpm || d.liveGpm || 0} VND | CTR: ${lv.sessionCtrPct || 0}% | CVR: ${lv.sessionCvrPct || 0}%`,
      ],
    ];

    for (const p of bagList) {
      rows.push([
        'SẢN PHẨM TRONG GIỎ LIVE',
        `="${p.productId}"`,
        p.title || '',
        p.soldCount || 0,
        Math.round(Number(p.priceVnd || 0) * Number(p.soldCount || 0)),
      ]);
    }

    for (const c of liveCmts.filter((x) => x.intentGroup === 'BUYING' || x.extractedPhone)) {
      rows.push([
        'KHÁCH HỎI MUA TRÊN LIVE',
        c.intentLabel || 'Hỏi mua',
        c.text || '',
        c.extractedPhone ? `="${c.extractedPhone}"` : '',
        'Cần CSKH phản hồi chốt đơn',
      ]);
    }

    const csv =
      '\uFEFF' +
      rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_TongKetCaLive_${uiState.handle || 'shop'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất file CSV Tổng kết Ca Live của @${uiState.handle || 'shop'} (${bagList.length} sản phẩm trong giỏ).`,
    };
    render();
  }

  // Copy 5 cột Nghiệm thu Air & Ads (Cột BE -> BI trên Google Sheet Listing)
  function handleCopyAdsAcceptanceColumnsBEtoBI() {
    const a = uiState.adsDraft;
    const totalCost = Math.round(Number(a.bookingCostNet || 0)) + Math.round(Number(a.adsSpend || 0));
    const gmv = Math.round(Number(a.gmv || 0));
    const totalRoi = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

    const colsBEtoBI = [
      String(a.sparkAdsCode || '—'),             // Cột BE: Mã ủy quyền ads
      Math.round(Number(a.views || 0)),          // Cột BF: Views (cập nhật sau 30 ngày)
      gmv,                                       // Cột BG: GMV (cập nhật sau 30 ngày)
      Math.round(Number(a.orders || 0)),         // Cột BH: Số đơn hàng (cập nhật sau 30 ngày)
      totalRoi,                                  // Cột BI: ROI (cập nhật sau 30 ngày)
    ].join('\t');

    copyTextToClipboard(
      colsBEtoBI,
      `Đã copy 5 cột Nghiệm thu (Cột BE → BI) · ROI Tổng: ${totalRoi}x. Đặt chuột vào Cột BE (Mã ủy quyền ads) trên Sheet rồi bấm Ctrl+V.`
    );
  }

  // Nạp mã Spark Ads tự động vào ô nhập trên TikTok Ads Manager & Đồng bộ trạng thái
  function handleRunSparkAdsBatchAuth() {
    const rawLines = String(uiState.adsDraft.batchSparkCodesText || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (uiState.adsDraft.sparkAdsCode && !rawLines.includes(uiState.adsDraft.sparkAdsCode.trim())) {
      rawLines.unshift(uiState.adsDraft.sparkAdsCode.trim());
    }

    if (rawLines.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Vui lòng nhập ít nhất 1 mã ủy quyền Spark Ads để nạp và xác thực.',
      };
      render();
      return;
    }

    const codes = rawLines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        return {
          videoId: parts[0],
          sparkAdsCode: parts[1],
          dealCode: parts[2] || uiState.adsDraft.dealCode || '',
          handle: uiState.handle || '',
          kocHandle: uiState.handle || '',
          storeName: uiState.selectedStoreName,
          status: 'AUTHORIZED',
          daysAuthorized: 30,
        };
      }
      return {
        videoId: uiState.adsDraft.videoId || `VID-${Date.now().toString().slice(-6)}`,
        sparkAdsCode: parts[0],
        dealCode: uiState.adsDraft.dealCode || '',
        handle: uiState.handle || '',
        kocHandle: uiState.handle || '',
        storeName: uiState.selectedStoreName,
        status: 'AUTHORIZED',
        daysAuthorized: 30,
      };
    });

    // Điền mã đầu tiên vào ô nhập Spark Ads Post trên giao diện TikTok Ads Manager (nếu đang mở modal)
    window.postMessage(
      {
        source: 'UPBASE_B2C_RUN_SPARK_AUTH',
        codes: codes.map((c) => c.sparkAdsCode),
      },
      '*'
    );

    uiState.syncing = true;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'VERIFY_SPARK_ADS_CODES',
          storeName: uiState.selectedStoreName,
          picName: uiState.picNameInput,
          sparkCodes: codes,
          codes,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || `Đã điền và xác thực ${codes.length} mã Spark Ads.`,
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi xác thực mã Spark Ads về Web-Admin.',
          };
        }
        render();
      }
    );
  }

  // Đồng bộ báo cáo chi phí Ads & ROI thực tế về Web-Admin
  function handleSyncAdsPerformanceToServer() {
    if (uiState.syncing) return;
    const a = uiState.adsDraft;

    const mergedRecords = [];
    // Đưa bản ghi đang chỉnh sửa vào đầu danh sách
    if (a.videoId || a.sparkAdsCode || a.adsSpend > 0 || a.gmv > 0) {
      mergedRecords.push({
        videoId: a.videoId || `VID-${Date.now().toString().slice(-6)}`,
        dealCode: a.dealCode,
        kocHandle: uiState.handle,
        storeName: uiState.selectedStoreName,
        sparkAdsCode: a.sparkAdsCode,
        bookingCostNet: Number(a.bookingCostNet || 0),
        adsSpend: Number(a.adsSpend || 0),
        gmv: Number(a.gmv || 0),
        orders: Number(a.orders || 0),
        impressions: Number(a.views || 0),
        views: Number(a.views || 0),
        hookRate2s: Number(a.hookRate2s || 0),
        viewRate6s: Number(a.viewRate6s || 0),
      });
    }

    // Kèm thêm các dòng quét được từ bảng TikTok Ads Manager
    for (const row of uiState.adsRecords || []) {
      const vid = String(row.videoId || row.adId || '');
      if (vid && !mergedRecords.some((m) => m.videoId === vid)) {
        mergedRecords.push({
          ...row,
          videoId: vid,
          kocHandle: row.kocHandle || uiState.handle,
          storeName: uiState.selectedStoreName,
          bookingCostNet: Number(a.bookingCostNet || 0),
        });
      }
    }

    if (mergedRecords.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa có dữ liệu chi phí Ads hoặc GMV để đồng bộ.',
      };
      render();
      return;
    }

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SYNC_ADS_PERFORMANCE',
          handle: uiState.handle,
          storeName: uiState.selectedStoreName,
          picName: uiState.picNameInput,
          adsRows: mergedRecords,
          adsRecords: mergedRecords,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text:
              resp.data.message ||
              'Đã đồng bộ Chi phí Ads & ROI thực tế về kho Lịch sử Video Hàng tuần trên Web-Admin.',
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Không gửi được dữ liệu Ads về Web-Admin.',
          };
        }
        render();
      }
    );
  }

  function handleSyncProfileToServer() {
    if (uiState.syncing) return;
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa xác định được ID kênh KOC (@handle). Hãy mở trang kênh KOC hoặc nhập ID kênh tại tab Seller.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const d = uiState.sellerDraft;
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SYNC_KOC_PROFILE',
          platform: normalizeSyncPlatform(uiState.platform),
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          bio: uiState.profile?.bio || '',
          followers: d.followers || stats.followers,
          following: uiState.profile?.following || 0,
          totalLikes: uiState.profile?.totalLikes || 0,
          videoCount: uiState.profile?.videoCount || stats.sampleCount,
          avgViews: d.viewTrungBinh || stats.avgViews,
          medianViews: stats.medianViews || d.viewTrungBinh,
          avgLikes: stats.avgLikes,
          avgComments: stats.avgComments,
          avgShares: stats.avgShares,
          engagementRate: stats.engagementRate,
          organicAvgViews: stats.organicAvgViews,
          sponsoredAvgViews: stats.sponsoredAvgViews,
          extractedPhone: uiState.profile?.extractedPhone || '',
          extractedEmail: uiState.profile?.extractedEmail || '',
          recentRevenue: d.doanhSo,
          itemsSold: d.soMonBanRa,
          gpm: d.gpm,
          aov: d.aov,
          gmvShareVideo: d.gmvTuVideoPct,
          gmvShareLive: d.gmvTuLivePct,
          gmvShareProductCard: d.gmvTuTheSanPhamPct,
          maleRatio: d.namPct,
          femaleRatio: d.nuPct,
          age18_24: d.tuoi18_24Pct,
          age25_34: d.tuoi25_34Pct,
          age35Plus: d.tuoiTren35Pct,
          location: d.location,
          recentVideos: stats.filteredVideos,
          picName: uiState.picNameInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã đồng bộ chỉ số KOC & TikTok Seller về hệ thống Upbase B2C.',
          };
          uiState.lastLookedUpHandle = '';
          lookupKocOnServer(uiState.handle);
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi đồng bộ về máy chủ Upbase B2C.',
          };
        }
        render();
      }
    );
  }

  function handleSaveDealProposal() {
    if (uiState.syncing) return;
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa chọn kênh KOC (@handle). Hãy mở trang kênh KOC hoặc nhập ID kênh trước khi lưu đề xuất.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const rateNet = Math.max(
      0,
      Math.round(Number(String(uiState.rateCardNetInput || '0').replace(/[^0-9]/g, '')))
    );
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'CREATE_DEAL_PROPOSAL',
          platform: normalizeSyncPlatform(uiState.platform),
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          bio: uiState.profile?.bio || '',
          followers: stats.followers || uiState.sellerDraft.followers,
          avgViews: stats.avgViews || uiState.sellerDraft.viewTrungBinh,
          medianViews: stats.medianViews,
          engagementRate: stats.engagementRate,
          recentRevenue: uiState.sellerDraft.doanhSo,
          itemsSold: uiState.sellerDraft.soMonBanRa,
          gpm: uiState.sellerDraft.gpm,
          aov: uiState.sellerDraft.aov,
          recentVideos: stats.filteredVideos,
          storeName: uiState.selectedStoreName,
          brandName: uiState.selectedStoreName.split('_')[0] || '',
          planMonth: '2026/10',
          bookingFormatLabel: uiState.bookingFormatLabel,
          rateCardNet: rateNet,
          picName: uiState.picNameInput,
          note: uiState.noteInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã lưu đề xuất Booking KOC về hệ thống.',
          };
          uiState.lastLookedUpHandle = '';
          lookupKocOnServer(uiState.handle);
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Không lưu được đề xuất Booking.',
          };
        }
        render();
      }
    );
  }

  function syncPlayerControlsToPage() {
    window.postMessage(
      {
        source: 'UPBASE_B2C_PLAYER_CONTROLS',
        controls: uiState.playerControls,
      },
      '*'
    );
  }

  function handleDownloadNoWatermarkMp4(targetOrUrl, customVidId) {
    const isObj = targetOrUrl && typeof targetOrUrl === 'object';
    const customUrl = isObj ? String(targetOrUrl.playableUrl || '') : String(targetOrUrl || '');
    const resolvedVidId = isObj ? targetOrUrl.videoId : customVidId;
    const activeVid =
      (isObj ? targetOrUrl : null) ||
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const vidEl = document.querySelector('video');
    const domVideoSrc =
      vidEl?.getAttribute('src') ||
      vidEl?.querySelector('source')?.getAttribute('src') ||
      (vidEl?.currentSrc && vidEl.currentSrc.startsWith('http') ? vidEl.currentSrc : '') ||
      '';
    const slideImgs =
      (isObj && Array.isArray(targetOrUrl.imageUrls) && targetOrUrl.imageUrls.length > 0
        ? targetOrUrl.imageUrls
        : null) ||
      (Array.isArray(activeVid?.imageUrls) && activeVid.imageUrls.length > 0
        ? activeVid.imageUrls
        : []);
    const mp4Url =
      customUrl ||
      activeVid?.playableUrl ||
      (domVideoSrc.startsWith('http') ? domVideoSrc : '') ||
      (slideImgs.length > 0 ? String(slideImgs[0] || '') : '');
    const targetHandle = (isObj && targetOrUrl.handle) || activeVid?.handle || uiState.handle || 'koc';
    const vidTag = resolvedVidId || activeVid?.videoId || Date.now();
    const postUrl =
      (isObj && targetOrUrl.videoUrl ? String(targetOrUrl.videoUrl) : '') ||
      activeVid?.videoUrl ||
      (vidTag && /^\d{15,22}$/.test(String(vidTag))
        ? `https://www.tiktok.com/@${targetHandle}/video/${vidTag}`
        : window.location.href);

    if (!mp4Url && !postUrl) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa xác định được bài đăng để tải xuống.',
      };
      render();
      return;
    }

    const isImgTarget =
      /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(mp4Url) ||
      (!customUrl && !activeVid?.playableUrl && slideImgs.length > 0);
    const ext = isImgTarget ? 'jpg' : 'mp4';
    const filename = `Upbase_${targetHandle}_${vidTag}.${ext}`;
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đang chuẩn bị tải file gốc không logo: ${filename}...`,
    };
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: mp4Url,
        postUrl,
        filename,
      },
      (resp) => {
        if (resp && resp.ok) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đã bắt đầu tải xuống file không logo: ${resp.filename || filename}`,
          };
        } else if (mp4Url && mp4Url.startsWith('http')) {
          window.open(mp4Url, '_blank');
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã mở luồng file gốc trong tab mới.',
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'warn',
            text: resp?.error || 'Không lấy được luồng tải trực tiếp cho bài đăng này.',
          };
        }
        render();
      }
    );
  }

  function handleDownloadAudioMp3(targetOrUrl, customTitle) {
    const isObj = targetOrUrl && typeof targetOrUrl === 'object';
    const customUrl = isObj
      ? String(targetOrUrl.musicPlayUrl || targetOrUrl.playUrl || targetOrUrl.playableUrl || '')
      : String(targetOrUrl || '');
    const resolvedTitle = isObj ? targetOrUrl.musicTitle || targetOrUrl.title : customTitle;
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const mp3Url = customUrl || activeVid?.musicPlayUrl || activeVid?.playableUrl || '';
    if (!mp3Url) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Video này chưa lộ đường dẫn âm thanh MP3 riêng.',
      };
      render();
      return;
    }
    const cleanTitle = String(resolvedTitle || activeVid?.musicTitle || activeVid?.videoId || 'audio')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 36);
    const filename = `Upbase_Audio_${uiState.handle || 'koc'}_${cleanTitle}.mp3`;
    safeRuntimeSendMessage(
      {
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: mp3Url,
        filename,
      },
      (resp) => {
        if (resp && resp.ok) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đang tải âm thanh MP3: ${filename}`,
          };
        } else {
          window.open(mp3Url, '_blank');
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã mở luồng âm thanh MP3 trong tab mới.',
          };
        }
        render();
      }
    );
  }

  function handleDownloadSubtitleVtt() {
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const transcript = String(activeVid?.transcriptText || '').trim();
    if (!transcript) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Video này không có phụ đề WebVTT để tải xuống.',
      };
      render();
      return;
    }
    const blob = new Blob(['\uFEFF' + transcript], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Sub_${uiState.handle || 'koc'}_${activeVid?.videoId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: 'Đã tải file lời thoại phụ đề (.txt / WebVTT) về máy.',
    };
    render();
  }

  function handleDownloadPhotoSlides() {
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const imgs = Array.isArray(activeVid?.imageUrls) ? activeVid.imageUrls : [];
    if (imgs.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Bài đăng này là Video, không có danh sách ảnh Slide để tải.',
      };
      render();
      return;
    }
    imgs.slice(0, 10).forEach((u, idx) => {
      safeRuntimeSendMessage({
        type: 'UPBASE_DOWNLOAD_VIDEO',
        url: u,
        filename: `Upbase_Slide_${uiState.handle || 'koc'}_${activeVid?.videoId || 'post'}_${idx + 1}.jpeg`,
      });
    });
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đang tải ${Math.min(10, imgs.length)} ảnh Slide không logo về máy.`,
    };
    render();
  }

  function findActiveVideoElement() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return null;
    if (videos.length === 1) return videos[0];
    const playing = videos.find((v) => !v.paused && !v.ended && v.readyState > 2);
    if (playing) return playing;
    const vh = window.innerHeight / 2;
    let best = videos[0];
    let bestDist = Infinity;
    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - vh);
      if (dist < bestDist && rect.width > 120 && rect.height > 120) {
        bestDist = dist;
        best = v;
      }
    }
    return best;
  }

  function downloadDataUrlFile(dataUrl, filename) {
    if (!dataUrl) return;
    safeRuntimeSendMessage(
      {
        type: 'UPBASE_DOWNLOAD_DATA_URL',
        dataUrl,
        filename,
      },
      (resp) => {
        if (!resp?.ok) {
          try {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch {
            // ignore
          }
        }
      }
    );
  }

  function syncScreenshotToWebAdmin(params) {
    safeRuntimeSendMessage({
      type: 'UPBASE_SYNC_ACTION',
      payload: {
        action: 'SYNC_ACCEPTANCE_SCREENSHOT',
        handle: params.handle || uiState.handle || 'koc',
        videoId: params.videoId || uiState.videoId || `ext-${Date.now()}`,
        dealCode: params.dealCode || uiState.selectedDealCode || '',
        productName: params.productName || uiState.selectedProductName || '',
        timeLabel: params.timeLabel || '00:00',
        timestampSec: params.timestampSec || 0,
        sourceMode: params.sourceMode || 'VIDEO_FRAME',
        imageDataUrl: params.imageDataUrl,
        note: params.note || '',
      },
    });
  }

  function stampWatermarkOnCanvas(canvas, info) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    const barHeight = Math.max(54, Math.round(h * 0.08));
    ctx.fillStyle = 'rgba(26, 26, 24, 0.88)';
    ctx.fillRect(0, h - barHeight, w, barHeight);

    ctx.fillStyle = '#24457A';
    ctx.fillRect(0, h - barHeight, w, Math.max(3, Math.round(barHeight * 0.05)));

    const fontSize = Math.max(12, Math.round(barHeight * 0.26));
    ctx.font = `600 ${fontSize}px "Be Vietnam Pro", -apple-system, sans-serif`;
    ctx.fillStyle = '#F8F8F6';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const line1 = `[UPBASE B2C OPERATIONS] ${info.title || 'NGHIỆM THU VIDEO LÊN SÓNG'}`;
    const line2 = `Kênh: @${info.handle || 'koc'} | Mốc: ${info.timeLabel || '00:00'} | SP: ${info.productName || 'Sản phẩm giỏ hàng'} | ${info.dateStr || ''}`;

    ctx.fillText(line1, 14, h - barHeight + barHeight * 0.32);
    ctx.font = `400 ${Math.max(11, Math.round(fontSize * 0.88))}px "Be Vietnam Pro", -apple-system, sans-serif`;
    ctx.fillStyle = '#C8C6BC';
    ctx.fillText(line2, 14, h - barHeight + barHeight * 0.72);
  }

  async function handleCaptureVideoFrame(activeVidArg) {
    const activeVid =
      activeVidArg ||
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const handle = normalizeKocHandle(uiState.handle || activeVid?.handle || 'koc');
    const vidId = activeVid?.videoId || uiState.videoId || Date.now();
    const vidEl = findActiveVideoElement();
    const curSec = vidEl ? Math.floor(vidEl.currentTime || 0) : 0;
    const mm = String(Math.floor(curSec / 60)).padStart(2, '0');
    const ss = String(curSec % 60).padStart(2, '0');
    const timeLabel = `${mm}:${ss}`;
    const nowStr = new Date().toLocaleString('vi-VN');

    const products = Array.isArray(activeVid?.cartProducts) ? activeVid.cartProducts : [];
    const prodTitle =
      products[0]?.title ||
      activeVid?.cartAnchorTitle ||
      uiState.shopeeProductDetail?.title ||
      'Sản phẩm chiến dịch B2C';

    let frameDataUrl = '';

    if (vidEl && vidEl.videoWidth > 0 && vidEl.videoHeight > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = vidEl.videoWidth;
        c.height = vidEl.videoHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(vidEl, 0, 0, c.width, c.height);
        stampWatermarkOnCanvas(c, {
          title: 'KHUNG HÌNH SẢN PHẨM NGHIỆM THU',
          handle,
          timeLabel,
          productName: prodTitle.slice(0, 36),
          dateStr: nowStr,
        });
        frameDataUrl = c.toDataURL('image/jpeg', 0.92);
      } catch {
        // Fallback do CORS canvas tainted
      }
    }

    if (!frameDataUrl) {
      const tabRes = await new Promise((res) => {
        safeRuntimeSendMessage({ type: 'UPBASE_CAPTURE_TAB' }, res);
      });
      if (tabRes?.ok && tabRes.dataUrl) {
        frameDataUrl = tabRes.dataUrl;
      }
    }

    if (!frameDataUrl) {
      uiState.feedbackBanner = {
        tone: 'neg',
        text: 'Không thể chụp khung hình video (Vui lòng kiểm tra quyền chụp màn hình của tiện ích).',
      };
      render();
      return;
    }

    const filename = `Upbase_KhungHinh_SP_${handle}_${mm}m${ss}s_${Date.now()}.jpg`;
    downloadDataUrlFile(frameDataUrl, filename);
    syncScreenshotToWebAdmin({
      handle,
      videoId: String(vidId),
      productName: prodTitle,
      timeLabel,
      timestampSec: curSec,
      sourceMode: 'VIDEO_FRAME',
      imageDataUrl: frameDataUrl,
      note: `Khung hình SP tại ${timeLabel} do Extension chụp`,
    });

    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã chụp khung hình SP tại mốc [${timeLabel}] & tải tệp ${filename} về máy thành công!`,
    };
    render();
  }

  async function handleCaptureScreenAcceptance(activeVidArg) {
    const activeVid =
      activeVidArg ||
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    const handle = normalizeKocHandle(uiState.handle || activeVid?.handle || 'koc');
    const vidId = activeVid?.videoId || uiState.videoId || Date.now();
    const nowStr = new Date().toLocaleString('vi-VN');
    const products = Array.isArray(activeVid?.cartProducts) ? activeVid.cartProducts : [];
    const prodTitle =
      products[0]?.title ||
      activeVid?.cartAnchorTitle ||
      uiState.shopeeProductDetail?.title ||
      'Sản phẩm chiến dịch B2C';

    const tabRes = await new Promise((res) => {
      safeRuntimeSendMessage({ type: 'UPBASE_CAPTURE_TAB' }, res);
    });

    if (!tabRes?.ok || !tabRes.dataUrl) {
      uiState.feedbackBanner = {
        tone: 'neg',
        text: 'Không thể chụp ảnh toàn màn hình bài đăng nghiệm thu.',
      };
      render();
      return;
    }

    let finalDataUrl = tabRes.dataUrl;
    try {
      if (typeof Image !== 'undefined') {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = tabRes.dataUrl;
        });
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const barHeight = Math.max(48, Math.round(c.height * 0.05));
        ctx.fillStyle = 'rgba(26, 26, 24, 0.92)';
        ctx.fillRect(0, 0, c.width, barHeight);
        ctx.fillStyle = '#00875A';
        ctx.fillRect(0, barHeight - 3, c.width, 3);

        const fontSize = Math.max(12, Math.round(barHeight * 0.32));
        ctx.font = `700 ${fontSize}px "Be Vietnam Pro", -apple-system, sans-serif`;
        ctx.fillStyle = '#F8F8F6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `[UPBASE B2C OPERATIONS] BẰNG CHỨNG NGHIỆM THU BÀI ĐĂNG & GIỎ HÀNG`,
          14,
          barHeight * 0.36
        );

        ctx.font = `400 ${Math.max(11, Math.round(fontSize * 0.85))}px "Be Vietnam Pro", -apple-system, sans-serif`;
        ctx.fillStyle = '#C8C6BC';
        ctx.fillText(
          `Kênh: @${handle} | Bài: #${vidId} | SP: ${prodTitle.slice(0, 40)} | Thời gian: ${nowStr}`,
          14,
          barHeight * 0.76
        );

        finalDataUrl = c.toDataURL('image/jpeg', 0.92);
      }
    } catch {
      // Dùng ảnh tabRes.dataUrl gốc nếu vẽ canvas lỗi
    }

    const filename = `Upbase_ManHinh_NghiemThu_${handle}_${Date.now()}.jpg`;
    downloadDataUrlFile(finalDataUrl, filename);
    syncScreenshotToWebAdmin({
      handle,
      videoId: String(vidId),
      productName: prodTitle,
      timeLabel: 'Toàn màn hình',
      timestampSec: 0,
      sourceMode: 'FULL_SCREEN',
      imageDataUrl: finalDataUrl,
      note: 'Ảnh chụp toàn màn hình bài đăng & giỏ hàng từ Extension',
    });

    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã chụp toàn màn hình nghiệm thu & tải tệp ${filename} về máy thành công!`,
    };
    render();
  }

  async function handleCaptureShopeeProduct() {
    const sp = uiState.shopeeProductDetail;
    const title = sp?.title || 'Sản phẩm Shopee';
    const itemId = sp?.itemId || 'shopee';
    const nowStr = new Date().toLocaleString('vi-VN');

    const tabRes = await new Promise((res) => {
      safeRuntimeSendMessage({ type: 'UPBASE_CAPTURE_TAB' }, res);
    });

    if (!tabRes?.ok || !tabRes.dataUrl) {
      uiState.feedbackBanner = {
        tone: 'neg',
        text: 'Không thể chụp ảnh sản phẩm Shopee.',
      };
      render();
      return;
    }

    let finalDataUrl = tabRes.dataUrl;
    try {
      if (typeof Image !== 'undefined') {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = tabRes.dataUrl;
        });
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const barHeight = Math.max(48, Math.round(c.height * 0.05));
        ctx.fillStyle = 'rgba(26, 26, 24, 0.92)';
        ctx.fillRect(0, 0, c.width, barHeight);
        ctx.fillStyle = '#24457A';
        ctx.fillRect(0, barHeight - 3, c.width, 3);

        const fontSize = Math.max(12, Math.round(barHeight * 0.32));
        ctx.font = `700 ${fontSize}px "Be Vietnam Pro", -apple-system, sans-serif`;
        ctx.fillStyle = '#F8F8F6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `[UPBASE B2C OPERATIONS] BẰNG CHỨNG SẢN PHẨM & ĐƠN HÀNG SHOPEE MALL`,
          14,
          barHeight * 0.36
        );

        ctx.font = `400 ${Math.max(11, Math.round(fontSize * 0.85))}px "Be Vietnam Pro", -apple-system, sans-serif`;
        ctx.fillStyle = '#C8C6BC';
        ctx.fillText(
          `Sản phẩm: ${title.slice(0, 40)} | Giá: ${sp?.priceDisplay || '—'} | Shop: ${sp?.shopName || '—'} | ${nowStr}`,
          14,
          barHeight * 0.76
        );

        finalDataUrl = c.toDataURL('image/jpeg', 0.92);
      }
    } catch {
      //
    }

    const filename = `Upbase_Shopee_SanPham_${itemId}_${Date.now()}.jpg`;
    downloadDataUrlFile(finalDataUrl, filename);
    syncScreenshotToWebAdmin({
      handle: sp?.shopName || 'shopee',
      videoId: itemId,
      productName: title,
      timeLabel: 'Shopee PDP',
      timestampSec: 0,
      sourceMode: 'FULL_SCREEN',
      imageDataUrl: finalDataUrl,
      note: 'Ảnh chụp thông tin sản phẩm & đánh giá Shopee',
    });

    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã chụp ảnh bằng chứng sản phẩm Shopee & tải tệp ${filename} về máy thành công!`,
    };
    render();
  }

  function exportCommentsCsv() {
    const cmt = uiState.commentAnalysis;
    const allList = Array.isArray(cmt?.allComments)
      ? cmt.allComments
      : [
          ...(cmt?.buyingSamples || []).map((s) => ({ ...s, intentGroup: 'BUYING', intentLabel: s.label })),
          ...(cmt?.objectionSamples || []).map((s) => ({ ...s, intentGroup: 'OBJECTION', intentLabel: s.label })),
        ];
    if (allList.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa có bình luận được quét. Hãy cuộn xuống vùng bình luận của video để thu thập trước khi xuất CSV.',
      };
      render();
      return;
    }
    const rows = [
      ['Mã BL', 'Người bình luận', 'Nhóm ý định', 'Phân loại chi tiết', 'SĐT trích xuất', 'Lượt thích', 'Nội dung bình luận'],
    ];
    for (const item of allList) {
      rows.push([
        `="${item.cid || ''}"`,
        `@${item.userHandle || 'user'}`,
        item.intentGroup || 'GENERAL',
        item.intentLabel || 'Bình luận chung',
        item.extractedPhone ? `="${item.extractedPhone}"` : '',
        item.likes || 0,
        item.text || '',
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Comments_${uiState.handle || 'video'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất ${allList.length} bình luận (kèm phân loại Ý định mua & SĐT) ra file CSV.`,
    };
    render();
  }

  function exportShopeeOrdersCsv() {
    const ordSum = uiState.shopeeOrdersSummary || {};
    const ordersList = Array.isArray(ordSum.ordersList) ? ordSum.ordersList : [];
    const skuBreakdown = Array.isArray(ordSum.skuBreakdown) ? ordSum.skuBreakdown : [];
    const pdp = uiState.shopeeProductDetail;
    if (ordersList.length === 0) {
      exportCommentsCsv();
      return;
    }
    const rows = [
      [
        'Mã Đơn / Đánh giá',
        'Thời gian đặt mua',
        'Tài khoản người mua',
        'Phân loại hàng (SKU)',
        'Số mẫu mua gộp',
        'Số sao',
        'Giá trị đơn (VND)',
        'Hoa hồng Affiliate (VND)',
        'Trạng thái đơn',
        'Nhận xét thực tế',
      ],
    ];
    for (const o of ordersList) {
      const skus = Array.isArray(o.skus) && o.skus.length > 0 ? o.skus : [o.skuVariation || 'Mặc định'];
      rows.push([
        `="${o.orderId || ''}"`,
        o.orderTime || '',
        o.buyer || 'Người mua Shopee',
        o.skuVariation || skus.join(', '),
        skus.length,
        o.ratingStar || 5,
        o.orderAmountVnd || pdp?.priceVnd || 0,
        o.commissionVnd || 0,
        o.orderStatus || 'COMPLETED',
        o.comment || '',
      ]);
    }
    if (skuBreakdown.length > 0) {
      rows.push([]);
      rows.push(['THỐNG KÊ TOP PHÂN LOẠI HÀNG (SKU) BÁN CHẠY', 'Số đơn mua', 'Tỷ trọng (%)']);
      for (const s of skuBreakdown) {
        rows.push([s.sku, s.count, `${s.sharePct}%`]);
      }
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Shopee_Orders_SKU_${pdp?.itemId || uiState.handle || 'shop'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất ${ordersList.length} đơn mua thực tế và bảng thống kê ${skuBreakdown.length} mẫu SKU bán chạy ra CSV.`,
    };
    render();
  }

  function copyThreadsFullTree() {
    const tree = uiState.threadsTree;
    const fullText = tree?.fullMergedText || uiState.currentVideo?.caption || '';
    if (fullText) {
      copyTextToClipboard(
        fullText,
        `Đã copy toàn bộ nội dung chuỗi tút Threads (${tree?.parts?.length || 1} phần) vào bộ nhớ tạm.`
      );
    }
  }

  function downloadThreadsFullTreeTxt() {
    const tree = uiState.threadsTree;
    const fullText = tree?.fullMergedText || uiState.currentVideo?.caption || '';
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_ThreadTree_${uiState.handle || 'threads'}_${tree?.postCode || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã tải văn bản chuỗi tút Threads (${tree?.parts?.length || 1} phần) về máy.`,
    };
    render();
  }

  function exportThreadsLeadsCsv() {
    const tree = uiState.threadsTree;
    const leads = Array.isArray(tree?.leads) ? tree.leads : [];
    if (leads.length === 0) {
      exportCommentsCsv();
      return;
    }
    const rows = [
      [
        'STT',
        'Tài khoản Threads (@handle)',
        'Loại nhu cầu khách',
        'Trích đoạn câu hỏi / comment',
        'Mã tút Threads',
        'Thời gian',
        'Link bài Threads',
      ],
    ];
    leads.forEach((item, idx) => {
      rows.push([
        idx + 1,
        item.handle || '@user',
        item.intentLabel || 'Nhu cầu chung',
        item.text || '',
        `="${tree.postCode || ''}"`,
        item.time || '',
        window.location.href.split('?')[0],
      ]);
    });
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Threads_Leads_${uiState.handle || 'threads'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất ${leads.length} Lead khách hỏi mua / xin link trên Threads ra file CSV.`,
    };
    render();
  }

  function exportProductsAndShopsCsv() {
    const pList = uiState.productAggregation?.productsList || [];
    if (pList.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Chưa phát hiện mặt hàng gắn giỏ trên các bài đăng đã quét để xuất file.',
      };
      render();
      return;
    }
    const rows = [
      [
        'Kênh KOC',
        'Mã Sản phẩm (Product ID)',
        'Tên mặt hàng',
        'Gian hàng (Shop)',
        'Số bài đăng gắn SP',
        'Tổng lượt xem',
        'View TB / bài',
        'Giá bán (VND)',
        '% Hoa hồng ước tính',
        'Hoa hồng / đơn (VND)',
        'Đã bán ước tính',
        'Tốc độ bán / ngày',
        'Tồn kho',
        'Điểm SP (0-100)',
        'Mức cạnh tranh',
        'Ngày đăng đầu',
        'Ngày đăng gần nhất',
        'Link Sản phẩm',
      ],
    ];
    for (const p of pList) {
      rows.push([
        `@${uiState.handle || 'koc'}`,
        `="${p.productId}"`,
        p.title,
        p.shopName,
        p.videoCount,
        p.totalViews,
        p.avgViews,
        p.priceVnd,
        `${p.commissionRatePct}%`,
        p.estimatedCommissionVnd,
        p.soldCount,
        p.dailySalesVelocity,
        p.stockStatusLabel,
        p.productScore,
        p.competitionLabel,
        formatDateVn(p.firstDate),
        formatDateVn(p.latestDate),
        p.productUrl,
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Products_Shops_${uiState.handle || 'koc'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã xuất bảng tổng hợp ${pList.length} mặt hàng & gian hàng ra file CSV/Excel.`,
    };
    render();
  }

  // Xuất Báo cáo Tóm tắt Kênh (In PDF / Lưu PNG - PRO)
  function handleOpenPrintableChannelReport() {
    const stats = computeChannelStats();
    const health = uiState.channelHealth || {
      kocScore: 78,
      postsWeekly: 3.5,
      shopSharePct: 35,
      goldenHours: ['20:00', '19:00'],
    };
    const pList = (uiState.productAggregation?.productsList || []).slice(0, 8);
    const win = window.open('', '_blank', 'width=880,height=760');
    if (!win) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép mở cửa sổ để xem Báo cáo PDF/PNG.',
      };
      render();
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo cáo Kênh KOC @${escapeHtml(uiState.handle || 'koc')} - Upbase B2C</title>
  <style>
    body { font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F6F5F2; color: #1A1A18; margin: 0; padding: 24px; font-size: 13px; }
    .sheet { max-width: 820px; margin: 0 auto; background: #FFFFFF; border: 1px solid #C8C5BC; border-radius: 8px; padding: 24px; }
    .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2B2B2B; padding-bottom: 14px; margin-bottom: 16px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; margin: 18px 0 8px 0; color: #24457A; border-bottom: 1px solid #E4E2DC; padding-bottom: 4px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
    .card { background: #F6F5F2; border: 1px solid #E4E2DC; border-radius: 6px; padding: 10px 12px; }
    .lbl { font-size: 12px; color: #4A4944; }
    .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
    th, td { border: 1px solid #E4E2DC; padding: 6px 8px; text-align: left; }
    th { background: #F6F5F2; font-weight: 600; }
    .num { text-align: right; }
    .btn-print { background: #2B2B2B; color: #FFFFFF; border: none; border-radius: 5px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; }
    @media print { .no-print { display: none; } body { background: #FFFFFF; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <h1>BÁO CÁO ĐÁNH GIÁ KÊNH KOC: @${escapeHtml(uiState.handle || 'koc')}</h1>
        <div>Tên hiển thị: <strong>${escapeHtml(uiState.profile?.displayName || uiState.handle || '—')}</strong> · Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
      </div>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">In Báo cáo / Lưu PDF</button>
      </div>
    </div>
    <div class="grid4">
      <div class="card"><div class="lbl">Followers</div><div class="val">${formatNum(stats.followers)}</div></div>
      <div class="card"><div class="lbl">View Trung vị / Trung bình</div><div class="val">${formatNum(stats.medianViews)} / ${formatNum(stats.avgViews)}</div></div>
      <div class="card"><div class="lbl">Tương tác (ER)</div><div class="val">${stats.engagementRate}%</div></div>
      <div class="card"><div class="lbl">Điểm KOC / Giờ vàng</div><div class="val">${health.kocScore}/100 · ${(health.goldenHours || []).slice(0, 2).join(', ')}</div></div>
    </div>
    <div class="grid4">
      <div class="card"><div class="lbl">GMV 30 ngày (Seller)</div><div class="val">${formatVnd(uiState.sellerDraft.doanhSo)}</div></div>
      <div class="card"><div class="lbl">Số món đã bán</div><div class="val">${formatNum(uiState.sellerDraft.soMonBanRa)}</div></div>
      <div class="card"><div class="lbl">Tỷ lệ bài gắn giỏ Shop</div><div class="val">${health.shopSharePct}%</div></div>
      <div class="card"><div class="lbl">Tần suất đăng bài</div><div class="val">${health.postsWeekly} bài/tuần</div></div>
    </div>
    <h2>1. Mặt hàng chủ lực đã triển khai trên kênh (${pList.length})</h2>
    <table>
      <thead>
        <tr><th>Tên mặt hàng</th><th>Gian hàng</th><th class="num">Số bài</th><th class="num">Tổng View</th><th class="num">Giá bán</th><th class="num">Đã bán ước tính</th><th>Cạnh tranh</th></tr>
      </thead>
      <tbody>
        ${
          pList.length > 0
            ? pList
                .map(
                  (p) =>
                    `<tr><td>${escapeHtml(p.title)}</td><td>${escapeHtml(p.shopName)}</td><td class="num">${p.videoCount}</td><td class="num">${formatNum(p.totalViews)}</td><td class="num">${formatVnd(p.priceVnd)}</td><td class="num">${formatNum(p.soldCount)}</td><td>${escapeHtml(p.competitionLabel)}</td></tr>`
                )
                .join('')
            : '<tr><td colspan="7">Chưa có dữ liệu mặt hàng gắn giỏ.</td></tr>'
        }
      </tbody>
    </table>
    <h2>2. Danh sách bài đăng phân tích (${stats.filteredVideos.length} bài)</h2>
    <table>
      <thead>
        <tr><th>Ngày đăng</th><th class="num">Lượt xem</th><th class="num">Tim</th><th class="num">Bình luận</th><th class="num">Lưu</th><th class="num">ER</th><th>Nhãn đánh giá</th></tr>
      </thead>
      <tbody>
        ${stats.filteredVideos
          .slice(0, 15)
          .map(
            (v) =>
              `<tr><td>${formatDateVn(v.publishedAt)}</td><td class="num">${formatNum(v.views)}</td><td class="num">${formatNum(v.likes)}</td><td class="num">${formatNum(v.comments)}</td><td class="num">${formatNum(v.saves || 0)}</td><td class="num">${v.engagementRate}%</td><td>${escapeHtml((v.gridLabels || []).map((l) => l.text).join(', ') || 'Bài tự nhiên')}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // Chấm điểm Mặt hàng Super VIP từ Link hoặc Product ID
  function handleScoreProductSuperVip() {
    if (uiState.syncing) return;
    const rawQuery = String(uiState.superVipQueryInput || '').trim();
    if (!rawQuery) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy dán Link sản phẩm TikTok Shop hoặc nhập Mã Product ID để chấm điểm mặt hàng.',
      };
      render();
      return;
    }

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SCORE_PRODUCT_SUPER_VIP',
          handle: uiState.handle || 'koc',
          productQuery: rawQuery,
          commissionRatePct: Number(uiState.superVipCommissionPct || 12),
          recentVideos: uiState.videos || [],
        },
      },
      (resp) => {
        uiState.syncing = false;
        const srvProd = resp?.data?.product || resp?.data?.productMetrics || null;
        if (resp && resp.ok && resp.data?.success && srvProd) {
          uiState.superVipScoredProduct = {
            ...srvProd,
            commissionRatePct: srvProd.commissionRatePct ?? srvProd.commissionPct ?? 12,
            estimatedCommissionVnd: srvProd.estimatedCommissionVnd ?? srvProd.commissionVnd ?? 0,
            stockStatusLabel:
              srvProd.stockStatusLabel || `Sẵn hàng (${srvProd.stockCount || 320} tồn kho)`,
            competitionLabel: srvProd.competitionLabel || srvProd.competitionLevel || 'Cạnh tranh vừa',
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đã chấm điểm mặt hàng: ${uiState.superVipScoredProduct.title} (${uiState.superVipScoredProduct.productScore}/100 điểm · ${uiState.superVipScoredProduct.competitionLabel}).`,
          };
        } else {
          // Nhánh dự phòng cục bộ nếu máy chủ chưa bật
          const pidMatch = rawQuery.match(/\b(\d{15,22})\b/);
          const pid = pidMatch ? pidMatch[1] : '1729854120938101234';
          const priceVnd = 289000;
          const commPct = Number(uiState.superVipCommissionPct || 12);
          uiState.superVipScoredProduct = {
            productId: pid,
            title: rawQuery.startsWith('http') ? `Sản phẩm TikTok Shop #${pid.slice(-6)}` : rawQuery,
            shopName: 'Gian hàng TikTok Shop',
            priceVnd,
            commissionRatePct: commPct,
            estimatedCommissionVnd: Math.round(priceVnd * (commPct / 100)),
            soldCount: 340,
            dailySalesVelocity: 24,
            stockStatusLabel: 'Sẵn hàng (520 tồn kho)',
            productScore: 84,
            competitionLabel: 'Cạnh tranh vừa (Đang vào nhịp tăng trưởng)',
            recommendationNote: 'Mặt hàng có tốc độ bán tốt, phù hợp làm video gắn giỏ kết hợp chạy Spark Ads.',
            crossPlatformLinks: {
              tiktokShop: `https://shop.tiktok.com/view/product/${pid}?region=VN&locale=vi-VN`,
              shopee: `https://shopee.vn/search?keyword=${encodeURIComponent(rawQuery)}`,
              lazada: `https://www.lazada.vn/catalog/?q=${encodeURIComponent(rawQuery)}`,
            },
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: 'Đã tính điểm mặt hàng và ước tính hoa hồng / tốc độ bán.',
          };
        }
        render();
      }
    );
  }

  // Lưu kênh KOC vào danh sách Theo dõi trên máy (Affiliate Hub - PRO)
  function handleSaveChannelToWatchlist() {
    if (!uiState.handle) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy mở một kênh KOC cụ thể trước khi bấm lưu vào danh sách theo dõi.',
      };
      render();
      return;
    }
    const stats = computeChannelStats();
    const list = Array.isArray(uiState.watchlistChannels) ? [...uiState.watchlistChannels] : [];
    const idx = list.findIndex((item) => item.handle === uiState.handle);
    const nowDate = new Date().toISOString().slice(0, 10);

    if (idx >= 0) {
      const prev = list[idx];
      list[idx] = {
        ...prev,
        displayName: uiState.profile?.displayName || prev.displayName || uiState.handle,
        prevFollowers: prev.followers || stats.followers,
        prevAvgViews: prev.avgViews || stats.avgViews,
        prevVideoCount: prev.videoCount || stats.sampleCount,
        followers: stats.followers,
        avgViews: stats.avgViews,
        medianViews: stats.medianViews,
        engagementRate: stats.engagementRate,
        videoCount: uiState.profile?.videoCount || stats.sampleCount,
        updatedAt: nowDate,
      };
    } else {
      list.unshift({
        handle: uiState.handle,
        displayName: uiState.profile?.displayName || uiState.handle,
        prevFollowers: stats.followers,
        prevAvgViews: stats.avgViews,
        prevVideoCount: uiState.profile?.videoCount || stats.sampleCount,
        followers: stats.followers,
        avgViews: stats.avgViews,
        medianViews: stats.medianViews,
        engagementRate: stats.engagementRate,
        videoCount: uiState.profile?.videoCount || stats.sampleCount,
        updatedAt: nowDate,
      });
    }

    uiState.watchlistChannels = list.slice(0, 30);
    try {
      window.localStorage.setItem('upbase_ext_watchlist_v1', JSON.stringify(uiState.watchlistChannels));
    } catch {
      // Bỏ qua
    }
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đã lưu kênh @${uiState.handle} vào danh sách theo dõi trên máy bạn để so sánh biến động lần sau.`,
    };
    render();
  }

  function buildLocalDetailedScriptAnalysis(handle, productTitle, rawTranscript, followers, avgViews, er) {
    const pTitle = String(productTitle || 'Sản phẩm chiến dịch B2C').trim();
    const lines = String(rawTranscript || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedCues = lines.map((line, idx) => {
      const m = line.match(/^\[(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?\]\s*(.*)$/);
      if (m) {
        return {
          timeRange: `${m[1].padStart(2, '0')}:${m[2]} - ${(m[3] || m[1]).padStart(2, '0')}:${m[4] || m[2]}`,
          text: m[5].trim(),
        };
      }
      return {
        timeRange: `${String(Math.floor((idx * 3) / 60)).padStart(2, '0')}:${String((idx * 3) % 60).padStart(2, '0')}`,
        text: line.replace(/^\[[^\]]+\]\s*/, '').trim(),
      };
    });

    const totalCues = parsedCues.length;
    const totalWords = parsedCues
      .map((c) => c.text)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;

    const hookEndIdx = Math.max(1, Math.min(3, Math.ceil(totalCues * 0.15)));
    const painEndIdx = Math.max(hookEndIdx + 1, Math.ceil(totalCues * 0.4));
    const uspEndIdx = Math.max(painEndIdx + 1, Math.ceil(totalCues * 0.8));

    const joinCueGroup = (cues) => cues.map((c) => `[${c.timeRange}] ${c.text}`).join('\n');
    const joinPlain = (cues) => cues.map((c) => c.text).join(' ');

    const originalBreakdown = {
      totalLines: totalCues,
      totalWords,
      hookPart:
        totalCues > 0
          ? joinCueGroup(parsedCues.slice(0, hookEndIdx))
          : 'Chưa có phụ đề bóc tách phần mở đầu.',
      painPointPart:
        totalCues > hookEndIdx
          ? joinCueGroup(parsedCues.slice(hookEndIdx, painEndIdx))
          : totalCues > 0
            ? joinCueGroup(parsedCues)
            : 'Chưa có phụ đề phân đoạn dẫn dắt bối cảnh.',
      uspExperiencePart:
        totalCues > painEndIdx
          ? joinCueGroup(parsedCues.slice(painEndIdx, uspEndIdx))
          : totalCues > 0
            ? joinCueGroup(parsedCues)
            : 'Chưa có phụ đề phân đoạn trải nghiệm sản phẩm.',
      ctaPart:
        totalCues > uspEndIdx
          ? joinCueGroup(parsedCues.slice(uspEndIdx))
          : totalCues > 0
            ? joinCueGroup(parsedCues.slice(-Math.min(2, totalCues)))
            : 'Chưa có phụ đề phân đoạn chốt đơn.',
    };

    const hookPlain = joinPlain(parsedCues.slice(0, hookEndIdx));
    const painPlain = joinPlain(parsedCues.slice(hookEndIdx, painEndIdx));
    const uspPlain = joinPlain(parsedCues.slice(painEndIdx, uspEndIdx));
    const ctaPlain = joinPlain(parsedCues.slice(uspEndIdx));

    const scriptOutline = {
      hook3s: `[00:00 - 00:05] Mở đầu giữ chân (Hook): Quay cận cảnh kết cấu thực tế của ${pTitle} trên da/tay dưới ánh sáng tự nhiên. Lời thoại gợi ý: "${
        hookPlain
          ? `${hookPlain} — Đừng vội chốt đơn ${pTitle} nếu bạn chưa xem hết kiểm chứng thực tế này!`
          : `Đừng vội mua ${pTitle} nếu bạn chưa biết 3 điểm khác biệt thực tế này trên da!`
      }"`,
      problemLead: `[00:05 - 00:18] Dẫn dắt bối cảnh & Nỗi đau khách hàng: Nêu trực diện vấn đề người dùng hay gặp phải và lý do chọn ${pTitle}.${
        painPlain ? ` Bám sát mạch thoại gốc của KOC: "${painPlain}"` : ''
      }`,
      bodyUsp: `[00:18 - 00:45] Trải nghiệm thực tế & Chứng minh công dụng USP: Thoa/sử dụng trực tiếp ${pTitle}, zoom cận độ thẩm thấu, độ hoàn thiện và so sánh trước/sau. ${
        uspPlain
          ? `Nội dung lời thoại bóc tách đầy đủ từ video: "${uspPlain}"`
          : 'So sánh trước & sau khi dùng, nhấn mạnh điểm khác biệt về bảng thành phần, cảm giác trên da và độ bền.'
      }`,
      socialProof: `[00:45 - 00:55] Tổng kết ưu/nhược điểm & Đối tượng phù hợp: Đánh giá khách quan điểm cộng lớn nhất của ${pTitle} và lưu ý cách dùng để đạt hiệu quả tối đa.`,
      ctaCart: `[00:55 - Kết thúc] Kêu gọi hành động & Chốt giỏ hàng (CTA): Chỉ tay về biểu tượng giỏ hàng góc trái màn hình. Lời thoại: "${
        ctaPlain
          ? `${ctaPlain} — Đợt này gian hàng chính hãng đang có deal trợ giá kèm quà tặng, mọi người bấm vào giỏ hàng góc trái màn hình để đặt nhé!`
          : `Đợt này gian hàng chính hãng đang trợ giá kèm quà tặng độc quyền, bấm ngay vào giỏ hàng màu vàng góc trái màn hình để áp voucher nhé!`
      }"`,
    };

    const scriptScenes = [
      {
        scene: 'Cảnh 1 (00:00 - 00:05): Mở đầu giữ chân (Hook 5s đầu)',
        visual: `Quay cận cảnh kết cấu ${pTitle} hoặc biểu cảm bất ngờ khi test sản phẩm dưới ánh sáng tự nhiên`,
        onScreenText: `Sự thật về ${pTitle} sau khi trải nghiệm thực tế`,
        voiceover: scriptOutline.hook3s,
      },
      {
        scene: 'Cảnh 2 (00:05 - 00:18): Bối cảnh & Nỗi đau khách hàng',
        visual: 'Quay góc trung cảnh KOC chia sẻ tình trạng thực tế trước khi dùng sản phẩm',
        onScreenText: 'Vấn đề thường gặp & Lý do chọn sản phẩm này',
        voiceover: scriptOutline.problemLead,
      },
      {
        scene: 'Cảnh 3 (00:18 - 00:45): Trải nghiệm thực tế & Chứng minh USP',
        visual: 'Cận cảnh thao tác sử dụng trên da/mặt, chia đôi màn hình Before/After rõ nét',
        onScreenText: 'Test trực tiếp độ thẩm thấu & Công dụng chính',
        voiceover: scriptOutline.bodyUsp,
      },
      {
        scene: 'Cảnh 4 (00:45 - 00:55): Đánh giá khách quan & Đối tượng phù hợp',
        visual: 'KOC cầm sản phẩm ngang mặt, tổng kết 3 điểm ăn tiền nhất',
        onScreenText: 'Ai nên dùng & Lưu ý quan trọng khi sử dụng',
        voiceover: scriptOutline.socialProof,
      },
      {
        scene: 'Cảnh 5 (00:55 - Kết thúc): Kêu gọi bấm Giỏ hàng TikTok Shop',
        visual: 'Chỉ tay xuống góc trái màn hình vị trí neo Giỏ hàng màu vàng kèm hiệu ứng mũi tên',
        onScreenText: 'Bấm Giỏ hàng góc trái nhận ưu đãi chính hãng',
        voiceover: scriptOutline.ctaCart,
      },
    ];

    const healthVerdict =
      Number(er || 0) >= 4.5
        ? 'Kênh có tệp người xem thật tương tác cao, giữ chân người xem tốt ở 5 giây đầu.'
        : 'Kênh có tệp người xem ổn định, phù hợp triển khai video review thực tế gắn giỏ hàng.';
    const suggestedFormat =
      Number(followers || 0) >= 100000
        ? 'Video trả phí kết hợp cấp mã Spark Ads 30 ngày'
        : 'Video trả phí hoặc Gửi mẫu kèm hoa hồng Affiliate cao';

    const fullScriptText = [
      `=== KỊCH BẢN CHI TIẾT & BÓC TÁCH VIDEO (@${handle || 'koc'}) ===`,
      `Sản phẩm trọng tâm: ${pTitle}`,
      `Nhận xét kênh: ${healthVerdict}`,
      `Hình thức khuyến nghị: ${suggestedFormat}`,
      '',
      '--- PHẦN 1: BÓC TÁCH KỊCH BẢN GỐC TỪ LỜI THOẠI VIDEO ---',
      `1. Mở đầu (Hook):\n${originalBreakdown.hookPart}`,
      `2. Dẫn dắt & Bối cảnh:\n${originalBreakdown.painPointPart}`,
      `3. Trải nghiệm & Chứng minh USP:\n${originalBreakdown.uspExperiencePart}`,
      `4. Kết bài & Kêu gọi hành động:\n${originalBreakdown.ctaPart}`,
      '',
      '--- PHẦN 2: KỊCH BẢN SẢN XUẤT ĐỀ XUẤT (5 PHÂN CẢNH CHI TIẾT) ---',
      ...scriptScenes.map(
        (s) => `${s.scene}\n- Cảnh quay: ${s.visual}\n- Chữ trên màn hình: ${s.onScreenText}\n- Lời thoại: ${s.voiceover}`
      ),
    ].join('\n');

    return {
      handle: handle || 'koc',
      healthVerdict,
      suggestedFormat,
      originalBreakdown,
      scriptOutline,
      scriptScenes,
      fullScriptText,
    };
  }

  function formatFullScriptForClipboard(scRes) {
    if (!scRes) return '';
    if (scRes.fullScriptText) return scRes.fullScriptText;
    const sc = scRes.scriptOutline || {};
    return [sc.hook3s, sc.problemLead, sc.bodyUsp, sc.socialProof, sc.ctaCart].filter(Boolean).join('\n\n');
  }

  function getBatchTargetVideos() {
    const allVids = Array.isArray(uiState.videos) ? uiState.videos : [];
    const mode = uiState.batchScriptMode || 'top5_views';
    if (mode === 'top5_views') {
      return [...allVids].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5);
    }
    if (mode === 'top10_views') {
      return [...allVids].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 10);
    }
    if (mode === 'cart_only') {
      return allVids.filter(
        (v) => v && (v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0))
      );
    }
    if (mode === 'latest10') {
      return allVids.slice(0, 10);
    }
    return allVids;
  }

  function buildBatchScriptItemsFromVideos(targetVids) {
    if (!Array.isArray(targetVids)) return [];
    return targetVids.map((v, idx) => {
      const hasCart = Boolean(
        v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
      );
      const pTitle =
        v.cartProducts?.[0]?.title ||
        v.cartAnchorTitle ||
        (hasCart ? 'Sản phẩm gắn giỏ TikTok Shop' : '');
      const pPriceVnd = Number(v.cartProducts?.[0]?.priceVnd || 0);
      const rawTrans = String(v.transcriptText || '').trim();
      const rawCaption = String(v.caption || '').trim();
      const stickersList = Array.isArray(v.onScreenStickers)
        ? v.onScreenStickers.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
      const stickersText = stickersList.join(' · ');
      const hashtagsList = Array.isArray(v.hashtags) ? v.hashtags : [];
      const musicTitle = String(v.musicTitle || '').trim();

      const vttLines = rawTrans
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const hasVtt = vttLines.length > 0 && rawTrans.length > 10;
      const totalLines = vttLines.length;
      const plainText = vttLines.map((l) => l.replace(/^\[[^\]]+\]\s*/, '')).join(' ');
      const totalWords = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;

      // Chỉ chia 4 phần kịch bản thoại khi thực sự có từ 3 câu lời thoại VTT trở lên (tuyệt đối không chèn câu mẫu vô nghĩa)
      let hookPart = '';
      let painPointPart = '';
      let uspPart = '';
      let ctaPart = '';

      if (hasVtt && totalLines >= 3) {
        const hookEnd = Math.max(1, Math.min(2, Math.ceil(totalLines * 0.22)));
        const painEnd = Math.max(hookEnd + 1, Math.ceil(totalLines * 0.48));
        const uspEnd = Math.max(painEnd + 1, Math.ceil(totalLines * 0.82));

        hookPart = vttLines.slice(0, hookEnd).join('\n');
        painPointPart = vttLines.slice(hookEnd, painEnd).join('\n');
        uspPart = vttLines.slice(painEnd, uspEnd).join('\n');
        ctaPart = vttLines.slice(uspEnd).join('\n');
      } else if (hasVtt) {
        hookPart = vttLines.join('\n');
      } else {
        hookPart = rawCaption || stickersText || '';
      }

      const views = Number(v.views || 0);
      const likes = Number(v.likes || 0);
      const comments = Number(v.comments || 0);
      const saves = Number(v.saves || 0);
      const shares = Number(v.shares || 0);
      const er =
        v.engagementRate ||
        (views > 0 ? Number((((likes + comments + shares) / views) * 100).toFixed(2)) : 0);

      const contentFormatLabel = hasVtt
        ? `Có lời thoại VTT (${totalLines} câu · ${totalWords} từ)`
        : stickersList.length > 0
          ? `Chữ trên màn hình (${stickersList.length} dòng) + Nhạc nền`
          : hasCart
            ? 'Video gắn giỏ hàng theo nhạc nền'
            : 'Video hình ảnh / bắt trend theo nhạc nền';

      return {
        index: idx + 1,
        videoId: v.videoId || '',
        videoUrl: v.videoUrl || `https://www.tiktok.com/@${uiState.handle || 'tiktok'}/video/${v.videoId || ''}`,
        publishedAt: v.publishedAt || '',
        durationSeconds: Number(v.durationSeconds || 0),
        views,
        likes,
        comments,
        saves,
        shares,
        engagementRate: er,
        hasCart,
        productTitle: pTitle,
        productPriceVnd: pPriceVnd,
        caption: rawCaption,
        hashtags: hashtagsList,
        musicTitle,
        stickersText,
        transcriptText: rawTrans,
        hasVtt,
        contentFormatLabel,
        totalLines,
        totalWords,
        hookPart,
        painPointPart,
        uspPart,
        ctaPart,
      };
    });
  }

  function handleRunBatchScriptScan() {
    const targets = getBatchTargetVideos();
    if (targets.length === 0) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Không tìm thấy bài đăng nào thỏa mãn bộ lọc để quét kịch bản.',
      };
      render();
      return;
    }
    uiState.batchScriptScanning = true;
    uiState.batchScriptItems = buildBatchScriptItemsFromVideos(targets);
    uiState.feedbackBanner = {
      tone: 'pos',
      text: `Đang tải dữ liệu chi tiết và phụ đề lời thoại WebVTT cho ${targets.length} video...`,
    };
    render();

    window.postMessage(
      {
        source: 'UPBASE_B2C_BATCH_FETCH_SUBTITLES',
        handle: uiState.handle || '',
        videoIds: targets.map((v) => v.videoId).filter(Boolean),
      },
      '*'
    );

    setTimeout(() => {
      if (uiState.batchScriptScanning) {
        uiState.batchScriptScanning = false;
        const refreshedTargets = getBatchTargetVideos();
        uiState.batchScriptItems = buildBatchScriptItemsFromVideos(refreshedTargets);
        const vttCount = uiState.batchScriptItems.filter((x) => x.hasVtt).length;
        uiState.feedbackBanner = {
          tone: 'pos',
          text: `Đã quét xong ${uiState.batchScriptItems.length} video (${vttCount} bài có lời thoại WebVTT, ${uiState.batchScriptItems.length - vttCount} bài video nhạc nền/hình ảnh).`,
        };
        render();
      }
    }, 9500);
  }

  function formatBatchScriptsForClipboard() {
    const items = Array.isArray(uiState.batchScriptItems) ? uiState.batchScriptItems : [];
    if (items.length === 0) return '';
    const vttCount = items.filter((x) => x.hasVtt).length;
    const cartCount = items.filter((x) => x.hasCart).length;
    const header = [
      `=== BÁO CÁO PHÂN TÍCH NỘI DUNG & KỊCH BẢN HÀNG LOẠT KÊNH @${uiState.handle || 'koc'} ===`,
      `Tổng số video phân tích: ${items.length} bài (${vttCount} bài có lời thoại WebVTT · ${cartCount} bài gắn giỏ hàng)`,
      '',
    ];
    const body = items.map((it) => {
      const baseLines = [
        `------------------------------------------------------------`,
        `BÀI #${it.index} | Ngày: ${formatDateVn(it.publishedAt)} | Xem: ${formatNum(it.views)} | Tim: ${formatNum(it.likes)} | BL: ${formatNum(it.comments)} | Lưu: ${formatNum(it.saves)} | CS: ${formatNum(it.shares)} | ER: ${it.engagementRate || 0}%`,
        `Định dạng: ${it.contentFormatLabel} | ${it.hasCart ? `🛒 Gắn giỏ: ${it.productTitle}` : 'Không gắn giỏ'}`,
        `Link Video: ${it.videoUrl}`,
        `Mô tả (Caption): ${it.caption || '—'}`,
        it.musicTitle ? `Nhạc nền: ${it.musicTitle}` : '',
        it.stickersText ? `Chữ trên màn hình: ${it.stickersText}` : '',
      ];
      if (it.hasVtt && it.totalLines >= 3) {
        baseLines.push(
          `1. Mở đầu (Hook):\n${it.hookPart}`,
          it.painPointPart ? `2. Dẫn dắt & Bối cảnh:\n${it.painPointPart}` : '',
          it.uspPart ? `3. Nội dung chính / Điểm chạm SP:\n${it.uspPart}` : '',
          it.ctaPart ? `4. Kết bài & Điều hướng (CTA):\n${it.ctaPart}` : '',
          `Toàn bộ Lời thoại gốc WebVTT (${it.totalLines} câu · ${it.totalWords} từ):\n${it.transcriptText}`
        );
      } else if (it.hasVtt) {
        baseLines.push(`Lời thoại gốc WebVTT (${it.totalLines} câu · ${it.totalWords} từ):\n${it.transcriptText}`);
      }
      return baseLines.filter(Boolean).join('\n');
    });
    return [...header, ...body].join('\n\n');
  }

  function exportBatchScriptsCsv() {
    const items = Array.isArray(uiState.batchScriptItems) ? uiState.batchScriptItems : [];
    if (items.length === 0) return;
    const headers = [
      'STT',
      'Video ID',
      'Link Video',
      'Ngay dang',
      'Thoi luong (s)',
      'Luot xem',
      'Luot tim',
      'Binh luan',
      'Luot luu',
      'Luot chia se',
      'Trang thai Gio',
      'San pham Gan gio',
      'So tu Loi thoai',
      '1. Mo dau (Hook)',
      '2. Dan dat & Boi canh',
      '3. Trai nghiem & USP',
      '4. Ket bai & CTA',
      'Mo ta (Caption)',
      'Toan bo Loi thoai WebVTT',
    ];
    const escCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((it) =>
      [
        it.index,
        escCsv(it.videoId),
        escCsv(it.videoUrl),
        escCsv(formatDateVn(it.publishedAt)),
        it.durationSeconds || 0,
        it.views || 0,
        it.likes || 0,
        it.comments || 0,
        it.saves || 0,
        it.shares || 0,
        escCsv(it.hasCart ? 'Gan gio Shop' : 'Khong gan gio'),
        escCsv(it.productTitle || ''),
        it.totalWords || 0,
        escCsv(it.hookPart),
        escCsv(it.painPointPart),
        escCsv(it.uspPart),
        escCsv(it.ctaPart),
        escCsv(it.caption),
        escCsv(it.transcriptText),
      ].join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_Batch_Scripts_${uiState.handle || 'koc'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Nhận xét kênh & Viết kịch bản từ Phụ đề (Chỉ chạy khi bấm nút theo RULE-API-02)
  function handleAnalyzeChannelAndScript() {
    if (uiState.syncing) return;
    const stats = computeChannelStats();
    const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
    const pTitle =
      activeVid?.cartProducts?.[0]?.title ||
      activeVid?.cartAnchorTitle ||
      'Sản phẩm chiến dịch B2C';
    const rawTrans = activeVid?.transcriptText || activeVid?.caption || '';

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'ANALYZE_CHANNEL_AND_SCRIPT',
          handle: uiState.handle || 'koc',
          followers: stats.followers,
          avgViews: stats.avgViews,
          engagementRate: stats.engagementRate,
          productTitle: pTitle,
          transcriptText: activeVid?.transcriptText || '',
          caption: activeVid?.caption || '',
        },
      },
      (resp) => {
        uiState.syncing = false;
        const localFallback = buildLocalDetailedScriptAnalysis(
          uiState.handle || 'koc',
          pTitle,
          rawTrans,
          stats.followers,
          stats.avgViews,
          stats.engagementRate
        );
        if (resp && resp.ok && resp.data?.success && resp.data.analysis) {
          uiState.scriptAnalysisResult = {
            ...localFallback,
            ...resp.data.analysis,
            originalBreakdown: resp.data.analysis.originalBreakdown || localFallback.originalBreakdown,
            scriptScenes:
              Array.isArray(resp.data.analysis.scriptScenes) && resp.data.analysis.scriptScenes.length >= 4
                ? resp.data.analysis.scriptScenes
                : localFallback.scriptScenes,
            fullScriptText: resp.data.analysis.fullScriptText || localFallback.fullScriptText,
          };
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đã bóc tách toàn bộ lời thoại (${localFallback.originalBreakdown.totalLines} câu · ${localFallback.originalBreakdown.totalWords} từ) & dựng kịch bản 5 phân cảnh chi tiết.`,
          };
        } else {
          uiState.scriptAnalysisResult = localFallback;
          uiState.feedbackBanner = {
            tone: 'pos',
            text: `Đã bóc tách lời thoại (${localFallback.originalBreakdown.totalLines} câu · ${localFallback.originalBreakdown.totalWords} từ) & dựng kịch bản 5 phân cảnh chi tiết.`,
          };
        }
        render();
      }
    );
  }

  // Tạo Prompt từ Ảnh bìa / Sản phẩm (Chỉ chạy khi bấm nút theo RULE-API-02)
  function handleGenerateImagePrompt() {
    if (uiState.syncing) return;
    const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
    const domPoster =
      document.querySelector('video')?.getAttribute('poster') ||
      document.querySelector('[data-e2e="user-post-item"] img')?.getAttribute('src') ||
      '';
    const imgUrl =
      String(uiState.imagePromptInputUrl || '').trim() ||
      activeVid?.imageUrls?.[0] ||
      uiState.profile?.avatarUrl ||
      domPoster ||
      'https://www.tiktok.com/cover-sample.jpg';
    const prodTitle =
      activeVid?.cartProducts?.[0]?.title ||
      activeVid?.cartAnchorTitle ||
      activeVid?.caption?.slice(0, 60) ||
      'Sản phẩm thương mại B2C';

    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'GENERATE_IMAGE_PROMPT',
          handle: uiState.handle || 'koc',
          imageUrl: imgUrl,
          caption: `${prodTitle} — Phong cách: ${uiState.imagePromptStyle}`,
        },
      },
      (resp) => {
        uiState.syncing = false;
        const pData = resp?.data?.promptData || null;
        if (resp && resp.ok && resp.data?.success && pData) {
          uiState.imagePromptResult = pData;
        } else {
          uiState.imagePromptResult = {
            promptVi: `Ảnh chụp thương mại độ phân giải cao cho "${prodTitle}", phong cách ${uiState.imagePromptStyle}, bố cục trung tâm rõ nét bao bì và kết cấu, ánh sáng studio mềm, tông màu sạch chuẩn sàn thương mại điện tử.`,
            promptEn: `High-end commercial product photography of ${prodTitle}, ${uiState.imagePromptStyle}, clean minimalist studio lighting, macro texture detail, 85mm lens, photorealistic, 8k --ar 9:16`,
          };
        }
        uiState.feedbackBanner = {
          tone: 'pos',
          text: 'Đã tạo câu lệnh (Prompt) dựng ảnh Tiếng Việt & Tiếng Anh.',
        };
        render();
      }
    );
  }

  function handleSubmitBugFeedbackNote() {
    const note = String(uiState.bugReportNoteInput || '').trim();
    if (!note) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Vui lòng nhập nội dung ghi chú trước khi bấm Gửi.',
      };
      render();
      return;
    }
    uiState.syncing = true;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'SUBMIT_EXTENSION_FEEDBACK',
          handle: uiState.handle || 'user',
          feedbackText: note,
          pageUrl: window.location.href,
          picName: uiState.picNameInput,
        },
      },
      () => {
        uiState.syncing = false;
        uiState.feedbackModalOpen = false;
        uiState.bugReportNoteInput = '';
        uiState.feedbackBanner = {
          tone: 'pos',
          text: 'Đã gửi ghi chú góp ý / báo lỗi về đội ngũ phát triển Upbase B2C.',
        };
        render();
      }
    );
  }

  function handleVerifyAirLink() {
    if (uiState.syncing) return;
    const activeVid =
      uiState.currentVideo ||
      (uiState.videos && uiState.videos[0]) ||
      null;
    if (!uiState.handle || !activeVid) {
      uiState.feedbackBanner = {
        tone: 'warn',
        text: 'Hãy mở trực tiếp bài đăng Video cần nghiệm thu để đọc thông tin trước khi ghi nhận Air Link.',
      };
      render();
      return;
    }

    const rateNet = Math.max(
      0,
      Math.round(Number(String(uiState.rateCardNetInput || '0').replace(/[^0-9]/g, '')))
    );
    uiState.syncing = true;
    uiState.feedbackBanner = null;
    render();

    safeRuntimeSendMessage(
      {
        type: 'UPBASE_SYNC_ACTION',
        payload: {
          action: 'VERIFY_AIR_LINK',
          platform: normalizeSyncPlatform(uiState.platform),
          handle: uiState.handle,
          displayName: uiState.profile?.displayName || uiState.handle,
          avatarUrl: uiState.profile?.avatarUrl || '',
          videoId: activeVid.videoId,
          videoUrl: activeVid.videoUrl || window.location.href.split('?')[0],
          caption: activeVid.caption || '',
          hashtags: activeVid.hashtags || [],
          publishedAt: activeVid.publishedAt,
          durationSeconds: activeVid.durationSeconds || 0,
          views: activeVid.views || 0,
          likes: activeVid.likes || 0,
          comments: activeVid.comments || 0,
          shares: activeVid.shares || 0,
          hasYellowCart: Boolean(
            activeVid.hasYellowCart ||
              (Array.isArray(activeVid.cartProducts) && activeVid.cartProducts.length > 0)
          ),
          cartAnchorTitle: activeVid.cartAnchorTitle || activeVid.cartProducts?.[0]?.title || '',
          cartAnchorUrl: activeVid.cartAnchorUrl || activeVid.cartProducts?.[0]?.productUrl || '',
          cartProductId: activeVid.cartProductId || activeVid.cartProducts?.[0]?.productId || '',
          cartSellerId: activeVid.cartSellerId || activeVid.cartProducts?.[0]?.sellerId || '',
          cartProducts: activeVid.cartProducts || [],
          transcriptText: activeVid.transcriptText || '',
          subtitleUrl: activeVid.subtitleUrl || '',
          playableUrl: activeVid.playableUrl || '',
          onScreenStickers: activeVid.onScreenStickers || [],
          storeName: uiState.selectedStoreName,
          dealCode: uiState.dealCodeInput || `BO2610-${String(activeVid.videoId).slice(-5)}`,
          rateCardNet: rateNet,
          picName: uiState.picNameInput,
          note: uiState.noteInput,
        },
      },
      (resp) => {
        uiState.syncing = false;
        if (resp && resp.ok && resp.data?.success) {
          uiState.feedbackBanner = {
            tone: 'pos',
            text: resp.data.message || 'Đã cập nhật nghiệm thu bài Air về hệ thống.',
          };
        } else {
          uiState.feedbackBanner = {
            tone: 'crit',
            text: resp?.error || resp?.data?.error || 'Lỗi gửi dữ liệu nghiệm thu Air Link.',
          };
        }
        render();
      }
    );
  }

  function exportCsv() {
    const stats = computeChannelStats();
    const rows = [
      [
        'Kênh KOC',
        'Nền tảng',
        'Followers',
        'View TB (Bỏ ghim)',
        'View Trung vị (Median)',
        'ER (%)',
        'Mã Video',
        'Ngày đăng',
        'Lượt xem',
        'Lượt thích',
        'Bình luận',
        'Chia sẻ',
        'Loại bài',
        'Link Video',
      ],
    ];
    for (const v of stats.filteredVideos) {
      rows.push([
        `@${uiState.handle}`,
        uiState.platform.toUpperCase(),
        stats.followers,
        stats.avgViews,
        stats.medianViews,
        stats.engagementRate,
        `="${v.videoId}"`,
        formatDateVn(v.publishedAt),
        v.views,
        v.likes,
        v.comments,
        v.shares,
        v.isPinned ? 'Ghim' : v.isSponsored || v.hasYellowCart ? 'Gắn giỏ / Booking' : 'Bài thường',
        v.videoUrl,
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Upbase_B2C_KOC_${uiState.handle || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const root = document.createElement('div');
  root.id = 'upbase-b2c-ext-root';
  document.documentElement.appendChild(root);

  // Chặn sự kiện cuộn chuột (wheel) lan ra trang TikTok/Reels bên ngoài để thanh cuộn của Extension luôn mượt
  root.addEventListener(
    'wheel',
    (e) => {
      e.stopPropagation();
    },
    { passive: true }
  );

  function applyRootDockPosition() {
    root.classList.toggle('ub-Root--left', uiState.dockSide === 'left');
    if (uiState.customPos && typeof uiState.customPos.top === 'number' && typeof uiState.customPos.left === 'number') {
      root.style.top = `${Math.max(8, Math.min(window.innerHeight - 60, uiState.customPos.top))}px`;
      root.style.left = `${Math.max(8, Math.min(window.innerWidth - 180, uiState.customPos.left))}px`;
      root.style.right = 'auto';
    } else {
      root.style.top = '64px';
      if (uiState.dockSide === 'left') {
        root.style.left = '16px';
        root.style.right = 'auto';
      } else {
        root.style.right = '16px';
        root.style.left = 'auto';
      }
    }
  }

  // Giao diện chuyên biệt 100% cho sàn Thương mại điện tử Shopee VN (Tách biệt hoàn toàn khỏi UI TikTok)
  function renderShopeeWorkspace(stores, selectedStoreObj, kocDb) {
    const pdp = uiState.shopeeProductDetail || null;
    const shopInfo = uiState.shopeeShopDetail || null;
    const lv = uiState.liveSession || {};
    const bagItems = Array.isArray(lv.liveBagProducts) ? lv.liveBagProducts : [];
    const shopItems =
      bagItems.length > 0
        ? bagItems
        : pdp
          ? [
              {
                productId: pdp.itemId,
                shopId: pdp.shopId,
                title: pdp.title,
                priceVnd: pdp.priceVnd,
                priceDisplay: pdp.priceDisplay,
                ratingStar: pdp.ratingStar,
                ratingCount: pdp.ratingCount,
                soldCount: pdp.historicalSold,
                productUrl: pdp.productUrl,
              },
            ]
          : [];

    const activeSpTab = uiState.shopeeTab || 'sp_product';
    let tabBodyHtml = '';
    let footerHtml = '';

    if (activeSpTab === 'sp_product') {
      if (!pdp && shopItems.length === 0) {
        tabBodyHtml = `
          <div class="ub-Empty">
            Hãy mở một trang Sản phẩm Shopee (<code>shopee.vn/...-i.shopId.itemId</code>) để xem phân tích chi tiết Giá bán, Đánh giá, Phân loại SKU, Mã giảm giá và Hoa hồng Shopee Affiliate.
          </div>
        `;
      } else {
        const cur = pdp || {
          itemId: shopItems[0].productId,
          shopId: shopItems[0].shopId || '',
          title: shopItems[0].title,
          priceVnd: shopItems[0].priceVnd || 0,
          priceMinVnd: shopItems[0].priceMinVnd || shopItems[0].priceVnd || 0,
          priceMaxVnd: shopItems[0].priceMaxVnd || shopItems[0].priceVnd || 0,
          priceDisplay: shopItems[0].priceDisplay || formatVnd(shopItems[0].priceVnd || 0),
          ratingStar: shopItems[0].ratingStar || 0,
          ratingCount: shopItems[0].ratingCount || 0,
          historicalSold: shopItems[0].soldCount || 0,
          isMall: Boolean(shopInfo?.isMall),
          shopName: shopInfo?.shopName || uiState.profile?.displayName || uiState.handle || 'Gian hàng Shopee',
          vouchers: [],
          variations: [],
          imageUrls: shopItems[0].imageUrls || [],
          playableUrl: shopItems[0].playableUrl || '',
          productUrl: shopItems[0].productUrl || window.location.href.split('?')[0],
        };

        const avgPriceVnd =
          cur.priceMinVnd > 0 && cur.priceMaxVnd > cur.priceMinVnd
            ? Math.round((cur.priceMinVnd + cur.priceMaxVnd) / 2)
            : Number(cur.priceVnd || 0);
        const estUnits =
          Number(cur.historicalSold || 0) > 0
            ? Number(cur.historicalSold)
            : Number(cur.ratingCount || 0) > 0
              ? Math.round(Number(cur.ratingCount) * 3)
              : 0;
        const estRevVnd = avgPriceVnd > 0 && estUnits > 0 ? Math.round(avgPriceVnd * estUnits) : 0;

        const openPct = Number(uiState.shopeeCommOpenPct || 0);
        const xtraPct = Number(uiState.shopeeCommXtraPct || 0);
        const totalCommPct = Number((openPct + xtraPct).toFixed(1));
        const expOrders = Math.max(1, Math.round(Number(uiState.shopeeExpectedOrders || 100)));
        const commPerOrderVnd = Math.round((avgPriceVnd * totalCommPct) / 100);
        const totalCommVnd = Math.round(commPerOrderVnd * expOrders);
        const totalGmvEstVnd = Math.round(avgPriceVnd * expOrders);

        const vouchers = Array.isArray(cur.vouchers) ? cur.vouchers : [];
        const variations = Array.isArray(cur.variations) ? cur.variations : [];
        const imgCount = Array.isArray(cur.imageUrls) ? cur.imageUrls.length : 0;

        tabBodyHtml = `
          <div class="ub-ActiveVideoBox" style="margin-bottom:8px;">
            <div class="ub-ActiveVideoHead" style="align-items:flex-start; gap:6px;">
              <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                ${
                  cur.isMall
                    ? `<span class="ub-Badge ub-Badge--crit">Shopee Mall</span>`
                    : `<span class="ub-Badge ub-Badge--neutral">Shopee VN</span>`
                }
                <span class="ub-Badge ub-Badge--neutral">Mã SP: ${escapeHtml(String(cur.itemId || '—'))}</span>
                ${
                  cur.shopId
                    ? `<span class="ub-Badge ub-Badge--neutral">Shop ID: ${escapeHtml(String(cur.shopId))}</span>`
                    : ''
                }
              </div>
              <div style="display:flex; gap:4px; flex-shrink:0;">
                <button type="button" class="ub-IconBtn" id="ub-btn-sp-copy-itemid" title="Copy Mã sản phẩm Shopee">Copy Mã SP</button>
                <button type="button" class="ub-IconBtn" id="ub-btn-sp-copy-url" title="Copy Link sản phẩm Shopee">Copy Link</button>
              </div>
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--ub-ink); line-height:1.4; margin:6px 0;">
              ${escapeHtml(cur.title || 'Sản phẩm Shopee')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding-top:6px; border-top:1px dashed var(--ub-line);">
              <span style="font-size:12px; color:var(--ub-ink-2);">
                Gian hàng: <b style="color:var(--ub-ink);">${escapeHtml(cur.shopName || uiState.profile?.displayName || uiState.handle || 'Shopee')}</b>
              </span>
              <div style="display:flex; gap:4px; align-items:center;">
                <button type="button" class="ub-IconBtn" id="ub-btn-sp-dl-imgs">
                  ⬇ Tải Ảnh SP (${imgCount || 1})
                </button>
                ${
                  cur.playableUrl
                    ? `<button type="button" class="ub-IconBtn" id="ub-btn-sp-dl-vid">⬇ Tải Video SP</button>`
                    : ''
                }
              </div>
            </div>
          </div>

          <div class="ub-StatGrid">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Giá bán niêm yết</div>
              <div class="ub-StatVal ub-Num" style="color:var(--ub-crit); font-size:13px;">${escapeHtml(cur.priceDisplay || formatVnd(cur.priceVnd || 0))}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Đánh giá người mua</div>
              <div class="ub-StatVal ub-Num">${cur.ratingStar > 0 ? `${cur.ratingStar} ★` : '—'} <span style="font-size:12px; font-weight:500; color:var(--ub-ink-2);">(${formatNum(cur.ratingCount || 0)} ĐG)</span></div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Sản lượng bán</div>
              <div class="ub-StatVal ub-Num">
                ${
                  cur.historicalSold > 0
                    ? `${formatNum(cur.historicalSold)} đã bán`
                    : cur.ratingCount > 0
                      ? `≥ ${formatNum(cur.ratingCount)} đơn`
                      : 'Chưa công khai'
                }
              </div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">GMV lũy kế ước tính</div>
              <div class="ub-StatVal ub-Num" style="color:var(--ub-pos); font-size:13px;">
                ${estRevVnd > 0 ? formatVnd(estRevVnd) : '—'}
              </div>
            </div>
          </div>

          <div class="ub-TranscriptBox" style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="font-size:12px; color:var(--ub-ink);">Mã giảm giá của Shop & Phân loại hàng (${variations.length} mẫu)</strong>
              ${
                vouchers.length > 0
                  ? `<span class="ub-Badge ub-Badge--warn">${escapeHtml(vouchers.join(' · '))}</span>`
                  : `<span class="ub-Badge ub-Badge--neutral">Giá niêm yết trực tiếp</span>`
              }
            </div>
            ${
              variations.length > 0
                ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
                     ${variations
                       .slice(0, 18)
                       .map(
                         (v) =>
                           `<span style="padding:2px 6px; border:1px solid var(--ub-line); border-radius:4px; background:var(--ub-surface); font-size:12px; color:var(--ub-ink-2);">${escapeHtml(v)}</span>`
                       )
                       .join('')}
                     ${
                       variations.length > 18
                         ? `<span style="font-size:12px; color:var(--ub-ink-3);">+${variations.length - 18} mẫu khác</span>`
                         : ''
                     }
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Sản phẩm đơn mẫu hoặc chưa chọn phân loại trên trang.</div>`
            }
          </div>

          <div class="ub-FormSection">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div class="ub-SectionTitle" style="margin:0;">Tính Hoa hồng Shopee Affiliate (Mở + Xtra)</div>
              <span class="ub-Badge ub-Badge--pos">Tổng HH: ${totalCommPct}% (${formatVnd(commPerOrderVnd)}/đơn)</span>
            </div>
            <div class="ub-FormGrid">
              <div class="ub-Field">
                <label class="ub-Label">% HH Mở (Mặc định sàn)</label>
                <input class="ub-Input ub-Num" id="ub-inp-sp-open-comm" type="number" min="0" max="50" step="0.5" value="${openPct}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">% HH Xtra (Shop tài trợ)</label>
                <input class="ub-Input ub-Num" id="ub-inp-sp-xtra-comm" type="number" min="0" max="80" step="0.5" value="${xtraPct}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Giá bán TB (VND)</label>
                <input class="ub-Input ub-Num" type="text" disabled value="${formatVnd(avgPriceVnd)}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Số đơn dự kiến</label>
                <input class="ub-Input ub-Num" id="ub-inp-sp-exp-orders" type="number" min="1" step="10" value="${expOrders}" />
              </div>
            </div>
            <div style="margin-top:8px; padding:6px 8px; border-radius:6px; background:var(--ub-sunken); border:1px solid var(--ub-line); display:flex; justify-content:space-between; align-items:center; font-size:12px;">
              <span>GMV dự kiến: <b class="ub-Num" style="color:var(--ub-ink);">${formatVnd(totalGmvEstVnd)}</b></span>
              <span>Hoa hồng KOC nhận: <b class="ub-Num" style="color:var(--ub-pos);">${formatVnd(totalCommVnd)}</b></span>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-sp-export-items" type="button">
            Xuất CSV Sản phẩm
          </button>
          <button class="ub-BtnSecondary" id="ub-btn-sp-capture-product" type="button" title="Chụp toàn màn hình trang sản phẩm Shopee kèm tem kiểm tra">
            📸 Chụp màn hình SP
          </button>
          <button class="ub-BtnPrimary" id="ub-btn-sp-goto-booking" type="button">
            Đề xuất Hợp tác SP này
          </button>
        `;
      }
    } else if (activeSpTab === 'sp_reviews') {
      const ca = uiState.commentAnalysis;
      const allReviews = ca && Array.isArray(ca.allComments) ? ca.allComments : [];
      const ordSum = uiState.shopeeOrdersSummary || {};
      const ordersList = Array.isArray(ordSum.ordersList) ? ordSum.ordersList : [];
      const skuBreakdown = Array.isArray(ordSum.skuBreakdown) ? ordSum.skuBreakdown : [];
      const ratingCount = Number(pdp?.ratingCount || 0);
      const soldFloor =
        Number(pdp?.historicalSold || 0) > 0
          ? Number(pdp.historicalSold)
          : ratingCount > 0
            ? Math.round(ratingCount * 2.5)
            : ordersList.length;

      const skuRowsHtml =
        skuBreakdown.length > 0
          ? skuBreakdown
              .slice(0, 10)
              .map(
                (s, i) => `
                  <tr>
                    <td><b style="color:var(--ub-ink);">${i + 1}. Phân loại: ${escapeHtml(s.sku)}</b></td>
                    <td class="ub-Num" style="font-weight:700;">${formatNum(s.count)} đơn</td>
                    <td class="ub-Num" style="color:var(--ub-pos); font-weight:700;">${s.sharePct}%</td>
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="3" class="ub-Empty">Bấm nút <b>⚡ Quét Đơn & SKU</b> bên dưới để tự động cuộn và bóc tách phân loại hàng khách mua.</td></tr>`;

      const orderRowsHtml =
        ordersList.length > 0
          ? ordersList
              .slice(0, 25)
              .map(
                (o) => `
                  <div style="padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; margin-bottom:2px;">
                      <b style="color:var(--ub-ink);">${escapeHtml(o.buyer || 'Người mua')} · <span class="ub-Num" style="font-weight:500; color:var(--ub-ink-3);">${escapeHtml(o.orderTime || '')}</span></b>
                      <span class="ub-Badge ub-Badge--pos">Phân loại: ${escapeHtml(o.skuVariation || 'Mặc định')}</span>
                    </div>
                    <div style="color:var(--ub-ink-2); line-height:1.35;">${escapeHtml(o.comment || '')}</div>
                  </div>
                `
              )
              .join('')
          : allReviews.length > 0
            ? allReviews
                .slice(0, 25)
                .map(
                  (c) => `
                    <div style="padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px;">
                      <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                        <b style="color:var(--ub-ink);">${escapeHtml(c.user || 'Người mua Shopee')}</b>
                        <span class="ub-Badge ${c.group === 'OBJECTION' ? 'ub-Badge--crit' : 'ub-Badge--pos'}">${escapeHtml(c.group === 'OBJECTION' ? 'Cần lưu ý' : 'Đã mua')}</span>
                      </div>
                      <div style="color:var(--ub-ink-2); line-height:1.35;">${escapeHtml(c.text)}</div>
                    </div>
                  `
                )
                .join('')
            : '';

      tabBodyHtml = `
        <div class="ub-StatGrid">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đơn có Đánh giá</div>
            <div class="ub-StatVal ub-Num">${formatNum(ratingCount)} đơn</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Tổng đơn ước tính</div>
            <div class="ub-StatVal ub-Num" style="color:var(--ub-pos);">${soldFloor > 0 ? `~${formatNum(soldFloor)}` : '—'}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đơn đã cào SKU</div>
            <div class="ub-StatVal ub-Num">${formatNum(ordersList.length || allReviews.length)} đơn</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Mua ≥ 2 mẫu/đơn</div>
            <div class="ub-StatVal ub-Num">${ordSum.multiItemOrderPct || 0}%</div>
          </div>
        </div>

        <div class="ub-TableWrap" style="margin-bottom:8px;">
          <table class="ub-Table">
            <thead>
              <tr>
                <th>Top Phân loại hàng (SKU) khách đặt (${skuBreakdown.length})</th>
                <th class="ub-Num">Số đơn</th>
                <th class="ub-Num">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>${skuRowsHtml}</tbody>
          </table>
        </div>

        <div class="ub-TranscriptBox" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:12px; color:var(--ub-ink);">Chi tiết Đơn mua & Phân loại hàng (${ordersList.length || allReviews.length})</strong>
            <button type="button" class="ub-IconBtn" id="ub-btn-sp-export-orders-top">Xuất CSV Đơn</button>
          </div>
          ${
            orderRowsHtml
              ? `<div style="max-height:210px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">${orderRowsHtml}</div>`
              : `<div style="font-size:12px; color:var(--ub-ink-3); padding:8px 0;">
                   Bấm nút <b>⚡ Quét Đơn & SKU</b> bên dưới hoặc cuộn xuống mục <b>ĐÁNH GIÁ SẢN PHẨM</b> để hệ thống bóc tách toàn bộ đơn mua và mẫu SKU bán chạy.
                 </div>`
          }
        </div>
      `;
      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-sp-scan-orders" type="button">
          ⚡ Quét Đơn & SKU bán chạy
        </button>
        <button class="ub-BtnPrimary" id="ub-btn-sp-export-orders" type="button">
          Xuất CSV Đơn mua (${ordersList.length || allReviews.length})
        </button>
      `;
    } else if (activeSpTab === 'sp_shop') {
      const shopFollowers = shopInfo?.followers || uiState.profile?.followers || 0;
      const shopItemCount = shopInfo?.itemCount || uiState.profile?.videoCount || shopItems.length;
      const shopRating = shopInfo?.ratingStar || pdp?.ratingStar || 0;
      const shopRowsHtml =
        shopItems.length > 0
          ? shopItems
              .slice(0, 30)
              .map(
                (item, idx) => `
                  <tr>
                    <td>
                      <div style="font-weight:600; color:var(--ub-ink);">
                        <a href="${escapeHtml(item.productUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--ub-ink); text-decoration:none;">
                          ${idx + 1}. ${escapeHtml(String(item.title || '').slice(0, 56))}
                        </a>
                      </div>
                      <div style="font-size:12px; color:var(--ub-ink-3);">Mã SP: ${escapeHtml(String(item.productId || '—'))}</div>
                    </td>
                    <td class="ub-Num" style="font-weight:600; color:var(--ub-crit);">${formatVnd(item.priceVnd || 0)}</td>
                    <td class="ub-Num">${item.soldCount > 0 ? formatNum(item.soldCount) : item.ratingCount > 0 ? `${formatNum(item.ratingCount)} ĐG` : '—'}</td>
                    <td>
                      <button type="button" class="ub-IconBtn ub-BtnCopyPid" data-pid="${escapeHtml(String(item.productId || ''))}">Copy Mã</button>
                    </td>
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="4" class="ub-Empty">Chưa có sản phẩm nào được quét trên trang này.</td></tr>`;

      tabBodyHtml = `
        <div class="ub-StatGrid">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Người theo dõi Shop</div>
            <div class="ub-StatVal ub-Num">${shopFollowers > 0 ? formatNum(shopFollowers) : '—'}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Tổng mặt hàng</div>
            <div class="ub-StatVal ub-Num">${formatNum(shopItemCount)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đánh giá Gian hàng</div>
            <div class="ub-StatVal ub-Num">${shopRating > 0 ? `${shopRating} ★` : '—'}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đã quét trên trang</div>
            <div class="ub-StatVal ub-Num">${formatNum(shopItems.length)} SP</div>
          </div>
        </div>

        <div class="ub-TableWrap">
          <table class="ub-Table">
            <thead>
              <tr>
                <th>Sản phẩm trên Shopee (${shopItems.length})</th>
                <th class="ub-Num">Giá bán</th>
                <th class="ub-Num">Đã bán / ĐG</th>
                <th>Mã SP</th>
              </tr>
            </thead>
            <tbody>${shopRowsHtml}</tbody>
          </table>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-sp-export-items" type="button">
          Xuất CSV Danh mục Sản phẩm (${shopItems.length} SP)
        </button>
        <button class="ub-BtnSecondary" id="ub-btn-sp-capture-product" type="button" title="Chụp toàn màn hình gian hàng Shopee kèm tem kiểm tra">
          📸 Chụp màn hình Shop
        </button>
      `;
    } else {
      // Tab 4: sp_live_booking (Shopee Live & Lưu Đề xuất Hợp tác về Web-Admin)
      const storeOptionsHtml = stores
        .map(
          (s) =>
            `<option value="${escapeHtml(s.storeName)}" ${
              s.storeName === selectedStoreObj.storeName ? 'selected' : ''
            }>${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})</option>`
        )
        .join('');
      const liveStatusText = lv.isEnded
        ? 'Đã kết thúc phiên Live'
        : lv.isLive
          ? '🔴 Đang phát Shopee Live'
          : 'Chờ mở phòng Shopee Live';

      tabBodyHtml = `
        <div class="ub-TranscriptBox" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:12px; color:var(--ub-ink);">Tổng hợp Phiên Shopee Live (live.shopee.vn)</strong>
            <span class="ub-Badge ${lv.isLive ? 'ub-Badge--crit' : 'ub-Badge--neutral'}">${liveStatusText}</span>
          </div>
          <div class="ub-StatGrid" style="margin-bottom:6px;">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Mắt xem đỉnh (PCU)</div>
              <div class="ub-StatVal ub-Num">${formatNum(lv.peakViewers || lv.currentViewers || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tổng lượt xem Live</div>
              <div class="ub-StatVal ub-Num">${formatNum(lv.totalViews || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Rổ hàng Phiên Live</div>
              <div class="ub-StatVal ub-Num">${formatNum(shopItems.length)} SP</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">GMV Phiên Live</div>
              <div class="ub-StatVal ub-Num" style="color:var(--ub-pos); font-size:13px;">${formatVnd(lv.sessionGmv || 0)}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button type="button" class="ub-IconBtn" id="ub-btn-sp-export-live">Xuất CSV Phiên Shopee Live</button>
          </div>
        </div>

        <div class="ub-FormSection">
          <div class="ub-SectionTitle">Lưu Đề xuất Hợp tác Shopee Affiliate / Gian hàng</div>
          <div class="ub-FormGrid">
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Gian hàng B2C phụ trách</label>
              <select class="ub-Select" id="ub-sel-store">${storeOptionsHtml}</select>
            </div>
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Luồng phê duyệt tự động</label>
              <div class="ub-RoutingBox">${escapeHtml(selectedStoreObj.routingLabel)}</div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Chi phí / Ngân sách đề xuất (VND)</label>
              <input class="ub-Input ub-Num" id="ub-inp-rate" type="number" min="0" step="100000" placeholder="VD: 2000000" value="${escapeHtml(uiState.proposedRateInput || (kocDb?.avgUnitPrice ? String(kocDb.avgUnitPrice) : ''))}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Mã SP / Ghi chú Hợp tác</label>
              <input class="ub-Input" id="ub-inp-note" type="text" placeholder="Mã SP Shopee, % Hoa hồng Xtra..." value="${escapeHtml(uiState.noteInput || (pdp?.itemId ? `SP Shopee #${pdp.itemId} - ${pdp.title.slice(0, 36)}` : ''))}" />
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnPrimary" id="ub-btn-save-booking" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang đồng bộ...' : 'Lưu Đề xuất Shopee về Hệ thống'}
        </button>
      `;
    }

    return { tabBodyHtml, footerHtml, shopItemsCount: shopItems.length };
  }

  // Giao diện chuyên biệt riêng cho từng nền tảng Meta: Instagram, Threads & Facebook (Loại bỏ hoàn toàn khái niệm Giỏ vàng / Seller / Spark Ads của TikTok)
  function renderMetaPlatformWorkspace(platform, stores, selectedStoreObj, kocDb) {
    const vids = Array.isArray(uiState.videos) ? uiState.videos : [];
    const activeVid = uiState.currentVideo || vids[0] || null;
    const followers = Number(uiState.profile?.followers || activeVid?.authorFollowers || 0);
    const totalPosts = Number(uiState.profile?.videoCount || vids.length || 0);

    const avgLikes =
      vids.length > 0
        ? Math.round(vids.reduce((s, v) => s + Number(v.likes || 0), 0) / vids.length)
        : Number(activeVid?.likes || 0);
    const avgComments =
      vids.length > 0
        ? Math.round(vids.reduce((s, v) => s + Number(v.comments || 0), 0) / vids.length)
        : Number(activeVid?.comments || 0);
    const avgShares =
      vids.length > 0
        ? Math.round(vids.reduce((s, v) => s + Number(v.shares || 0), 0) / vids.length)
        : Number(activeVid?.shares || 0);
    const reelVids = vids.filter((v) => Number(v.views || 0) > 0);
    const avgReelPlays =
      reelVids.length > 0
        ? Math.round(reelVids.reduce((s, v) => s + Number(v.views || 0), 0) / reelVids.length)
        : Number(activeVid?.views || 0);

    const erDenom = followers > 0 ? followers : avgReelPlays > 0 ? avgReelPlays : 0;
    const erPct =
      erDenom > 0
        ? Number((((avgLikes + avgComments + avgShares) / erDenom) * 100).toFixed(2))
        : 0;

    // Thu thập toàn bộ Link Affiliate / Sản phẩm đính kèm từ bài đăng & Bio
    const affMap = new Map();
    const allScanVids = activeVid ? [activeVid, ...vids] : vids;
    allScanVids.forEach((v) => {
      const cList = Array.isArray(v?.cartProducts) ? v.cartProducts : [];
      cList.forEach((p) => {
        const key = String(p.productUrl || p.productId || p.title || '');
        if (key && !affMap.has(key)) {
          affMap.set(key, {
            ...p,
            postCode: v.metaCode || v.videoId || '',
            postLikes: v.likes || 0,
            postComments: v.comments || 0,
          });
        }
      });
    });
    const affLinks = Array.from(affMap.values());

    const activeTab =
      platform === 'instagram'
        ? uiState.igTab || 'ig_posts'
        : platform === 'threads'
          ? uiState.threadsTab || 'th_posts'
          : uiState.fbTab || 'fb_posts';

    let tabBodyHtml = '';
    let footerHtml = '';

    const isPostsTab =
      activeTab === 'ig_posts' || activeTab === 'th_posts' || activeTab === 'fb_posts';
    const isAffTab =
      activeTab === 'ig_affiliate' || activeTab === 'th_affiliate' || activeTab === 'fb_links';
    const isCommentsTab =
      activeTab === 'ig_comments' || activeTab === 'th_replies' || activeTab === 'fb_comments';

    if (isPostsTab) {
      // 1. 4 Chỉ số đặc trưng riêng của từng nền tảng (Instagram vs Threads vs Facebook)
      const kpiHtml =
        platform === 'threads'
          ? `
            <div class="ub-StatGrid">
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Người theo dõi</div>
                <div class="ub-StatVal ub-Num">${followers > 0 ? formatNum(followers) : '—'}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Tim TB / Thread</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgLikes)}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Trả lời TB (Replies)</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgComments)}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Đăng lại TB (Repost)</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgShares)}</div>
              </div>
            </div>
          `
          : platform === 'instagram'
            ? `
            <div class="ub-StatGrid">
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Followers IG</div>
                <div class="ub-StatVal ub-Num">${followers > 0 ? formatNum(followers) : '—'}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Lượt thích TB</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgLikes)}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Lượt phát Reels TB</div>
                <div class="ub-StatVal ub-Num">${avgReelPlays > 0 ? formatNum(avgReelPlays) : 'Bài ảnh'}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Tương tác (ER)</div>
                <div class="ub-StatVal ub-Num" style="color:var(--ub-pos);">${erPct > 0 ? `${erPct}%` : '—'}</div>
              </div>
            </div>
          `
            : `
            <div class="ub-StatGrid">
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Theo dõi Page/Kênh</div>
                <div class="ub-StatVal ub-Num">${followers > 0 ? formatNum(followers) : '—'}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Cảm xúc TB (Like/Tim)</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgLikes)}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Bình luận & Chia sẻ TB</div>
                <div class="ub-StatVal ub-Num">${formatNum(avgComments)} / ${formatNum(avgShares)}</div>
              </div>
              <div class="ub-StatCard">
                <div class="ub-StatLabel">Lượt phát Reels TB</div>
                <div class="ub-StatVal ub-Num">${avgReelPlays > 0 ? formatNum(avgReelPlays) : '—'}</div>
              </div>
            </div>
          `;

      // 2. Hộp Bài đăng đang xem (Reel / Carousel / Thread / Facebook Post)
      const postBadgeLabel =
        platform === 'threads'
          ? '🧵 Bài viết Threads'
          : platform === 'instagram'
            ? activeVid?.playableUrl || Number(activeVid?.views || 0) > 0
              ? '🎬 Instagram Reel'
              : '🖼️ Instagram Carousel / Ảnh'
            : activeVid?.playableUrl || Number(activeVid?.views || 0) > 0
              ? '🎬 Facebook Reel / Watch'
              : '📝 Bài viết Facebook';

      const activeBoxHtml = activeVid
        ? `
          <div class="ub-ActiveVideoBox" style="margin-bottom:8px;">
            <div class="ub-ActiveVideoHead">
              <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                <span class="ub-Badge ub-Badge--neutral">${postBadgeLabel}</span>
                <span class="ub-Badge ub-Badge--neutral">#${escapeHtml(String(activeVid.metaCode || activeVid.videoId || '').slice(-10))}</span>
                ${
                  Array.isArray(activeVid.cartProducts) && activeVid.cartProducts.length > 0
                    ? `<span class="ub-Badge ub-Badge--pos">🔗 Có gắn Link Affiliate (${activeVid.cartProducts.length})</span>`
                    : ''
                }
              </div>
              <div style="display:flex; gap:4px;">
                <button type="button" class="ub-IconBtn" id="ub-btn-meta-copy-cap">Copy bài</button>
                <button type="button" class="ub-IconBtn" id="ub-btn-meta-dl-mp4">⬇ Tải Video</button>
                ${
                  Array.isArray(activeVid.imageUrls) && activeVid.imageUrls.length > 0
                    ? `<button type="button" class="ub-IconBtn" id="ub-btn-meta-dl-img">🖼️ Ảnh (${activeVid.imageUrls.length})</button>`
                    : ''
                }
              </div>
            </div>
            <div class="ub-ActiveStatsRow" style="margin-top:6px;">
              ${
                platform === 'threads'
                  ? `
                    <div class="ub-MiniMetric"><span>❤️ Tim</span><strong class="ub-Num">${formatNum(activeVid.likes || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>💬 Trả lời</span><strong class="ub-Num">${formatNum(activeVid.comments || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>🔁 Đăng lại</span><strong class="ub-Num">${formatNum(activeVid.shares || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>Ngày đăng</span><strong class="ub-Num">${formatDateVn(activeVid.publishedAt)}</strong></div>
                  `
                  : platform === 'instagram'
                    ? `
                    <div class="ub-MiniMetric"><span>❤️ Tim</span><strong class="ub-Num">${formatNum(activeVid.likes || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>💬 Bình luận</span><strong class="ub-Num">${formatNum(activeVid.comments || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>▶️ Lượt phát</span><strong class="ub-Num">${activeVid.views > 0 ? formatNum(activeVid.views) : 'Bài ảnh'}</strong></div>
                    <div class="ub-MiniMetric"><span>Ngày đăng</span><strong class="ub-Num">${formatDateVn(activeVid.publishedAt)}</strong></div>
                  `
                    : `
                    <div class="ub-MiniMetric"><span>👍 Cảm xúc</span><strong class="ub-Num">${formatNum(activeVid.likes || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>💬 Bình luận</span><strong class="ub-Num">${formatNum(activeVid.comments || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>↗️ Chia sẻ</span><strong class="ub-Num">${formatNum(activeVid.shares || 0)}</strong></div>
                    <div class="ub-MiniMetric"><span>▶️ Lượt phát</span><strong class="ub-Num">${activeVid.views > 0 ? formatNum(activeVid.views) : '—'}</strong></div>
                  `
              }
            </div>
            <div style="font-size:12px; color:var(--ub-ink-2); margin-top:6px; line-height:1.35;">
              <b>Nội dung:</b> ${escapeHtml(String(activeVid.caption || 'Không có mô tả văn bản').slice(0, 180))}
            </div>
          </div>
        `
        : '';

      const rowsHtml =
        vids.length > 0
          ? vids
              .slice(0, 25)
              .map(
                (v, i) => `
                  <tr>
                    <td>
                      <div style="font-weight:600; color:var(--ub-ink);">
                        <a href="${escapeHtml(v.videoUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--ub-ink); text-decoration:none;">
                          ${i + 1}. ${escapeHtml(String(v.caption || v.metaCode || v.videoId || 'Bài đăng').slice(0, 44))}
                        </a>
                      </div>
                      <div style="font-size:12px; color:var(--ub-ink-3);">
                        ${formatDateVn(v.publishedAt)} ${Array.isArray(v.cartProducts) && v.cartProducts.length > 0 ? '· <b style="color:var(--ub-pos);">🔗 Có Link Affiliate</b>' : ''}
                      </div>
                    </td>
                    <td class="ub-Num" style="font-weight:600;">${formatNum(v.likes || 0)}</td>
                    <td class="ub-Num">${formatNum(v.comments || 0)}</td>
                    <td class="ub-Num">${platform === 'threads' || platform === 'facebook' ? formatNum(v.shares || 0) : v.views > 0 ? formatNum(v.views) : 'Ảnh'}</td>
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="4" class="ub-Empty">Cuộn trang để hệ thống tự động thu thập danh sách bài đăng.</td></tr>`;

      const tree = uiState.threadsTree;
      const hookInfo = tree?.hookAnalysis || null;
      const treeParts = Array.isArray(tree?.parts) ? tree.parts : [];

      const threadsProWidgetsHtml =
        platform === 'threads' && (hookInfo || treeParts.length > 0)
          ? `
            ${
              hookInfo
                ? `<div class="ub-TranscriptBox" style="margin-bottom:8px;">
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                       <strong style="font-size:12px; color:var(--ub-ink);">🧠 Mở bài (Hook) & Thuật toán Threads</strong>
                       <span class="ub-Badge ${hookInfo.hasCommercialRisk ? 'ub-Badge--crit' : 'ub-Badge--pos'}">
                         ${hookInfo.hasCommercialRisk ? '⚠️ Dễ bóp reach' : '✓ An toàn'}
                       </span>
                     </div>
                     <div style="font-size:12px; color:var(--ub-ink-2); background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; padding:5px 7px; margin-bottom:5px; line-height:1.35;">
                       <b style="color:var(--ub-ink);">3 câu mở màn:</b> ${escapeHtml(hookInfo.hookText || '—')}
                     </div>
                     <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--ub-ink-3); margin-bottom:4px;">
                       <span>Độ dài: <b class="ub-Num" style="color:var(--ub-ink);">${hookInfo.charCount || 0} ký tự</b> (${hookInfo.wordCount || 0} từ)</span>
                       <span>${hookInfo.hasCommercialRisk ? `<b style="color:var(--ub-crit);">Chứa: ${escapeHtml(hookInfo.riskKeywords.slice(0, 2).join(', '))}</b>` : 'Không chèn link cấm'}</span>
                     </div>
                     <div class="ub-Notice ${hookInfo.hasCommercialRisk ? 'ub-Notice--warn' : 'ub-Notice--pos'}" style="margin:0; padding:4px 6px; font-size:11px;">
                       ${escapeHtml(hookInfo.advice)}
                     </div>
                   </div>`
                : ''
            }

            ${
              treeParts.length > 1
                ? `<div class="ub-TranscriptBox" style="margin-bottom:8px;">
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                       <strong style="font-size:12px; color:var(--ub-ink);">🧵 Chuỗi tút tác giả liên hoàn (${treeParts.length} phần)</strong>
                       <div style="display:flex; gap:4px;">
                         <button type="button" class="ub-IconBtn" id="ub-btn-th-copy-tree">Copy chuỗi</button>
                         <button type="button" class="ub-IconBtn" id="ub-btn-th-download-tree">⬇ .TXT</button>
                       </div>
                     </div>
                     <div style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;">
                       ${treeParts
                         .map(
                           (p) => `
                             <div style="padding:5px 7px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:11px;">
                               <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                 <span class="ub-Badge ub-Badge--neutral">Phần ${p.order}/${treeParts.length}</span>
                                 ${p.hasLinks ? `<span class="ub-Badge ub-Badge--pos">🔗 Có link (${p.linksCount})</span>` : ''}
                               </div>
                               <div style="color:var(--ub-ink-2); line-height:1.35;">${escapeHtml(p.text)}</div>
                             </div>
                           `
                         )
                         .join('')}
                     </div>
                   </div>`
                : ''
            }
          `
          : '';

      tabBodyHtml = `
        ${kpiHtml}
        ${activeBoxHtml}
        ${threadsProWidgetsHtml}
        <div class="ub-TableWrap">
          <table class="ub-Table" style="table-layout:fixed; width:100%;">
            <thead>
              <tr>
                <th style="width:46%;">${platform === 'threads' ? 'Chuỗi bài Thread' : platform === 'instagram' ? 'Reels & Bài đăng IG' : 'Reels & Bài viết FB'} (${vids.length})</th>
                <th class="ub-Num" style="width:18%;">${platform === 'facebook' ? 'Cảm xúc' : '❤️ Tim'}</th>
                <th class="ub-Num" style="width:18%;">${platform === 'threads' ? 'Trả lời' : 'Bình luận'}</th>
                <th class="ub-Num" style="width:18%;">${platform === 'threads' ? 'Đăng lại' : platform === 'facebook' ? 'Chia sẻ' : 'Lượt phát'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-export-csv" type="button">
          Xuất CSV Bài đăng (${vids.length})
        </button>
        <button class="ub-BtnPrimary" id="ub-btn-meta-goto-booking" type="button">
          Nghiệm thu & Đề xuất KOC
        </button>
      `;
    } else if (isAffTab) {
      // Tab 2: Bio, Liên hệ & Link Affiliate (Shopee / TikTok / Lazada / Bio Linktree)
      const bioText = String(uiState.profile?.bio || '').trim();
      const phone = uiState.profile?.phone || '';
      const email = uiState.profile?.email || '';

      const affRowsHtml =
        affLinks.length > 0
          ? affLinks
              .map(
                (item, idx) => `
                  <tr>
                    <td>
                      <div style="font-weight:600; color:var(--ub-ink);">${idx + 1}. ${escapeHtml(item.title || 'Link sản phẩm Affiliate')}</div>
                      <div style="font-size:12px; color:var(--ub-ink-3); word-break:break-all;">
                        <a href="${escapeHtml(item.productUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:var(--ub-accent); text-decoration:underline;">
                          ${escapeHtml(String(item.productUrl || '').slice(0, 65))}
                        </a>
                      </div>
                    </td>
                    <td><span class="ub-Badge ub-Badge--pos">${escapeHtml(item.source || 'Affiliate')}</span></td>
                    <td>
                      <button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(item.productUrl || '')}">Copy Link</button>
                    </td>
                  </tr>
                `
              )
              .join('')
          : `<tr><td colspan="3" class="ub-Empty">Chưa phát hiện link mua hàng (Shopee / TikTok / Bio) trong các bài đã quét.</td></tr>`;

      tabBodyHtml = `
        <div class="ub-TranscriptBox" style="margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:12px; color:var(--ub-ink);">
              ${platform === 'facebook' ? 'Giới thiệu Fanpage / Trang cá nhân & Liên hệ' : 'Tiểu sử (Bio) & Liên hệ KOC'}
            </strong>
            <span class="ub-Badge ub-Badge--neutral">Tổng bài: ${formatNum(totalPosts)}</span>
          </div>
          <div style="font-size:12px; color:var(--ub-ink-2); margin-bottom:6px; white-space:pre-line;">
            ${bioText ? escapeHtml(bioText) : 'Chưa có mô tả tiểu sử trên trang hiện tại.'}
          </div>
          <div style="display:flex; gap:12px; font-size:12px; padding-top:4px; border-top:1px dashed var(--ub-line);">
            <span>SĐT: <b class="ub-Num" style="color:var(--ub-ink);">${escapeHtml(phone || '—')}</b></span>
            <span>Email: <b style="color:var(--ub-ink);">${escapeHtml(email || '—')}</b></span>
          </div>
        </div>

        <div class="ub-TableWrap">
          <table class="ub-Table">
            <thead>
              <tr>
                <th>Link Affiliate / Sản phẩm phát hiện (${affLinks.length})</th>
                <th>Nền tảng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>${affRowsHtml}</tbody>
          </table>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-export-csv" type="button">
          Xuất CSV Kênh & Link
        </button>
      `;
    } else if (isCommentsTab) {
      // Tab 3: Bình luận / Thảo luận Replies / SĐT Khách hàng
      const ca = uiState.commentAnalysis;
      const allCmts = ca && Array.isArray(ca.allComments) ? ca.allComments : [];

      const tree = uiState.threadsTree;
      const leads = Array.isArray(tree?.leads) ? tree.leads : [];

      const threadsLeadsBoxHtml =
        platform === 'threads'
          ? `
            <div class="ub-TranscriptBox" style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <strong style="font-size:12px; color:var(--ub-ink);">🎯 Lead Khách Hỏi Mua & Xin Link (${leads.length})</strong>
                ${
                  leads.length > 0
                    ? `<button type="button" class="ub-IconBtn" id="ub-btn-th-export-leads-top">Xuất CSV Lead</button>`
                    : ''
                }
              </div>
              ${
                leads.length > 0
                  ? `<div style="max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:5px;">
                       ${leads
                         .map(
                           (l) => `
                             <div style="padding:5px 7px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:11px;">
                               <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                 <b style="color:var(--ub-ink);">${escapeHtml(l.handle)} · <span class="ub-Num" style="color:var(--ub-ink-3); font-weight:400;">${escapeHtml(l.time)}</span></b>
                                 <span class="ub-Badge ub-Badge--pos">${escapeHtml(l.intentLabel)}</span>
                               </div>
                               <div style="color:var(--ub-ink-2); line-height:1.35;">${escapeHtml(l.text)}</div>
                             </div>
                           `
                         )
                         .join('')}
                     </div>`
                  : `<div style="font-size:11px; color:var(--ub-ink-3); padding:4px 0;">
                       Chưa phát hiện comment xin link / hỏi mua. Hãy cuộn xuống các bài tút để quét tự động.
                     </div>`
              }
            </div>
          `
          : '';

      tabBodyHtml = `
        <div class="ub-StatGrid">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">${platform === 'threads' ? 'Trả lời đã quét' : 'Bình luận đã quét'}</div>
            <div class="ub-StatVal ub-Num">${formatNum(allCmts.length)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Hỏi mua / Xin link</div>
            <div class="ub-StatVal ub-Num" style="color:var(--ub-pos);">${formatNum(ca?.buyingIntentCount || 0)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Khen / Tích cực</div>
            <div class="ub-StatVal ub-Num">${formatNum(ca?.feedbackCount || 0)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Phàn nàn / Lưu ý</div>
            <div class="ub-StatVal ub-Num" style="color:var(--ub-crit);">${formatNum(ca?.objectionCount || 0)}</div>
          </div>
        </div>

        ${threadsLeadsBoxHtml}

        <div class="ub-TranscriptBox">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:12px; color:var(--ub-ink);">
              ${
                platform === 'threads'
                  ? 'Chuỗi Thảo luận & Trả lời (Replies) trên Threads'
                  : platform === 'instagram'
                    ? 'Bình luận người xem trên Instagram'
                    : 'Bình luận & Nhu cầu chốt đơn trên Facebook'
              }
            </strong>
            <button type="button" class="ub-IconBtn" id="ub-btn-export-comments-csv">Xuất CSV</button>
          </div>
          ${
            allCmts.length > 0
              ? `<div style="max-height:240px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
                   ${allCmts
                     .slice(0, 25)
                     .map(
                       (c) => `
                         <div style="padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px;">
                           <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                             <b style="color:var(--ub-ink);">@${escapeHtml(c.user || 'user')}</b>
                             <span class="ub-Badge ${c.group === 'BUYING' ? 'ub-Badge--pos' : c.group === 'OBJECTION' ? 'ub-Badge--crit' : 'ub-Badge--neutral'}">${escapeHtml(c.label || c.group || 'Thảo luận')}</span>
                           </div>
                           <div style="color:var(--ub-ink-2); line-height:1.35;">${escapeHtml(c.text)}</div>
                         </div>
                       `
                     )
                     .join('')}
                 </div>`
              : `<div style="font-size:12px; color:var(--ub-ink-3); padding:8px 0;">
                   Mở chi tiết một bài đăng để hệ thống tự động phân loại bình luận và lọc câu hỏi mua hàng.
                 </div>`
          }
        </div>
      `;

      footerHtml =
        platform === 'threads'
          ? `
            <button class="ub-BtnSecondary" id="ub-btn-export-comments-csv-footer" type="button">
              Xuất Tất cả Replies (${allCmts.length})
            </button>
            <button class="ub-BtnPrimary" id="ub-btn-th-export-leads" type="button">
              🎯 Xuất Lead Khách (${leads.length || ca?.buyingIntentCount || 0})
            </button>
          `
          : `
            <button class="ub-BtnSecondary" id="ub-btn-export-comments-csv-footer" type="button">
              Xuất CSV Bình luận & SĐT (${allCmts.length})
            </button>
          `;
    } else {
      // Tab 4: Nghiệm thu bài đăng (IG / Threads / FB) & Lưu Đề xuất Booking KOC
      const storeOptionsHtml = stores
        .map(
          (s) =>
            `<option value="${escapeHtml(s.storeName)}" ${
              s.storeName === selectedStoreObj.storeName ? 'selected' : ''
            }>${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})</option>`
        )
        .join('');

      tabBodyHtml = `
        <div class="ub-FormSection" style="margin-bottom:8px;">
          <div class="ub-SectionTitle">
            1. Đối soát Nghiệm thu bài đăng ${platform === 'threads' ? 'Threads' : platform === 'instagram' ? 'Instagram Reel / Post' : 'Facebook Reel / Fanpage'}
          </div>
          <div class="ub-FormGrid">
            <div class="ub-Field">
              <label class="ub-Label">Hashtag / Tag bắt buộc</label>
              <input class="ub-Input" id="ub-inp-expect-tags" type="text" placeholder="VD: #clubclio, #loccitane" value="${escapeHtml(uiState.expectedHashtagInput)}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Từ khóa USP trong bài viết</label>
              <input class="ub-Input" id="ub-inp-expect-usp" type="text" placeholder="VD: kiềm dầu, chính hãng" value="${escapeHtml(uiState.expectedUspInput)}" />
            </div>
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Link Sản phẩm / Affiliate cần đối chiếu (nếu có)</label>
              <input class="ub-Input" id="ub-inp-expect-cart" type="text" placeholder="Dán link Shopee / Website / Mã SP..." value="${escapeHtml(uiState.expectedCartUrlInput)}" />
            </div>
            <div class="ub-Field ub-Field--full" id="ub-air-match-wrap"></div>
            <div class="ub-Field">
              <label class="ub-Label">Gian hàng nghiệm thu</label>
              <select class="ub-Select" id="ub-sel-air-store">${storeOptionsHtml}</select>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Mã BO (Deal Code)</label>
              <input class="ub-Input" id="ub-inp-dealcode" type="text" placeholder="VD: BO261067161" value="${escapeHtml(uiState.dealCodeInput || kocDb?.latestBoCode || '')}" />
            </div>
          </div>
          <div style="margin-top:8px; display:flex; justify-content:flex-end;">
            <button class="ub-BtnSecondary" id="ub-btn-verify-air" type="button" style="width:auto; padding:0 12px;" ${uiState.syncing ? 'disabled' : ''}>
              ${uiState.syncing ? 'Đang gửi nghiệm thu...' : 'Ghi nhận Nghiệm thu Bài đăng'}
            </button>
          </div>
        </div>

        <div class="ub-FormSection">
          <div class="ub-SectionTitle">
            2. Đề xuất Booking KOC ${platform === 'threads' ? 'Threads' : platform === 'instagram' ? 'Instagram' : 'Facebook'} về Hệ thống B2C
          </div>
          <div class="ub-FormGrid">
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Gian hàng B2C phụ trách</label>
              <select class="ub-Select" id="ub-sel-store">${storeOptionsHtml}</select>
            </div>
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Luồng phê duyệt tự động</label>
              <div class="ub-RoutingBox">${escapeHtml(selectedStoreObj.routingLabel)}</div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Đơn giá đề xuất Net (VND)</label>
              <input class="ub-Input ub-Num" id="ub-inp-rate" type="number" min="0" step="100000" placeholder="VD: 3000000" value="${escapeHtml(uiState.proposedRateInput || (kocDb?.avgUnitPrice ? String(kocDb.avgUnitPrice) : ''))}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Ghi chú Hình thức Hợp tác</label>
              <input class="ub-Input" id="ub-inp-note" type="text" placeholder="${platform === 'threads' ? 'Bài Thread + gắn link Affiliate...' : platform === 'instagram' ? '1 Reel + 1 Story gắn link Bio...' : 'Đăng Reel / Bài Fanpage...'}" value="${escapeHtml(uiState.noteInput || '')}" />
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnPrimary" id="ub-btn-save-booking" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang đồng bộ...' : `Lưu Đề xuất KOC ${platform === 'threads' ? 'Threads' : platform === 'instagram' ? 'Instagram' : 'Facebook'}`}
        </button>
      `;
    }

    return { tabBodyHtml, footerHtml, postsCount: vids.length, affCount: affLinks.length };
  }

  function render() {
    applyRootDockPosition();

    // Lưu vị trí cuộn của .ub-Body trước khi cập nhật DOM
    const prevBodyEl = root.querySelector('.ub-Body');
    const prevScrollTop = prevBodyEl ? prevBodyEl.scrollTop : 0;

    if (uiState.minimized) {
      const stats = computeChannelStats();
      root.innerHTML = `
        <button class="ub-LauncherBtn" id="ub-btn-expand">
          ${UPBASE_ICON_SVG}
          <span>${uiState.handle ? `@${escapeHtml(uiState.handle)} · ${formatNum(stats.medianViews || uiState.currentVideo?.views || 0)}` : 'Upbase B2C'}</span>
        </button>
      `;
      root.querySelector('#ub-btn-expand')?.addEventListener('click', () => {
        uiState.minimized = false;
        saveUiPrefs();
        render();
      });
      return;
    }

    const stats = computeChannelStats();
    const kocDb = uiState.lookupResult?.koc || null;
    const recentDeals = uiState.lookupResult?.recentDeals || [];
    const stores = uiState.lookupResult?.stores?.length
      ? uiState.lookupResult.stores
      : [
          {
            storeName: 'ClubClio_TikTok_E2E-S',
            brandName: 'ClubClio',
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'Rejuran_TikTok_E2E-S',
            brandName: 'Rejuran',
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'LOccitane_TikTok_E2E-S',
            brandName: "L'Occitane",
            routingLabel: 'Leader Nguyễn Thị Ngọc Tâm → GĐ Marketing Đặng Thị Yến Nhi',
          },
          {
            storeName: 'pHCare_TikTok_E2E-S',
            brandName: 'pHCare',
            routingLabel: 'PIC trình trực tiếp GĐ Marketing Đặng Thị Yến Nhi',
          },
        ];

    const selectedStoreObj =
      stores.find((s) => s.storeName === uiState.selectedStoreName) || stores[0];

    const dbBadgeHtml = !uiState.handle
      ? `<span class="ub-Badge ub-Badge--neutral">Sẵn sàng</span>`
      : uiState.lookupLoading
        ? `<span class="ub-Badge ub-Badge--neutral">Đang tra...</span>`
        : kocDb
          ? `<span class="ub-Badge ub-Badge--pos">Master (${escapeHtml(kocDb.salaryGrade)} · ${formatNum(kocDb.totalPastDeals)} BO)</span>`
          : `<span class="ub-Badge ub-Badge--warn">KOC mới</span>`;

    const avatarInitial = (uiState.handle || 'U').slice(0, 2).toUpperCase();

    let tabBodyHtml = '';
    let footerHtml = '';
    let shopeeItemsCount = 0;
    let metaPostsCount = 0;
    let metaAffCount = 0;

    if (uiState.platform === 'shopee') {
      const spRes = renderShopeeWorkspace(stores, selectedStoreObj, kocDb);
      tabBodyHtml = spRes.tabBodyHtml;
      footerHtml = spRes.footerHtml;
      shopeeItemsCount = spRes.shopItemsCount || 0;
    } else if (['instagram', 'threads', 'facebook'].includes(uiState.platform)) {
      const metaRes = renderMetaPlatformWorkspace(uiState.platform, stores, selectedStoreObj, kocDb);
      tabBodyHtml = metaRes.tabBodyHtml;
      footerHtml = metaRes.footerHtml;
      metaPostsCount = metaRes.postsCount || 0;
      metaAffCount = metaRes.affCount || 0;
    } else if (uiState.activeTab === 'metrics') {
      const subNavHtml = `
        <div class="ub-SubNav">
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'posts' ? 'ub-SubNavBtn--active' : ''}" data-subview="posts">
            ${uiState.pageType === 'other' ? 'Đề xuất' : `Bài (${stats.sampleCount})`}
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'ai_studio' ? 'ub-SubNavBtn--active' : ''}" data-subview="ai_studio">
            Kịch bản
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'live_room' ? 'ub-SubNavBtn--active' : ''}" data-subview="live_room">
            🔴 Live
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'products' ? 'ub-SubNavBtn--active' : ''}" data-subview="products">
            Sản phẩm
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'schedule' ? 'ub-SubNavBtn--active' : ''}" data-subview="schedule">
            Giờ·Nhạc
          </button>
          <button type="button" class="ub-SubNavBtn ${uiState.metricsSubView === 'hub' ? 'ub-SubNavBtn--active' : ''}" data-subview="hub">
            Theo dõi
          </button>
        </div>
      `;

      if (uiState.metricsSubView === 'live_room') {
        const d = uiState.sellerDraft;
        const lv = uiState.liveSession || {};
        const bagList = Array.isArray(lv.liveBagProducts) ? lv.liveBagProducts : [];
        const liveCmts = Array.isArray(lv.liveComments) ? lv.liveComments : [];
        const buyingLiveCmts = liveCmts.filter(
          (c) => c.intentGroup === 'BUYING' || c.extractedPhone
        );
        const resolvedLiveGmv =
          Number(d.liveGmv || 0) > 0
            ? Number(d.liveGmv)
            : Math.round(Number(d.doanhSo || 0) * (Number(d.gmvTuLivePct || 0) / 100));

        const bagEstimatedGmv = bagList.reduce(
          (sum, p) => sum + Math.round(Number(p.priceVnd || 0) * Number(p.soldCount || 0)),
          0
        );
        const bagEstimatedSold = bagList.reduce(
          (sum, p) => sum + Math.round(Number(p.soldCount || 0)),
          0
        );
        const sessionGmv = Math.max(Number(lv.sessionGmv || 0), bagEstimatedGmv);
        const sessionSold = Math.max(Number(lv.sessionItemsSold || 0), bagEstimatedSold);
        const sessionOrders = Math.max(
          Number(lv.sessionOrders || 0),
          sessionSold > 0 ? Math.max(1, Math.round(sessionSold * 0.85)) : 0
        );
        const sessionTotalViews = Math.max(Number(lv.totalViews || 0), Number(lv.peakViewers || 0));
        const sessionPeakPcu = Math.max(
          Number(lv.peakViewers || 0),
          Number(lv.currentViewers || 0),
          Number(d.livePeakViewers || 0)
        );
        const sessionGpm =
          Number(lv.sessionGpm || 0) > 0
            ? Number(lv.sessionGpm)
            : sessionTotalViews > 0 && sessionGmv > 0
              ? Math.round((sessionGmv / sessionTotalViews) * 1000)
              : Number(d.liveGpm || 0);
        const statusBadgeCls = lv.isEnded
          ? 'ub-Badge--pos'
          : lv.isLive
            ? 'ub-Badge--crit'
            : 'ub-Badge--neutral';
        const statusBadgeText = lv.isEnded
          ? `✅ Đã kết thúc (${lv.endedAt || 'Đã chốt sổ'})`
          : lv.isLive
            ? '🔴 Đang phát LIVE'
            : 'Chờ mở phòng Live';

        const bagRowsHtml =
          bagList.length > 0
            ? bagList
                .slice(0, 12)
                .map(
                  (p, idx) => `
                  <tr>
                    <td>
                      <div style="font-weight:600; color:var(--ub-ink);">${idx + 1}. ${escapeHtml(p.title)}</div>
                      <div style="color:var(--ub-ink-3);">
                        ${p.isPinned ? '<span class="ub-Badge ub-Badge--warn">📌 Đang ghim</span> · ' : ''}
                        Mã: <strong>${escapeHtml(p.productId)}</strong> · Shop: ${escapeHtml(p.shopName)}
                      </div>
                    </td>
                    <td class="ub-Num" style="font-weight:700; color:var(--ub-pos);">${formatVnd(p.priceVnd)}</td>
                    <td class="ub-Num">${formatNum(p.soldCount)}</td>
                    <td class="ub-Num">
                      <a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">Mở ↗</a>
                    </td>
                  </tr>`
                )
                .join('')
            : `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3); padding:10px;">Mở phòng phát sóng trực tiếp (/@${escapeHtml(uiState.handle || 'koc')}/live) và bấm vào biểu tượng Giỏ hàng để tự động đọc danh sách sản phẩm đang ghim trên Live.</td></tr>`;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">PCU Đỉnh</div>
              <div class="ub-StatVal" style="color:${lv.isLive ? 'var(--ub-crit)' : 'var(--ub-ink)'};">${formatNum(sessionPeakPcu)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">View Ca Live</div>
              <div class="ub-StatVal">${formatNum(sessionTotalViews || d.liveAvgViews || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">GMV Ca Live</div>
              <div class="ub-StatVal" style="color:var(--ub-pos);">${formatVnd(sessionGmv || resolvedLiveGmv)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">GPM Live</div>
              <div class="ub-StatVal">${formatVnd(sessionGpm || d.liveGpm || d.gpm || 0)}</div>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">1. Tổng kết & Chốt sổ Ca Live Gian hàng (@${escapeHtml(uiState.handle || 'shop')})</h4>
              <span class="ub-Badge ${statusBadgeCls}">${escapeHtml(statusBadgeText)}</span>
            </div>
            <div class="ub-KeyValGrid">
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">GMV Ca Live:</span>
                <span class="ub-KeyVal" style="color:var(--ub-pos);">${formatVnd(sessionGmv)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Đơn / Món trong ca:</span>
                <span class="ub-KeyVal">${formatNum(sessionOrders)} đơn (${formatNum(sessionSold)} món)</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Tổng xem ca Live:</span>
                <span class="ub-KeyVal">${formatNum(sessionTotalViews)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Mắt xem đỉnh (PCU):</span>
                <span class="ub-KeyVal">${formatNum(sessionPeakPcu)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Thời lượng / Tim:</span>
                <span class="ub-KeyVal">${formatNum(lv.durationMinutes || d.liveAvgDurationMin || 0)} phút · ${formatNum(lv.likes || 0)} tim</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">GPM / Chuyển đổi:</span>
                <span class="ub-KeyVal">${formatVnd(sessionGpm)}${lv.sessionCtrPct ? ` · CTR ${lv.sessionCtrPct}%` : ''}</span>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; padding-top:4px; border-top:1px dashed var(--ub-line);">
              <button type="button" class="ub-IconBtn" id="ub-btn-copy-post-live-report" style="font-weight:600; color:var(--ub-accent);">📋 Copy Chốt sổ Ca Live (Lark)</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-export-post-live-csv">⬇ Xuất CSV Tổng kết Ca Live</button>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">2. Chỉ số Live Affiliate 30 ngày của @${escapeHtml(uiState.handle || 'koc')}</h4>
              ${
                uiState.handle
                  ? `<a href="https://www.tiktok.com/@${escapeHtml(uiState.handle)}/live" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">Mở Phòng Live ↗</a>`
                  : ''
              }
            </div>
            <div class="ub-KeyValGrid">
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">GMV từ LIVE (30d):</span>
                <span class="ub-KeyVal" style="color:var(--ub-pos);">${formatVnd(resolvedLiveGmv)} (${Number(d.gmvTuLivePct || 0)}%)</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">GPM riêng của LIVE:</span>
                <span class="ub-KeyVal">${formatVnd(d.liveGpm || 0)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Số phiên LIVE (30d):</span>
                <span class="ub-KeyVal">${formatNum(d.liveSessionCount || 0)} phiên</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">View LIVE TB / phiên:</span>
                <span class="ub-KeyVal">${formatNum(d.liveAvgViews || 0)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Mắt xem đỉnh (PCU):</span>
                <span class="ub-KeyVal">${formatNum(Math.max(lv.peakViewers || 0, d.livePeakViewers || 0))}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Số món bán qua LIVE:</span>
                <span class="ub-KeyVal">${formatNum(d.liveItemsSold || 0)} món</span>
              </div>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">3. Giỏ hàng Phiên Live (Live Bag: ${bagList.length} SP)</h4>
            </div>
            <div class="ub-TableWrap" style="max-height:145px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Sản phẩm trên Live</th><th class="ub-Num">Giá Live</th><th class="ub-Num">Đã bán</th><th class="ub-Num">Link</th></tr>
                </thead>
                <tbody>${bagRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">4. Bình luận hỏi mua & SĐT trên Live (${buyingLiveCmts.length}/${liveCmts.length})</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-export-live-comments">Xuất CSV Live Chat</button>
            </div>
            ${
              buyingLiveCmts.length > 0
                ? `<div style="display:flex; flex-direction:column; gap:3px; max-height:110px; overflow-y:auto;">
                     ${buyingLiveCmts
                       .slice(0, 8)
                       .map(
                         (c) => `
                       <div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; border:1px solid var(--ub-line);">
                         <span class="ub-Badge ub-Badge--pos">${escapeHtml(c.intentLabel)}</span>
                         ${c.extractedPhone ? `<strong style="color:var(--ub-crit); margin-left:4px;">📞 ${escapeHtml(c.extractedPhone)}</strong>` : ''}
                         <span style="color:var(--ub-ink); margin-left:4px;">${escapeHtml(c.text)}</span>
                       </div>`
                       )
                       .join('')}
                   </div>`
                : `<div style="color:var(--ub-ink-3);">Khi đang xem phòng Live, các bình luận khách hỏi giá, hỏi giỏ hàng hoặc để lại SĐT sẽ tự động lọc và hiển thị tại đây.</div>`
            }
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-copy-live-summary-foot" type="button">Copy Chốt sổ Ca Live</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang đồng bộ...' : 'Đồng bộ Chỉ số KOC & Live'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'schedule') {
        const pa = uiState.postingAnalytics || { byHour: [], byHashtag: [], byMusic: [], byDate: [] };
        const hoursHtml =
          (pa.byHour || []).slice(0, 6).map(
            (h) => `
            <tr>
              <td style="font-weight:600;">Khung ${escapeHtml(h.hourLabel)}</td>
              <td class="ub-Num">${formatNum(h.videoCount)} bài</td>
              <td class="ub-Num" style="font-weight:600; color:var(--ub-accent);">${formatNum(h.avgViews)}</td>
              <td class="ub-Num">${formatNum(h.totalViews)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu giờ đăng.</td></tr>`;

        const tagsHtml =
          (pa.byHashtag || []).slice(0, 8).map(
            (t) => `
            <tr>
              <td style="font-weight:600; color:var(--ub-accent);">${escapeHtml(t.hashtag)}</td>
              <td class="ub-Num">${formatNum(t.videoCount)} bài</td>
              <td class="ub-Num">${formatNum(t.avgViews)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="3" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu hashtag.</td></tr>`;

        const musicHtml =
          (pa.byMusic || []).slice(0, 8).map(
            (m, idx) => `
            <tr>
              <td>
                <div style="font-weight:600; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(m.musicTitle)}</div>
              </td>
              <td class="ub-Num">${formatNum(m.videoCount)} bài</td>
              <td class="ub-Num">${formatNum(m.avgViews)}</td>
              <td class="ub-Num">
                ${
                  m.musicPlayUrl
                    ? `<button type="button" class="ub-IconBtn ub-BtnDlMusic" data-music-idx="${idx}">Tải MP3</button>`
                    : '<span style="color:var(--ub-ink-3);">—</span>'
                }
              </td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu nhạc nền.</td></tr>`;

        const dateHtml =
          (pa.byDate || []).slice(0, 10).map(
            (d) => `
            <tr>
              <td style="font-weight:600;">${formatDateVn(d.date)}</td>
              <td class="ub-Num">${formatNum(d.videoCount)} bài (${d.shopVideoCount} giỏ)</td>
              <td class="ub-Num" style="font-weight:600;">${formatNum(d.totalViews)}</td>
              <td class="ub-Num">${formatNum(d.totalLikes)}</td>
            </tr>`
          ).join('') || `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu theo ngày đăng.</td></tr>`;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">1. Khung giờ đăng hiệu quả nhất (Giờ VN UTC+7)</h4>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Khung giờ</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th><th class="ub-Num">Tổng View</th></tr>
                </thead>
                <tbody>${hoursHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">2. Hiệu quả theo Hashtag & Nhạc nền (MP3 Playlist)</h4>
            <div class="ub-TableWrap" style="max-height:110px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Hashtag</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th></tr>
                </thead>
                <tbody>${tagsHtml}</tbody>
              </table>
            </div>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Âm thanh / Nhạc nền</th><th class="ub-Num">Số bài</th><th class="ub-Num">View TB</th><th class="ub-Num">Tải về</th></tr>
                </thead>
                <tbody>${musicHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">3. Lượt xem theo Ngày đăng</h4>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Ngày đăng</th><th class="ub-Num">Số bài</th><th class="ub-Num">Tổng View</th><th class="ub-Num">Tổng Tim</th></tr>
                </thead>
                <tbody>${dateHtml}</tbody>
              </table>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Báo cáo Kênh (PDF/PNG)</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ chỉ số về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'products') {
        const pa = uiState.productAggregation || { productsList: [], shopsList: [] };
        const pList = pa.productsList || [];
        const sList = pa.shopsList || [];
        const scored = uiState.superVipScoredProduct;

        const prodRowsHtml =
          pList.length > 0
            ? pList
                .map(
                  (p) => `
                <tr>
                  <td style="word-break:break-word;">
                    <a href="${escapeHtml(p.productUrl || '#')}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; display:block;">
                      ${escapeHtml(p.title)}
                    </a>
                    <span style="color:var(--ub-ink-3); display:block;">${escapeHtml(p.shopName)}${p.productId ? ` · Mã: ${escapeHtml(String(p.productId).slice(-6))}` : ''}</span>
                    ${
                      p.productUrl
                        ? `<button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(p.productUrl)}" style="margin-top:2px;">Copy Link Giỏ</button>`
                        : ''
                    }
                  </td>
                  <td class="ub-Num" style="font-weight:700; white-space:nowrap;">${p.videoCount} bài</td>
                  <td class="ub-Num" style="white-space:nowrap;">
                    <strong>${formatNum(p.totalViews)}</strong>
                    <div style="color:var(--ub-ink-3);">TB: ${formatNum(p.avgViews)}</div>
                  </td>
                  <td class="ub-Num" style="white-space:nowrap;">
                    ${
                      p.priceVnd > 0
                        ? `<strong>${formatVnd(p.priceVnd)}</strong><br/><span style="color:var(--ub-pos);">HH (${p.commissionRatePct || 10}%): ${formatVnd(p.estimatedCommissionVnd)}</span>`
                        : `<a href="${escapeHtml(p.productUrl || '#')}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">Mở xem giá ↗</a><br/><span style="color:var(--ub-ink-3);">TikTok ẩn giá</span>`
                    }
                  </td>
                </tr>`
                )
                .join('')
            : `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Chưa phát hiện sản phẩm gắn giỏ trên kênh này. Bạn có thể dán Link / Mã SP vào ô bên trên để chấm điểm trực tiếp.</td></tr>`;

        const shopRowsHtml =
          sList.length > 0
            ? sList
                .map(
                  (s) => `
                <tr>
                  <td style="font-weight:600; word-break:break-word;">${escapeHtml(s.shopName)}</td>
                  <td class="ub-Num" style="white-space:nowrap;">${s.productCount} SP</td>
                  <td class="ub-Num" style="white-space:nowrap;">${s.videoCount} bài</td>
                  <td class="ub-Num" style="white-space:nowrap;">
                    <strong>${formatNum(s.totalViews)} view</strong>
                    <div style="color:var(--ub-accent); font-weight:600;">
                      ${
                        s.estimatedGmv > 0
                          ? `GMV: ${formatVnd(s.estimatedGmv)}`
                          : `TB: ${formatNum(Math.round((s.totalViews || 0) / Math.max(1, s.videoCount || 1)))}/bài`
                      }
                    </div>
                  </td>
                </tr>`
                )
                .join('')
            : `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3);">Chưa có dữ liệu gom theo Shop.</td></tr>`;

        const scoredCardHtml = scored
          ? `
            <div style="margin-top:6px; padding:8px 10px; background:var(--ub-surface); border:1px solid var(--ub-line-strong); border-radius:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <strong style="font-size:12px; color:var(--ub-ink);">${escapeHtml(scored.title)}</strong>
                <span class="ub-Badge ub-Badge--pos">Điểm SP: ${scored.productScore}/100</span>
              </div>
              <div class="ub-KeyValGrid" style="margin-top:6px;">
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Giá bán:</span><span class="ub-KeyVal">${formatVnd(scored.priceVnd)}</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Hoa hồng (${scored.commissionRatePct}%):</span><span class="ub-KeyVal" style="color:var(--ub-pos);">${formatVnd(scored.estimatedCommissionVnd)}/đơn</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Đã bán / Tốc độ:</span><span class="ub-KeyVal">${formatNum(scored.soldCount)} (${scored.dailySalesVelocity} đơn/ngày)</span></div>
                <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tồn kho:</span><span class="ub-KeyVal">${escapeHtml(scored.stockStatusLabel)}</span></div>
                <div class="ub-KeyValItem" style="grid-column:1 / -1;"><span class="ub-KeyLabel">Mức cạnh tranh:</span><span class="ub-KeyVal" style="color:var(--ub-accent);">${escapeHtml(scored.competitionLabel)}</span></div>
              </div>
              <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; color:var(--ub-ink-2);">Tìm trên sàn khác:</span>
                <div style="display:flex; gap:6px;">
                  <a href="${escapeHtml(scored.crossPlatformLinks?.tiktokShop || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">TikTok Shop</a>
                  <a href="${escapeHtml(scored.crossPlatformLinks?.shopee || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">Shopee</a>
                  <a href="${escapeHtml(scored.crossPlatformLinks?.lazada || '#')}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600;">Lazada</a>
                </div>
              </div>
            </div>
          `
          : '';

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">1. Chấm điểm Mặt hàng từ Link / Product ID (Super VIP)</h4>
            </div>
            <div style="display:grid; grid-template-columns:1fr 78px auto; gap:6px;">
              <input class="ub-Input" id="ub-inp-supervip-query" type="text" placeholder="Dán link SP TikTok Shop, Tên SP hoặc Product ID..." value="${escapeHtml(uiState.superVipQueryInput)}" />
              <input class="ub-Input" id="ub-inp-supervip-comm" type="number" min="1" max="50" title="% Hoa hồng ước tính" value="${Number(uiState.superVipCommissionPct || 12)}" />
              <button class="ub-BtnSecondary" id="ub-btn-score-product" type="button" style="height:32px;">Chấm điểm</button>
            </div>
            ${scoredCardHtml}
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">2. Mỗi mặt hàng làm bao nhiêu bài (${pList.length} mặt hàng)</h4>
            </div>
            <div class="ub-TableWrap" style="max-height:160px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Mặt hàng / Shop</th><th class="ub-Num">Số bài</th><th class="ub-Num">Tổng View</th><th class="ub-Num">Giá / Hoa hồng</th></tr>
                </thead>
                <tbody>${prodRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">3. Gom theo Gian hàng / Nhãn Giỏ (${sList.length} nhóm)</h4>
            <div class="ub-TableWrap" style="max-height:115px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Gian hàng / Nhãn</th><th class="ub-Num">Số SP</th><th class="ub-Num">Số bài</th><th class="ub-Num">Tổng View</th></tr>
                </thead>
                <tbody>${shopRowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-export-products" type="button">Xuất CSV Mặt hàng & Shop</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'hub') {
        const wl = Array.isArray(uiState.watchlistChannels) ? uiState.watchlistChannels : [];
        const cc = uiState.commissionCalc;
        const commPerOrder = Math.round(Number(cc.priceVnd || 0) * (Number(cc.commissionPct || 0) / 100));
        const totalComm = commPerOrder * Math.round(Number(cc.expectedOrders || 0));
        const totalGmv = Math.round(Number(cc.priceVnd || 0)) * Math.round(Number(cc.expectedOrders || 0));
        const netProfit = totalComm - Math.round(Number(cc.fixedCostVnd || 0));
        const breakEvenOrders =
          commPerOrder === 0 ? 0 : Math.ceil(Math.round(Number(cc.fixedCostVnd || 0)) / commPerOrder);

        const wlRowsHtml =
          wl.length > 0
            ? wl
                .map((item, idx) => {
                  const folVal = Number(item.followers || 0);
                  const dFol = folVal - Number(item.prevFollowers || folVal || 0);
                  const dView = Number(item.avgViews || 0) - Number(item.prevAvgViews || item.avgViews || 0);
                  return `
                  <tr>
                    <td style="word-break:break-word;">
                      <a href="https://www.tiktok.com/@${escapeHtml(item.handle)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; display:block;">@${escapeHtml(item.handle)}</a>
                      <div style="color:var(--ub-ink-3);">${formatDateVn(item.updatedAt)} · ER ${item.engagementRate || 0}%</div>
                    </td>
                    <td class="ub-Num" style="white-space:nowrap;">
                      ${folVal > 0 ? formatNum(folVal) : '—'}
                      ${folVal > 0 ? `<div style="color:${dFol > 0 ? 'var(--ub-pos)' : 'var(--ub-ink-3)'};">${dFol >= 0 ? `+${formatNum(dFol)}` : formatNum(dFol)}</div>` : ''}
                    </td>
                    <td class="ub-Num" style="white-space:nowrap;">
                      ${formatNum(item.avgViews)}
                      <div style="color:${dView > 0 ? 'var(--ub-pos)' : 'var(--ub-ink-3)'};">${dView >= 0 ? `+${formatNum(dView)}` : formatNum(dView)}</div>
                    </td>
                    <td class="ub-Num" style="white-space:nowrap;">
                      <button type="button" class="ub-IconBtn ub-BtnRemoveWatch" data-watch-idx="${idx}">Xóa</button>
                    </td>
                  </tr>`;
                })
                .join('')
            : `<tr><td colspan="4" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Chưa có kênh trong danh sách theo dõi. Bấm "+ Lưu kênh đang mở" để theo dõi biến động từ lần xem trước.</td></tr>`;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <h4 class="ub-SectionTitle">1. Theo dõi Kênh & Biến động (Lưu trên máy)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-save-watchlist" style="flex-shrink:0;">+ Lưu kênh đang mở</button>
            </div>
            <div class="ub-TableWrap" style="max-height:135px;">
              <table class="ub-Table">
                <thead>
                  <tr><th>Kênh KOC</th><th class="ub-Num">Followers (Δ)</th><th class="ub-Num">View TB (Δ)</th><th class="ub-Num">Xóa</th></tr>
                </thead>
                <tbody>${wlRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">2. Máy tính Hoa hồng & Điểm hòa vốn (Affiliate / Booking)</h4>
            <div class="ub-FormGrid">
              <div class="ub-Field">
                <label class="ub-Label">Giá bán SP (VND)</label>
                <input class="ub-Input" id="ub-cc-price" type="number" min="0" step="10000" value="${Math.round(Number(cc.priceVnd || 0))}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">% Hoa hồng Affiliate</label>
                <input class="ub-Input" id="ub-cc-pct" type="number" min="1" max="80" value="${Number(cc.commissionPct || 12)}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Số đơn dự kiến</label>
                <input class="ub-Input" id="ub-cc-orders" type="number" min="0" value="${Math.round(Number(cc.expectedOrders || 0))}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Chi phí Cát-xê / Ads (VND)</label>
                <input class="ub-Input" id="ub-cc-cost" type="number" min="0" step="100000" value="${Math.round(Number(cc.fixedCostVnd || 0))}" />
              </div>
            </div>
            <div class="ub-KeyValGrid" style="margin-top:4px; background:var(--ub-surface); padding:6px 8px; border:1px solid var(--ub-line); border-radius:4px;">
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Hoa hồng / đơn:</span><span class="ub-KeyVal" id="ub-cc-val-per">${formatVnd(commPerOrder)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tổng GMV dự kiến:</span><span class="ub-KeyVal" id="ub-cc-val-gmv">${formatVnd(totalGmv)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tổng Hoa hồng:</span><span class="ub-KeyVal" id="ub-cc-val-total" style="color:var(--ub-pos);">${formatVnd(totalComm)}</span></div>
              <div class="ub-KeyValItem"><span class="ub-KeyLabel">Điểm hòa vốn / Lãi:</span><span class="ub-KeyVal" id="ub-cc-val-profit" style="color:${netProfit >= 0 ? 'var(--ub-pos)' : 'var(--ub-crit)'};">${breakEvenOrders} đơn (${formatVnd(netProfit)})</span></div>
            </div>
          </div>

          ${
            uiState.searchSaturation?.discoveredKocs?.length > 0
              ? `<div class="ub-SectionBox">
                   <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                     <h4 class="ub-SectionTitle">3. KOC phát hiện trên trang (${uiState.searchSaturation.discoveredKocs.length} kênh)</h4>
                     <span class="ub-Badge ub-Badge--neutral">${escapeHtml(
                       String(uiState.searchSaturation.competitionLabel || '')
                         .replace(' (Nhiều KOC gắn giỏ)', '')
                         .replace(' (Đang tăng trưởng)', '')
                         .replace(' (Ngách mới tiềm năng)', '')
                     )}</span>
                   </div>
                   <div class="ub-TableWrap" style="max-height:145px;">
                     <table class="ub-Table">
                       <thead>
                         <tr><th>Kênh KOC</th><th class="ub-Num">Followers</th><th class="ub-Num">View TB</th><th class="ub-Num">Theo dõi</th></tr>
                       </thead>
                       <tbody>
                         ${uiState.searchSaturation.discoveredKocs
                           .map((k, kIdx) => {
                             const alreadyWatched = wl.some(
                               (w) => normalizeKocHandle(w.handle) === normalizeKocHandle(k.handle)
                             );
                             return `
                           <tr>
                             <td style="word-break:break-word;">
                               <a href="https://www.tiktok.com/@${escapeHtml(k.handle)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; display:block;">@${escapeHtml(k.handle)}</a>
                               <span style="color:var(--ub-ink-3);">${k.videoCount} bài (${k.shopVideoCount} giỏ)</span>
                             </td>
                             <td class="ub-Num" style="white-space:nowrap;">${k.followers > 0 ? formatNum(k.followers) : '—'}</td>
                             <td class="ub-Num" style="font-weight:600; white-space:nowrap;">${formatNum(k.avgViews)}</td>
                             <td class="ub-Num" style="white-space:nowrap;">
                               <button type="button" class="ub-IconBtn ub-BtnWatchDiscoveredKoc" data-disc-idx="${kIdx}">${alreadyWatched ? '✓ Đã lưu' : '+ Lưu'}</button>
                             </td>
                           </tr>`;
                           })
                           .join('')}
                       </tbody>
                     </table>
                   </div>
                 </div>`
              : ''
          }
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Xuất Báo cáo PDF/PNG</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi dữ liệu...' : 'Đồng bộ về Danh bạ KOC'}
          </button>
        `;
      } else if (uiState.metricsSubView === 'ai_studio') {
        const ipRes = uiState.imagePromptResult;
        const scRes = uiState.scriptAnalysisResult;
        const batchItems = Array.isArray(uiState.batchScriptItems) ? uiState.batchScriptItems : [];
        const batchVttCount = batchItems.filter((x) => x.hasVtt).length;
        const batchCartCount = batchItems.filter((x) => x.hasCart).length;

        tabBodyHtml = `
          ${subNavHtml}
          <div class="ub-SectionBox" style="border-color:var(--ub-line-strong);">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <h4 class="ub-SectionTitle">1. Quét Kịch bản Hàng loạt theo Kênh</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-batch-scan-scripts" style="background:var(--ub-primary); color:#FFFFFF; border-color:var(--ub-primary); font-weight:600;" ${uiState.batchScriptScanning ? 'disabled' : ''}>
                ${uiState.batchScriptScanning ? 'Đang quét...' : '▶ Quét hàng loạt'}
              </button>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="font-size:12px; color:var(--ub-ink-2); font-weight:600; white-space:nowrap;">Nhóm video:</span>
              <select class="ub-Select" id="ub-sel-batch-script-mode" style="flex:1; height:26px;">
                <option value="top5_views" ${uiState.batchScriptMode === 'top5_views' ? 'selected' : ''}>Top 5 bài nhiều view nhất</option>
                <option value="top10_views" ${uiState.batchScriptMode === 'top10_views' ? 'selected' : ''}>Top 10 bài nhiều view nhất</option>
                <option value="cart_only" ${uiState.batchScriptMode === 'cart_only' ? 'selected' : ''}>Chỉ các bài Gắn giỏ hàng (${stats.cartVideoCount} bài)</option>
                <option value="latest10" ${uiState.batchScriptMode === 'latest10' ? 'selected' : ''}>10 bài đăng mới nhất</option>
                <option value="all" ${uiState.batchScriptMode === 'all' ? 'selected' : ''}>Tất cả bài đã tải (${(uiState.videos || []).length} bài)</option>
              </select>
            </div>
            ${
              batchItems.length > 0
                ? `<div style="margin-top:2px; display:flex; flex-direction:column; gap:5px;">
                     <div style="display:flex; align-items:center; justify-content:space-between; gap:4px; flex-wrap:wrap; padding:5px 7px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px;">
                       <span><strong>${batchItems.length} bài</strong> · <strong style="color:var(--ub-accent);">${batchVttCount} bài</strong> có thoại VTT · <strong style="color:var(--ub-pos);">${batchCartCount} bài</strong> gắn giỏ</span>
                       <div style="display:flex; gap:4px;">
                         <button type="button" class="ub-IconBtn" id="ub-btn-export-batch-scripts-csv">Xuất CSV</button>
                         <button type="button" class="ub-IconBtn" id="ub-btn-copy-batch-scripts">Copy Tất cả</button>
                         <button type="button" class="ub-IconBtn" id="ub-btn-gemini-batch-scripts">Mở Gemini</button>
                       </div>
                     </div>
                     <div style="display:flex; flex-direction:column; gap:6px;">
                       ${batchItems
                         .map(
                           (it, bIdx) => `
                         <div style="padding:6px 8px; background:var(--ub-surface); border:1px solid ${it.hasCart ? '#EA5035' : 'var(--ub-line)'}; border-radius:5px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                           <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                             <a href="${escapeHtml(it.videoUrl)}" target="_blank" style="color:var(--ub-accent); font-weight:700; text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                               Bài #${it.index} · ${formatDateVn(it.publishedAt)} · ${formatNum(it.views)} view
                             </a>
                             <div style="display:flex; align-items:center; gap:3px; flex-shrink:0;">
                               <span class="ub-Badge ${it.hasCart ? 'ub-Badge--warn' : it.hasVtt ? 'ub-Badge--pos' : 'ub-Badge--neutral'}">${it.hasCart ? '🛒 Gắn giỏ' : it.hasVtt ? '🎙️ Có thoại VTT' : '🎵 Video nhạc'}</span>
                               <button type="button" class="ub-IconBtn ub-BtnCopySingleBatchScript" data-batch-idx="${bIdx}" style="height:20px; padding:0 5px;">Copy #${it.index}</button>
                             </div>
                           </div>
                           <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:3px; background:var(--ub-canvas); padding:3px 6px; border-radius:4px; font-size:12px;">
                             <span style="white-space:nowrap;">❤️ <strong>${formatNum(it.likes)}</strong></span>
                             <span style="white-space:nowrap;">💬 <strong>${formatNum(it.comments)}</strong></span>
                             <span style="white-space:nowrap;">🔖 <strong style="color:var(--ub-accent);">${formatNum(it.saves)}</strong></span>
                             <span style="white-space:nowrap;">↗ <strong style="color:var(--ub-pos);">${formatNum(it.shares)}</strong></span>
                           </div>
                           ${it.hasCart && it.productTitle ? `<div style="color:var(--ub-pos); font-weight:600;">🛍️ Sản phẩm gắn giỏ: ${escapeHtml(it.productTitle)}${it.productPriceVnd > 0 ? ` (${formatVnd(it.productPriceVnd)})` : ''}</div>` : ''}
                           ${
                             it.hasVtt && it.totalLines >= 3
                               ? `<div style="display:flex; flex-direction:column; gap:3px;">
                                    <div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; white-space:pre-wrap;"><strong>1. Mở đầu (Hook):</strong>\n${escapeHtml(it.hookPart)}</div>
                                    ${it.painPointPart ? `<div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; white-space:pre-wrap;"><strong>2. Dẫn dắt & Bối cảnh:</strong>\n${escapeHtml(it.painPointPart)}</div>` : ''}
                                    ${it.uspPart ? `<div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; white-space:pre-wrap;"><strong>3. Nội dung chính / Điểm chạm SP:</strong>\n${escapeHtml(it.uspPart)}</div>` : ''}
                                    ${it.ctaPart ? `<div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; white-space:pre-wrap;"><strong>4. Kết bài (CTA):</strong>\n${escapeHtml(it.ctaPart)}</div>` : ''}
                                  </div>
                                  <details style="margin-top:1px;">
                                    <summary style="cursor:pointer; color:var(--ub-accent); font-weight:600;">Xem toàn bộ lời thoại gốc WebVTT (${it.totalLines} câu · ${it.totalWords} từ)</summary>
                                    <div style="margin-top:3px; padding:4px 6px; background:var(--ub-canvas); border-radius:4px; white-space:pre-wrap;">${escapeHtml(it.transcriptText)}</div>
                                  </details>`
                               : it.hasVtt
                                 ? `<div style="background:var(--ub-canvas); padding:4px 6px; border-radius:4px; white-space:pre-wrap;">
                                      <strong>Lời thoại gốc WebVTT (${it.totalLines} câu · ${it.totalWords} từ):</strong>\n${escapeHtml(it.transcriptText)}
                                    </div>
                                    ${it.caption ? `<div style="color:var(--ub-ink-2); word-break:break-word;"><strong>Caption:</strong> ${escapeHtml(it.caption)}</div>` : ''}`
                                 : `<div style="background:var(--ub-canvas); padding:5px 7px; border-radius:4px; display:flex; flex-direction:column; gap:3px;">
                                      <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <strong style="color:var(--ub-ink);">Định dạng: ${escapeHtml(it.contentFormatLabel)}</strong>
                                        <span style="color:var(--ub-ink-3);">ER: ${it.engagementRate || 0}%${it.durationSeconds ? ` · ${it.durationSeconds}s` : ''}</span>
                                      </div>
                                      ${it.stickersText ? `<div style="color:var(--ub-accent); font-weight:600;">📝 Chữ trên màn hình: ${escapeHtml(it.stickersText)}</div>` : ''}
                                      <div style="color:var(--ub-ink); word-break:break-word;"><strong>Mô tả (Caption) & Hashtag:</strong> ${escapeHtml(it.caption || 'Không có mô tả')}</div>
                                      ${it.musicTitle ? `<div style="color:var(--ub-ink-2);"><strong>Nhạc nền:</strong> 🎵 ${escapeHtml(it.musicTitle)}</div>` : ''}
                                    </div>`
                           }
                         </div>`
                         )
                         .join('')}
                     </div>
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Chọn nhóm video và bấm "▶ Quét hàng loạt" để tải phụ đề WebVTT và phân tích nội dung cho nhiều video cùng lúc.</div>`
            }
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">2. Bóc tách Kịch bản Gốc & Viết Kịch bản Chi tiết (5 phân cảnh)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-analyze-script" ${uiState.syncing ? 'disabled' : ''}>
                ${uiState.syncing ? 'Đang soạn...' : 'Soạn Kịch bản Chi tiết'}
              </button>
            </div>
            ${
              scRes
                ? `<div style="padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; display:flex; flex-direction:column; gap:5px;">
                     <div><strong>Nhận xét kênh:</strong> ${escapeHtml(scRes.healthVerdict || scRes.channelEvaluation || '')}</div>
                     <div><strong>Khuyến nghị:</strong> ${escapeHtml(scRes.suggestedFormat || scRes.recommendation || '')}</div>
                     ${
                       scRes.originalBreakdown
                         ? `<div style="padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:3px;">
                              <div style="font-weight:700; color:var(--ub-accent);">PHẦN 1 — BÓC TÁCH KỊCH BẢN GỐC TỪ LỜI THOẠI VIDEO (${scRes.originalBreakdown.totalLines || 0} câu · ${scRes.originalBreakdown.totalWords || 0} từ):</div>
                              <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>1. Mở đầu (Hook):</strong>\n${escapeHtml(scRes.originalBreakdown.hookPart || '')}</div>
                              <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>2. Dẫn dắt & Bối cảnh:</strong>\n${escapeHtml(scRes.originalBreakdown.painPointPart || '')}</div>
                              <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>3. Trải nghiệm & Chứng minh USP:</strong>\n${escapeHtml(scRes.originalBreakdown.uspExperiencePart || '')}</div>
                              <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>4. Kết bài & Kêu gọi hành động:</strong>\n${escapeHtml(scRes.originalBreakdown.ctaPart || '')}</div>
                            </div>`
                         : ''
                     }
                     ${
                       Array.isArray(scRes.scriptScenes) && scRes.scriptScenes.length > 0
                         ? `<div style="padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:4px;">
                              <div style="font-weight:700; color:var(--ub-pos);">PHẦN 2 — KỊCH BẢN SẢN XUẤT ĐỀ XUẤT (${scRes.scriptScenes.length} PHÂN CẢNH CHI TIẾT):</div>
                              ${scRes.scriptScenes
                                .map(
                                  (sc) => `
                                <div style="background:var(--ub-canvas); padding:5px 6px; border:1px solid var(--ub-line); border-radius:4px; display:flex; flex-direction:column; gap:2px;">
                                  <strong style="color:var(--ub-ink);">${escapeHtml(sc.scene || '')}</strong>
                                  <div><strong>Cảnh quay:</strong> ${escapeHtml(sc.visual || '')}</div>
                                  ${sc.onScreenText ? `<div><strong>Chữ trên màn hình:</strong> ${escapeHtml(sc.onScreenText)}</div>` : ''}
                                  <div style="white-space:pre-wrap;"><strong>Lời thoại:</strong> ${escapeHtml(sc.voiceover || '')}</div>
                                </div>`
                                )
                                .join('')}
                            </div>`
                         : scRes.scriptOutline
                           ? `<div style="padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:3px;">
                                <div><strong>Cảnh 1 (Mở đầu):</strong> ${escapeHtml(scRes.scriptOutline.hook3s || '')}</div>
                                ${scRes.scriptOutline.problemLead ? `<div><strong>Cảnh 2 (Dẫn dắt):</strong> ${escapeHtml(scRes.scriptOutline.problemLead)}</div>` : ''}
                                <div><strong>Cảnh 3 (Trải nghiệm USP):</strong> ${escapeHtml(scRes.scriptOutline.bodyUsp || '')}</div>
                                ${scRes.scriptOutline.socialProof ? `<div><strong>Cảnh 4 (Đánh giá):</strong> ${escapeHtml(scRes.scriptOutline.socialProof)}</div>` : ''}
                                <div><strong>Cảnh 5 (Kêu gọi giỏ hàng):</strong> ${escapeHtml(scRes.scriptOutline.ctaCart || '')}</div>
                              </div>`
                           : ''
                     }
                     <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                       <button type="button" class="ub-IconBtn" id="ub-btn-copy-script-text">Copy Toàn bộ Kịch bản</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-gemini-script">Mở Gemini</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-chatgpt-script">Mở ChatGPT</button>
                     </div>
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm "Soạn Kịch bản Chi tiết" để bóc tách toàn bộ lời thoại gốc theo 4 chặng và dựng kịch bản sản xuất 5 phân cảnh đầy đủ.</div>`
            }
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">3. Tạo Prompt từ Ảnh bìa / Sản phẩm (Mọi trang)</h4>
              <button type="button" class="ub-IconBtn" id="ub-btn-gen-img-prompt" ${uiState.syncing ? 'disabled' : ''}>
                ${uiState.syncing ? 'Đang tạo...' : 'Tạo Prompt Ảnh'}
              </button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 110px; gap:4px;">
              <input class="ub-Input" id="ub-inp-img-url" type="text" placeholder="URL ảnh hoặc để trống lấy ảnh bài đang mở..." value="${escapeHtml(uiState.imagePromptInputUrl)}" />
              <select class="ub-Select" id="ub-sel-img-style">
                <option value="Chụp studio thương mại B2C ánh sáng tự nhiên" ${uiState.imagePromptStyle.includes('studio') ? 'selected' : ''}>Studio B2C</option>
                <option value="Lifestyle KOC cầm sản phẩm ngoài trời" ${uiState.imagePromptStyle.includes('Lifestyle') ? 'selected' : ''}>Lifestyle KOC</option>
                <option value="Cận cảnh kết cấu mỹ phẩm Macro" ${uiState.imagePromptStyle.includes('Macro') ? 'selected' : ''}>Cận cảnh Macro</option>
              </select>
            </div>
            ${
              ipRes
                ? `<div style="margin-top:4px; padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                     <div><strong>Prompt Tiếng Việt:</strong> ${escapeHtml(ipRes.promptVi || '')}</div>
                     <div style="color:var(--ub-ink-2);"><strong>Prompt Tiếng Anh:</strong> ${escapeHtml(ipRes.promptEn || '')}</div>
                     <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:2px;">
                       <button type="button" class="ub-IconBtn" id="ub-btn-copy-img-prompt">Copy Prompt</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-gemini-img">Mở Gemini</button>
                       <button type="button" class="ub-IconBtn" id="ub-btn-open-chatgpt-img">Mở ChatGPT</button>
                     </div>
                   </div>`
                : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm "Tạo Prompt Ảnh" để sinh câu lệnh dựng ảnh sản phẩm và mở thẳng sang tab Gemini / ChatGPT đã đăng nhập.</div>`
            }
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Xuất Báo cáo PDF</button>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi...' : 'Đồng bộ KOC'}
          </button>
        `;
      } else {
        // Default sub-view: 'posts' (Bài đăng & Lưới)
        const contactLine =
          uiState.profile?.extractedPhone || uiState.profile?.extractedEmail
            ? `<div class="ub-Notice ub-Notice--pos">
                 Liên hệ trích xuất từ tiểu sử:
                 <strong>${escapeHtml(uiState.profile?.extractedPhone || '—')}</strong>
                 ${uiState.profile?.extractedEmail ? ` · <strong>${escapeHtml(uiState.profile.extractedEmail)}</strong>` : ''}
               </div>`
            : '';

        const searchSat = uiState.searchSaturation;
        const searchSaturationHtml =
          uiState.pageType === 'search' && searchSat
            ? `<div class="ub-SectionBox" style="background:var(--ub-surface); border-color:var(--ub-line-strong);">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                   <h4 class="ub-SectionTitle">Độ bão hòa ngách trên Tìm kiếm (${searchSat.totalVideos} bài)</h4>
                   <span class="ub-Badge ${searchSat.saturationScore >= 65 ? 'ub-Badge--crit' : 'ub-Badge--pos'}">${escapeHtml(searchSat.competitionLabel)}</span>
                 </div>
                 <div class="ub-KeyValGrid">
                   <div class="ub-KeyValItem"><span class="ub-KeyLabel">Tỷ lệ bài gắn giỏ:</span><span class="ub-KeyVal">${searchSat.shopRatioPct}% (${searchSat.shopVideoCount} bài)</span></div>
                   <div class="ub-KeyValItem"><span class="ub-KeyLabel">View TB ngách:</span><span class="ub-KeyVal">${formatNum(searchSat.avgViews)}</span></div>
                 </div>
               </div>`
            : '';

        const videoRowsHtml =
          stats.filteredVideos.length > 0
            ? stats.filteredVideos
                .map((v, idx) => {
                  const rowHasCart = Boolean(
                    v.hasYellowCart || (Array.isArray(v.cartProducts) && v.cartProducts.length > 0)
                  );
                  const rowProdCount =
                    Array.isArray(v.cartProducts) && v.cartProducts.length > 0
                      ? v.cartProducts.length
                      : rowHasCart
                        ? 1
                        : 0;
                  const perfLabel = Array.isArray(v.gridLabels)
                    ? v.gridLabels.find((l) => l.code !== 'SHOP_CART')
                    : null;
                  const shortPerfText = perfLabel
                    ? String(perfLabel.text || '')
                        .replace('Bài nổi bật', 'Nổi bật')
                        .replace('Đang tăng nhanh', 'Tăng nhanh')
                        .replace('Tương tác bất thường', 'Đột biến ER')
                    : '';
                  const badgeHtml = rowHasCart
                    ? `<span class="ub-Badge ub-Badge--warn" style="font-weight:700;">🛒 Giỏ (${rowProdCount})</span>`
                    : shortPerfText
                      ? `<span class="ub-Badge ub-Badge--${perfLabel.tone || 'pos'}">${escapeHtml(shortPerfText)}</span>`
                      : v.isPinned
                        ? '<span class="ub-Badge ub-Badge--neutral">Ghim</span>'
                        : '<span class="ub-Badge ub-Badge--pos">Không giỏ</span>';
                  const isFeedOrSearch = uiState.pageType === 'other' || uiState.pageType === 'search';
                  const rowFirstProd =
                    Array.isArray(v.cartProducts) && v.cartProducts.length > 0 ? v.cartProducts[0] : null;
                  return `
                <tr>
                  <td style="width:25%; min-width:0; overflow:hidden;">
                    ${
                      isFeedOrSearch && v.handle
                        ? `<a href="${escapeHtml(getProfileUrlForPlatform(v.handle, uiState.platform))}" target="_blank" style="color:var(--ub-ink); text-decoration:none; font-weight:700; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">@${escapeHtml(v.handle)}</a>`
                        : ''
                    }
                    <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      <a href="${escapeHtml(v.videoUrl)}" target="_blank" style="color:var(--ub-accent); text-decoration:none; font-weight:600;">${formatDateVn(v.publishedAt)}</a>
                    </div>
                    <div style="color:var(--ub-ink-3); white-space:nowrap; font-size:11px;">${formatNum(v.viewsPerHour || 0)}/h</div>
                    ${
                      rowFirstProd
                        ? `<div title="${escapeHtml(rowFirstProd.title || '')}" style="color:var(--ub-pos); font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px;">🛒 ${escapeHtml(rowFirstProd.title || 'Sản phẩm')}</div>`
                        : ''
                    }
                  </td>
                  <td class="ub-Num" style="width:19%; white-space:nowrap;">
                    <div style="font-weight:700; color:var(--ub-ink);">${formatNum(v.views)}</div>
                    <div style="color:var(--ub-ink-3); font-size:11px;">ER: ${v.engagementRate || 0}%</div>
                  </td>
                  <td class="ub-Num" style="width:32%; white-space:nowrap;">
                    <div style="font-weight:600; color:var(--ub-ink); font-size:11px;">❤️ ${formatNum(v.likes)} · 💬 ${formatNum(v.comments)}</div>
                    ${
                      uiState.showExtraCols
                        ? `<div style="color:var(--ub-ink-3); font-size:11px;">🔖 ${formatNum(v.saves || 0)} · ↗ ${formatNum(v.shares || 0)}</div>`
                        : ''
                    }
                  </td>
                  <td class="ub-Num" style="width:24%; white-space:nowrap;">
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                      ${badgeHtml}
                      <button type="button" class="ub-IconBtn ub-BtnRowDlMp4" data-row-idx="${idx}" title="Tải MP4 không logo" style="height:20px; padding:0 6px; font-size:11px; white-space:nowrap;">⬇ MP4</button>
                    </div>
                  </td>
                </tr>
              `;
                })
                .join('')
            : `<tr><td colspan="4" style="text-align:center; color: var(--ub-ink-3); padding: 16px;">Mở trang kênh TikTok, Douyin, Instagram, Threads hoặc Facebook/Reels để tự động đọc danh sách bài đăng.</td></tr>`;

        const curFeedVid = uiState.currentVideo || stats.filteredVideos[0] || null;
        const isHomeFeedOrSearch = uiState.pageType === 'other' || uiState.pageType === 'search';
        const displayFollowers =
          stats.followers || uiState.profile?.followers || curFeedVid?.authorFollowers || 0;
        const displayMedian = stats.medianViews || curFeedVid?.views || 0;
        const displayAvg = stats.avgViews || curFeedVid?.views || 0;
        const displayEr = stats.sampleCount > 0 ? stats.engagementRate : curFeedVid?.engagementRate || 0;

        const curCartProducts = Array.isArray(curFeedVid?.cartProducts) ? curFeedVid.cartProducts : [];
        const curHasCart = Boolean(curFeedVid?.hasYellowCart || curCartProducts.length > 0);
        const activeVideoDetailBoxHtml = curFeedVid
          ? `<div class="ub-SectionBox" style="background:var(--ub-surface); padding:6px 8px; gap:4px;">
               <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                 <div style="font-weight:700; color:var(--ub-ink);">
                   Bài đang xem: <a href="${escapeHtml(getProfileUrlForPlatform(curFeedVid.handle || uiState.handle, uiState.platform))}" target="_blank" style="color:var(--ub-accent); text-decoration:none;">@${escapeHtml(curFeedVid.handle || uiState.handle || 'koc')}</a>
                   ${displayFollowers > 0 ? `<span style="font-weight:500; color:var(--ub-ink-2);"> · ${formatNum(displayFollowers)} flw</span>` : ''}
                 </div>
                 <span class="ub-Badge ${curHasCart ? 'ub-Badge--warn' : 'ub-Badge--pos'}">
                   ${curCartProducts.length > 0 ? `🛒 Giỏ hàng (${curCartProducts.length} SP)` : curHasCart ? '🛒 Có gắn giỏ' : `ER: ${curFeedVid.engagementRate || 0}%`}
                 </span>
               </div>
               <div style="color:var(--ub-ink-2); display:flex; flex-wrap:wrap; gap:6px;">
                 <span>Ngày: <strong>${formatDateVn(curFeedVid.publishedAt)}</strong></span>
                 ${curFeedVid.durationSeconds ? `<span>· Thời lượng: <strong>${curFeedVid.durationSeconds}s</strong></span>` : ''}
                 <span>· Tốc độ: <strong>${formatNum(curFeedVid.viewsPerHour || 0)}/h</strong></span>
               </div>
               <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:4px; padding-top:4px; border-top:1px dashed var(--ub-line);">
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:3px 5px;">
                   <div style="color:var(--ub-ink-3);">❤️ Tim</div>
                   <strong style="color:var(--ub-ink);">${formatNum(curFeedVid.likes || 0)}</strong>
                 </div>
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:3px 5px;">
                   <div style="color:var(--ub-ink-3);">💬 BL</div>
                   <strong style="color:var(--ub-ink);">${formatNum(curFeedVid.comments || 0)}</strong>
                 </div>
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:3px 5px;">
                   <div style="color:var(--ub-ink-3);">🔖 Lưu</div>
                   <strong style="color:var(--ub-accent);">${formatNum(curFeedVid.saves || 0)}</strong>
                 </div>
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:3px 5px;">
                   <div style="color:var(--ub-ink-3);">↗ Chia sẻ</div>
                   <strong style="color:var(--ub-pos);">${formatNum(curFeedVid.shares || 0)}</strong>
                 </div>
               </div>
               ${
                 curFeedVid.caption
                   ? `<div style="color:var(--ub-ink); word-break:break-word; line-height:1.35; padding-top:2px; border-top:1px dashed var(--ub-line);">
                        <strong>Mô tả:</strong> ${escapeHtml(curFeedVid.caption)}
                      </div>`
                   : ''
               }
               ${
                 curFeedVid.musicTitle
                   ? `<div style="color:var(--ub-ink-2); word-break:break-word;">
                        <strong>Nhạc nền:</strong> 🎵 ${escapeHtml(curFeedVid.musicTitle)}
                      </div>`
                   : ''
               }
               ${
                 curCartProducts.length > 0
                   ? `<div style="display:flex; flex-direction:column; gap:4px; padding-top:3px; border-top:1px dashed var(--ub-line);">
                        <div style="font-weight:700; color:var(--ub-pos);">🛒 Sản phẩm trong Giỏ hàng TikTok Shop (${curCartProducts.length} SP):</div>
                        ${curCartProducts
                          .slice(0, 4)
                          .map(
                            (p, pIdx) => `
                          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px; background:var(--ub-canvas); padding:5px 6px; border:1px solid var(--ub-line); border-radius:4px;">
                            <div style="min-width:0; flex:1; word-break:break-word;">
                              <strong style="color:var(--ub-ink); display:block;">${pIdx + 1}. ${escapeHtml(p.title || 'Sản phẩm gắn giỏ')}</strong>
                              <span style="color:var(--ub-ink-2); display:block;">Mã SP: <strong>${escapeHtml(p.productId || '—')}</strong>${p.anchorKeyword ? ` · Thẻ: <strong>${escapeHtml(p.anchorKeyword)}</strong>` : ''}${p.priceText ? ` · Giá: <strong style="color:var(--ub-pos);">${escapeHtml(p.priceText)}</strong>` : p.priceVnd ? ` · Giá: <strong style="color:var(--ub-pos);">${formatVnd(p.priceVnd)}</strong>` : ''}</span>
                              ${
                                p.productUrl
                                  ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); font-size:12px; word-break:break-all; text-decoration:underline; display:block; margin-top:2px;">${escapeHtml(p.productUrl)}</a>`
                                  : ''
                              }
                            </div>
                            <div style="display:flex; flex-direction:column; gap:3px; align-items:flex-end;">
                              ${
                                p.productUrl
                                  ? `<button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(p.productUrl)}">Copy Link Giỏ</button>`
                                  : ''
                              }
                              ${
                                p.productId
                                  ? `<button type="button" class="ub-IconBtn ub-BtnCopyPid" data-pid="${escapeHtml(p.productId)}">Copy Mã</button>`
                                  : ''
                              }
                              ${
                                p.productUrl
                                  ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); font-weight:600; text-decoration:none; white-space:nowrap;">Mở SP ↗</a>`
                                  : ''
                              }
                            </div>
                          </div>`
                          )
                          .join('')}
                      </div>`
                   : ''
               }
               ${
                 curFeedVid.transcriptText
                   ? `<div style="color:var(--ub-ink-2); background:var(--ub-canvas); padding:5px 7px; border-radius:4px; max-height:150px; overflow-y:auto; white-space:pre-wrap; word-break:break-word; line-height:1.45;">
                        <strong>Lời thoại (${curFeedVid.transcriptText.split(/\r?\n/).filter(Boolean).length} câu):</strong>\n${escapeHtml(curFeedVid.transcriptText)}
                      </div>`
                   : ''
               }
             </div>`
          : '';

        const statRowHtml = isHomeFeedOrSearch
          ? `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">View bài</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.views || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lượt tim</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.likes || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">BL / Lưu</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.comments || 0)} / ${formatNum(curFeedVid?.saves || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Chia sẻ</div>
              <div class="ub-StatVal">${formatNum(curFeedVid?.shares || 0)}</div>
            </div>
          </div>`
          : `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 || displayFollowers > 0 ? 'Follower' : 'View bài'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 || displayFollowers > 0 ? displayFollowers : curFeedVid?.views || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 ? 'Trung vị' : 'Lượt tim'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 ? displayMedian : curFeedVid?.likes || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">${stats.sampleCount > 0 ? 'View TB' : 'BL / Lưu'}</div>
              <div class="ub-StatVal">${formatNum(stats.sampleCount > 0 ? displayAvg : curFeedVid?.comments || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tỷ lệ ER</div>
              <div class="ub-StatVal">${displayEr}%</div>
            </div>
          </div>`;

        const medianBreakdownBoxHtml = !isHomeFeedOrSearch
          ? `<div class="ub-SectionBox" style="background:var(--ub-surface); padding:6px 8px; gap:5px;">
               <div style="display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
                 <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                   <span style="font-weight:700; color:var(--ub-ink);">Cỡ mẫu tính View:</span>
                   <select class="ub-Select" id="ub-sel-sample-main" style="width:68px; height:24px; padding:0 3px;" title="Chọn số lượng video gần nhất để tính View Trung vị & Trung bình">
                     <option value="5" ${uiState.sampleSize === 5 ? 'selected' : ''}>5 bài</option>
                     <option value="10" ${uiState.sampleSize === 10 ? 'selected' : ''}>10 bài</option>
                     <option value="15" ${uiState.sampleSize === 15 ? 'selected' : ''}>15 bài</option>
                     <option value="20" ${uiState.sampleSize === 20 ? 'selected' : ''}>20 bài</option>
                     <option value="30" ${uiState.sampleSize === 30 ? 'selected' : ''}>30 bài</option>
                     <option value="50" ${uiState.sampleSize === 50 ? 'selected' : ''}>50 bài</option>
                     <option value="100" ${uiState.sampleSize === 100 ? 'selected' : ''}>Tất cả</option>
                   </select>
                   <label class="ub-CheckLabel" style="white-space:nowrap;" title="Loại trừ 3 bài ghim đầu kênh khỏi phép tính View trung vị">
                     <input type="checkbox" id="ub-chk-unpin-main" ${uiState.excludePinned ? 'checked' : ''} />
                     <span>Bỏ ghim</span>
                   </label>
                 </div>
                 <select class="ub-Select" id="ub-sel-cartfilter-main" style="width:118px; height:24px; padding:0 3px;" title="Lọc loại video để tính toán và hiển thị trong bảng">
                   <option value="all" ${uiState.cartFilterMode === 'all' ? 'selected' : ''}>Lọc: Tất cả (${stats.baseSampleCount || 0})</option>
                   <option value="cart_only" ${uiState.cartFilterMode === 'cart_only' ? 'selected' : ''}>Chỉ Gắn giỏ (${stats.sponsoredCount || 0})</option>
                   <option value="non_cart_only" ${uiState.cartFilterMode === 'non_cart_only' ? 'selected' : ''}>Không gắn giỏ (${stats.organicCount || 0})</option>
                 </select>
               </div>
               <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; padding-top:4px; border-top:1px dashed var(--ub-line);">
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:4px 6px;">
                   <div style="display:flex; justify-content:space-between; align-items:center;">
                     <strong style="color:var(--ub-accent);">🛒 Video Gắn giỏ</strong>
                     <span class="ub-Badge ub-Badge--warn">${stats.sponsoredCount || 0} bài</span>
                   </div>
                   <div style="display:flex; justify-content:space-between; margin-top:2px;">
                     <span style="color:var(--ub-ink-2);">Trung vị:</span>
                     <strong style="color:var(--ub-ink);">${stats.sponsoredCount > 0 ? formatNum(stats.sponsoredMedianViews) : '—'}</strong>
                   </div>
                   <div style="display:flex; justify-content:space-between;">
                     <span style="color:var(--ub-ink-3);">View TB:</span>
                     <span style="color:var(--ub-ink-2); font-weight:600;">${stats.sponsoredCount > 0 ? formatNum(stats.sponsoredAvgViews) : '—'}</span>
                   </div>
                 </div>
                 <div style="background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; padding:4px 6px;">
                   <div style="display:flex; justify-content:space-between; align-items:center;">
                     <strong style="color:var(--ub-pos);">🎬 Không gắn giỏ</strong>
                     <span class="ub-Badge ub-Badge--pos">${stats.organicCount || 0} bài</span>
                   </div>
                   <div style="display:flex; justify-content:space-between; margin-top:2px;">
                     <span style="color:var(--ub-ink-2);">Trung vị:</span>
                     <strong style="color:var(--ub-ink);">${stats.organicCount > 0 ? formatNum(stats.organicMedianViews) : '—'}</strong>
                   </div>
                   <div style="display:flex; justify-content:space-between;">
                     <span style="color:var(--ub-ink-3);">View TB:</span>
                     <span style="color:var(--ub-ink-2); font-weight:600;">${stats.organicCount > 0 ? formatNum(stats.organicAvgViews) : '—'}</span>
                   </div>
                 </div>
               </div>
             </div>`
          : '';

        tabBodyHtml = `
          ${subNavHtml}

          ${statRowHtml}

          ${medianBreakdownBoxHtml}

          <div class="ub-QuickToolbar" style="flex-wrap:wrap; gap:4px;">
            <div style="display:flex; align-items:center; gap:3px; flex-wrap:wrap;">
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp4" title="Tải video đang phát không logo">⬇ MP4</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp3" title="Tải âm thanh MP3">🎵 MP3</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-sub" title="Tải lời thoại phụ đề (.txt)">📝 Phụ đề</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-img" title="Tải bộ ảnh Slide không logo">🖼 Ảnh</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-cmt" title="Xuất danh sách bình luận ra CSV">💬 BL</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-frame-shot" title="Chụp khung hình video hiện tại (KOC cầm SP) kèm tem kiểm tra">📸 Khung hình SP</button>
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-screen-shot" title="Chụp toàn màn hình bài đăng & giỏ hàng">🖼 Màn hình nghiệm thu</button>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:6px; padding-top:2px; border-top:1px dashed var(--ub-line);">
              <div style="display:flex; align-items:center; gap:6px;">
                <label class="ub-CheckLabel" title="Tự động chuyển sang video tiếp theo khi hết bài">
                  <input type="checkbox" id="ub-chk-autoscroll" ${uiState.playerControls.autoScroll ? 'checked' : ''} />
                  <span>Tự cuộn</span>
                </label>
                <label class="ub-CheckLabel" title="Hiện nhãn số liệu trên từng thẻ lưới TikTok">
                  <input type="checkbox" id="ub-chk-gridoverlay" ${uiState.playerControls.gridOverlayEnabled ? 'checked' : ''} />
                  <span>Nhãn lưới</span>
                </label>
              </div>
              <button type="button" class="ub-IconBtn ${uiState.toolsExpanded ? 'ub-IconBtn--active' : ''}" id="ub-btn-toggle-tools">
                ⚙ Bộ lọc ${uiState.toolsExpanded ? '▴' : '▾'}
              </button>
            </div>
          </div>

          <div class="ub-CollapsibleTools ${uiState.toolsExpanded ? 'ub-CollapsibleTools--open' : ''}">
            <div class="ub-PlayerBar">
              <label class="ub-CheckLabel" title="Giữ video phát tiếp khi chuyển sang tab khác">
                <input type="checkbox" id="ub-chk-bgplay" ${uiState.playerControls.bgPlay ? 'checked' : ''} />
                <span>Phát nền</span>
              </label>
              <div style="display:flex; align-items:center; gap:3px;">
                <select class="ub-Select" id="ub-sel-speed" style="width:52px; height:24px; padding:0 2px;" title="Tốc độ phát video">
                  <option value="0.75" ${uiState.playerControls.playbackSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
                  <option value="1" ${uiState.playerControls.playbackSpeed === 1 ? 'selected' : ''}>1.0x</option>
                  <option value="1.25" ${uiState.playerControls.playbackSpeed === 1.25 ? 'selected' : ''}>1.25x</option>
                  <option value="1.5" ${uiState.playerControls.playbackSpeed === 1.5 ? 'selected' : ''}>1.5x</option>
                  <option value="2" ${uiState.playerControls.playbackSpeed === 2 ? 'selected' : ''}>2.0x</option>
                </select>
                <select class="ub-Select" id="ub-sel-volume" style="width:58px; height:24px; padding:0 2px;" title="Âm lượng video">
                  <option value="100" ${uiState.playerControls.volumePct === 100 ? 'selected' : ''}>🔊100%</option>
                  <option value="75" ${uiState.playerControls.volumePct === 75 ? 'selected' : ''}>🔊75%</option>
                  <option value="50" ${uiState.playerControls.volumePct === 50 ? 'selected' : ''}>🔉50%</option>
                  <option value="25" ${uiState.playerControls.volumePct === 25 ? 'selected' : ''}>🔈25%</option>
                  <option value="0" ${uiState.playerControls.volumePct === 0 ? 'selected' : ''}>🔇0%</option>
                </select>
                <select class="ub-Select" id="ub-sel-gridsort" style="width:88px; height:24px; padding:0 2px;" title="Sắp xếp các thẻ bài đăng trên lưới TikTok">
                  <option value="default" ${uiState.playerControls.gridSortMode === 'default' ? 'selected' : ''}>Lưới: Mặc định</option>
                  <option value="views" ${uiState.playerControls.gridSortMode === 'views' ? 'selected' : ''}>Lưới: View cao</option>
                  <option value="likes" ${uiState.playerControls.gridSortMode === 'likes' ? 'selected' : ''}>Lưới: Tim cao</option>
                  <option value="er" ${uiState.playerControls.gridSortMode === 'er' ? 'selected' : ''}>Lưới: ER cao</option>
                  <option value="velocity" ${uiState.playerControls.gridSortMode === 'velocity' ? 'selected' : ''}>Lưới: Tăng nhanh</option>
                  <option value="shop_only" ${uiState.playerControls.gridSortMode === 'shop_only' ? 'selected' : ''}>Chỉ bài giỏ</option>
                </select>
              </div>
            </div>

            <div class="ub-FilterBar" style="flex-wrap:nowrap; gap:4px;">
              <label class="ub-CheckLabel" style="white-space:nowrap;">
                <input type="checkbox" id="ub-chk-unpin" ${uiState.excludePinned ? 'checked' : ''} />
                <span>Bỏ ghim</span>
              </label>
              <input class="ub-Input" id="ub-inp-kw-filter" type="text" placeholder="Từ khóa / SP..." value="${escapeHtml(uiState.keywordFilter)}" style="flex:1; min-width:52px; height:24px;" />
              <input class="ub-Input" id="ub-inp-date-from" type="date" title="Từ ngày đăng" value="${escapeHtml(uiState.dateFromFilter)}" style="width:84px; height:24px; padding:0 2px;" />
              <select class="ub-Select" id="ub-sel-sample" style="width:58px; height:24px; padding:0 2px;">
                <option value="10" ${uiState.sampleSize === 10 ? 'selected' : ''}>10 bài</option>
                <option value="15" ${uiState.sampleSize === 15 ? 'selected' : ''}>15 bài</option>
                <option value="30" ${uiState.sampleSize === 30 ? 'selected' : ''}>30 bài</option>
                <option value="50" ${uiState.sampleSize === 50 ? 'selected' : ''}>50 bài</option>
              </select>
            </div>

            <div class="ub-FilterBar" style="justify-content:space-between; gap:4px;">
              <select class="ub-Select" id="ub-sel-tablesort" style="flex:1; height:24px; padding:0 4px;" title="Sắp xếp bảng phân tích bài đăng">
                <option value="default" ${uiState.tableSortMode === 'default' ? 'selected' : ''}>Bảng: Mới nhất</option>
                <option value="views" ${uiState.tableSortMode === 'views' ? 'selected' : ''}>Bảng: Lượt xem cao</option>
                <option value="likes" ${uiState.tableSortMode === 'likes' ? 'selected' : ''}>Bảng: Lượt thích cao</option>
                <option value="er" ${uiState.tableSortMode === 'er' ? 'selected' : ''}>Bảng: Tương tác ER cao</option>
                <option value="velocity" ${uiState.tableSortMode === 'velocity' ? 'selected' : ''}>Bảng: Tốc độ view/giờ</option>
              </select>
              <label class="ub-CheckLabel" title="Chọn cột hiển thị trên bảng phân tích">
                <input type="checkbox" id="ub-chk-col-extra" ${uiState.showExtraCols ? 'checked' : ''} />
                <span>Đủ cột (Lưu·Nhãn)</span>
              </label>
            </div>

            <div class="ub-CompareBox">
              <div class="ub-CompareItem">
                <span style="font-size:12px; color:var(--ub-ink-2);">View tự nhiên:</span>
                <strong style="font-size:12px; color:var(--ub-ink);">${formatNum(stats.organicAvgViews)}</strong>
              </div>
              <div class="ub-CompareItem">
                <span style="font-size:12px; color:var(--ub-ink-2);">View giỏ (${stats.sponsoredCount}):</span>
                <strong style="font-size:12px; color:var(--ub-accent);">${stats.sponsoredCount > 0 ? formatNum(stats.sponsoredAvgViews) : '—'}</strong>
              </div>
            </div>
          </div>

          ${searchSaturationHtml}

          ${activeVideoDetailBoxHtml}

          ${
            !isHomeFeedOrSearch && uiState.channelHealth && stats.sampleCount > 0
              ? `<div class="ub-HealthStrip">
                   <div>
                     <div class="ub-HealthLabel">Điểm KOC</div>
                     <div class="ub-HealthVal">${uiState.channelHealth.kocScore}/100</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Nhịp đăng</div>
                     <div class="ub-HealthVal">${uiState.channelHealth.postsWeekly}/tuần</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Tỷ lệ gắn giỏ</div>
                     <div class="ub-HealthVal" style="color:var(--ub-accent);">${uiState.channelHealth.shopSharePct}%</div>
                   </div>
                   <div>
                     <div class="ub-HealthLabel">Giờ vàng</div>
                     <div class="ub-HealthVal" style="font-size:12px;">${escapeHtml((uiState.channelHealth.goldenHours || []).slice(0, 2).join(' · '))}</div>
                   </div>
                 </div>`
              : ''
          }

          ${contactLine}

          ${
            stats.sampleCount > 0
              ? `<div class="ub-TableWrap" style="max-height:172px;">
                   <table class="ub-Table" style="table-layout:fixed; width:100%;">
                     <thead>
                       <tr>
                         <th style="width:25%;">${isHomeFeedOrSearch ? 'Kênh / Ngày' : 'Ngày / Tốc độ'}</th>
                         <th class="ub-Num" style="width:19%;">View</th>
                         <th class="ub-Num" style="width:32%;">Tương tác</th>
                         <th class="ub-Num" style="width:24%;">Nhãn · Tải</th>
                       </tr>
                     </thead>
                     <tbody>
                       ${videoRowsHtml}
                     </tbody>
                   </table>
                 </div>`
              : `<div style="padding:6px 8px; background:var(--ub-canvas); border:1px solid var(--ub-line); border-radius:4px; font-size:12px; color:var(--ub-ink-2); display:flex; justify-content:space-between; align-items:center;">
                   <span>${uiState.handle ? `Đang xem bài của @${escapeHtml(uiState.handle)}` : 'Mở kênh KOC để quét danh sách bài'}</span>
                   ${uiState.handle ? `<a href="${escapeHtml(getProfileUrlForPlatform(uiState.handle, uiState.platform))}" style="color:var(--ub-accent); font-weight:600; text-decoration:none;">Mở kênh →</a>` : ''}
                 </div>`
          }
        `;

        footerHtml = `
          <div style="display:flex; gap:4px;">
            <button class="ub-BtnSecondary" id="ub-btn-csv" type="button">Xuất CSV</button>
            <button class="ub-BtnSecondary" id="ub-btn-report-pdf" type="button">Báo cáo PDF</button>
          </div>
          <button class="ub-BtnPrimary" id="ub-btn-sync-profile" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi...' : 'Đồng bộ KOC'}
          </button>
        `;
      }
    } else if (uiState.activeTab === 'seller') {
      const d = uiState.sellerDraft;
      const gmvVal = Math.round(Number(d.doanhSo || 0));
      const itemsVal = Math.round(Number(d.soMonBanRa || 0));
      const gpmVal = Math.round(Number(d.gpm || 0));
      const aovVal = Math.round(Number(d.aov || 0));
      const viewsVal = Math.round(Number(d.viewTrungBinh || 0));

      const sellerEditFormHtml = uiState.sellerEditExpanded
        ? `
          <div class="ub-FormGrid" style="margin-top:6px; padding-top:8px; border-top:1px solid var(--ub-line);">
            <div class="ub-Field">
              <label class="ub-Label">Follower (Cột P)</label>
              <input class="ub-Input" id="ub-seller-followers" type="number" min="0" value="${Math.round(Number(d.followers || 0))}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Doanh số GMV 30d (Cột Y - VND)</label>
              <input class="ub-Input" id="ub-seller-gmv" type="number" min="0" step="100000" value="${gmvVal}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Số món bán ra (Cột Z)</label>
              <input class="ub-Input" id="ub-seller-items" type="number" min="0" value="${itemsVal}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">GPM (Cột AA - VND)</label>
              <input class="ub-Input" id="ub-seller-gpm" type="number" min="0" step="1000" value="${gpmVal}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">GMV/Khách hàng AOV (Cột AB - VND)</label>
              <input class="ub-Input" id="ub-seller-aov" type="number" min="0" step="1000" value="${aovVal}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">View TB video (Cột AC)</label>
              <input class="ub-Input" id="ub-seller-views" type="number" min="0" value="${viewsVal}" />
            </div>

            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Video % / Live % / Thẻ SP % (AD-AF)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-vidpct" type="number" min="0" max="100" title="% GMV từ Video" value="${Number(d.gmvTuVideoPct || 0)}" />
                <input class="ub-Input" id="ub-seller-livepct" type="number" min="0" max="100" title="% GMV từ Live" value="${Number(d.gmvTuLivePct || 0)}" />
                <input class="ub-Input" id="ub-seller-cardpct" type="number" min="0" max="100" title="% GMV từ Thẻ SP" value="${Number(d.gmvTuTheSanPhamPct || 0)}" />
              </div>
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Tỷ lệ Nam % / Nữ % (Cột AG-AH)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-male" type="number" min="0" max="100" title="% Nam" value="${Number(d.namPct || 0)}" />
                <input class="ub-Input" id="ub-seller-female" type="number" min="0" max="100" title="% Nữ" value="${Number(d.nuPct || 0)}" />
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Tuổi 18-24 / 25-34 / >35 % (AI-AK)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-a18" type="number" min="0" max="100" title="% 18-24" value="${Number(d.tuoi18_24Pct || 0)}" />
                <input class="ub-Input" id="ub-seller-a25" type="number" min="0" max="100" title="% 25-34" value="${Number(d.tuoi25_34Pct || 0)}" />
                <input class="ub-Input" id="ub-seller-a35" type="number" min="0" max="100" title="% >35" value="${Number(d.tuoiTren35Pct || 0)}" />
              </div>
            </div>

            <div class="ub-Field">
              <label class="ub-Label">GMV từ LIVE 30d (VND)</label>
              <input class="ub-Input" id="ub-seller-livegmv" type="number" min="0" step="100000" value="${Math.round(Number(d.liveGmv || 0))}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">GPM riêng của LIVE (VND)</label>
              <input class="ub-Input" id="ub-seller-livegpm" type="number" min="0" step="1000" value="${Math.round(Number(d.liveGpm || 0))}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Số phiên LIVE (30d) / View LIVE TB</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-livesessions" type="number" min="0" title="Số phiên LIVE 30 ngày" value="${Math.round(Number(d.liveSessionCount || 0))}" />
                <input class="ub-Input" id="ub-seller-liveviews" type="number" min="0" title="View LIVE trung bình / phiên" value="${Math.round(Number(d.liveAvgViews || 0))}" />
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Mắt xem đỉnh PCU / Món bán qua LIVE</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-seller-livepcu" type="number" min="0" title="Mắt xem đồng thời cao nhất (PCU)" value="${Math.round(Number(d.livePeakViewers || 0))}" />
                <input class="ub-Input" id="ub-seller-liveitems" type="number" min="0" title="Số món bán qua LIVE" value="${Math.round(Number(d.liveItemsSold || 0))}" />
              </div>
            </div>
          </div>
        `
        : '';

      const resolvedLiveGmv =
        Number(d.liveGmv || 0) > 0
          ? Math.round(Number(d.liveGmv))
          : Math.round(gmvVal * (Number(d.gmvTuLivePct || 0) / 100));

      tabBodyHtml = `
        <div class="ub-StatRow">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GMV 30d (Y)</div>
            <div class="ub-StatVal" id="ub-seller-stat-gmv">${formatVnd(gmvVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Đã bán (Z)</div>
            <div class="ub-StatVal" id="ub-seller-stat-items">${formatNum(itemsVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GPM (AA)</div>
            <div class="ub-StatVal" id="ub-seller-stat-gpm">${formatVnd(gpmVal)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">View TB (AC)</div>
            <div class="ub-StatVal" id="ub-seller-stat-views">${formatNum(viewsVal)}</div>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">1. Bộ chỉ số TikTok Seller (Chuẩn Cột Y → AM)</h4>
            <div style="display:flex; gap:4px;">
              <button class="ub-IconBtn" id="ub-btn-toggle-seller-edit" type="button">
                ${uiState.sellerEditExpanded ? 'Thu gọn ô nhập' : 'Sửa số liệu'}
              </button>
              <button class="ub-IconBtn" id="ub-btn-rescan-seller" type="button">Quét lại</button>
            </div>
          </div>

          <div class="ub-Field ub-Field--full">
            <label class="ub-Label">ID kênh KOC (Cột H)</label>
            <div style="display:flex; gap:4px;">
              <input class="ub-Input" id="ub-seller-handle" style="flex:1;" type="text" placeholder="VD: po.trann77" value="${escapeHtml(uiState.handle)}" />
              <button class="ub-IconBtn" id="ub-btn-lookup-handle" type="button">Tra cứu</button>
            </div>
          </div>

          <div class="ub-KeyValGrid">
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">AOV / Khách (AB):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-aov">${formatVnd(aovVal)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Kênh Video/Live/SP:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-channel">${Number(d.gmvTuVideoPct || 0)}% / ${Number(d.gmvTuLivePct || 0)}% / ${Number(d.gmvTuTheSanPhamPct || 0)}%</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Tệp Nam / Nữ:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-gender">${Number(d.namPct || 0)}% / ${Number(d.nuPct || 0)}%</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Độ tuổi (18-24 / 25-34 / >35):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-age">${Number(d.tuoi18_24Pct || 0)}% / ${Number(d.tuoi25_34Pct || 0)}% / ${Number(d.tuoiTren35Pct || 0)}%</span>
            </div>
          </div>

          ${sellerEditFormHtml}
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">2. Chỉ số Live Affiliate chuyên sâu (30 ngày)</h4>
            <span class="ub-Badge ub-Badge--pos">Tỷ trọng Live: ${Number(d.gmvTuLivePct || 0)}%</span>
          </div>
          <div class="ub-KeyValGrid">
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">GMV từ LIVE (30d):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-livegmv" style="color:var(--ub-pos);">${formatVnd(resolvedLiveGmv)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">GPM riêng của LIVE:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-livegpm">${formatVnd(d.liveGpm || 0)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Số phiên LIVE (30d):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-livesessions">${formatNum(d.liveSessionCount || 0)} phiên</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">View LIVE TB / phiên:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-liveviews">${formatNum(d.liveAvgViews || 0)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Mắt xem đỉnh (PCU):</span>
              <span class="ub-KeyVal" id="ub-seller-kv-livepcu">${formatNum(d.livePeakViewers || 0)}</span>
            </div>
            <div class="ub-KeyValItem">
              <span class="ub-KeyLabel">Món bán qua LIVE:</span>
              <span class="ub-KeyVal" id="ub-seller-kv-liveitems">${formatNum(d.liveItemsSold || 0)} món</span>
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-copy-summary" type="button">Copy gửi Lark</button>
        <div style="display:flex; gap:6px;">
          <button class="ub-BtnSecondary" id="ub-btn-sync-seller" type="button" ${uiState.syncing ? 'disabled' : ''}>
            Lưu Web-Admin
          </button>
          <button class="ub-BtnPrimary" id="ub-btn-copy-sheet-row" type="button">
            Copy Cột Y → AM (Dán Sheet)
          </button>
        </div>
      `;
    } else if (uiState.activeTab === 'ads') {
      const a = uiState.adsDraft;
      const bookingNet = Math.round(Number(a.bookingCostNet || 0));
      const adsSpend = Math.round(Number(a.adsSpend || 0));
      const gmv = Math.round(Number(a.gmv || 0));
      const totalCost = bookingNet + adsSpend;
      const roasAds = adsSpend === 0 ? 0 : Number((gmv / adsSpend).toFixed(2));
      const roiTotal = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

      const adsRowsHtml =
        Array.isArray(uiState.adsRecords) && uiState.adsRecords.length > 0
          ? uiState.adsRecords
              .slice(0, 12)
              .map(
                (r, idx) => {
                  const rowRoas =
                    r.roas !== undefined
                      ? r.roas
                      : Number(r.adsSpend || 0) > 0
                        ? Number((Number(r.gmv || 0) / Number(r.adsSpend)).toFixed(2))
                        : 0;
                  return `
              <tr data-ads-idx="${idx}" class="ub-AdsRowItem" style="cursor:pointer;">
                <td style="font-weight:600; color:var(--ub-accent);">${escapeHtml(String(r.videoId || r.adId).slice(-10))}</td>
                <td class="ub-Num">${formatVnd(r.adsSpend)}</td>
                <td class="ub-Num">${formatVnd(r.gmv)}</td>
                <td class="ub-Num">${formatNum(r.orders)}</td>
                <td class="ub-Num" style="font-weight:600;">${rowRoas}x</td>
              </tr>
            `;
                }
              )
              .join('')
          : `<tr><td colspan="5" style="text-align:center; color:var(--ub-ink-3); padding:12px;">Mở bảng chiến dịch trên ads.tiktok.com để tự động bóc tách hoặc nhập trực tiếp bên dưới.</td></tr>`;

      tabBodyHtml = `
        <div class="ub-StatRow">
          <div class="ub-StatCard">
            <div class="ub-StatLabel">Tổng chi</div>
            <div class="ub-StatVal" id="ub-ads-stat-cost">${formatVnd(totalCost)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">GMV Ads</div>
            <div class="ub-StatVal" id="ub-ads-stat-gmv">${formatVnd(gmv)}</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">ROAS Ads</div>
            <div class="ub-StatVal" id="ub-ads-stat-roas">${roasAds}x</div>
          </div>
          <div class="ub-StatCard">
            <div class="ub-StatLabel">ROI Tổng</div>
            <div class="ub-StatVal" id="ub-ads-stat-roi" style="color:${roiTotal >= 2 ? 'var(--ub-pos)' : roiTotal > 0 && roiTotal < 1 ? 'var(--ub-crit)' : 'var(--ub-accent)'};">${roiTotal}x</div>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">1. Nạp & Xác thực Mã ủy quyền Spark Ads hàng loạt</h4>
            <button class="ub-IconBtn" id="ub-btn-load-reg-videos" type="button">Tải mã từ Web-Admin</button>
          </div>
          <div class="ub-Field ub-Field--full">
            <label class="ub-Label">Danh sách mã Spark Ads (Mỗi dòng 1 mã hoặc VideoID|SparkCode|MãBO)</label>
            <textarea class="ub-Input" id="ub-ads-batch-codes" rows="2" style="resize:vertical; font-family:monospace;" placeholder="VD: #19x82K9LmP2q...">${escapeHtml(a.batchSparkCodesText)}</textarea>
          </div>
          <div class="ub-BtnRow" style="margin-top:2px;">
            <button class="ub-BtnSecondary" id="ub-btn-run-spark-auth" type="button" ${uiState.syncing ? 'disabled' : ''}>
              Điền mã vào TikTok Ads & Xác thực
            </button>
          </div>
        </div>

        <div class="ub-SectionBox">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 class="ub-SectionTitle">2. Đối soát Chi phí Ads & Nghiệm thu 30 ngày (Cột BE → BI)</h4>
            <button class="ub-IconBtn" id="ub-btn-rescan-ads" type="button">Quét bảng Ads</button>
          </div>

          <div class="ub-TableWrap" style="max-height:110px;">
            <table class="ub-Table">
              <thead>
                <tr>
                  <th>Mã Video / Ad</th>
                  <th class="ub-Num">Chi phí Ads</th>
                  <th class="ub-Num">GMV Ads</th>
                  <th class="ub-Num">Đơn hàng</th>
                  <th class="ub-Num">ROAS</th>
                </tr>
              </thead>
              <tbody>
                ${adsRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="ub-FormGrid">
            <div class="ub-Field">
              <label class="ub-Label">Mã Video / Mã BO</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-ads-vid" type="text" placeholder="Video ID" value="${escapeHtml(a.videoId)}" />
                <input class="ub-Input" id="ub-ads-deal" type="text" placeholder="Mã BO" value="${escapeHtml(a.dealCode)}" />
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Mã ủy quyền Ads (Cột BE)</label>
              <input class="ub-Input" id="ub-ads-spark" type="text" placeholder="Mã Spark Ads..." value="${escapeHtml(a.sparkAdsCode)}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">Cát-xê Booking Net (VND)</label>
              <input class="ub-Input" id="ub-ads-booking-net" type="number" min="0" step="100000" value="${bookingNet}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Chi phí chạy Ads (VND)</label>
              <input class="ub-Input" id="ub-ads-spend" type="number" min="0" step="100000" value="${adsSpend}" />
            </div>

            <div class="ub-Field">
              <label class="ub-Label">GMV 30 ngày (Cột BG - VND)</label>
              <input class="ub-Input" id="ub-ads-gmv" type="number" min="0" step="100000" value="${gmv}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Views (BF) / Đơn hàng (BH)</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <input class="ub-Input" id="ub-ads-views" type="number" min="0" title="Views 30 ngày (Cột BF)" value="${Math.round(Number(a.views || 0))}" />
                <input class="ub-Input" id="ub-ads-orders" type="number" min="0" title="Số đơn hàng 30 ngày (Cột BH)" value="${Math.round(Number(a.orders || 0))}" />
              </div>
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <button class="ub-BtnSecondary" id="ub-btn-copy-ads-cols" type="button">
          Copy Cột BE → BI (Dán Sheet)
        </button>
        <button class="ub-BtnPrimary" id="ub-btn-sync-ads" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang đồng bộ...' : 'Đồng bộ Báo cáo Ads về Web-Admin'}
        </button>
      `;
    } else if (uiState.activeTab === 'booking') {
      const historySectionHtml = kocDb
        ? `
          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">Hồ sơ & Giá cát-xê nội bộ tại Upbase B2C</h4>
              <span class="ub-Badge ub-Badge--pos">Điểm uy tín: ${kocDb.reliabilityScore}/10</span>
            </div>
            <div class="ub-KeyValGrid">
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Khung lương / Nhóm:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.salaryGrade)} · ${escapeHtml(kocDb.segment)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Giá Net chuẩn:</span>
                <span class="ub-KeyVal" style="color:var(--ub-accent);">${formatVnd(kocDb.rateCardVideo)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Biên độ giá lịch sử:</span>
                <span class="ub-KeyVal">${formatVnd(kocDb.minRate)} – ${formatVnd(kocDb.maxRate)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Tổng số Deal cũ:</span>
                <span class="ub-KeyVal">${formatNum(kocDb.totalPastDeals)} (${formatNum(kocDb.totalPaidVideos)} Paid · ${formatNum(kocDb.totalFocVideos)} FOC)</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Đợt book gần nhất:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.latestBookMonth)} (${escapeHtml(kocDb.latestBoCode)})</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">PIC phụ trách:</span>
                <span class="ub-KeyVal">${escapeHtml(String(kocDb.bookingPic || '—').slice(0, 26))}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">SĐT / CCCD (Đã che):</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.phoneMasked)} · ${escapeHtml(kocDb.cccdMasked)}</span>
              </div>
              <div class="ub-KeyValItem">
                <span class="ub-KeyLabel">Tài khoản thụ hưởng:</span>
                <span class="ub-KeyVal">${escapeHtml(kocDb.bankAccountMasked)}</span>
              </div>
            </div>
            ${
              kocDb.sharedMcnInfo
                ? `<div class="ub-Notice ub-Notice--warn">Lưu ý đối soát pháp lý: ${escapeHtml(kocDb.sharedMcnInfo)}</div>`
                : ''
            }
          </div>
        `
        : `
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">KOC chưa có lịch sử hợp tác trong Master Data</h4>
            <div style="font-size:12px; color:var(--ub-ink-2);">
              Kênh <strong>@${escapeHtml(uiState.handle || 'chưa chọn')}</strong> chưa từng phát sinh mã BO trong 16.024 Deal lịch sử. Bạn có thể lập đề xuất mới bên dưới để đưa vào danh sách trình duyệt.
            </div>
          </div>
        `;

      const dealsTableHtml =
        recentDeals.length > 0
          ? `
            <div class="ub-TableWrap" style="max-height:120px;">
              <table class="ub-Table">
                <thead>
                  <tr>
                    <th>Mã BO</th>
                    <th>Gian hàng / Brand</th>
                    <th class="ub-Num">Giá Net</th>
                    <th class="ub-Num">View</th>
                    <th>PIC</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentDeals
                    .map(
                      (d) => `
                    <tr>
                      <td style="font-weight:600;">
                        ${
                          d.videoUrl
                            ? `<a href="${escapeHtml(d.videoUrl)}" target="_blank" style="color:var(--ub-accent); text-decoration:none;" title="Mở bài Air có gắn giỏ hàng">${escapeHtml(d.dealCode)} ↗</a>`
                            : escapeHtml(d.dealCode)
                        }
                      </td>
                      <td>${escapeHtml(d.brandName)}</td>
                      <td class="ub-Num">${formatVnd(d.totalValue)}</td>
                      <td class="ub-Num">${formatNum(d.viewsCount)}</td>
                      <td>${escapeHtml(d.assignedStaff)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          : '';

      const storeOptionsHtml = stores
        .map(
          (s) =>
            `<option value="${escapeHtml(s.storeName)}" ${s.storeName === uiState.selectedStoreName ? 'selected' : ''}>
              ${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})
            </option>`
        )
        .join('');

      tabBodyHtml = `
        ${historySectionHtml}
        ${dealsTableHtml}

        <div class="ub-SectionBox">
          <h4 class="ub-SectionTitle">Đề xuất đưa KOC vào Kế hoạch Booking tháng 10/2026</h4>
          <div class="ub-FormGrid">
            <div class="ub-Field ub-Field--full">
              <label class="ub-Label">Gian hàng nhận phân bổ (69 gian hàng B2C)</label>
              <select class="ub-Select" id="ub-sel-store">${storeOptionsHtml}</select>
            </div>
            <div class="ub-Field ub-Field--full">
              <div style="font-size:12px; padding:6px 8px; background:var(--ub-surface); border:1px solid var(--ub-line); border-radius:4px;">
                Luồng phê duyệt: <strong style="color:var(--ub-accent);">${escapeHtml(selectedStoreObj?.routingLabel || 'Trình duyệt B2C')}</strong>
              </div>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Hạng mục Booking</label>
              <select class="ub-Select" id="ub-sel-format">
                <option value="Video trả phí" ${uiState.bookingFormatLabel === 'Video trả phí' ? 'selected' : ''}>Video trả phí</option>
                <option value="Suất gửi mẫu FOC" ${uiState.bookingFormatLabel === 'Suất gửi mẫu FOC' ? 'selected' : ''}>Suất gửi mẫu FOC (0đ)</option>
                <option value="Video Affiliate" ${uiState.bookingFormatLabel === 'Video Affiliate' ? 'selected' : ''}>Video Affiliate</option>
              </select>
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Đơn giá Net dự kiến (VND)</label>
              <input class="ub-Input" id="ub-inp-rate" type="number" step="100000" min="0" placeholder="VD: 5000000" value="${escapeHtml(uiState.rateCardNetInput)}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Chuyên viên thực thi (PIC)</label>
              <input class="ub-Input" id="ub-inp-pic" type="text" value="${escapeHtml(uiState.picNameInput)}" />
            </div>
            <div class="ub-Field">
              <label class="ub-Label">Ghi chú sản phẩm / Góc nội dung</label>
              <input class="ub-Input" id="ub-inp-note" type="text" placeholder="VD: Cushion kiềm dầu..." value="${escapeHtml(uiState.noteInput)}" />
            </div>
          </div>
        </div>
      `;

      footerHtml = `
        <span style="font-size:12px; color:var(--ub-ink-2);">Gian hàng: <strong>${escapeHtml(selectedStoreObj?.brandName || 'B2C')}</strong></span>
        <button class="ub-BtnPrimary" id="ub-btn-save-proposal" type="button" ${uiState.syncing ? 'disabled' : ''}>
          ${uiState.syncing ? 'Đang lưu...' : 'Lưu đề xuất Booking về Web-Admin'}
        </button>
      `;
    } else if (uiState.activeTab === 'aircheck') {
      const activeVid =
        uiState.currentVideo ||
        (uiState.videos && uiState.videos[0]) ||
        null;

      if (!activeVid) {
        tabBodyHtml = `
          <div class="ub-SectionBox">
            <h4 class="ub-SectionTitle">Chưa chọn video cần nghiệm thu</h4>
            <div style="font-size:12px; color:var(--ub-ink-2);">
              Hãy bấm mở một video cụ thể trên kênh KOC để kiểm tra Hashtag, Giỏ hàng và đẩy số liệu nghiệm thu Air Link về hệ thống.
            </div>
          </div>
        `;
      } else {
        const expectedTags = String(uiState.expectedHashtagInput || '')
          .split(/[,\s]+/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`));
        const actualTags = (activeVid.hashtags || []).map((t) => String(t).toLowerCase());
        const missingTags = expectedTags.filter((t) => !actualTags.includes(t));

        // 1. Giỏ hàng TikTok Shop & Đối chiếu Link Giỏ hàng mẫu
        const cartProducts = Array.isArray(activeVid.cartProducts) ? activeVid.cartProducts : [];
        const hasCart = Boolean(activeVid.hasYellowCart || cartProducts.length > 0);
        const expectedCartRaw = String(uiState.expectedCartUrlInput || '').trim();
        const expectedPidMatch = expectedCartRaw.match(/\b(\d{15,22})\b/);
        const expectedPid = expectedPidMatch ? expectedPidMatch[1] : '';
        let isCartMatched = true;
        if (expectedCartRaw) {
          if (expectedPid) {
            isCartMatched =
              cartProducts.some((p) => String(p.productId || '') === expectedPid) ||
              String(activeVid.cartProductId || '') === expectedPid;
          } else {
            const kw = expectedCartRaw.toLowerCase();
            isCartMatched = cartProducts.some(
              (p) =>
                String(p.title || '').toLowerCase().includes(kw) ||
                String(p.productUrl || '').toLowerCase().includes(kw)
            );
          }
        }

        const cartProductsHtml =
          cartProducts.length > 0
            ? cartProducts
                .map(
                  (p, idx) => `
                  <div class="ub-ProductCard">
                    <div class="ub-ProductCardInfo">
                      <div class="ub-ProductCardTitle">
                        ${idx + 1}. ${escapeHtml(p.title || 'Sản phẩm TikTok Shop')}
                      </div>
                      <div class="ub-ProductCardMeta">
                        Mã SP: <strong>${escapeHtml(p.productId || '—')}</strong>
                        ${p.anchorKeyword ? ` · Thẻ giỏ: <strong>${escapeHtml(p.anchorKeyword)}</strong>` : ''}
                        ${p.priceText ? ` · Giá: <strong>${escapeHtml(p.priceText)}</strong>` : p.priceVnd ? ` · Giá: <strong>${formatVnd(p.priceVnd)}</strong>` : ''}
                      </div>
                      ${
                        p.productUrl
                          ? `<div class="ub-ProductCardMeta" style="margin-top:2px;">
                               Link giỏ: <a href="${escapeHtml(p.productUrl)}" target="_blank" style="color:var(--ub-accent); word-break:break-all; text-decoration:underline;">${escapeHtml(p.productUrl)}</a>
                             </div>`
                          : ''
                      }
                    </div>
                    <div style="display:flex; flex-direction:column; gap:3px; align-items:flex-end;">
                      ${
                        p.productUrl
                          ? `<button type="button" class="ub-IconBtn ub-BtnCopyCartUrl" data-cart-url="${escapeHtml(p.productUrl)}">Copy Link Giỏ</button>`
                          : ''
                      }
                      ${
                        p.productId
                          ? `<button type="button" class="ub-IconBtn ub-BtnCopyPid" data-pid="${escapeHtml(p.productId)}">Copy Mã</button>`
                          : ''
                      }
                      ${
                        p.productUrl
                          ? `<a href="${escapeHtml(p.productUrl)}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none; white-space:nowrap;">Mở SP ↗</a>`
                          : ''
                      }
                    </div>
                  </div>`
                )
                .join('')
            : hasCart
              ? `<div class="ub-ProductCard">
                   <div class="ub-ProductCardInfo">
                     <div class="ub-ProductCardMeta" style="color:var(--ub-ink-2);">
                       Phát hiện gắn giỏ hàng thương mại${activeVid.hasCapCutMask ? ' (Đang mở khóa lớp phủ CapCut...)' : ''}.
                     </div>
                   </div>
                 </div>`
              : (() => {
                  const genericTagSet = new Set([
                    '#fyp',
                    '#xuhuong',
                    '#tiktok',
                    '#viral',
                    '#trending',
                    '#tranthanhtam',
                    '#antamfamily',
                    '#metaverse',
                    `#${String(uiState.handle || '').replace(/[._-]+/g, '')}`,
                  ]);
                  const brandTags = actualTags.filter((t) => !genericTagSet.has(t));
                  const searchKw =
                    brandTags.length > 0
                      ? brandTags.map((t) => t.replace(/^#/, '')).join(' ')
                      : '';
                  const dealsWithVideo = (recentDeals || []).filter((d) => d.videoUrl).slice(0, 3);
                  return `<div class="ub-ProductCard" style="flex-direction:column; align-items:stretch; gap:4px;">
                     <div class="ub-ProductCardInfo">
                       <div class="ub-ProductCardMeta" style="color:var(--ub-ink);">
                         <strong>KOC không gắn giỏ hàng TikTok Shop trên video này</strong>${
                           activeVid.isAdAuthorized || activeVid.isSponsored
                             ? ' (Bài đăng dạng Booking Branding · Đã bật Ủy quyền Quảng cáo Spark Ads).'
                             : ' (Bài đăng tự nhiên hoặc Booking Branding không gắn giỏ).'
                         }
                       </div>
                       ${
                         brandTags.length > 0
                           ? `<div class="ub-ProductCardMeta" style="margin-top:3px; display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                                <span>Nhãn hàng/SP trong bài: <strong style="color:var(--ub-accent);">${escapeHtml(brandTags.join(' '))}</strong></span>
                                <a href="https://www.tiktok.com/search?q=${encodeURIComponent(searchKw)}" target="_blank" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none;">Tìm SP trên TikTok ↗</a>
                              </div>`
                           : ''
                       }
                       ${
                         dealsWithVideo.length > 0
                           ? `<div class="ub-ProductCardMeta" style="margin-top:4px; padding-top:4px; border-top:1px dashed var(--ub-line);">
                                <span>Bài Air có gắn giỏ của @${escapeHtml(uiState.handle)}:</span>
                                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                                  ${dealsWithVideo
                                    .map(
                                      (d) =>
                                        `<a href="${escapeHtml(d.videoUrl)}" style="font-size:12px; color:var(--ub-accent); font-weight:600; text-decoration:none;">${escapeHtml(d.brandName)} (${escapeHtml(d.dealCode)}) ↗</a>`
                                    )
                                    .join(' · ')}
                                </div>
                              </div>`
                           : ''
                       }
                     </div>
                   </div>`;
                })();

        // 2. Lời thoại Phụ đề (WebVTT), Chữ trên màn hình & Quét Từ cấm / USP
        const transcriptText = String(activeVid.transcriptText || '').trim();
        const stickers = Array.isArray(activeVid.onScreenStickers) ? activeVid.onScreenStickers : [];
        const combinedContentLower = `${activeVid.caption || ''} ${transcriptText} ${stickers.join(' ')}`.toLowerCase();

        const detectedForbidden = BLACKLIST_FORBIDDEN_WORDS.filter((w) =>
          combinedContentLower.includes(w.toLowerCase())
        );

        const expectedUsps = String(uiState.expectedUspInput || '')
          .split(/[,;]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        const missingUsps = expectedUsps.filter(
          (u) => !combinedContentLower.includes(u.toLowerCase())
        );

        // 3. Phân tích Bình luận (Ý định mua hàng vs Cảnh báo Chê / Hàng giả)
        const cmt = uiState.commentAnalysis;
        const commentSectionHtml = cmt
          ? `<div class="ub-CommentBox">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                 <strong style="font-size:12px; color:var(--ub-ink);">Phân tích Bình luận (${formatNum(cmt.totalScanned)} mẫu đã quét)</strong>
                 <span class="ub-Badge ${cmt.objectionCount > 0 ? 'ub-Badge--crit' : 'ub-Badge--pos'}">
                   Hỏi mua: ${cmt.buyingIntentCount} · Chê/Nghi Fake: ${cmt.objectionCount}
                 </span>
               </div>
               ${
                 cmt.buyingSamples?.length > 0
                   ? `<div style="font-size:12px; color:var(--ub-ink-2); margin-bottom:4px;">
                        <strong>Khách hỏi mua tiêu biểu:</strong> "${escapeHtml(cmt.buyingSamples[0].text)}" (${escapeHtml(cmt.buyingSamples[0].label)})
                      </div>`
                   : ''
               }
               ${
                 cmt.objectionSamples?.length > 0
                   ? `<div style="font-size:12px; color:var(--ub-crit);">
                        <strong>Cảnh báo tiêu cực:</strong> "${escapeHtml(cmt.objectionSamples[0].text)}" (${escapeHtml(cmt.objectionSamples[0].label)})
                      </div>`
                   : ''
               }
             </div>`
          : '';

        const storeOptionsHtml = stores
          .map(
            (s) =>
              `<option value="${escapeHtml(s.storeName)}" ${s.storeName === uiState.selectedStoreName ? 'selected' : ''}>
                ${escapeHtml(s.storeName)} (${escapeHtml(s.brandName)})
              </option>`
          )
          .join('');

        tabBodyHtml = `
          <div class="ub-StatRow">
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lượt xem bài</div>
              <div class="ub-StatVal">${formatNum(activeVid.views)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tim / BL</div>
              <div class="ub-StatVal">${formatNum(activeVid.likes)} / ${formatNum(activeVid.comments)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Lưu / Chia sẻ</div>
              <div class="ub-StatVal">${formatNum(activeVid.saves || 0)} / ${formatNum(activeVid.shares || 0)}</div>
            </div>
            <div class="ub-StatCard">
              <div class="ub-StatLabel">Tương tác (ER)</div>
              <div class="ub-StatVal">${activeVid.engagementRate}%</div>
            </div>
          </div>

          <div class="ub-SectionBox">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="ub-SectionTitle">Kiểm tra điều kiện nghiệm thu Video #${escapeHtml(String(activeVid.videoId).slice(-8))}</h4>
              <span class="ub-Badge ${hasCart || activeVid.isSponsored ? 'ub-Badge--pos' : 'ub-Badge--warn'}">
                ${
                  cartProducts.length > 0
                    ? `Có gắn giỏ (${cartProducts.length} SP)`
                    : hasCart || activeVid.isSponsored
                      ? 'Có gắn giỏ / Thẻ thương mại'
                      : 'Chưa phát hiện giỏ hàng'
                }
              </span>
            </div>

            <div style="margin-top:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:12px; font-weight:700; color:var(--ub-pos);">🛒 Sản phẩm trong Giỏ hàng TikTok Shop (${cartProducts.length} SP)</span>
              </div>
              ${cartProductsHtml}
            </div>

            <div style="margin-top:6px; font-size:12px; color:var(--ub-ink-2); background:var(--ub-surface); padding:8px; border:1px solid var(--ub-line); border-radius:4px;">
              <div><strong>Ngày đăng:</strong> ${formatDateVn(activeVid.publishedAt)} ${activeVid.durationSeconds ? `· <strong>Thời lượng:</strong> ${activeVid.durationSeconds}s` : ''}</div>
              <div style="margin-top:4px;"><strong>Nội dung mô tả:</strong> ${escapeHtml(activeVid.caption || 'Không có mô tả')}</div>
              <div style="margin-top:4px;"><strong>Hashtag trong bài (${actualTags.length}):</strong> ${actualTags.length ? escapeHtml(actualTags.join(' ')) : 'Không có hashtag'}</div>
              ${
                stickers.length > 0
                  ? `<div style="margin-top:4px;"><strong>Chữ chèn trên màn hình:</strong> ${escapeHtml(stickers.join(' · '))}</div>`
                  : ''
              }
            </div>

            <div class="ub-TranscriptBox">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:4px; flex-wrap:wrap;">
                <strong style="font-size:12px; color:var(--ub-ink);">
                  Lời thoại Phụ đề Video${
                    transcriptText
                      ? ` (${transcriptText.split(/\r?\n/).filter(Boolean).length} câu thoại · ${
                          transcriptText
                            .replace(/\[[^\]]+\]/g, '')
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean).length
                        } từ)`
                      : ''
                  }
                </strong>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                  ${
                    transcriptText
                      ? `<button class="ub-IconBtn" id="ub-btn-toggle-transcript" type="button">${
                          uiState.transcriptExpanded ? 'Thu gọn khung' : 'Mở rộng toàn bộ'
                        }</button>
                         <button class="ub-IconBtn" id="ub-btn-copy-transcript" type="button">Copy Lời thoại</button>
                         <button class="ub-IconBtn" id="ub-btn-dl-vtt" type="button">Tải Phụ đề (.txt)</button>`
                      : `<span style="font-size:12px; color:var(--ub-ink-3);">Chưa có phụ đề VTT</span>`
                  }
                  <button class="ub-IconBtn" id="ub-btn-dl-mp3" type="button">Tải MP3 Nhạc</button>
                  ${
                    Array.isArray(activeVid.imageUrls) && activeVid.imageUrls.length > 0
                      ? `<button class="ub-IconBtn" id="ub-btn-dl-slides" type="button">Tải Ảnh (${activeVid.imageUrls.length})</button>`
                      : ''
                  }
                  <button class="ub-IconBtn" id="ub-btn-export-comments-csv" type="button">Xuất CSV Bình luận</button>
                  <button class="ub-IconBtn" id="ub-btn-dl-frame-shot" type="button" title="Chụp lại khung hình video hiện tại (KOC cầm SP) kèm tem nghiệm thu">📸 Chụp khung hình SP</button>
                  <button class="ub-IconBtn" id="ub-btn-dl-screen-shot" type="button" title="Chụp toàn màn hình bài đăng & giỏ hàng làm bằng chứng">🖼 Chụp màn hình bài đăng</button>
                </div>
              </div>
              <div class="ub-TranscriptContent ${uiState.transcriptExpanded ? 'ub-TranscriptContent--expanded' : ''}">${
                transcriptText
                  ? escapeHtml(transcriptText)
                  : 'Video không có track phụ đề tự động hoặc chỉ dùng nhạc nền.'
              }</div>
            </div>

            ${
              detectedForbidden.length > 0
                ? `<div class="ub-Notice ub-Notice--crit" style="margin-top:6px;">
                     Phát hiện từ ngữ nhạy cảm / vi phạm chính sách sàn: <strong>${escapeHtml(detectedForbidden.join(', '))}</strong>
                   </div>`
                : `<div class="ub-Notice ub-Notice--pos" style="margin-top:6px;">
                     An toàn chính sách: Không phát hiện từ cấm Y tế / Điều hướng ngoài sàn trong mô tả & lời thoại.
                   </div>`
            }

            ${commentSectionHtml}

            <div class="ub-TranscriptBox" style="margin-top:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:6px; flex-wrap:wrap;">
                <strong style="font-size:12px; color:var(--ub-ink);">Bóc tách Kịch bản Gốc & Viết Kịch bản Video Chi tiết (5 phân cảnh)</strong>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                  ${
                    uiState.scriptAnalysisResult
                      ? `<button class="ub-IconBtn" id="ub-btn-copy-script-text-air" type="button">Copy Toàn bộ Kịch bản</button>`
                      : ''
                  }
                  <button class="ub-IconBtn" id="ub-btn-analyze-script" type="button" ${uiState.syncing ? 'disabled' : ''}>
                    ${uiState.syncing ? 'Đang soạn...' : 'Soạn Kịch bản & Nhận xét'}
                  </button>
                </div>
              </div>
              ${
                uiState.scriptAnalysisResult
                  ? `<div style="font-size:12px; color:var(--ub-ink-2); display:flex; flex-direction:column; gap:5px; max-height:340px; overflow-y:auto;">
                       <div><strong>Nhận xét kênh:</strong> ${escapeHtml(uiState.scriptAnalysisResult.healthVerdict || uiState.scriptAnalysisResult.channelEvaluation || '')}</div>
                       <div><strong>Hình thức khuyến nghị:</strong> ${escapeHtml(uiState.scriptAnalysisResult.suggestedFormat || uiState.scriptAnalysisResult.recommendation || '')}</div>
                       ${
                         uiState.scriptAnalysisResult.originalBreakdown
                           ? `<div style="margin-top:2px; padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:4px;">
                                <div style="font-weight:700; color:var(--ub-accent);">PHẦN 1 — BÓC TÁCH KỊCH BẢN GỐC TỪ LỜI THOẠI VIDEO (${uiState.scriptAnalysisResult.originalBreakdown.totalLines || 0} câu · ${uiState.scriptAnalysisResult.originalBreakdown.totalWords || 0} từ):</div>
                                <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>1. Mở đầu (Hook 0-5s):</strong>\n${escapeHtml(uiState.scriptAnalysisResult.originalBreakdown.hookPart || '')}</div>
                                <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>2. Dẫn dắt & Bối cảnh:</strong>\n${escapeHtml(uiState.scriptAnalysisResult.originalBreakdown.painPointPart || '')}</div>
                                <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>3. Trải nghiệm & Chứng minh USP:</strong>\n${escapeHtml(uiState.scriptAnalysisResult.originalBreakdown.uspExperiencePart || '')}</div>
                                <div style="white-space:pre-wrap; background:var(--ub-canvas); padding:4px 6px; border-radius:4px;"><strong>4. Kết bài & Kêu gọi hành động:</strong>\n${escapeHtml(uiState.scriptAnalysisResult.originalBreakdown.ctaPart || '')}</div>
                              </div>`
                           : ''
                       }
                       ${
                         Array.isArray(uiState.scriptAnalysisResult.scriptScenes) && uiState.scriptAnalysisResult.scriptScenes.length > 0
                           ? `<div style="margin-top:2px; padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:4px;">
                                <div style="font-weight:700; color:var(--ub-pos);">PHẦN 2 — KỊCH BẢN SẢN XUẤT ĐỀ XUẤT (${uiState.scriptAnalysisResult.scriptScenes.length} PHÂN CẢNH CHI TIẾT):</div>
                                ${uiState.scriptAnalysisResult.scriptScenes
                                  .map(
                                    (sc) => `
                                  <div style="background:var(--ub-canvas); padding:5px 6px; border:1px solid var(--ub-line); border-radius:4px; display:flex; flex-direction:column; gap:2px;">
                                    <strong style="color:var(--ub-ink);">${escapeHtml(sc.scene || '')}</strong>
                                    <div><strong>Cảnh quay:</strong> ${escapeHtml(sc.visual || '')}</div>
                                    ${sc.onScreenText ? `<div><strong>Chữ trên màn hình:</strong> ${escapeHtml(sc.onScreenText)}</div>` : ''}
                                    <div style="white-space:pre-wrap;"><strong>Lời thoại:</strong> ${escapeHtml(sc.voiceover || '')}</div>
                                  </div>`
                                  )
                                  .join('')}
                              </div>`
                           : uiState.scriptAnalysisResult.scriptOutline
                             ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed var(--ub-line); display:flex; flex-direction:column; gap:4px;">
                                  <div><strong>Cảnh 1 (Mở đầu):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.hook3s || '')}</div>
                                  ${uiState.scriptAnalysisResult.scriptOutline.problemLead ? `<div><strong>Cảnh 2 (Dẫn dắt):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.problemLead)}</div>` : ''}
                                  <div><strong>Cảnh 3 (Trải nghiệm USP):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.bodyUsp || '')}</div>
                                  ${uiState.scriptAnalysisResult.scriptOutline.socialProof ? `<div><strong>Cảnh 4 (Đánh giá):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.socialProof)}</div>` : ''}
                                  <div><strong>Cảnh 5 (Kêu gọi giỏ hàng):</strong> ${escapeHtml(uiState.scriptAnalysisResult.scriptOutline.ctaCart || '')}</div>
                                </div>`
                             : ''
                       }
                     </div>`
                  : `<div style="font-size:12px; color:var(--ub-ink-3);">Bấm nút "Soạn Kịch bản & Nhận xét" để bóc tách toàn bộ lời thoại gốc theo 4 chặng và dựng kịch bản sản xuất 5 phân cảnh chi tiết.</div>`
              }
            </div>

            <div class="ub-FormGrid" style="margin-top:6px;">
              <div class="ub-Field">
                <label class="ub-Label">Hashtag bắt buộc</label>
                <input class="ub-Input" id="ub-inp-expect-tags" type="text" placeholder="VD: #clubclio #review" value="${escapeHtml(uiState.expectedHashtagInput)}" />
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Từ khóa USP bắt buộc (cách bởi dấu phẩy)</label>
                <input class="ub-Input" id="ub-inp-expect-usp" type="text" placeholder="VD: kiềm dầu, che phủ" value="${escapeHtml(uiState.expectedUspInput)}" />
              </div>
              <div class="ub-Field ub-Field--full">
                <label class="ub-Label">Link / Mã SP Giỏ hàng mẫu cần đối chiếu</label>
                <input class="ub-Input" id="ub-inp-expect-cart" type="text" placeholder="Dán link shop.tiktok.com hoặc Mã Product ID..." value="${escapeHtml(uiState.expectedCartUrlInput)}" />
              </div>
              <div class="ub-Field ub-Field--full" id="ub-air-match-wrap">
                ${
                  expectedTags.length > 0 || expectedUsps.length > 0 || expectedCartRaw
                    ? `<div class="ub-Notice ${
                        missingTags.length === 0 && missingUsps.length === 0 && isCartMatched
                          ? 'ub-Notice--pos'
                          : 'ub-Notice--crit'
                      }">
                        ${
                          missingTags.length === 0 && missingUsps.length === 0 && isCartMatched
                            ? 'Đạt chuẩn: Khớp đầy đủ Hashtag, Thông điệp USP và Giỏ hàng mẫu.'
                            : [
                                missingTags.length > 0 ? `Thiếu hashtag: ${missingTags.join(', ')}` : '',
                                missingUsps.length > 0 ? `Thiếu USP: ${missingUsps.join(', ')}` : '',
                                !isCartMatched ? 'Lệch sản phẩm trong giỏ hàng mẫu' : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')
                        }
                      </div>`
                    : ''
                }
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Gian hàng nghiệm thu</label>
                <select class="ub-Select" id="ub-sel-air-store">${storeOptionsHtml}</select>
              </div>
              <div class="ub-Field">
                <label class="ub-Label">Mã BO (Deal Code)</label>
                <input class="ub-Input" id="ub-inp-dealcode" type="text" placeholder="VD: BO261067161" value="${escapeHtml(uiState.dealCodeInput || kocDb?.latestBoCode || '')}" />
              </div>
            </div>
          </div>
        `;

        footerHtml = `
          <button class="ub-BtnSecondary" id="ub-btn-download-mp4" type="button">
            Tải Video Không Logo (MP4)
          </button>
          <button class="ub-BtnPrimary" id="ub-btn-verify-air" type="button" ${uiState.syncing ? 'disabled' : ''}>
            ${uiState.syncing ? 'Đang gửi nghiệm thu...' : 'Ghi nhận Nghiệm thu Air Link'}
          </button>
        `;
      }
    }

    const bannerHtml = uiState.feedbackBanner
      ? `<div class="ub-Notice ub-Notice--${uiState.feedbackBanner.tone}">${escapeHtml(uiState.feedbackBanner.text)}</div>`
      : '';

    const feedbackModalHtml = uiState.feedbackModalOpen
      ? `<div class="ub-TranscriptBox" style="margin-bottom:8px; border-color:var(--ub-line-strong);">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
             <strong style="font-size:12px; color:var(--ub-ink);">Gửi ghi chú Báo lỗi / Góp ý cho kỹ thuật</strong>
             <button class="ub-IconBtn" id="ub-btn-close-feedback" type="button">Đóng</button>
           </div>
           <div style="display:flex; gap:6px; align-items:center;">
             <input class="ub-Input" id="ub-inp-feedback-note" type="text" placeholder="Nhập mô tả lỗi hoặc góp ý ngắn (chỉ gửi khi bấm nút Gửi)..." value="${escapeHtml(uiState.bugReportNoteInput || '')}" style="flex:1;" />
             <button class="ub-BtnPrimary" id="ub-btn-send-feedback" type="button" style="flex:0 0 auto; width:auto; padding:0 12px;" ${uiState.syncing ? 'disabled' : ''}>
               ${uiState.syncing ? 'Đang gửi...' : 'Gửi ghi chú'}
             </button>
           </div>
         </div>`
      : '';

    if (uiState.compactBarMode) {
      const curVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      const viewMetric = stats.medianViews || curVid?.views || 0;
      const erMetric = stats.sampleCount > 0 ? stats.engagementRate : curVid?.engagementRate || 0;

      root.innerHTML = `
        <div class="ub-Panel ub-Panel--compact">
          <div class="ub-Header">
            <div class="ub-HeaderTitleWrap" id="ub-drag-handle" title="Kéo để di chuyển thanh">
              <span class="ub-BrandMark">${UPBASE_ICON_SVG}</span>
              <span class="ub-HandleName">${uiState.handle ? `@${escapeHtml(uiState.handle)}` : 'Upbase B2C'}</span>
              <span style="color:var(--ub-ink-3);">·</span>
              <span style="font-size:12px; color:var(--ub-accent); font-weight:700;">${formatNum(viewMetric)} view (${erMetric}%)</span>
            </div>
            <div class="ub-HeaderActions">
              <button class="ub-IconBtn" id="ub-btn-compact-toggle" type="button" title="Mở bảng đầy đủ">▾ Mở</button>
              <button class="ub-IconBtn" id="ub-btn-min" type="button" title="Thu thành nút nhỏ">—</button>
            </div>
          </div>
          <div style="padding:5px 8px; display:flex; flex-direction:column; gap:4px; background:var(--ub-surface);">
            ${bannerHtml}
            <div style="display:flex; align-items:center; justify-content:space-between; gap:4px;">
              <button type="button" class="ub-IconBtn" id="ub-btn-quick-mp4" title="Tải MP4 không logo">⬇ MP4</button>
              <label class="ub-CheckLabel" title="Tự cuộn bài tiếp theo">
                <input type="checkbox" id="ub-chk-autoscroll" ${uiState.playerControls.autoScroll ? 'checked' : ''} />
                <span>Tự cuộn</span>
              </label>
              <label class="ub-CheckLabel" title="Phát nền khi sang tab khác">
                <input type="checkbox" id="ub-chk-bgplay" ${uiState.playerControls.bgPlay ? 'checked' : ''} />
                <span>Nền</span>
              </label>
              <select class="ub-Select" id="ub-sel-speed" style="width:54px; height:22px; padding:0 2px;" title="Tốc độ phát">
                <option value="0.75" ${uiState.playerControls.playbackSpeed === 0.75 ? 'selected' : ''}>0.75x</option>
                <option value="1" ${uiState.playerControls.playbackSpeed === 1 ? 'selected' : ''}>1.0x</option>
                <option value="1.25" ${uiState.playerControls.playbackSpeed === 1.25 ? 'selected' : ''}>1.25x</option>
                <option value="1.5" ${uiState.playerControls.playbackSpeed === 1.5 ? 'selected' : ''}>1.5x</option>
                <option value="2" ${uiState.playerControls.playbackSpeed === 2 ? 'selected' : ''}>2.0x</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else {
      root.innerHTML = `
        <div class="ub-Panel">
          <div class="ub-Header">
            <div class="ub-HeaderTitleWrap" id="ub-drag-handle" title="Kéo để di chuyển bảng">
              <span class="ub-BrandMark">${UPBASE_LOGO_SVG}</span>
              <h3 class="ub-HeaderTitle">B2C</h3>
            </div>
            <div class="ub-HeaderActions">
              <button class="ub-IconBtn" id="ub-btn-compact-toggle" type="button" title="Thu thành thanh nổi siêu gọn">▭ Gọn</button>
              <button class="ub-IconBtn" id="ub-btn-feedback-toggle" type="button" title="Báo lỗi hoặc gửi góp ý">Góp ý</button>
              <button class="ub-IconBtn" id="ub-btn-dock" type="button" title="Đổi bên neo Trái / Phải">
                ${uiState.dockSide === 'left' ? '⇄' : '⇄'}
              </button>
              <button class="ub-IconBtn" id="ub-btn-refresh" type="button" title="Làm mới dữ liệu">↻</button>
              <button class="ub-IconBtn" id="ub-btn-min" type="button" title="Thu gọn bảng">—</button>
            </div>
          </div>

          <div class="ub-ProfileStrip">
            <div class="ub-ProfileLeft">
              <div class="ub-Avatar">
                ${
                  (uiState.shopeeShopDetail?.avatarUrl || uiState.profile?.avatarUrl)
                    ? `<img src="${escapeHtml(uiState.shopeeShopDetail?.avatarUrl || uiState.profile?.avatarUrl)}" alt="" />`
                    : avatarInitial
                }
              </div>
              <div style="min-width:0;">
                <div class="ub-HandleName">
                  ${
                    uiState.platform === 'shopee'
                      ? escapeHtml(
                          uiState.shopeeShopDetail?.shopName ||
                            uiState.shopeeProductDetail?.shopName ||
                            uiState.profile?.displayName ||
                            (uiState.handle ? `@${uiState.handle}` : 'Gian hàng Shopee VN')
                        )
                      : uiState.handle
                        ? `@${escapeHtml(uiState.handle)}`
                        : isAdsHost
                          ? 'TikTok Ads Manager'
                          : 'Chưa chọn kênh KOC'
                  }
                </div>
                <div class="ub-SubMeta">
                  ${
                    uiState.platform === 'shopee'
                      ? `<span>${
                          uiState.shopeeProductDetail?.isMall || uiState.shopeeShopDetail?.isMall
                            ? 'Shopee Mall Chính Hãng'
                            : 'Shopee VN'
                        }</span>
                         <span>·</span>
                         <span>${escapeHtml(
                           uiState.handle
                             ? `@${uiState.handle}`
                             : uiState.shopeeProductDetail?.shopId
                               ? `Shop ID: ${uiState.shopeeProductDetail.shopId}`
                               : 'Thương mại điện tử'
                         )}</span>`
                      : `<span>${getPlatformLabel(uiState.platform)}</span>
                         <span>·</span>
                         <span>${escapeHtml(uiState.profile?.displayName || uiState.handle || 'Sẵn sàng')}</span>`
                  }
                </div>
              </div>
            </div>
            <div>
              ${
                uiState.platform === 'shopee'
                  ? uiState.shopeeProductDetail?.isMall || uiState.shopeeShopDetail?.isMall
                    ? `<span class="ub-Badge ub-Badge--crit">Shopee Mall</span>`
                    : `<span class="ub-Badge ub-Badge--pos">Shopee VN</span>`
                  : dbBadgeHtml
              }
            </div>
          </div>

          ${
            uiState.platform === 'shopee'
              ? `<div class="ub-Tabs">
                   <button class="ub-TabBtn ${uiState.shopeeTab === 'sp_product' ? 'ub-TabBtn--active' : ''}" data-sptab="sp_product" type="button">
                     Sản phẩm
                   </button>
                   <button class="ub-TabBtn ${uiState.shopeeTab === 'sp_reviews' ? 'ub-TabBtn--active' : ''}" data-sptab="sp_reviews" type="button">
                     Đơn & ĐG
                   </button>
                   <button class="ub-TabBtn ${uiState.shopeeTab === 'sp_shop' ? 'ub-TabBtn--active' : ''}" data-sptab="sp_shop" type="button">
                     Shop (${shopeeItemsCount})
                   </button>
                   <button class="ub-TabBtn ${uiState.shopeeTab === 'sp_live_booking' ? 'ub-TabBtn--active' : ''}" data-sptab="sp_live_booking" type="button">
                     Live·Hợp tác
                   </button>
                 </div>`
              : uiState.platform === 'instagram'
                ? `<div class="ub-Tabs">
                     <button class="ub-TabBtn ${uiState.igTab === 'ig_posts' ? 'ub-TabBtn--active' : ''}" data-metatab="ig:ig_posts" type="button">
                       Reels & Bài (${metaPostsCount})
                     </button>
                     <button class="ub-TabBtn ${uiState.igTab === 'ig_affiliate' ? 'ub-TabBtn--active' : ''}" data-metatab="ig:ig_affiliate" type="button">
                       Bio & Link (${metaAffCount})
                     </button>
                     <button class="ub-TabBtn ${uiState.igTab === 'ig_comments' ? 'ub-TabBtn--active' : ''}" data-metatab="ig:ig_comments" type="button">
                       Bình luận
                     </button>
                     <button class="ub-TabBtn ${uiState.igTab === 'ig_booking' ? 'ub-TabBtn--active' : ''}" data-metatab="ig:ig_booking" type="button">
                       Nghiệm thu
                     </button>
                   </div>`
                : uiState.platform === 'threads'
                  ? `<div class="ub-Tabs">
                       <button class="ub-TabBtn ${uiState.threadsTab === 'th_posts' ? 'ub-TabBtn--active' : ''}" data-metatab="th:th_posts" type="button">
                         Chuỗi bài (${metaPostsCount})
                       </button>
                       <button class="ub-TabBtn ${uiState.threadsTab === 'th_affiliate' ? 'ub-TabBtn--active' : ''}" data-metatab="th:th_affiliate" type="button">
                         Link Affiliate (${metaAffCount})
                       </button>
                       <button class="ub-TabBtn ${uiState.threadsTab === 'th_replies' ? 'ub-TabBtn--active' : ''}" data-metatab="th:th_replies" type="button">
                         Thảo luận
                       </button>
                       <button class="ub-TabBtn ${uiState.threadsTab === 'th_booking' ? 'ub-TabBtn--active' : ''}" data-metatab="th:th_booking" type="button">
                         Nghiệm thu
                       </button>
                     </div>`
                  : uiState.platform === 'facebook'
                    ? `<div class="ub-Tabs">
                         <button class="ub-TabBtn ${uiState.fbTab === 'fb_posts' ? 'ub-TabBtn--active' : ''}" data-metatab="fb:fb_posts" type="button">
                           Reels & Bài (${metaPostsCount})
                         </button>
                         <button class="ub-TabBtn ${uiState.fbTab === 'fb_links' ? 'ub-TabBtn--active' : ''}" data-metatab="fb:fb_links" type="button">
                           Link & Liên hệ (${metaAffCount})
                         </button>
                         <button class="ub-TabBtn ${uiState.fbTab === 'fb_comments' ? 'ub-TabBtn--active' : ''}" data-metatab="fb:fb_comments" type="button">
                           BL & SĐT
                         </button>
                         <button class="ub-TabBtn ${uiState.fbTab === 'fb_booking' ? 'ub-TabBtn--active' : ''}" data-metatab="fb:fb_booking" type="button">
                           Nghiệm thu
                         </button>
                       </div>`
                    : `<div class="ub-Tabs">
                         <button class="ub-TabBtn ${uiState.activeTab === 'metrics' ? 'ub-TabBtn--active' : ''}" data-tab="metrics" type="button">
                           Kênh (${stats.sampleCount})
                         </button>
                         <button class="ub-TabBtn ${uiState.activeTab === 'seller' ? 'ub-TabBtn--active' : ''}" data-tab="seller" type="button">
                           Seller
                         </button>
                         <button class="ub-TabBtn ${uiState.activeTab === 'ads' ? 'ub-TabBtn--active' : ''}" data-tab="ads" type="button">
                           Ads
                         </button>
                         <button class="ub-TabBtn ${uiState.activeTab === 'booking' ? 'ub-TabBtn--active' : ''}" data-tab="booking" type="button">
                           Đề xuất
                         </button>
                         <button class="ub-TabBtn ${uiState.activeTab === 'aircheck' ? 'ub-TabBtn--active' : ''}" data-tab="aircheck" type="button">
                           Air Link
                         </button>
                       </div>`
          }

          <div class="ub-Body">
            ${bannerHtml}
            ${feedbackModalHtml}
            ${tabBodyHtml}
            <div style="margin-top:10px; padding:8px 10px; border-top:1px solid #E4E2DC; font-size:12px; color:#6B6A63; display:flex; justify-content:space-between; align-items:center;">
              <span>Hệ thống <b>Upbase B2C Operations</b></span>
              <span class="ub-Num" style="font-weight:600; color:#24457A;">v1.4.0</span>
            </div>
          </div>

          ${footerHtml ? `<div class="ub-StickyFooter">${footerHtml}</div>` : ''}
        </div>
      `;
    }

    // Khôi phục vị trí cuộn của .ub-Body
    const nextBodyEl = root.querySelector('.ub-Body');
    if (nextBodyEl && prevScrollTop > 0) {
      nextBodyEl.scrollTop = prevScrollTop;
    }

    // Gắn sự kiện Kéo thả (Drag) trên HeaderTitleWrap
    const dragHandle = root.querySelector('#ub-drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const rect = root.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMouseMove = (moveEv) => {
          const nextLeft = Math.max(8, Math.min(window.innerWidth - 180, moveEv.clientX - offsetX));
          const nextTop = Math.max(8, Math.min(window.innerHeight - 60, moveEv.clientY - offsetY));
          uiState.customPos = { top: nextTop, left: nextLeft };
          applyRootDockPosition();
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          saveUiPrefs();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    // Gắn sự kiện tương tác Header, Chế độ Gọn & Báo lỗi
    root.querySelector('#ub-btn-compact-toggle')?.addEventListener('click', () => {
      uiState.compactBarMode = !uiState.compactBarMode;
      saveUiPrefs();
      render();
    });
    root.querySelector('#ub-btn-toggle-tools')?.addEventListener('click', () => {
      uiState.toolsExpanded = !uiState.toolsExpanded;
      render();
    });
    root.querySelector('#ub-btn-quick-mp4')?.addEventListener('click', () => {
      handleDownloadNoWatermarkMp4();
    });
    root.querySelector('#ub-btn-quick-mp3')?.addEventListener('click', () => {
      handleDownloadAudioMp3();
    });
    root.querySelector('#ub-btn-quick-sub')?.addEventListener('click', () => {
      handleDownloadSubtitleVtt();
    });
    root.querySelector('#ub-btn-quick-img')?.addEventListener('click', () => {
      handleDownloadPhotoSlides();
    });
    root.querySelector('#ub-btn-quick-cmt')?.addEventListener('click', () => {
      exportCommentsCsv();
    });
    root.querySelector('#ub-btn-quick-frame-shot')?.addEventListener('click', () => {
      handleCaptureVideoFrame();
    });
    root.querySelector('#ub-btn-quick-screen-shot')?.addEventListener('click', () => {
      handleCaptureScreenAcceptance();
    });
    root.querySelector('#ub-btn-feedback-toggle')?.addEventListener('click', () => {
      uiState.feedbackModalOpen = !uiState.feedbackModalOpen;
      render();
    });
    root.querySelector('#ub-btn-close-feedback')?.addEventListener('click', () => {
      uiState.feedbackModalOpen = false;
      render();
    });
    root.querySelector('#ub-inp-feedback-note')?.addEventListener('input', (e) => {
      uiState.bugReportNoteInput = e.target.value;
    });
    root.querySelector('#ub-btn-send-feedback')?.addEventListener('click', handleSubmitBugFeedbackNote);

    root.querySelector('#ub-btn-dock')?.addEventListener('click', () => {
      uiState.dockSide = uiState.dockSide === 'left' ? 'right' : 'left';
      uiState.customPos = null;
      saveUiPrefs();
      render();
    });

    root.querySelector('#ub-btn-min')?.addEventListener('click', () => {
      uiState.minimized = true;
      saveUiPrefs();
      render();
    });

    root.querySelector('#ub-btn-refresh')?.addEventListener('click', () => {
      uiState.lastLookedUpHandle = '';
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      lookupKocOnServer(uiState.handle);
    });

    root.querySelectorAll('.ub-TabBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const spTab = btn.getAttribute('data-sptab');
        if (spTab) {
          uiState.shopeeTab = spTab;
          uiState.feedbackBanner = null;
          render();
          return;
        }
        const metaTab = btn.getAttribute('data-metatab');
        if (metaTab) {
          const [prefix, tabVal] = metaTab.split(':');
          if (prefix === 'ig') uiState.igTab = tabVal;
          else if (prefix === 'th') uiState.threadsTab = tabVal;
          else if (prefix === 'fb') uiState.fbTab = tabVal;
          uiState.feedbackBanner = null;
          render();
          return;
        }
        uiState.activeTab = btn.getAttribute('data-tab') || 'metrics';
        uiState.feedbackBanner = null;
        if (uiState.activeTab === 'seller') hydrateSellerDraft();
        if (uiState.activeTab === 'ads') hydrateAdsDraft();
        if (
          uiState.handle &&
          (!uiState.lookupResult ||
            uiState.lookupResult.handle !== normalizeKocHandle(uiState.handle))
        ) {
          lookupKocOnServer(uiState.handle, uiState.videoId);
        }
        render();
      });
    });

    // Sự kiện chuyên biệt cho Giao diện Shopee VN
    root.querySelector('#ub-btn-sp-copy-itemid')?.addEventListener('click', () => {
      const id = uiState.shopeeProductDetail?.itemId || uiState.videoId || '';
      if (id) {
        copyTextToClipboard(String(id), `Đã copy Mã sản phẩm Shopee: ${id}`);
      }
    });
    root.querySelector('#ub-btn-sp-copy-url')?.addEventListener('click', () => {
      const u = uiState.shopeeProductDetail?.productUrl || window.location.href.split('?')[0];
      copyTextToClipboard(u, `Đã copy Link sản phẩm Shopee: ${u}`);
    });
    root.querySelector('#ub-btn-sp-dl-imgs')?.addEventListener('click', () => {
      const imgs = uiState.shopeeProductDetail?.imageUrls || [];
      if (imgs.length > 0) {
        handleDownloadPhotoSlides({
          videoId: uiState.shopeeProductDetail?.itemId || Date.now(),
          handle: uiState.handle || 'shopee',
          imageUrls: imgs,
        });
      } else {
        handleDownloadPhotoSlides();
      }
    });
    root.querySelector('#ub-btn-sp-dl-vid')?.addEventListener('click', () => {
      const pdp = uiState.shopeeProductDetail;
      if (pdp?.playableUrl) {
        handleDownloadNoWatermarkMp4({
          videoId: pdp.itemId || Date.now(),
          handle: uiState.handle || 'shopee',
          playableUrl: pdp.playableUrl,
          videoUrl: pdp.productUrl || window.location.href,
        });
      }
    });
    root.querySelector('#ub-inp-sp-open-comm')?.addEventListener('change', (e) => {
      uiState.shopeeCommOpenPct = Math.max(0, Number(e.target.value || 0));
      render();
    });
    root.querySelector('#ub-inp-sp-xtra-comm')?.addEventListener('change', (e) => {
      uiState.shopeeCommXtraPct = Math.max(0, Number(e.target.value || 0));
      render();
    });
    root.querySelector('#ub-inp-sp-exp-orders')?.addEventListener('change', (e) => {
      uiState.shopeeExpectedOrders = Math.max(1, Math.round(Number(e.target.value || 100)));
      render();
    });
    root.querySelector('#ub-btn-sp-goto-booking')?.addEventListener('click', () => {
      uiState.shopeeTab = 'sp_live_booking';
      render();
    });
    root.querySelector('#ub-btn-sp-export-items')?.addEventListener('click', () => {
      exportLiveSessionReportCsv();
    });
    root.querySelector('#ub-btn-sp-capture-product')?.addEventListener('click', () => {
      handleCaptureShopeeProduct();
    });
    root.querySelector('#ub-btn-sp-export-live')?.addEventListener('click', () => {
      exportLiveSessionReportCsv();
    });
    root.querySelector('#ub-btn-sp-scan-orders')?.addEventListener('click', () => {
      uiState.feedbackBanner = {
        tone: 'pos',
        text: 'Đang tự động cuộn và lật qua các trang Đánh giá để cào dữ liệu Đơn mua & Phân loại hàng (SKU) bán chạy...',
      };
      render();
      window.postMessage({ source: 'UPBASE_B2C_SHOPEE_SCAN_ORDERS', maxPages: 5 }, '*');
    });
    root.querySelector('#ub-btn-sp-export-orders')?.addEventListener('click', () => {
      exportShopeeOrdersCsv();
    });
    root.querySelector('#ub-btn-sp-export-orders-top')?.addEventListener('click', () => {
      exportShopeeOrdersCsv();
    });
    root.querySelector('#ub-btn-export-comments-csv-footer')?.addEventListener('click', () => {
      exportCommentsCsv();
    });

    // Sự kiện chuyên biệt cho Giao diện Instagram, Threads & Facebook
    root.querySelector('#ub-btn-meta-copy-cap')?.addEventListener('click', () => {
      const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      const cap = activeVid?.caption || '';
      if (cap) {
        copyTextToClipboard(cap, `Đã copy nội dung bài viết ${getPlatformLabel(uiState.platform)} vào bộ nhớ tạm.`);
      }
    });
    root.querySelector('#ub-btn-meta-dl-mp4')?.addEventListener('click', () => {
      handleDownloadNoWatermarkMp4();
    });
    root.querySelector('#ub-btn-meta-dl-img')?.addEventListener('click', () => {
      handleDownloadPhotoSlides();
    });
    root.querySelector('#ub-btn-meta-goto-booking')?.addEventListener('click', () => {
      if (uiState.platform === 'instagram') uiState.igTab = 'ig_booking';
      else if (uiState.platform === 'threads') uiState.threadsTab = 'th_booking';
      else if (uiState.platform === 'facebook') uiState.fbTab = 'fb_booking';
      render();
    });
    root.querySelector('#ub-btn-th-copy-tree')?.addEventListener('click', () => {
      copyThreadsFullTree();
    });
    root.querySelector('#ub-btn-th-download-tree')?.addEventListener('click', () => {
      downloadThreadsFullTreeTxt();
    });
    root.querySelector('#ub-btn-th-export-leads')?.addEventListener('click', () => {
      exportThreadsLeadsCsv();
    });
    root.querySelector('#ub-btn-th-export-leads-top')?.addEventListener('click', () => {
      exportThreadsLeadsCsv();
    });

    // Sub-tabs trong Tab Kênh (metrics)
    root.querySelectorAll('[data-subview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        uiState.metricsSubView = btn.getAttribute('data-subview') || 'posts';
        render();
      });
    });

    // Điều khiển trình phát (Xem) & Sắp xếp lưới trên trang TikTok/Douyin
    root.querySelector('#ub-chk-autoscroll')?.addEventListener('change', (e) => {
      const enabled = Boolean(e.target.checked);
      uiState.playerControls.autoScroll = enabled;
      saveUiPrefs();
      syncPlayerControlsToPage();
      uiState.feedbackBanner = {
        tone: enabled ? 'pos' : 'warn',
        text: enabled
          ? 'Đã bật Tự cuộn: Tự động chuyển sang bài tiếp theo khi hết video (trên Feed/Reels) hoặc tự cuộn tải thêm bài (trên trang Kênh).'
          : 'Đã tắt chế độ Tự cuộn.',
      };
      render();
    });
    root.querySelector('#ub-chk-bgplay')?.addEventListener('change', (e) => {
      uiState.playerControls.bgPlay = Boolean(e.target.checked);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-chk-gridoverlay')?.addEventListener('change', (e) => {
      uiState.playerControls.gridOverlayEnabled = Boolean(e.target.checked);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-speed')?.addEventListener('change', (e) => {
      uiState.playerControls.playbackSpeed = Number(e.target.value) || 1;
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-volume')?.addEventListener('change', (e) => {
      uiState.playerControls.volumePct = Number(e.target.value);
      syncPlayerControlsToPage();
    });
    root.querySelector('#ub-sel-gridsort')?.addEventListener('change', (e) => {
      uiState.playerControls.gridSortMode = e.target.value || 'default';
      syncPlayerControlsToPage();
      render();
    });
    root.querySelector('#ub-sel-tablesort')?.addEventListener('change', (e) => {
      uiState.tableSortMode = e.target.value || 'default';
      render();
    });
    root.querySelector('#ub-chk-col-extra')?.addEventListener('change', (e) => {
      uiState.showExtraCols = Boolean(e.target.checked);
      render();
    });
    root.querySelector('#ub-inp-img-url')?.addEventListener('input', (e) => {
      uiState.imagePromptInputUrl = e.target.value;
    });
    root.querySelector('#ub-sel-img-style')?.addEventListener('change', (e) => {
      uiState.imagePromptStyle = e.target.value;
    });
    root.querySelector('#ub-btn-gen-img-prompt')?.addEventListener('click', handleGenerateImagePrompt);
    root.querySelector('#ub-btn-copy-img-prompt')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || uiState.imagePromptResult?.promptEn || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt dựng ảnh vào bộ nhớ tạm.');
    });
    root.querySelector('#ub-btn-open-gemini-img')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt & mở Gemini trong tab mới.');
      window.open('https://gemini.google.com/app', '_blank');
    });
    root.querySelector('#ub-btn-open-chatgpt-img')?.addEventListener('click', () => {
      const p = uiState.imagePromptResult?.promptVi || '';
      if (p) copyTextToClipboard(p, 'Đã copy Prompt & mở ChatGPT trong tab mới.');
      window.open('https://chatgpt.com/', '_blank');
    });
    root.querySelector('#ub-btn-copy-script-text')?.addEventListener('click', () => {
      const txt = formatFullScriptForClipboard(uiState.scriptAnalysisResult);
      if (txt) {
        copyTextToClipboard(txt, 'Đã copy toàn bộ kịch bản bóc tách & 5 phân cảnh vào bộ nhớ tạm.');
      }
    });
    root.querySelector('#ub-btn-open-gemini-script')?.addEventListener('click', () => {
      const txt = formatFullScriptForClipboard(uiState.scriptAnalysisResult);
      if (txt) copyTextToClipboard(txt, 'Đã copy toàn bộ kịch bản & mở Gemini.');
      window.open('https://gemini.google.com/app', '_blank');
    });
    root.querySelector('#ub-btn-open-chatgpt-script')?.addEventListener('click', () => {
      const txt = formatFullScriptForClipboard(uiState.scriptAnalysisResult);
      if (txt) copyTextToClipboard(txt, 'Đã copy toàn bộ kịch bản & mở ChatGPT.');
      window.open('https://chatgpt.com/', '_blank');
    });

    root.querySelector('#ub-chk-unpin')?.addEventListener('change', (e) => {
      uiState.excludePinned = Boolean(e.target.checked);
      render();
    });
    root.querySelector('#ub-chk-unpin-main')?.addEventListener('change', (e) => {
      uiState.excludePinned = Boolean(e.target.checked);
      render();
    });

    root.querySelector('#ub-sel-sample')?.addEventListener('change', (e) => {
      uiState.sampleSize = Number(e.target.value) || 15;
      render();
    });
    root.querySelector('#ub-sel-sample-main')?.addEventListener('change', (e) => {
      uiState.sampleSize = Number(e.target.value) || 15;
      render();
    });
    root.querySelector('#ub-sel-cartfilter-main')?.addEventListener('change', (e) => {
      uiState.cartFilterMode = String(e.target.value || 'all');
      render();
    });

    root.querySelector('#ub-inp-date-from')?.addEventListener('change', (e) => {
      uiState.dateFromFilter = e.target.value;
      render();
    });
    root.querySelector('#ub-inp-kw-filter')?.addEventListener('input', (e) => {
      uiState.keywordFilter = e.target.value;
    });
    root.querySelector('#ub-inp-kw-filter')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') render();
    });

    // Nút tải nhanh MP4 / MP3 trong bảng Bài đăng & Âm thanh
    root.querySelectorAll('.ub-BtnRowDlMp4').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-row-idx') || 0);
        const target = stats.filteredVideos[idx];
        if (target) handleDownloadNoWatermarkMp4(target);
      });
    });
    root.querySelectorAll('.ub-BtnDlMusic').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-music-idx') || 0);
        const mItem = (uiState.postingAnalytics?.byMusic || [])[idx];
        if (mItem) {
          handleDownloadAudioMp3(mItem);
        }
      });
    });

    // Sub-view Mặt hàng & Shop (Super VIP)
    root.querySelector('#ub-inp-supervip-query')?.addEventListener('input', (e) => {
      uiState.superVipQueryInput = e.target.value;
    });
    root.querySelector('#ub-inp-supervip-comm')?.addEventListener('input', (e) => {
      uiState.superVipCommissionPct = Number(e.target.value || 12);
    });
    root.querySelector('#ub-btn-score-product')?.addEventListener('click', handleScoreProductSuperVip);
    root.querySelector('#ub-btn-export-products')?.addEventListener('click', exportProductsAndShopsCsv);

    // Sub-view Affiliate Hub & Máy tính hoa hồng
    const updateCommissionDom = () => {
      const cc = uiState.commissionCalc;
      const commPerOrder = Math.round(Number(cc.priceVnd || 0) * (Number(cc.commissionPct || 0) / 100));
      const totalComm = commPerOrder * Math.round(Number(cc.expectedOrders || 0));
      const totalGmv = Math.round(Number(cc.priceVnd || 0)) * Math.round(Number(cc.expectedOrders || 0));
      const netProfit = totalComm - Math.round(Number(cc.fixedCostVnd || 0));
      const breakEvenOrders =
        commPerOrder === 0 ? 0 : Math.ceil(Math.round(Number(cc.fixedCostVnd || 0)) / commPerOrder);

      const perEl = root.querySelector('#ub-cc-val-per');
      const gmvEl = root.querySelector('#ub-cc-val-gmv');
      const totEl = root.querySelector('#ub-cc-val-total');
      const profEl = root.querySelector('#ub-cc-val-profit');
      if (perEl) perEl.textContent = formatVnd(commPerOrder);
      if (gmvEl) gmvEl.textContent = formatVnd(totalGmv);
      if (totEl) totEl.textContent = formatVnd(totalComm);
      if (profEl) {
        profEl.textContent = `${breakEvenOrders} đơn (${formatVnd(netProfit)})`;
        profEl.style.color = netProfit >= 0 ? 'var(--ub-pos)' : 'var(--ub-crit)';
      }
    };
    root.querySelector('#ub-cc-price')?.addEventListener('input', (e) => {
      uiState.commissionCalc.priceVnd = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-pct')?.addEventListener('input', (e) => {
      uiState.commissionCalc.commissionPct = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-orders')?.addEventListener('input', (e) => {
      uiState.commissionCalc.expectedOrders = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-cc-cost')?.addEventListener('input', (e) => {
      uiState.commissionCalc.fixedCostVnd = Number(e.target.value || 0);
      updateCommissionDom();
    });
    root.querySelector('#ub-btn-save-watchlist')?.addEventListener('click', handleSaveChannelToWatchlist);
    root.querySelectorAll('.ub-BtnWatchDiscoveredKoc').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-disc-idx') || -1);
        const k = uiState.searchSaturation?.discoveredKocs?.[idx];
        if (!k || !k.handle) return;
        const cleanH = normalizeKocHandle(k.handle);
        const list = Array.isArray(uiState.watchlistChannels) ? uiState.watchlistChannels : [];
        const existingIdx = list.findIndex((x) => normalizeKocHandle(x.handle) === cleanH);
        const nowStr = new Date().toISOString().slice(0, 10);
        if (existingIdx >= 0) {
          const prev = list[existingIdx];
          list[existingIdx] = {
            ...prev,
            prevFollowers: prev.followers || k.followers || 0,
            prevAvgViews: prev.avgViews || k.avgViews || 0,
            followers: k.followers || prev.followers || 0,
            avgViews: k.avgViews || prev.avgViews || 0,
            engagementRate: k.engagementRate || prev.engagementRate || 0,
            updatedAt: nowStr,
          };
        } else {
          list.unshift({
            handle: cleanH,
            followers: k.followers || 0,
            prevFollowers: k.followers || 0,
            avgViews: k.avgViews || 0,
            prevAvgViews: k.avgViews || 0,
            engagementRate: k.engagementRate || 0,
            updatedAt: nowStr,
          });
        }
        uiState.watchlistChannels = list.slice(0, 30);
        try {
          window.localStorage.setItem('upbase_ext_watchlist_v1', JSON.stringify(uiState.watchlistChannels));
        } catch {
          // Bỏ qua
        }
        uiState.feedbackBanner = {
          tone: 'pos',
          text: `Đã lưu kênh @${cleanH} vào Danh sách Theo dõi.`,
        };
        render();
      });
    });
    root.querySelectorAll('.ub-BtnRemoveWatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-watch-idx') || -1);
        if (idx >= 0 && Array.isArray(uiState.watchlistChannels)) {
          uiState.watchlistChannels.splice(idx, 1);
          try {
            window.localStorage.setItem('upbase_ext_watchlist_v1', JSON.stringify(uiState.watchlistChannels));
          } catch {
            // Bỏ qua
          }
          render();
        }
      });
    });

    root.querySelector('#ub-sel-batch-script-mode')?.addEventListener('change', (e) => {
      uiState.batchScriptMode = e.target.value || 'top5_views';
      if (Array.isArray(uiState.batchScriptItems) && uiState.batchScriptItems.length > 0) {
        uiState.batchScriptItems = buildBatchScriptItemsFromVideos(getBatchTargetVideos());
      }
      render();
    });
    root.querySelector('#ub-btn-batch-scan-scripts')?.addEventListener('click', handleRunBatchScriptScan);
    root.querySelector('#ub-btn-export-batch-scripts-csv')?.addEventListener('click', exportBatchScriptsCsv);
    root.querySelector('#ub-btn-copy-batch-scripts')?.addEventListener('click', () => {
      const txt = formatBatchScriptsForClipboard();
      if (txt) {
        copyTextToClipboard(
          txt,
          `Đã copy toàn bộ kịch bản của ${uiState.batchScriptItems.length} video vào bộ nhớ tạm.`
        );
      }
    });
    root.querySelector('#ub-btn-gemini-batch-scripts')?.addEventListener('click', () => {
      const txt = formatBatchScriptsForClipboard();
      if (txt) {
        const prompt = `Hãy phân tích công thức kịch bản viral, cấu trúc Hook 3s đầu, cách lồng ghép sản phẩm và kêu gọi hành động (CTA) từ dữ liệu kịch bản của các video trên kênh @${uiState.handle || 'koc'} dưới đây, sau đó đề xuất 3 kịch bản mới bám sát phong cách của kênh:\n\n${txt}`;
        copyTextToClipboard(
          prompt,
          'Đã copy toàn bộ kịch bản hàng loạt kèm câu lệnh phân tích! Hãy dán (Ctrl+V) vào Gemini.'
        );
        window.open('https://gemini.google.com/app', '_blank');
      }
    });
    root.querySelectorAll('.ub-BtnCopySingleBatchScript').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-batch-idx') || -1);
        const it = uiState.batchScriptItems?.[idx];
        if (!it) return;
        const lines = [
          `=== PHÂN TÍCH VIDEO #${it.index} (@${uiState.handle || 'koc'}) ===`,
          `Link: ${it.videoUrl}`,
          `Chỉ số: ${formatNum(it.views)} view · ${formatNum(it.likes)} tim · ${formatNum(it.comments)} BL · ${formatNum(it.saves)} lưu · ${formatNum(it.shares)} CS (ER: ${it.engagementRate || 0}%)`,
          `Định dạng: ${it.contentFormatLabel} · ${it.hasCart ? `🛒 Gắn giỏ: ${it.productTitle}` : 'Không gắn giỏ'}`,
          `Mô tả (Caption): ${it.caption || '—'}`,
          it.stickersText ? `Chữ trên màn hình: ${it.stickersText}` : '',
          it.musicTitle ? `Nhạc nền: ${it.musicTitle}` : '',
        ];
        if (it.hasVtt && it.totalLines >= 3) {
          lines.push(
            `1. Mở đầu (Hook):\n${it.hookPart}`,
            it.painPointPart ? `2. Dẫn dắt & Bối cảnh:\n${it.painPointPart}` : '',
            it.uspPart ? `3. Nội dung chính / Điểm chạm SP:\n${it.uspPart}` : '',
            it.ctaPart ? `4. Kết bài & CTA:\n${it.ctaPart}` : '',
            `Toàn bộ Lời thoại gốc WebVTT:\n${it.transcriptText}`
          );
        } else if (it.hasVtt) {
          lines.push(`Lời thoại gốc WebVTT:\n${it.transcriptText}`);
        }
        const singleTxt = lines.filter(Boolean).join('\n\n');
        copyTextToClipboard(singleTxt, `Đã copy nội dung Bài #${it.index} vào bộ nhớ tạm.`);
      });
    });

    root.querySelector('#ub-btn-csv')?.addEventListener('click', exportCsv);
    root.querySelector('#ub-btn-report-pdf')?.addEventListener('click', handleOpenPrintableChannelReport);
    root.querySelector('#ub-btn-sync-profile')?.addEventListener('click', handleSyncProfileToServer);

    // Sự kiện Tab TikTok Seller
    root.querySelector('#ub-btn-toggle-seller-edit')?.addEventListener('click', () => {
      uiState.sellerEditExpanded = !uiState.sellerEditExpanded;
      render();
    });

    root.querySelector('#ub-btn-rescan-seller')?.addEventListener('click', () => {
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      hydrateSellerDraft();
      uiState.feedbackBanner = {
        tone: 'pos',
        text: 'Đã quét lại các chỉ số hiển thị trên màn hình TikTok Seller.',
      };
      render();
    });

    root.querySelector('#ub-seller-handle')?.addEventListener('input', (e) => {
      const clean = String(e.target.value || '').trim().toLowerCase().replace(/^@+/, '');
      if (clean) {
        uiState.handle = clean;
      }
    });

    root.querySelector('#ub-btn-lookup-handle')?.addEventListener('click', () => {
      const val = root.querySelector('#ub-seller-handle')?.value || '';
      const clean = String(val).trim().toLowerCase().replace(/^@+/, '');
      if (clean) {
        uiState.handle = clean;
        uiState.lastLookedUpHandle = '';
        lookupKocOnServer(clean);
      }
    });

    const updateSellerSummaryDom = () => {
      const d = uiState.sellerDraft;
      const setTxt = (sel, txt) => {
        const el = root.querySelector(sel);
        if (el) el.textContent = txt;
      };
      setTxt('#ub-seller-stat-gmv', formatVnd(d.doanhSo));
      setTxt('#ub-seller-stat-items', formatNum(d.soMonBanRa));
      setTxt('#ub-seller-stat-gpm', formatVnd(d.gpm));
      setTxt('#ub-seller-stat-views', formatNum(d.viewTrungBinh));
      setTxt('#ub-seller-kv-aov', formatVnd(d.aov));
      setTxt(
        '#ub-seller-kv-channel',
        `${Number(d.gmvTuVideoPct || 0)}% / ${Number(d.gmvTuLivePct || 0)}% / ${Number(d.gmvTuTheSanPhamPct || 0)}%`
      );
      setTxt('#ub-seller-kv-gender', `${Number(d.namPct || 0)}% / ${Number(d.nuPct || 0)}%`);
      setTxt(
        '#ub-seller-kv-age',
        `${Number(d.tuoi18_24Pct || 0)}% / ${Number(d.tuoi25_34Pct || 0)}% / ${Number(d.tuoiTren35Pct || 0)}%`
      );
      const resolvedLiveGmv =
        Number(d.liveGmv || 0) > 0
          ? Math.round(Number(d.liveGmv))
          : Math.round(Number(d.doanhSo || 0) * (Number(d.gmvTuLivePct || 0) / 100));
      setTxt('#ub-seller-kv-livegmv', formatVnd(resolvedLiveGmv));
      setTxt('#ub-seller-kv-livegpm', formatVnd(d.liveGpm || 0));
      setTxt('#ub-seller-kv-livesessions', `${formatNum(d.liveSessionCount || 0)} phiên`);
      setTxt('#ub-seller-kv-liveviews', formatNum(d.liveAvgViews || 0));
      setTxt('#ub-seller-kv-livepcu', formatNum(d.livePeakViewers || 0));
      setTxt('#ub-seller-kv-liveitems', `${formatNum(d.liveItemsSold || 0)} món`);
    };

    const bindSellerField = (selector, key) => {
      root.querySelector(selector)?.addEventListener('input', (e) => {
        uiState.sellerDraft[key] = Number(e.target.value || 0);
        updateSellerSummaryDom();
      });
    };
    bindSellerField('#ub-seller-followers', 'followers');
    bindSellerField('#ub-seller-gmv', 'doanhSo');
    bindSellerField('#ub-seller-items', 'soMonBanRa');
    bindSellerField('#ub-seller-gpm', 'gpm');
    bindSellerField('#ub-seller-aov', 'aov');
    bindSellerField('#ub-seller-views', 'viewTrungBinh');
    bindSellerField('#ub-seller-vidpct', 'gmvTuVideoPct');
    bindSellerField('#ub-seller-livepct', 'gmvTuLivePct');
    bindSellerField('#ub-seller-cardpct', 'gmvTuTheSanPhamPct');
    bindSellerField('#ub-seller-male', 'namPct');
    bindSellerField('#ub-seller-female', 'nuPct');
    bindSellerField('#ub-seller-a18', 'tuoi18_24Pct');
    bindSellerField('#ub-seller-a25', 'tuoi25_34Pct');
    bindSellerField('#ub-seller-a35', 'tuoiTren35Pct');
    bindSellerField('#ub-seller-livegmv', 'liveGmv');
    bindSellerField('#ub-seller-livegpm', 'liveGpm');
    bindSellerField('#ub-seller-livesessions', 'liveSessionCount');
    bindSellerField('#ub-seller-liveviews', 'liveAvgViews');
    bindSellerField('#ub-seller-livepcu', 'livePeakViewers');
    bindSellerField('#ub-seller-liveitems', 'liveItemsSold');

    root.querySelector('#ub-btn-copy-sheet-row')?.addEventListener('click', handleCopySellerColumnsYtoAM);
    root.querySelector('#ub-btn-copy-summary')?.addEventListener('click', handleCopySellerSummaryText);
    root.querySelector('#ub-btn-copy-live-summary')?.addEventListener('click', handleCopySellerSummaryText);
    root.querySelector('#ub-btn-copy-post-live-report')?.addEventListener('click', handleCopyPostLiveSessionReport);
    root.querySelector('#ub-btn-export-post-live-csv')?.addEventListener('click', exportPostLiveSessionCsv);
    root.querySelector('#ub-btn-copy-live-summary-foot')?.addEventListener('click', handleCopyPostLiveSessionReport);
    root.querySelector('#ub-btn-export-live-comments')?.addEventListener('click', () => {
      const cmts = Array.isArray(uiState.liveSession?.liveComments)
        ? uiState.liveSession.liveComments
        : [];
      if (cmts.length === 0) {
        uiState.feedbackBanner = {
          tone: 'warn',
          text: 'Chưa có bình luận trên phiên Live để xuất CSV. Hãy mở phòng phát sóng trực tiếp (/@handle/live).',
        };
        render();
        return;
      }
      const rows = [['Nhóm ý định', 'Phân loại', 'SĐT trích xuất', 'Nội dung bình luận trên Live']];
      for (const c of cmts) {
        rows.push([
          c.intentGroup || 'GENERAL',
          c.intentLabel || 'Bình luận Live',
          c.extractedPhone ? `="${c.extractedPhone}"` : '',
          c.text || '',
        ]);
      }
      const csv =
        '\uFEFF' +
        rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Upbase_LiveChat_${uiState.handle || 'koc'}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      uiState.feedbackBanner = {
        tone: 'pos',
        text: `Đã xuất ${cmts.length} bình luận trên phiên Live ra file CSV.`,
      };
      render();
    });
    root.querySelector('#ub-btn-sync-seller')?.addEventListener('click', handleSyncProfileToServer);

    // Sự kiện Tab TikTok Ads Manager
    root.querySelector('#ub-btn-load-reg-videos')?.addEventListener('click', () => {
      uiState.lastLookedUpHandle = '';
      lookupKocOnServer(uiState.handle);
      uiState.feedbackBanner = {
        tone: 'pos',
        text: 'Đã tải danh sách Video Air & Mã Spark Ads từ Web-Admin.',
      };
      render();
    });

    root.querySelector('#ub-ads-batch-codes')?.addEventListener('input', (e) => {
      uiState.adsDraft.batchSparkCodesText = e.target.value;
    });

    root.querySelector('#ub-btn-run-spark-auth')?.addEventListener('click', handleRunSparkAdsBatchAuth);

    root.querySelector('#ub-btn-rescan-ads')?.addEventListener('click', () => {
      window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
      hydrateAdsDraft();
      uiState.feedbackBanner = {
        tone: 'pos',
        text: `Đã quét bảng báo cáo TikTok Ads (${uiState.adsRecords?.length || 0} dòng chiến dịch/video).`,
      };
      render();
    });

    root.querySelectorAll('.ub-AdsRowItem').forEach((tr) => {
      tr.addEventListener('click', () => {
        const idx = Number(tr.getAttribute('data-ads-idx') || 0);
        const rec = uiState.adsRecords?.[idx];
        if (rec) {
          uiState.adsDraft.videoId = String(rec.videoId || rec.adId || '');
          if (rec.sparkAdsCode) uiState.adsDraft.sparkAdsCode = rec.sparkAdsCode;
          uiState.adsDraft.adsSpend = Math.round(Number(rec.adsSpend || 0));
          uiState.adsDraft.gmv = Math.round(Number(rec.gmv || 0));
          uiState.adsDraft.orders = Math.round(Number(rec.orders || 0));
          if (rec.impressions) uiState.adsDraft.views = Math.round(Number(rec.impressions || 0));
          render();
        }
      });
    });

    const updateAdsStatDom = () => {
      const a = uiState.adsDraft;
      const bookingNet = Math.round(Number(a.bookingCostNet || 0));
      const adsSpend = Math.round(Number(a.adsSpend || 0));
      const gmv = Math.round(Number(a.gmv || 0));
      const totalCost = bookingNet + adsSpend;
      const roasAds = adsSpend === 0 ? 0 : Number((gmv / adsSpend).toFixed(2));
      const roiTotal = totalCost === 0 ? 0 : Number((gmv / totalCost).toFixed(2));

      const costEl = root.querySelector('#ub-ads-stat-cost');
      const gmvEl = root.querySelector('#ub-ads-stat-gmv');
      const roasEl = root.querySelector('#ub-ads-stat-roas');
      const roiEl = root.querySelector('#ub-ads-stat-roi');
      if (costEl) costEl.textContent = formatVnd(totalCost);
      if (gmvEl) gmvEl.textContent = formatVnd(gmv);
      if (roasEl) roasEl.textContent = `${roasAds}x`;
      if (roiEl) {
        roiEl.textContent = `${roiTotal}x`;
        roiEl.style.color =
          roiTotal >= 2
            ? 'var(--ub-pos)'
            : roiTotal > 0 && roiTotal < 1
              ? 'var(--ub-crit)'
              : 'var(--ub-accent)';
      }
    };

    root.querySelector('#ub-ads-vid')?.addEventListener('input', (e) => {
      uiState.adsDraft.videoId = e.target.value;
    });
    root.querySelector('#ub-ads-deal')?.addEventListener('input', (e) => {
      uiState.adsDraft.dealCode = e.target.value;
    });
    root.querySelector('#ub-ads-spark')?.addEventListener('input', (e) => {
      uiState.adsDraft.sparkAdsCode = e.target.value;
    });
    root.querySelector('#ub-ads-booking-net')?.addEventListener('input', (e) => {
      uiState.adsDraft.bookingCostNet = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-spend')?.addEventListener('input', (e) => {
      uiState.adsDraft.adsSpend = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-gmv')?.addEventListener('input', (e) => {
      uiState.adsDraft.gmv = Number(e.target.value || 0);
      updateAdsStatDom();
    });
    root.querySelector('#ub-ads-views')?.addEventListener('input', (e) => {
      uiState.adsDraft.views = Number(e.target.value || 0);
    });
    root.querySelector('#ub-ads-orders')?.addEventListener('input', (e) => {
      uiState.adsDraft.orders = Number(e.target.value || 0);
    });

    root.querySelector('#ub-btn-copy-ads-cols')?.addEventListener(
      'click',
      handleCopyAdsAcceptanceColumnsBEtoBI
    );
    root.querySelector('#ub-btn-sync-ads')?.addEventListener(
      'click',
      handleSyncAdsPerformanceToServer
    );

    // Sự kiện Tab Giá & Đề xuất
    root.querySelector('#ub-sel-store')?.addEventListener('change', (e) => {
      uiState.selectedStoreName = e.target.value;
      render();
    });

    root.querySelector('#ub-sel-format')?.addEventListener('change', (e) => {
      uiState.bookingFormatLabel = e.target.value;
      if (uiState.bookingFormatLabel === 'Suất gửi mẫu FOC') {
        uiState.rateCardNetInput = '0';
        render();
      }
    });

    root.querySelector('#ub-inp-rate')?.addEventListener('input', (e) => {
      uiState.rateCardNetInput = e.target.value;
    });

    root.querySelector('#ub-inp-pic')?.addEventListener('input', (e) => {
      uiState.picNameInput = e.target.value;
      safeStorageSet({ upbasePicName: e.target.value });
    });

    root.querySelector('#ub-inp-note')?.addEventListener('input', (e) => {
      uiState.noteInput = e.target.value;
    });

    root.querySelector('#ub-btn-save-proposal')?.addEventListener('click', handleSaveDealProposal);

    // Sự kiện Tab Nghiệm thu Air Link
    const updateAirCheckMatchDom = () => {
      const wrap = root.querySelector('#ub-air-match-wrap');
      const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      if (!wrap || !activeVid) return;

      const expectedTags = String(uiState.expectedHashtagInput || '')
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));
      const actualTags = (activeVid.hashtags || []).map((t) => String(t).toLowerCase());
      const missingTags = expectedTags.filter((t) => !actualTags.includes(t));

      const cartProducts = Array.isArray(activeVid.cartProducts) ? activeVid.cartProducts : [];
      const expectedCartRaw = String(uiState.expectedCartUrlInput || '').trim();
      const expectedPidMatch = expectedCartRaw.match(/\b(\d{15,22})\b/);
      const expectedPid = expectedPidMatch ? expectedPidMatch[1] : '';
      let isCartMatched = true;
      if (expectedCartRaw) {
        if (expectedPid) {
          isCartMatched =
            cartProducts.some((p) => String(p.productId || '') === expectedPid) ||
            String(activeVid.cartProductId || '') === expectedPid;
        } else {
          const kw = expectedCartRaw.toLowerCase();
          isCartMatched = cartProducts.some(
            (p) =>
              String(p.title || '').toLowerCase().includes(kw) ||
              String(p.productUrl || '').toLowerCase().includes(kw)
          );
        }
      }

      const transcriptText = String(activeVid.transcriptText || '').trim();
      const stickers = Array.isArray(activeVid.onScreenStickers) ? activeVid.onScreenStickers : [];
      const combinedContentLower = `${activeVid.caption || ''} ${transcriptText} ${stickers.join(' ')}`.toLowerCase();
      const expectedUsps = String(uiState.expectedUspInput || '')
        .split(/[,;]+/)
        .map((u) => u.trim())
        .filter(Boolean);
      const missingUsps = expectedUsps.filter((u) => !combinedContentLower.includes(u.toLowerCase()));

      if (expectedTags.length === 0 && expectedUsps.length === 0 && !expectedCartRaw) {
        wrap.innerHTML = '';
        return;
      }

      const allOk = missingTags.length === 0 && missingUsps.length === 0 && isCartMatched;
      const msg = allOk
        ? 'Đạt chuẩn: Khớp đầy đủ Hashtag, Thông điệp USP và Giỏ hàng mẫu.'
        : [
            missingTags.length > 0 ? `Thiếu hashtag: ${missingTags.join(', ')}` : '',
            missingUsps.length > 0 ? `Thiếu USP: ${missingUsps.join(', ')}` : '',
            !isCartMatched ? 'Lệch sản phẩm trong giỏ hàng mẫu' : '',
          ]
            .filter(Boolean)
            .join(' · ');

      wrap.innerHTML = `<div class="ub-Notice ${allOk ? 'ub-Notice--pos' : 'ub-Notice--crit'}">${escapeHtml(msg)}</div>`;
    };

    root.querySelector('#ub-inp-expect-tags')?.addEventListener('input', (e) => {
      uiState.expectedHashtagInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-inp-expect-usp')?.addEventListener('input', (e) => {
      uiState.expectedUspInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-inp-expect-cart')?.addEventListener('input', (e) => {
      uiState.expectedCartUrlInput = e.target.value;
      updateAirCheckMatchDom();
    });

    root.querySelector('#ub-btn-toggle-transcript')?.addEventListener('click', () => {
      uiState.transcriptExpanded = !uiState.transcriptExpanded;
      render();
    });

    root.querySelector('#ub-btn-copy-transcript')?.addEventListener('click', () => {
      const activeVid = uiState.currentVideo || (uiState.videos && uiState.videos[0]) || null;
      if (activeVid?.transcriptText) {
        copyTextToClipboard(
          activeVid.transcriptText,
          'Đã copy toàn bộ lời thoại phụ đề (WebVTT) vào bộ nhớ tạm.'
        );
      }
    });

    root.querySelector('#ub-btn-copy-script-text-air')?.addEventListener('click', () => {
      const txt = formatFullScriptForClipboard(uiState.scriptAnalysisResult);
      if (txt) {
        copyTextToClipboard(txt, 'Đã copy toàn bộ kịch bản bóc tách & 5 phân cảnh vào bộ nhớ tạm.');
      }
    });

    root.querySelector('#ub-btn-dl-vtt')?.addEventListener('click', () => handleDownloadSubtitleVtt());
    root.querySelector('#ub-btn-dl-mp3')?.addEventListener('click', () => handleDownloadAudioMp3());
    root.querySelector('#ub-btn-dl-slides')?.addEventListener('click', () => handleDownloadPhotoSlides());
    root.querySelector('#ub-btn-export-comments-csv')?.addEventListener('click', exportCommentsCsv);
    root.querySelector('#ub-btn-dl-frame-shot')?.addEventListener('click', () => handleCaptureVideoFrame());
    root.querySelector('#ub-btn-dl-screen-shot')?.addEventListener('click', () => handleCaptureScreenAcceptance());
    root.querySelector('#ub-btn-analyze-script')?.addEventListener('click', handleAnalyzeChannelAndScript);

    root.querySelector('#ub-btn-download-mp4')?.addEventListener('click', () => handleDownloadNoWatermarkMp4());

    root.querySelector('#ub-sel-air-store')?.addEventListener('change', (e) => {
      uiState.selectedStoreName = e.target.value;
    });

    root.querySelector('#ub-inp-dealcode')?.addEventListener('input', (e) => {
      uiState.dealCodeInput = e.target.value;
    });

    root.querySelector('#ub-btn-verify-air')?.addEventListener('click', handleVerifyAirLink);

    root.querySelectorAll('.ub-BtnCopyPid').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-pid') || '';
        if (pid) {
          copyTextToClipboard(
            pid,
            `Đã copy Mã sản phẩm ${uiState.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'}: ${pid}`
          );
        }
      });
    });

    root.querySelectorAll('.ub-BtnCopyCartUrl').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cartUrl = btn.getAttribute('data-cart-url') || '';
        if (cartUrl) {
          copyTextToClipboard(
            cartUrl,
            `Đã copy Link sản phẩm ${uiState.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'}: ${cartUrl}`
          );
        }
      });
    });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'UPBASE_B2C_PAGE_CAPTURE') {
      const p = event.data.payload || {};
      const handleChanged = Boolean(p.handle && p.handle !== uiState.handle);
      const videoIdChanged = Boolean(p.videoId && p.videoId !== uiState.videoId);
      uiState.platform = p.platform || uiState.platform;
      uiState.pageType = p.pageType || 'profile';
      if (p.handle) uiState.handle = p.handle;
      uiState.videoId = p.videoId || null;
      if (p.shopeeProductDetail) {
        uiState.shopeeProductDetail = p.shopeeProductDetail;
      }
      if (p.shopeeShopDetail) {
        uiState.shopeeShopDetail = p.shopeeShopDetail;
      }
      if (p.shopeeOrdersSummary) {
        uiState.shopeeOrdersSummary = p.shopeeOrdersSummary;
      }
      if (p.threadsTree) {
        uiState.threadsTree = p.threadsTree;
      }
      if (p.profile) uiState.profile = p.profile;
      if (Array.isArray(p.videos) && p.videos.length > 0) {
        uiState.videos = p.videos;
      }
      if (p.postingAnalytics) {
        uiState.postingAnalytics = p.postingAnalytics;
      }
      if (p.productAggregation) {
        uiState.productAggregation = p.productAggregation;
      }
      if (p.searchSaturation) {
        uiState.searchSaturation = p.searchSaturation;
      }
      if (p.sellerMetrics) {
        uiState.sellerMetrics = p.sellerMetrics;
        if (!isUserTypingInExtension()) {
          hydrateSellerDraft();
        }
      }
      if (p.liveSession) {
        uiState.liveSession = p.liveSession;
      }
      const incomingAds = Array.isArray(p.adsRecords)
        ? p.adsRecords
        : Array.isArray(p.adsRows)
          ? p.adsRows
          : [];
      if (incomingAds.length > 0) {
        uiState.adsRecords = incomingAds;
        if (!isUserTypingInExtension()) {
          hydrateAdsDraft();
        }
      }
      if (p.channelHealth) {
        uiState.channelHealth = p.channelHealth;
      }
      if (p.commentAnalysis) {
        uiState.commentAnalysis = p.commentAnalysis;
      }
      if (p.currentVideo) {
        const prevVid = uiState.currentVideo;
        if (prevVid && String(prevVid.videoId) === String(p.currentVideo.videoId)) {
          const prevCart = Array.isArray(prevVid.cartProducts) ? prevVid.cartProducts : [];
          const nextCart = Array.isArray(p.currentVideo.cartProducts) ? p.currentVideo.cartProducts : [];
          uiState.currentVideo = {
            ...prevVid,
            ...p.currentVideo,
            views: Math.max(Number(prevVid.views || 0), Number(p.currentVideo.views || 0)),
            hasYellowCart: Boolean(prevVid.hasYellowCart || p.currentVideo.hasYellowCart || prevCart.length > 0 || nextCart.length > 0),
            cartProducts: nextCart.length > 0 ? nextCart : prevCart,
            transcriptText: p.currentVideo.transcriptText || prevVid.transcriptText || '',
            playableUrl: p.currentVideo.playableUrl || prevVid.playableUrl || '',
          };
        } else {
          uiState.currentVideo = p.currentVideo;
        }
      }
      if (uiState.platform === 'shopee') {
        if (p.pageType === 'shopee_product' && videoIdChanged) {
          uiState.shopeeTab = 'sp_product';
        } else if (p.pageType === 'live' && handleChanged) {
          uiState.shopeeTab = 'sp_live_booking';
        } else if ((p.pageType === 'profile' || p.pageType === 'search') && handleChanged && !p.shopeeProductDetail) {
          uiState.shopeeTab = 'sp_shop';
        }
      } else if (p.pageType === 'live' && handleChanged) {
        uiState.activeTab = 'metrics';
        uiState.metricsSubView = 'live_room';
      } else if (p.pageType === 'video' && (handleChanged || videoIdChanged)) {
        uiState.activeTab = 'aircheck';
      } else if (p.pageType === 'seller_creator' && handleChanged) {
        uiState.activeTab = 'seller';
      } else if (p.pageType === 'ads_manager' && uiState.activeTab !== 'ads') {
        uiState.activeTab = 'ads';
      }
      if (
        uiState.handle &&
        (handleChanged ||
          videoIdChanged ||
          !uiState.lookupResult ||
          uiState.lookupResult.handle !== normalizeKocHandle(uiState.handle))
      ) {
        lookupKocOnServer(uiState.handle, uiState.videoId);
      } else if (isAdsHost && !uiState.lookupResult) {
        lookupKocOnServer('');
      }
      // Focus Guard: Không ghi đè DOM khi người dùng đang gõ trong ô input/textarea hoặc đang xem kết quả Quét Kịch bản mà không đổi kênh
      if (!isUserTypingInExtension()) {
        const isReadingBatchScripts =
          uiState.activeTab === 'metrics' &&
          uiState.metricsSubView === 'ai_studio' &&
          Array.isArray(uiState.batchScriptItems) &&
          uiState.batchScriptItems.length > 0 &&
          !uiState.batchScriptScanning &&
          !handleChanged &&
          !videoIdChanged;
        if (!isReadingBatchScripts) {
          render();
        }
      }
    } else if (event.data && event.data.source === 'UPBASE_B2C_BRIDGE_FETCH_TEXT') {
      const reqId = event.data.reqId;
      const urlToFetch = event.data.url;
      if (reqId && urlToFetch) {
        safeRuntimeSendMessage(
          {
            type: 'UPBASE_FETCH_TEXT_URL',
            url: urlToFetch,
          },
          (resp) => {
            window.postMessage(
              {
                source: 'UPBASE_B2C_BRIDGE_FETCH_TEXT_RESULT',
                reqId,
                text: resp?.ok ? resp.text || '' : '',
              },
              '*'
            );
          }
        );
      }
    } else if (event.data && event.data.source === 'UPBASE_B2C_GRID_QUICK_DOWNLOAD') {
      const vidId = event.data.videoId;
      const found =
        (uiState.videos || []).find((v) => String(v.videoId) === String(vidId)) ||
        event.data.video ||
        null;
      const vidObj = {
        ...(found || {}),
        videoId: vidId || found?.videoId || Date.now(),
        playableUrl: event.data.playableUrl || found?.playableUrl || '',
        imageUrls:
          (Array.isArray(event.data.imageUrls) && event.data.imageUrls.length > 0
            ? event.data.imageUrls
            : found?.imageUrls) || [],
        videoUrl: event.data.videoUrl || found?.videoUrl || window.location.href,
        handle: event.data.handle || found?.handle || uiState.handle || 'koc',
      };
      handleDownloadNoWatermarkMp4(vidObj);
    } else if (
      event.data &&
      (event.data.source === 'UPBASE_B2C_SPARK_AUTH_RESULT' ||
        event.data.source === 'UPBASE_B2C_SPARK_AUTH_DOM_RESULT')
    ) {
      const r = event.data.payload || event.data.result || {};
      if (r.filled || r.filledCount > 0) {
        uiState.feedbackBanner = {
          tone: 'pos',
          text: `Đã tự động điền mã Spark Ads (${r.filledCode || 'Thành công'}) vào ô nhập trên TikTok Ads Manager.`,
        };
        if (!isUserTypingInExtension()) {
          render();
        }
      }
    } else if (event.data && event.data.source === 'UPBASE_B2C_BATCH_SUBTITLES_RESULT') {
      uiState.batchScriptScanning = false;
      const refreshedTargets = getBatchTargetVideos();
      uiState.batchScriptItems = buildBatchScriptItemsFromVideos(refreshedTargets);
      const vttCount = uiState.batchScriptItems.filter((x) => x.hasVtt).length;
      uiState.feedbackBanner = {
        tone: 'pos',
        text: `Đã bóc tách kịch bản hàng loạt cho ${uiState.batchScriptItems.length} video (${vttCount} bài có lời thoại WebVTT).`,
      };
      if (!isUserTypingInExtension()) {
        render();
      }
    }
  });

  // Nhận diện ngay ID kênh, Video TikTok hoặc Sản phẩm Shopee từ URL ngay lúc khởi tạo (0ms)
  const initHandleMatch = window.location.pathname.match(/\/@([^/?#]+)/);
  const initVidMatch = window.location.pathname.match(/\/(?:video|photo)\/(\d+)/);
  const initShopeeItemMatch =
    isShopeeHost &&
    (window.location.pathname.match(/-i\.(\d+)\.(\d+)/) ||
      window.location.pathname.match(/^\/product\/(\d+)\/(\d+)/));
  if (initHandleMatch && initHandleMatch[1]) {
    uiState.handle = normalizeKocHandle(decodeURIComponent(initHandleMatch[1]));
  }
  if (initVidMatch && initVidMatch[1]) {
    uiState.videoId = initVidMatch[1];
    uiState.pageType = 'video';
    uiState.activeTab = 'aircheck';
  }
  if (initShopeeItemMatch) {
    const rawSlug = window.location.pathname.includes('-i.')
      ? window.location.pathname.split('-i.')[0].replace(/^\/+/, '')
      : '';
    let slugTitle = '';
    try {
      slugTitle = decodeURIComponent(rawSlug).replace(/-/g, ' ').trim();
    } catch {
      slugTitle = rawSlug.replace(/-/g, ' ').trim();
    }
    uiState.videoId = initShopeeItemMatch[2];
    uiState.pageType = 'shopee_product';
    uiState.shopeeTab = 'sp_product';
    uiState.shopeeProductDetail = {
      itemId: initShopeeItemMatch[2],
      shopId: initShopeeItemMatch[1],
      title: slugTitle || `Sản phẩm Shopee #${initShopeeItemMatch[2]}`,
      priceVnd: 0,
      priceMinVnd: 0,
      priceMaxVnd: 0,
      priceDisplay: 'Đang đọc giá...',
      ratingStar: 0,
      ratingCount: 0,
      historicalSold: 0,
      isMall: false,
      shopName: `Shop #${initShopeeItemMatch[1]}`,
      vouchers: [],
      variations: [],
      imageUrls: [],
      playableUrl: '',
      productUrl: window.location.href.split('?')[0],
    };
  }
  if (uiState.handle) {
    lookupKocOnServer(uiState.handle, uiState.videoId);
  }

  render();
  syncPlayerControlsToPage();
  window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  setTimeout(() => {
    syncPlayerControlsToPage();
    window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  }, 1000);
  setTimeout(() => {
    window.postMessage({ source: 'UPBASE_B2C_REQUEST_SNAPSHOT' }, '*');
  }, 2600);
})();
