/* Smart Embeds v0.5 native Tiptap preview prototype for Invision Community 5.
 * This file only affects the composer. Published-post rendering stays v0.4.2.
 * The editor node serializes to a regular paragraph with a linked URL.
 */
(function () {
  'use strict';
  function register() {
    if (window.__smartEmbedsV05Registered) return true;
    if (!window.ips || !window.ips.ui || !window.ips.ui.editorv5 ||
        typeof window.ips.ui.editorv5.registerNode !== 'function' ||
        typeof window.ips.ui.editorv5.registerExtension !== 'function') return false;
    window.__smartEmbedsV05Registered = true;

  var name = 'smartEmbedsInline';
  var sdkCache = {};
  function classify(raw) {
    var u;
    try { u = new URL(raw); } catch (_) { return null; }
    if (u.protocol !== 'https:' || u.username || u.password || u.port || raw.length > 2048) return null;
    var h = u.hostname.toLowerCase(), p = u.pathname, m, id;
    if (['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am'].includes(h) &&
        /^\/(?:[\w.]+\/)?(?:reel|p|tv)\/[\w-]+\/?$/.test(p)) return {kind:'instagram',url:u.href};
    if (['facebook.com','www.facebook.com','m.facebook.com'].includes(h) &&
        (/\/(?:posts|videos)\//.test(p) || /^\/(?:reel|watch)\//.test(p) || ['/story.php','/permalink.php'].includes(p)))
      return {kind:'facebook',url:u.href};
    if (['threads.com','www.threads.com','threads.net','www.threads.net'].includes(h) &&
        /^\/(?:@[\w.]+\/post\/[\w-]+|t\/[\w-]+)\/?$/.test(p)) return {kind:'threads',url:u.href};
    if (['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(h)) {
      if (h === 'youtu.be') { m=p.match(/^\/([A-Za-z0-9_-]{11})\/?$/); id=m && m[1]; }
      else if (p === '/watch') id=u.searchParams.get('v');
      else { m=p.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/); id=m && m[1]; }
      if (id && /^[\w-]{11}$/.test(id)) return {kind:'youtube',url:u.href,embed:'https://www.youtube-nocookie.com/embed/'+id};
    }
    if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(h)) {
      m=(h === 'player.vimeo.com' ? p.match(/^\/video\/(\d+)\/?$/) : p.match(/^\/(\d+)(?:\/([a-fA-F0-9]{6,32}))?\/?$/));
      if (m) {
        var hash=m[2] || u.searchParams.get('h') || '';
        if (!hash || /^[a-fA-F0-9]{6,32}$/.test(hash))
          return {kind:'vimeo',url:u.href,embed:'https://player.vimeo.com/video/'+m[1]+(hash?'?h='+hash:'')};
      }
    }
    if (['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(h)) {
      m=p.match(/^\/@[\w.-]+\/(?:video|photo)\/(\d{10,25})\/?$/);
      if (m) return {kind:'tiktok',url:u.href,embed:'https://www.tiktok.com/player/v1/'+m[1]};
    }
    if (h === 'open.spotify.com') {
      m=p.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{15,30})\/?$/);
      if (m) return {kind:'spotify',url:u.href,embed:'https://open.spotify.com/embed/'+m[1]+'/'+m[2]};
    }
    if (['soundcloud.com','www.soundcloud.com'].includes(h) &&
        /^\/[A-Za-z0-9_-]+\/(?:sets\/)?[A-Za-z0-9_-]+\/?$/.test(p))
      return {kind:'soundcloud',url:u.href,embed:'https://w.soundcloud.com/player/?url='+encodeURIComponent('https://soundcloud.com'+p)+'&auto_play=false'};
    if (['giphy.com','www.giphy.com'].includes(h)) {
      m=p.match(/^\/(?:gifs\/(?:[\w-]+-)?([A-Za-z0-9]{5,30})|embed\/([A-Za-z0-9]{5,30}))\/?$/);
      if (m) return {kind:'giphy',url:u.href,embed:'https://giphy.com/embed/'+(m[1]||m[2])};
    }
    if (['streamable.com','www.streamable.com'].includes(h)) {
      m=p.match(/^\/([A-Za-z0-9]{4,15})\/?$/);
      if (m) return {kind:'streamable',url:u.href,embed:'https://streamable.com/e/'+m[1]};
    }
    if (['twitter.com','www.twitter.com','mobile.twitter.com','x.com','www.x.com'].includes(h) &&
        /^\/[A-Za-z0-9_]{1,15}\/status\/\d{5,25}\/?$/.test(p)) return {kind:'twitter',url:u.href};
    if (['bsky.app','www.bsky.app'].includes(h) &&
        /^\/profile\/(?:[A-Za-z0-9.-]+|did:plc:[a-z2-7]+)\/post\/[A-Za-z0-9]+\/?$/.test(p)) return {kind:'bluesky',url:u.href};
    if (/\.(?:png|jpe?g|gif|webp|avif)$/i.test(p)) return {kind:'image',url:u.href};
    if (/\.(?:mp4|webm)$/i.test(p)) return {kind:'video',url:u.href};
    return null;
  }

  // The official SDKs need only our validated permalink: never insert remote HTML
  // from an oEmbed response directly into the editable document.
  function loadSdk(kind) {
    if (sdkCache[kind]) return sdkCache[kind];
    var scripts = {
      instagram: 'https://www.instagram.com/embed.js',
      facebook: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0',
      threads: 'https://www.threads.com/embed.js'
    };
    var src = scripts[kind];
    if (!src) return Promise.reject(new Error('Unknown SDK'));
    sdkCache[kind] = new Promise(function (resolve, reject) {
      var already = document.querySelector('script[src="'+src.replace(/&/g,'&')+'"]');
      if (already && (kind === 'instagram' && window.instgrm || kind === 'facebook' && window.FB)) { resolve(); return; }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return sdkCache[kind];
  }

  function renderPreview(host, matched) {
    var panel = document.createElement('div');
    panel.className = 'smartembeds-v05-preview smartembeds-v05-' + matched.kind;
    host.appendChild(panel);
    if (matched.embed) {
      var frame=document.createElement('iframe');
      frame.src=matched.embed;
      frame.title=matched.kind+' preview';
      frame.loading='lazy';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.setAttribute('allowfullscreen','');
      panel.appendChild(frame);
      return;
    }
    if (matched.kind === 'image') {
      var img=document.createElement('img');
      img.alt='Image preview'; img.loading='lazy'; img.src=matched.url;
      panel.appendChild(img); return;
    }
    if (matched.kind === 'video') {
      var video=document.createElement('video');
      video.controls=true; video.preload='none'; video.src=matched.url;
      panel.appendChild(video); return;
    }
    if (matched.kind === 'instagram') {
      var instagram=document.createElement('blockquote');
      instagram.className='instagram-media';
      instagram.setAttribute('data-instgrm-permalink',matched.url);
      instagram.setAttribute('data-instgrm-version','14');
      panel.appendChild(instagram);
      loadSdk('instagram').then(function () {
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
      }).catch(function () {panel.textContent='Instagram preview unavailable';});
    } else if (matched.kind === 'facebook') {
      var fb=document.createElement('div');
      fb.className = /\/(?:reel|videos)\//.test(new URL(matched.url).pathname) ? 'fb-video' : 'fb-post';
      fb.setAttribute('data-href', matched.url);
      fb.setAttribute('data-width','660');
      fb.setAttribute('data-show-text','true');
      panel.appendChild(fb);
      loadSdk('facebook').then(function () {
        if (window.FB && window.FB.XFBML) window.FB.XFBML.parse(panel);
      }).catch(function () { panel.textContent='Facebook preview unavailable'; });
    } else if (matched.kind === 'threads') {
      var thread=document.createElement('blockquote');
      thread.className='text-post-media';
      thread.setAttribute('data-text-post-permalink',matched.url);
      panel.appendChild(thread);
      loadSdk('threads').catch(function () { panel.textContent='Threads preview unavailable'; });
    } else {
      panel.textContent='Preview will appear after posting';
    }
  }

  if (!document.getElementById('smartembeds-v05-style')) {
    var style=document.createElement('style');
    style.id='smartembeds-v05-style';
    style.textContent=[
      '.smartembeds-v05-node{box-sizing:border-box;display:block;max-width:740px;width:100%;margin:10px 0;padding:8px;border:1px solid var(--i-border-color,#d9dfe7);border-radius:8px;background:var(--i-background_1,#fff);overflow:hidden}',
      '.smartembeds-v05-preview{width:100%;max-width:100%;min-height:48px;overflow:hidden}',
      '.smartembeds-v05-preview iframe{display:block;width:100%;height:auto;aspect-ratio:16/9;border:0;max-width:100%}',
      '.smartembeds-v05-instagram{max-width:658px}',
      '.smartembeds-v05-instagram blockquote.instagram-media{min-width:0!important;max-width:658px!important;width:100%!important;margin:0!important}',
      '.smartembeds-v05-facebook{max-width:700px}',
      '.smartembeds-v05-tiktok iframe{width:min(100%,420px);height:690px;aspect-ratio:auto}',
      '.smartembeds-v05-spotify iframe{height:352px;aspect-ratio:auto}',
      '.smartembeds-v05-soundcloud iframe{height:166px;aspect-ratio:auto}',
      '.smartembeds-v05-preview img,.smartembeds-v05-preview video{display:block;max-width:100%;height:auto;max-height:680px}',
      '.smartembeds-v05-node .smartembeds-v05-edit{font:inherit;font-size:12px;cursor:pointer;margin:6px 0 0;padding:3px 8px;border:1px solid #aaa;border-radius:4px;background:transparent}',
      '@media(max-width:500px){.smartembeds-v05-node{padding:4px}.smartembeds-v05-tiktok iframe{height:590px}}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(style);
  }

  ips.ui.editorv5.registerNode(name, {
    priority: 900,
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,
    isolating: true,
    addAttributes: function () {
      return {url:{default:null}};
    },
    parseHTML: function () {
      return [{tag:'p', getAttrs:function (element) {
        if (element.children.length !== 1) return false;
        var anchor=element.firstElementChild;
        if (!anchor || anchor.tagName !== 'A') return false;
        if (element.textContent.trim() !== anchor.textContent.trim()) return false;
        var match=classify(anchor.getAttribute('href')||'');
        if (!match || anchor.textContent.trim() !== anchor.getAttribute('href')) return false;
        return {url:match.url};
      }}];
    },
    renderHTML: function (attrs) {
      var url=(attrs.node && attrs.node.attrs && attrs.node.attrs.url)||'';
      // Saved content is standard paragraph/link HTML, not a custom node or iframe.
      return ['p',{},['a',{href:url},url]];
    },
    addNodeView: function () {
      return function (props) {
        var url=(props.node.attrs && props.node.attrs.url)||'';
        var match=classify(url);
        var host=document.createElement('div');
        host.className='smartembeds-v05-node';
        host.contentEditable='false';
        host.dataset.smartembedsInline='1';
        if (match) renderPreview(host,match);
        else host.textContent=url;
        var edit=document.createElement('button');
        edit.type='button';
        edit.className='smartembeds-v05-edit';
        edit.textContent='Edit URL';
        edit.addEventListener('mousedown',function(e){e.preventDefault();});
        edit.addEventListener('click',function(e){
          e.preventDefault();
          try {
            props.editor.commands.insertContentAt({from:props.getPos(),to:props.getPos()+props.node.nodeSize},{type:'paragraph',content:[{type:'text',text:url}]});
            props.editor.commands.focus();
          } catch (_) { /* Keep the existing node if editing fails. */ }
        });
        host.appendChild(edit);
        return {dom:host,stopEvent:function(event){return !!(event.target && typeof event.target.closest === 'function' && event.target.closest('button, iframe, video, a'));}};
      };
    }
  });

  ips.ui.editorv5.registerExtension('smartEmbedsPaste', {
    onCreate: function () {
      var editor=this.editor;
      var view=editor && editor.view;
      if (!view || !view.dom) return;
      var paste=function (event) {
        if (!event.clipboardData || event.defaultPrevented) return;
        if (editor.isDestroyed || editor.isEditable === false) return;
        var raw=event.clipboardData.getData('text/plain');
        if (!raw || raw.length>6000) return;
        var lines=raw.replace(/\r/g,'').split('\n');
        var found=0, content=[];
        for (var i=0;i<lines.length;i++) {
          var trimmed=lines[i].trim();
          if (!trimmed) continue;
          var match=classify(trimmed);
          if (match) {
            found++;
            content.push({type: Object.keys(editor.schema.nodes).find(function (n) { return n.endsWith(name); }),attrs:{url:match.url}});
          } else {
            if (lines.length===1 || trimmed.length>160 || /https?:\/\//.test(trimmed)) return;
            content.push({type:'paragraph',content:[{type:'text',text:trimmed}]});
          }
        }
        if (found<1 || found>8 || !content.length || content.some(function(x){return !x.type;})) return;
        var selection=editor.state.selection;
        // Do not replace existing text, selections, headings or code blocks.
        if (!selection.empty || selection.$from.parent.type.name!=='paragraph' || selection.$from.parent.textContent.trim()) return;
        content.push({type:'paragraph'});
        event.preventDefault();
        event.stopImmediatePropagation();
        editor.chain().focus().insertContent(content).run();
      };
      view.dom.addEventListener('paste',paste,true);
      this.storage.smartembedsPasteListener={dom:view.dom,handler:paste};
    },
    onDestroy: function () {
      var item=this.storage && this.storage.smartembedsPasteListener;
      if (item && item.dom) item.dom.removeEventListener('paste',item.handler,true);
    }
  });
  return true;
  }
  if (register()) return;
  // The Loader can run before Invision's asynchronous editor bundle is ready.
  var attempts = 0;
  var timer = setInterval(function () {
    attempts++;
    if (register() || attempts >= 100) clearInterval(timer);
  }, 100);
})();
