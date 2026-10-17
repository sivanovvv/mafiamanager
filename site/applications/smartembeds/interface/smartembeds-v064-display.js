/* Smart Embeds v0.4.2 stable embeds and legacy video repair for Invision Community 5.0.20
 * Progressive enhancement: never alters stored post HTML; leaves URLs on failure.
 */
(function () {
  'use strict';

  if (window.__smartEmbedsStarted) return;
  window.__smartEmbedsStarted = true;

  var script = document.currentScript || document.querySelector('script[src*="/applications/smartembeds/interface/smartembeds.js"]');
  // Asset loaders may execute a script without a currentScript reference.
  // Use the forum origin as a fallback so initialization never silently stops.
  var base = window.location.origin;
  if (script && script.src) {
    var path = new URL(script.src, document.baseURI);
    var marker = '/applications/smartembeds/interface/';
    var markerPos = path.pathname.indexOf(marker);
    if (markerPos >= 0) base = path.origin + path.pathname.slice(0, markerPos);
  }
  var endpoint = base + '/index.php?app=smartembeds&module=embed&controller=resolve&url=';
  var sdkPromises = {};
  var scanPending = false;
  var exclude = "nav, header, footer, aside, blockquote, .ipsQuote, .ipsSpoiler, .smartembeds-card, [contenteditable], .ipsMenu, .ipsBreadcrumb";

  // Invision can strip custom data-* attributes from saved posts. A small,
  // restricted layout token in the permalink fragment survives standard link
  // sanitization; fragments are never sent to the provider server. The
  // original fragment is preserved byte-for-byte on read/write.
  var LAYOUT_TOKEN = '__se_layout_v1_';
  function readLayoutLink(raw) {
    var result={url:raw,align:'left',width:'large'};
    try {
      var u=new URL(raw);
      var re=/(?:^#|~)__se_layout_v1_(left|center|right)_(small|medium|large)$/;
      var found=u.hash.match(re);
      if (!found) return result;
      result.align=found[1];
      result.width=found[2];
      u.hash=u.hash.slice(0,found.index);
      result.url=u.href;
    } catch (_) { /* original text is still the fallback */ }
    return result;
  }
  function writeLayoutLink(raw,align,width) {
    var clean=readLayoutLink(raw);
    var layout=safeLayout(align,width);
    if (layout.align==='left' && layout.width==='large') return clean.url;
    try {
      var u=new URL(clean.url);
      u.hash=(u.hash ? u.hash+'~' : '#')+LAYOUT_TOKEN+layout.align+'_'+layout.width;
      return u.href;
    } catch (_) { return clean.url; }
  }

  function safeLayout(align,width) {
    return {
      align:['left','center','right'].includes(align) ? align : 'left',
      width:['small','medium','large'].includes(width) ? width : 'large'
    };
  }

  function layoutFor(anchor,parent) {
    var stored=readLayoutLink(anchor.href);
    var align=parent.getAttribute('data-smartembeds-align') || anchor.getAttribute('data-smartembeds-align') || stored.align;
    var width=parent.getAttribute('data-smartembeds-width') || anchor.getAttribute('data-smartembeds-width') || stored.width;
    return {url:stored.url,layout:safeLayout(align,width)};
  }
  function applyCardLayout(card,match,layout) {
    // No changes for existing/default embeds.
    if (!layout || (layout.align==='left' && layout.width==='large')) return;
    var limits={instagram:658,twitter:550,facebook:700,tiktok:420,threads:658};
    var sizes={small:360,medium:500,large:740};
    card.style.maxWidth=Math.min(sizes[layout.width],limits[match.type]||740)+'px';
    card.style.width='100%';
    card.style.marginLeft=layout.align==='left' ? '0' : 'auto';
    card.style.marginRight=layout.align==='right' ? '0' : (layout.align==='center' ? 'auto' : '0');
  }

  // The Loader currently enables JavaScript but not CSS on this installation.
  // Keep styles self-contained so they apply without touching the working Loader.
  if (!document.getElementById('smartembeds-v042-styles')) {
    var style = document.createElement('style');
    style.id = 'smartembeds-v042-styles';
    style.textContent = [
      '.smartembeds-card{box-sizing:border-box;width:100%;max-width:740px;margin:16px 0;overflow:hidden}',
      '.smartembeds-preview{width:100%;min-width:0;overflow:hidden}',
      '.smartembeds-card iframe{display:block;max-width:100%;border:0}',
      '.smartembeds-instagram{max-width:658px}',
      '.smartembeds-instagram blockquote.instagram-media{margin:0!important;width:100%!important;min-width:0!important;max-width:658px!important}',
      '.smartembeds-instagram iframe{width:100%!important;max-width:658px!important}',
      '.smartembeds-twitter{width:100%;max-width:550px}',
      '.smartembeds-facebook{max-width:700px}',
      '.smartembeds-facebook .fb-video,.smartembeds-facebook .fb-post{max-width:100%}',
      '.smartembeds-card.smartembeds-video{max-width:760px}',
      '.smartembeds-frame{display:block;width:100%;aspect-ratio:16/9;height:auto;min-height:220px;border:0;border-radius:8px}',
      '.smartembeds-tiktok .smartembeds-frame{width:min(100%,420px);height:740px;min-height:420px;aspect-ratio:auto}',
      '.smartembeds-giphy .smartembeds-frame{aspect-ratio:4/3;max-height:520px}',
      '.smartembeds-spotify .smartembeds-frame{height:352px;min-height:152px;aspect-ratio:auto}',
      '.smartembeds-soundcloud .smartembeds-frame{height:166px;min-height:166px;aspect-ratio:auto}',
      '.smartembeds-card.smartembeds-image{max-width:760px}',
      '.smartembeds-image img{display:block;max-width:100%;height:auto;border-radius:7px}',
      '.smartembeds-card.smartembeds-native-video video{display:block;width:100%;height:auto;max-height:600px}',
      '@media(max-width:500px){.smartembeds-tiktok .smartembeds-frame{width:100%;height:630px}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }
  // Invision 5 post markup varies with themes; avoid hard-coding IC4 classes.
  // We only act on a standalone social/image URL, never on navigation/editor links.

  function classify(address) {
    var url;
    try { url = new URL(address); } catch (_) { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.href.length > 2048) return null;
    var host = url.hostname.toLowerCase();
    var p = url.pathname;
    var m;
    if (/\.(?:png|jpe?g|gif|webp|avif)$/i.test(p)) return {type: 'image', url: url.href};
    if (/\.(?:mp4|webm)$/i.test(p)) return {type: 'native-video', url: url.href};
    if (['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'].includes(host)
        && /^\/(?:[\w.]+\/)?(?:p|reel|tv)\/[\w-]+\/?$/.test(p)) return {type: 'instagram', url: url.href};
    if (['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'].includes(host)
        && /^\/(?:@[\w.]+\/post\/[\w-]+|t\/[\w-]+)\/?$/.test(p)) return {type: 'threads', url: url.href};
    if (['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(host)
        && (/\/posts\//.test(p) || /\/videos\//.test(p) || /^\/(?:reel|watch)\//.test(p)
            || p === '/story.php' || p === '/permalink.php')) return {type: 'facebook', url: url.href};
    // Only fixed, provider-owned embed origins are used for iframes.
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      var id = null;
      if (host === 'youtu.be') { m = p.match(/^\/([A-Za-z0-9_-]{11})\/?$/); id = m && m[1]; }
      else if (p === '/watch') { id = url.searchParams.get('v'); }
      else { m = p.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/); id = m && m[1]; }
      if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
        return {type: 'youtube', url: url.href, embed: 'https://www.youtube-nocookie.com/embed/' + id};
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      m = host === 'player.vimeo.com' ? p.match(/^\/video\/(\d+)\/?$/) : p.match(/^\/(\d+)(?:\/([a-fA-F0-9]{6,32}))?\/?$/);
      if (m) {
        var hash = (m[2] || url.searchParams.get('h') || '');
        if (!hash || /^[a-fA-F0-9]{6,32}$/.test(hash))
          return {type: 'vimeo', url: url.href, embed: 'https://player.vimeo.com/video/' + m[1] + (hash ? '?h=' + hash : '')};
      }
    }
    if (['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(host)) {
      m = p.match(/^\/@[A-Za-z0-9._-]+\/(?:video|photo)\/(\d{10,25})\/?$/);
      if (m) return {type: 'tiktok', url: url.href, embed: 'https://www.tiktok.com/player/v1/' + m[1]};
    }
    if (host === 'open.spotify.com') {
      m = p.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{15,30})\/?$/);
      if (m) return {type: 'spotify', url: url.href, embed: 'https://open.spotify.com/embed/' + m[1] + '/' + m[2]};
    }
    if (['soundcloud.com', 'www.soundcloud.com'].includes(host)) {
      if (/^\/[A-Za-z0-9_-]+\/(?:sets\/)?[A-Za-z0-9_-]+\/?$/.test(p)) {
        var canonical = 'https://soundcloud.com' + p;
        return {type: 'soundcloud', url: url.href, embed: 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(canonical) + '&auto_play=false'};
      }
    }
    if (host === 'giphy.com' || host === 'www.giphy.com') {
      m = p.match(/^\/(?:gifs\/(?:[A-Za-z0-9_-]+-)?([A-Za-z0-9]{5,30})|embed\/([A-Za-z0-9]{5,30}))\/?$/);
      if (m) return {type: 'giphy', url: url.href, embed: 'https://giphy.com/embed/' + (m[1] || m[2])};
    }
    if (host === 'streamable.com' || host === 'www.streamable.com') {
      m = p.match(/^\/([A-Za-z0-9]{4,15})\/?$/);
      if (m) return {type: 'streamable', url: url.href, embed: 'https://streamable.com/e/' + m[1]};
    }
    if (['twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'x.com', 'www.x.com'].includes(host)) {
      m = p.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})\/?$/);
      if (m) return {type: 'twitter', url: url.href, id: m[2]};
    }
    if (host === 'bsky.app' || host === 'www.bsky.app') {
      if (/^\/profile\/(?:[A-Za-z0-9.-]+|did:plc:[a-z2-7]+)\/post\/[A-Za-z0-9]+\/?$/.test(p))
        return {type: 'bluesky', url: url.href};
    }
    return null;
  }

  function safeResource(raw) {
    try {
      var url = new URL(raw, document.baseURI);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch (_) { return null; }
  }

  // Never inject third-party scripts/iframes/HTML attributes supplied by oEmbed.
  // Only known Meta SDK scripts, inserted below, can execute.
  var allowed = new Set(['div', 'blockquote', 'a', 'p', 'span', 'small', 'strong', 'em', 'br', 'img']);
  var dataNames = new Set([
    'data-instgrm-permalink', 'data-instgrm-version', 'data-instgrm-captioned',
    'data-text-post-permalink', 'data-text-post-id', 'data-href', 'data-width',
    'data-height', 'data-show-text', 'data-layout',
    'data-bluesky-uri', 'data-bluesky-cid', 'data-bluesky-embed-color-mode'
  ]);
  var forbidden = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'link', 'meta']);

  function cleanNode(src, depth) {
    if (depth > 24) return null;
    if (src.nodeType === 3) return document.createTextNode(src.textContent || '');
    if (src.nodeType !== 1) return null;
    var name = src.tagName.toLowerCase();
    if (forbidden.has(name)) return null;
    if (!allowed.has(name)) return null;
    var dst = document.createElement(name);
    for (var i = 0; i < src.attributes.length; i++) {
      var attr = src.attributes[i];
      var key = attr.name.toLowerCase();
      var value = attr.value.slice(0, 2048);
      if (key === 'class' && /^[\w\s-]{1,200}$/.test(value)) {
        dst.className = value;
      } else if (dataNames.has(key)) {
        if (key === 'data-bluesky-uri') {
          if (/^at:\/\/(?:did:plc:[a-z2-7]+|did:web:[A-Za-z0-9._:%-]+)\/app\.bsky\.feed\.post\/[A-Za-z0-9]+$/.test(value)) dst.setAttribute(key, value);
        } else if (key === 'data-bluesky-cid') {
          if (/^[A-Za-z0-9]{20,120}$/.test(value)) dst.setAttribute(key, value);
        } else if (key === 'data-bluesky-embed-color-mode') {
          if (['system', 'light', 'dark'].includes(value)) dst.setAttribute(key, value);
        } else if (key.endsWith('permalink') || key === 'data-href') {
          var clean = safeResource(value);
          if (clean) dst.setAttribute(key, clean);
        } else if (/^[\w.\s-]{0,80}$/.test(value)) {
          dst.setAttribute(key, value);
        }
      } else if ((key === 'href' || key === 'src') && safeResource(value)) {
        dst.setAttribute(key, safeResource(value));
        if (key === 'href') { dst.setAttribute('target', '_blank'); dst.setAttribute('rel', 'noopener noreferrer nofollow'); }
        if (key === 'src' && name === 'img') dst.setAttribute('loading', 'lazy');
      } else if (key === 'alt' && name === 'img') {
        dst.setAttribute('alt', value);
      }
    }
    for (var child = src.firstChild; child; child = child.nextSibling) {
      var sanitized = cleanNode(child, depth + 1);
      if (sanitized) dst.appendChild(sanitized);
    }
    return dst;
  }

  function fromOEmbed(markup, provider) {
    var parsed = new DOMParser().parseFromString(markup, 'text/html');
    var root = null;
    if (provider === 'instagram') root = parsed.querySelector('blockquote.instagram-media');
    if (provider === 'threads') root = parsed.querySelector('blockquote');
    if (provider === 'facebook') root = parsed.querySelector('.fb-post, .fb-video');
    if (provider === 'bluesky') root = parsed.querySelector('blockquote.bluesky-embed');
    if (!root) return null;
    return cleanNode(root, 0);
  }

  function loadSdk(provider) {
    if (sdkPromises[provider]) return sdkPromises[provider];
    var src = {
      instagram: 'https://www.instagram.com/embed.js',
      facebook: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0',
      threads: 'https://www.threads.com/embed.js',
      bluesky: 'https://embed.bsky.app/static/embed.js',
      twitter: 'https://platform.twitter.com/widgets.js'
    }[provider];
    if (!src) return Promise.reject(new Error('Unknown provider'));
    sdkPromises[provider] = new Promise(function (resolve, reject) {
      var el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = resolve;
      el.onerror = function () { reject(new Error('Provider SDK blocked')); };
      document.head.appendChild(el);
    });
    return sdkPromises[provider];
  }

  function processSdk(provider, content) {
    return loadSdk(provider).then(function () {
      if (provider === 'instagram' && window.instgrm && window.instgrm.Embeds) {
        window.instgrm.Embeds.process();
      }
      if (provider === 'facebook' && window.FB && window.FB.XFBML) {
        window.FB.XFBML.parse(content);
      }
      // Threads initializes embedded blockquotes when embed.js is loaded.
    });
  }

  // The previous "Open on Instagram" link was app-added; platform-owned
  // controls inside external embeds are left untouched.
  function replaceNativeVideo(p, match, layout) {
    var box = document.createElement('div');
    box.className = 'smartembeds-card smartembeds-native-video';
    applyCardLayout(box, match, layout);
    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'none';
    video.playsInline = true;
    video.src = match.url;
    video.onerror = function () { box.replaceWith(p); };
    box.appendChild(video);
    p.replaceWith(box);
  }

  function replaceIframe(p, match, layout) {
    var box = document.createElement('div');
    box.className = 'smartembeds-card smartembeds-video smartembeds-' + match.type;
    applyCardLayout(box, match, layout);
    var frame = document.createElement('iframe');
    frame.className = 'smartembeds-frame';
    frame.src = match.embed;
    frame.title = match.type.charAt(0).toUpperCase() + match.type.slice(1) + ' embed';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
    frame.setAttribute('allowfullscreen', '');
    frame.onerror = function () { box.replaceWith(p); };
    box.appendChild(frame);
    p.replaceWith(box);
  }

  function replaceTweet(p, match, layout) {
    var box = document.createElement('div');
    box.className = 'smartembeds-card smartembeds-twitter';
    applyCardLayout(box, match, layout);
    box.textContent = 'Loading X post…';
    p.replaceWith(box);
    loadSdk('twitter').then(function () {
      if (!window.twttr || !window.twttr.widgets || !window.twttr.widgets.createTweet) throw new Error('Widget unavailable');
      box.textContent = '';
      var w=layout && layout.width!=='large' ? {small:360,medium:500}[layout.width] : 550;
      return window.twttr.widgets.createTweet(match.id, box, {dnt: true, align: 'left', width: w});
    }).then(function (rendered) { if (!rendered) throw new Error('Tweet unavailable'); })
      .catch(function () { box.replaceWith(p); });
  }

  function replaceImage(p, match, layout) {
    var box = document.createElement('figure');
    box.className = 'smartembeds-card smartembeds-image';
    applyCardLayout(box, match, layout);
    var imgLink = document.createElement('a');
    imgLink.href = match.url;
    imgLink.target = '_blank';
    imgLink.rel = 'noopener noreferrer nofollow';
    var img = document.createElement('img');
    img.src = match.url;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.alt = 'Linked image';
    img.onerror = function () { box.replaceWith(p); };
    imgLink.appendChild(img);
    box.appendChild(imgLink);
    p.replaceWith(box);
  }

  function resolveMeta(p, match, layout) {
    var card = document.createElement('div');
    card.className = 'smartembeds-card smartembeds-' + match.type;
    applyCardLayout(card, match, layout);
    var preview = document.createElement('div');
    preview.className = 'smartembeds-preview';
    preview.textContent = 'Loading ' + match.type + '…';
    card.appendChild(preview);
    p.replaceWith(card);
    fetch(endpoint + encodeURIComponent(match.url), {credentials: 'same-origin', headers: {Accept: 'application/json'}})
      .then(function (response) { if (!response.ok) throw new Error('Embed unavailable'); return response.json(); })
      .then(function (data) {
        if (!data.ok || data.provider !== match.type || typeof data.html !== 'string') throw new Error('Invalid response');
        var content = fromOEmbed(data.html, match.type);
        if (!content) throw new Error('Unsupported Meta markup');
        preview.textContent = '';
        // Facebook's SDK reads data-width when it builds the video iframe.
        // Changing iframe CSS afterwards is not reliable and can distort Reels.
        if (match.type === 'facebook') {
          var fbWidth=layout && layout.width!=='large' ? {small:360,medium:500}[layout.width] :
            (content.classList.contains('fb-video') ? 700 : 680);
          content.setAttribute('data-width', String(fbWidth));
          if (content.classList.contains('fb-video')) content.setAttribute('data-allowfullscreen', 'true');
        }
        preview.appendChild(content);
        return processSdk(match.type, preview);
      })
      .catch(function () { card.replaceWith(p); });
  }

  function examine(anchor) {
    if (anchor.dataset.smartembedsDone === '1') return;
    if (anchor.closest(exclude)) return;

    // Support both <p><a>URL</a></p> and Invision 5 <div><a>URL</a></div>.
    // Do not alter mixed text, multiple links or arbitrary inline hyperlinks.
    var parent = anchor.parentElement;
    if (!parent || !['P', 'DIV'].includes(parent.tagName)) return;
    if (parent.children.length !== 1 || parent.textContent.trim() !== anchor.textContent.trim()) return;
    var saved=layoutFor(anchor,parent);
    var match=classify(saved.url);
    if (!match) return;
    var target = parent.tagName === 'P' ? parent : anchor;

    anchor.dataset.smartembedsDone = '1';
    if (match.type === 'image') replaceImage(target, match, saved.layout);
    else if (match.type === 'native-video') replaceNativeVideo(target, match, saved.layout);
    else if (match.embed) replaceIframe(target, match, saved.layout);
    else if (match.type === 'twitter') replaceTweet(target, match, saved.layout);
    else resolveMeta(target, match, saved.layout);
  }

  // Repair a specific IC5 legacy attachment regression. Older video HTML may
  // contain <source src="https://forum.example/#t=0"> even though the real
  // attachment URL is already in the nested <a class="ipsAttachLink">.
  // This is intentionally read-only: it changes the browser's DOM, not the DB.
  function repairBrokenUploadedVideo(video) {
    if (video.dataset.smartembedsRepaired === '1') return;
    var fileId = video.getAttribute('data-fileid');
    if (!fileId || !/^\d+$/.test(fileId)) return;
    var source = video.querySelector('source[type^="video/"]');
    var fallback = video.querySelector('a.ipsAttachLink[href]');
    if (!source || !fallback) return;
    try {
      var broken = new URL(source.getAttribute('src') || '', document.baseURI);
      var origin = new URL(document.baseURI);
      // Only replace the known broken "forum homepage + time fragment" source.
      // Do not override normal media files, CDN URLs or valid attachments.
      if (broken.origin !== origin.origin || broken.pathname !== '/' ||
          !/^#t=(?:0(?:\.0+)?|\d+(?:\.\d+)?)$/.test(broken.hash)) return;
      var attachment = new URL(fallback.getAttribute('href'), document.baseURI);
      if (attachment.origin !== origin.origin || !attachment.pathname.endsWith('/applications/core/interface/file/attachment.php') ||
          attachment.searchParams.get('id') !== fileId || attachment.username || attachment.password || attachment.port) return;
      attachment.hash = broken.hash;
      source.setAttribute('src', attachment.href);
      video.dataset.smartembedsRepaired = '1';
      // Browsers do not always re-evaluate <source> changes automatically.
      if (typeof video.load === 'function') video.load();
    } catch (_) { /* leave the original source unchanged */ }
  }

  function scanBrokenVideos() {
    document.querySelectorAll('video.ipsEmbeddedVideo[data-fileid]').forEach(repairBrokenUploadedVideo);
  }

  // No overlays or direct DOM manipulation inside Tiptap/ProseMirror editors.
  // URLs remain editable text until a native editor extension is available.
  function scan() {
    scanPending = false;
    document.querySelectorAll('a[href]').forEach(examine);
    scanBrokenVideos();
  }

  function scheduleScan() {
    if (!scanPending) { scanPending = true; requestAnimationFrame(scan); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleScan, {once: true});
  } else {
    scheduleScan();
  }
  // Scan new replies loaded asynchronously; no post content is saved or changed.
  var observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {subtree: true, childList: true});
})();
