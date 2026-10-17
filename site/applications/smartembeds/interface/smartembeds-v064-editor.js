/* Smart Embeds v0.6.4 — Tiptap node view, Invision Community 5.0.20.
 * Native in-document card; no overlays. Preview media is never saved.
 * A safe URL link plus optional layout data-* attributes is serialized.
 * Invision parser may strip the attributes unless whitelisted in Developer Center.
 */
(function () {
  'use strict';
  var NAME = 'smartEmbedsInline';
  var registered = false;
  var sdkCache = Object.create(null);
  var WIDTHS = {small:360,medium:500,large:740};
  var LIMITS = {instagram:658,twitter:550,facebook:700,tiktok:420,threads:658};

  // Invision can strip custom data-* attributes from saved posts. A small,
  // restricted layout token in the permalink fragment survives standard link
  // sanitization; fragments are never sent to the provider server. The
  // original fragment is preserved byte-for-byte on read/write.
  var LAYOUT_TOKEN = '__se_layout_v1_';
  var MAX_WIDTH = {instagram:658,twitter:550,facebook:700,tiktok:420,threads:658};
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
      align: ['left','center','right'].indexOf(align) !== -1 ? align : 'left',
      width: ['small','medium','large'].indexOf(width) !== -1 ? width : 'large'
    };
  }
  function pxFor(kind,width) {
    return Math.min(WIDTHS[width] || 658, LIMITS[kind] || 740);
  }
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

  function loadSdk(kind) {
    if (sdkCache[kind]) return sdkCache[kind];
    var src = {
      instagram: 'https://www.instagram.com/embed.js',
      facebook: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v25.0',
      threads: 'https://www.threads.com/embed.js',
      twitter: 'https://platform.twitter.com/widgets.js'
    }[kind];
    if (!src) return Promise.reject(new Error('No provider SDK'));
    if (kind === 'instagram' && window.instgrm && window.instgrm.Embeds) return Promise.resolve();
    if (kind === 'facebook' && window.FB && window.FB.XFBML) return Promise.resolve();
    if (kind === 'twitter' && window.twttr && window.twttr.widgets) return Promise.resolve();
    sdkCache[kind] = new Promise(function (resolve,reject) {
      var script = document.createElement('script');
      script.src=src;
      script.async=true;
      script.onload=resolve;
      script.onerror=function () { sdkCache[kind]=null; reject(new Error('SDK unavailable')); };
      document.head.appendChild(script);
    });
    return sdkCache[kind];
  }
  function fallback(panel,match) {
    panel.replaceChildren();
    var link=document.createElement('a');
    link.href=match.url;
    link.textContent='Preview unavailable — open '+match.kind;
    link.target='_blank';
    link.rel='noopener noreferrer nofollow';
    panel.appendChild(link);
  }
  function instagramHeight(match,width) {
    // Cross-origin Instagram frames cannot be measured from the parent.
    // Reserve the expected height, with an expand control for long captions.
    var isReel=/\/reel\//.test(new URL(match.url).pathname);
    return Math.max(isReel ? 760 : 680,
      Math.round(width*(isReel ? 1.43 : 1.22)+(isReel ? 110 : 100)));
  }
  function renderPreview(panel,match,width) {
    panel.replaceChildren();
    if (match.embed) {
      var frame=document.createElement('iframe');
      frame.title=match.kind+' preview';
      frame.src=match.embed;
      frame.loading='lazy';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.setAttribute('allowfullscreen','');
      panel.appendChild(frame);
      return;
    }
    if (match.kind==='image') {
      var img=document.createElement('img'); img.alt='Linked image'; img.loading='lazy'; img.src=match.url;
      panel.appendChild(img); return;
    }
    if (match.kind==='video') {
      var video=document.createElement('video'); video.controls=true; video.preload='none';video.src=match.url;
      panel.appendChild(video);return;
    }
    if (match.kind==='instagram') {
      // Use Instagram's dedicated iframe endpoint.  An empty blockquote needs
      // embed.js to transform it, which failed inside the Invision editor.
      // Construct this URL only from the validated kind and shortcode.
      var found=new URL(match.url).pathname.match(/^\/(?:[\w.]+\/)?(reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
      if (!found) {fallback(panel,match);return;}
      var frame=document.createElement('iframe');
      frame.className='smartembeds-v064-instagram-frame';
      frame.src='https://www.instagram.com/'+found[1]+'/'+found[2]+'/embed/captioned/';
      frame.title='Instagram '+(found[1]==='reel' ? 'Reel' : 'post')+' preview';
      frame.loading='lazy';
      frame.referrerPolicy='strict-origin-when-cross-origin';
      frame.setAttribute('allowfullscreen','');
      frame.setAttribute('allow','encrypted-media; picture-in-picture; fullscreen');
      frame.setAttribute('scrolling','auto');
      frame.style.width='100%';
      frame.style.height=instagramHeight(match,width)+'px';
      panel.appendChild(frame);
      return;
    }
    if (match.kind==='facebook') {
      var fb=document.createElement('div');
      fb.className=/\/(?:reel|videos)\//.test(new URL(match.url).pathname)?'fb-video':'fb-post';
      fb.setAttribute('data-href',match.url);
      fb.setAttribute('data-width',String(Math.min(width,700)));
      fb.setAttribute('data-show-text','true');
      panel.appendChild(fb);
      loadSdk('facebook').then(function () {
        if (panel.isConnected && panel.contains(fb) && window.FB && window.FB.XFBML) window.FB.XFBML.parse(panel);
      }).catch(function () { if (panel.contains(fb)) fallback(panel,match); });
      return;
    }
    if (match.kind==='threads') {
      var thread=document.createElement('blockquote');
      thread.className='text-post-media';
      thread.setAttribute('data-text-post-permalink',match.url);
      panel.appendChild(thread);
      loadSdk('threads').catch(function () { if(panel.contains(thread)) fallback(panel,match); });
      return;
    }
    if (match.kind==='twitter') {
      var id=new URL(match.url).pathname.match(/\/status\/(\d+)/);
      if (!id) {fallback(panel,match);return;}
      var msg=document.createElement('span');msg.textContent='Loading X post…';panel.appendChild(msg);
      loadSdk('twitter').then(function () {
        if (!panel.isConnected || !panel.contains(msg)) return;
        if (!window.twttr || !window.twttr.widgets || !window.twttr.widgets.createTweet) throw new Error('Widget unavailable');
        panel.replaceChildren();
        return window.twttr.widgets.createTweet(id[1],panel,{dnt:true,align:'left',width:Math.min(width,550)});
      }).then(function (node) {if (!node && panel.isConnected) fallback(panel,match);})
        .catch(function () {fallback(panel,match);});
      return;
    }
    fallback(panel,match);
  }

  if (!document.getElementById('smartembeds-v064-style')) {
    var style=document.createElement('style');
    style.id='smartembeds-v064-style';
    style.textContent=[
      '.smartembeds-v064-node{display:block;width:100%;box-sizing:border-box;position:relative;margin:12px 0;}',
      '.smartembeds-v064-surface{box-sizing:border-box;width:100%;min-width:0;border:1px solid #cbd3df;border-radius:9px;padding:8px;background:var(--i-background_1,#fff);}',
      '.smartembeds-v064-node[data-align="center"] .smartembeds-v064-surface{margin-left:auto;margin-right:auto}',
      '.smartembeds-v064-node[data-align="right"] .smartembeds-v064-surface{margin-left:auto;margin-right:0}',
      '.smartembeds-v064-node[data-align="left"] .smartembeds-v064-surface{margin-left:0;margin-right:auto}',
      '.smartembeds-v064-node.ProseMirror-selectednode .smartembeds-v064-surface{outline:2px solid #4678e0}',
      '.smartembeds-v064-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 8px}',
      '.smartembeds-v064-label{font:600 11px/1.4 system-ui,sans-serif;text-transform:uppercase;color:#68778e;margin-right:8px}',
      '.smartembeds-v064-toolbar button{font:12px/1.4 system-ui,sans-serif;cursor:pointer;background:transparent;color:inherit;border:1px solid #cbd3df;border-radius:5px;padding:3px 7px}',
      '.smartembeds-v064-toolbar button[aria-pressed="true"]{background:#dde8ff;border-color:#6a8ad3;color:#243c73}',
      '.smartembeds-v064-toolbar .smartembeds-v064-edit{margin-left:auto}',
      '.smartembeds-v064-toolbar button[hidden]{display:none!important}',
      '.smartembeds-v064-preview{width:100%;min-width:0;overflow:visible;position:relative;}',
      '.smartembeds-v064-preview iframe{display:block;max-width:100%;border:0}',
      '.smartembeds-v064-preview:not(.smartembeds-v064-instagram):not(.smartembeds-v064-facebook):not(.smartembeds-v064-threads):not(.smartembeds-v064-twitter) iframe{width:100%;height:auto;aspect-ratio:16/9}',
      '.smartembeds-v064-instagram{overflow:visible!important}',
      '.smartembeds-v064-instagram blockquote.instagram-media{box-sizing:border-box;margin:0!important;min-width:0!important;width:100%!important;max-width:658px!important}',
      '.smartembeds-v064-instagram iframe{aspect-ratio:auto!important;max-width:100%!important;min-width:0!important;display:block;border:0;width:100%;}',
      '.smartembeds-v064-facebook iframe,.smartembeds-v064-threads iframe,.smartembeds-v064-twitter iframe{aspect-ratio:auto!important}',
      '.smartembeds-v064-tiktok iframe{height:740px!important;aspect-ratio:auto!important}',
      '.smartembeds-v064-spotify iframe{height:352px!important;aspect-ratio:auto!important}',
      '.smartembeds-v064-soundcloud iframe{height:166px!important;aspect-ratio:auto!important}',
      '.smartembeds-v064-preview img,.smartembeds-v064-preview video{display:block;max-width:100%;height:auto;max-height:800px}',
      '@media(max-width:500px){.smartembeds-v064-surface{padding:5px}.smartembeds-v064-toolbar{gap:3px}.smartembeds-v064-tiktok iframe{height:590px!important}}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(style);
  }

  function register() {
    if (registered) return true;
    if (!window.ips || !ips.ui || !ips.ui.editorv5 ||
        typeof ips.ui.editorv5.registerNode!=='function' ||
        typeof ips.ui.editorv5.registerExtension!=='function') return false;
    registered=true;
    window.__smartEmbedsV064Registered=true;

    ips.ui.editorv5.registerNode(NAME,{
      priority:900,
      group:'block',
      atom:true,
      selectable:true,
      draggable:true,
      isolating:true,
      addAttributes:function () {
        return {url:{default:null},align:{default:'left'},width:{default:'large'}};
      },
      parseHTML:function () {
        return [{tag:'p',getAttrs:function (el) {
          if (el.children.length!==1 || el.firstElementChild.tagName!=='A') return false;
          var a=el.firstElementChild;
          var href=a.getAttribute('href') || '';
          var stored=readLayoutLink(href);
          var match=classify(stored.url);
          // The visible text must be a URL, not an arbitrary captioned link.
          var visible=a.textContent.trim();
          if (!match || (visible!==href && visible!==stored.url) ||
              el.textContent.trim()!==visible) return false;
          var align=el.getAttribute('data-smartembeds-align') || a.getAttribute('data-smartembeds-align') || stored.align;
          var width=el.getAttribute('data-smartembeds-width') || a.getAttribute('data-smartembeds-width') || stored.width;
          var layout=safeLayout(align,width);
          return {url:match.url,align:layout.align,width:layout.width};
        }}];
      },
      renderHTML:function (props) {
        var attrs=(props.node && props.node.attrs)||{};
        var match=classify(attrs.url||'');
        var url=match ? match.url : '';
        var layout=safeLayout(attrs.align,attrs.width);
        // Standard link is the fallback even if Invision strips our data attributes.
        return ['p',{'data-smartembeds-align':layout.align,'data-smartembeds-width':layout.width},
          ['a',{href:writeLayoutLink(url,layout.align,layout.width),
            'data-smartembeds-align':layout.align,'data-smartembeds-width':layout.width},url]];
      },
      addNodeView:function () {
        return function (props) {
          var current=props.node;
          var currentUrl=current.attrs.url || '';
          var host=document.createElement('div');
          host.className='smartembeds-v064-node';
          host.contentEditable='false';
          host.dataset.smartembedsInline='1';
          var surface=document.createElement('div');surface.className='smartembeds-v064-surface';
          var toolbar=document.createElement('div');toolbar.className='smartembeds-v064-toolbar';
          toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Smart Embed controls');
          var label=document.createElement('span');label.className='smartembeds-v064-label';toolbar.appendChild(label);
          var controls=[];
          function setAttrs(next) {
            try {
              var position=props.getPos();
              if (typeof position!=='number') return;
              var view=props.editor.view;
              var existing=view.state.doc.nodeAt(position);
              if (!existing || existing.type!==current.type) return;
              view.dispatch(view.state.tr.setNodeMarkup(position,undefined,Object.assign({},existing.attrs,next)));
            } catch (e) {console.warn('Smart Embeds: could not update node',e);}
          }
          function button(text,title,onClick,part,value) {
            var b=document.createElement('button');b.type='button';b.textContent=text;b.title=title;
            b.setAttribute('aria-label',title);
            if (part) { b.dataset.control=part;b.dataset.value=value;controls.push(b); }
            b.addEventListener('mousedown',function (e) {e.preventDefault();});
            b.addEventListener('click',function (e) {e.preventDefault();e.stopPropagation();onClick();});
            toolbar.appendChild(b);return b;
          }
          ['left','center','right'].forEach(function (align) {
            button({left:'⇤',center:'≡',right:'⇥'}[align],'Align '+align,function(){setAttrs({align:align});},'align',align);
          });
          ['small','medium','large'].forEach(function (width) {
            button({small:'S',medium:'M',large:'L'}[width],width+' width',function(){setAttrs({width:width});},'width',width);
          });
          var expanded=false;
          var expand=button('↕','Expand or shrink Instagram preview',function () {
            expanded=!expanded;
            var frame=preview.querySelector('.smartembeds-v064-instagram-frame');
            var matched=classify(current.attrs.url||'');
            if (frame && matched) frame.style.height=(instagramHeight(matched,pxFor(matched.kind,safeLayout(current.attrs.align,current.attrs.width).width))+(expanded?380:0))+'px';
            expand.setAttribute('aria-pressed',String(expanded));
          });
          expand.className+=' smartembeds-v064-expand';
          var edit=button('Edit URL','Convert embed back to editable URL',function () {
            try {
              var position=props.getPos();
              if (typeof position!=='number') return;
              var url=current.attrs.url||'';
              props.editor.commands.insertContentAt({from:position,to:position+current.nodeSize},
                {type:'paragraph',content:[{type:'text',text:url}]});
              props.editor.commands.focus();
            } catch (e) {console.warn('Smart Embeds: could not edit URL',e);}
          });
          edit.className+=' smartembeds-v064-edit';
          button('×','Remove embed',function () {
            try {
              var pos=props.getPos();
              if(typeof pos!=='number') return;
              props.editor.commands.deleteRange({from:pos,to:pos+current.nodeSize});
              props.editor.commands.focus();
            } catch (e) {console.warn('Smart Embeds: could not remove node',e);}
          });
          var preview=document.createElement('div');preview.className='smartembeds-v064-preview';
          surface.appendChild(toolbar);surface.appendChild(preview);host.appendChild(surface);
          function apply(node,rebuild) {
            var layout=safeLayout(node.attrs.align,node.attrs.width);
            var match=classify(node.attrs.url||'');
            host.dataset.align=layout.align;
            host.dataset.width=layout.width;
            label.textContent=match ? match.kind : 'LINK';
            expand.hidden=!(match && match.kind==='instagram');
            surface.style.maxWidth=pxFor(match ? match.kind : '',layout.width)+'px';
            controls.forEach(function (b){b.setAttribute('aria-pressed',String(layout[b.dataset.control]===b.dataset.value));});
            if (rebuild) {
              expanded=false;expand.setAttribute('aria-pressed','false');
              preview.className='smartembeds-v064-preview '+(match ? 'smartembeds-v064-'+match.kind : '');
              preview.replaceChildren();
              if (match) requestAnimationFrame(function(){if(host.isConnected) renderPreview(preview,match,pxFor(match.kind,layout.width));});
            }
          }
          apply(current,true);
          return {
            dom:host,
            update:function (node) {
              if (node.type!==current.type) return false;
              var rebuild=(node.attrs.url!==current.attrs.url || node.attrs.width!==current.attrs.width);
              current=node;
              apply(node,rebuild);
              return true;
            },
            stopEvent:function (e) {
              return !!(e.target && typeof e.target.closest==='function' &&
                e.target.closest('.smartembeds-v064-toolbar, iframe, video, a, .instagram-media'));
            },
            ignoreMutation:function (mutation) {
              return !!(mutation.target && host.contains(mutation.target));
            }
          };
        };
      }
    });

    // Paste one or several standalone media URLs into an empty paragraph.
    ips.ui.editorv5.registerExtension('smartEmbedsPasteV064',{
      onCreate:function () {
        var editor=this.editor;
        var dom=editor && editor.view && editor.view.dom;
        if (!dom) return;
        function handle(event) {
          if (!event.clipboardData || event.defaultPrevented || editor.isDestroyed || !editor.isEditable) return;
          var data=event.clipboardData.getData('text/plain');
          if (!data || data.length>6000) return;
          var lines=data.replace(/\r/g,'').split('\n');
          var content=[],found=0;
          var nodeType=Object.keys(editor.schema.nodes).find(function(n){return n.endsWith(NAME);});
          if(!nodeType) return;
          for(var i=0;i<lines.length;i++) {
            var line=lines[i].trim();if(!line) continue;
            var stored=readLayoutLink(line);
            var match=classify(stored.url);
            if(match) {
              found++;
              content.push({type:nodeType,attrs:{url:match.url,align:stored.align,width:stored.width}});
            } else {
              if (lines.length===1 || line.length>160 || /https?:\/\//.test(line)) return;
              content.push({type:'paragraph',content:[{type:'text',text:line}]});
            }
          }
          if(!found || found>8) return;
          var selection=editor.state.selection;
          if(!selection.empty || selection.$from.parent.type.name!=='paragraph' || selection.$from.parent.textContent.trim()) return;
          content.push({type:'paragraph'});
          event.preventDefault();
          event.stopImmediatePropagation();
          editor.chain().focus().insertContent(content).run();
        }
        dom.addEventListener('paste',handle,true);
        this.storage.smartembedsV06Listener={dom:dom,handler:handle};
      },
      onDestroy:function () {
        var listen=this.storage && this.storage.smartembedsV06Listener;
        if(listen && listen.dom) listen.dom.removeEventListener('paste',listen.handler,true);
      }
    });
    return true;
  }
  if (register()) return;
  var tries=0;
  var interval=setInterval(function(){if(register() || ++tries>=100) clearInterval(interval);},100);
})();
