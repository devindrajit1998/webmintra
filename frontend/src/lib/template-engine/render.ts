import type {
  PageAnalysis,
  TemplateAnalysis,
  EditorState,
  ElementEdit,
  ThemeTokens,
} from "./types";

const PLACEHOLDER = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><text x="50%" y="50%" font-family="system-ui" font-size="26" fill="#0f172a" text-anchor="middle">${label}</text></svg>`,
  )}`;

const COLOR_TOKENS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "text",
  "muted",
  "border",
] as const;

export function defaultRepeaterItems(itemIds: string[]) {
  return itemIds.map((_, i) => ({ key: `i${i}`, srcIndex: i }));
}

function applyEdit(el: Element, edit: ElementEdit) {
  if (edit.className !== undefined) el.setAttribute("class", edit.className);
  if (edit.text !== undefined && el.children.length === 0) el.textContent = edit.text;
  else if (edit.text !== undefined) {
    const target = el.querySelector("span,strong,em") ?? el;
    if (target.children.length === 0) target.textContent = edit.text;
  }
  if (edit.src !== undefined) el.setAttribute("src", edit.src);
  if (edit.alt !== undefined) el.setAttribute("alt", edit.alt);
  if (edit.title !== undefined) el.setAttribute("title", edit.title);
  if (edit.href !== undefined) el.setAttribute("href", edit.href);
  if (edit.target !== undefined) el.setAttribute("target", edit.target);
  if (edit.loading !== undefined) el.setAttribute("loading", edit.loading);
  if (edit.placeholder !== undefined) el.setAttribute("placeholder", edit.placeholder);
  if (edit.poster !== undefined) el.setAttribute("poster", edit.poster);
  (["autoplay", "controls", "muted", "loop"] as const).forEach((a) => {
    const v = edit[a];
    if (v === undefined) return;
    if (v) el.setAttribute(a, "");
    else el.removeAttribute(a);
  });
  if (edit.fill)
    el.querySelectorAll("path,circle,rect,polygon").forEach((p) =>
      p.setAttribute("fill", edit.fill!),
    );
  if (edit.stroke)
    el.querySelectorAll("path,circle,rect,polygon").forEach((p) =>
      p.setAttribute("stroke", edit.stroke!),
    );
  if (edit.hidden)
    el.setAttribute("style", `${el.getAttribute("style") ?? ""};display:none !important`);
  if (edit.style) {
    const extra = Object.entries(edit.style)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    if (extra) el.setAttribute("style", `${el.getAttribute("style") ?? ""};${extra}`);
  }
}

function themeCss(t: ThemeTokens) {
  return `
    :root {
      --primary: ${t.primary};
      --color-primary: ${t.primary};
      --brand-primary: ${t.primary};
      --brand: ${t.primary};
      --secondary: ${t.secondary};
      --accent: ${t.accent};
      --background: ${t.background};
      --surface: ${t.surface};
      --text: ${t.text};
      --muted: ${t.muted};
      --border: ${t.border};
      --radius: ${t.radius};
    }
  `;
}

const BRIDGE = `
<style id="te-bridge-style" data-te-bridge-node>
  [data-te-id]:hover { outline: 2px dashed rgba(5, 150, 105, 0.85) !important; outline-offset: 2px; cursor: pointer; }
  [data-te-selected] { outline: 3px solid #059669 !important; outline-offset: 3px; position: relative; }
  [data-te-editing] { outline: 3px solid #ea580c !important; background: rgba(234, 88, 12, 0.08) !important; cursor: text !important; }
  
  /* Floating Quick Action Toolbar */
  #te-floating-bar {
    position: fixed;
    z-index: 2147483647;
    display: none;
    align-items: center;
    gap: 8px;
    background: #0f172a;
    color: #ffffff;
    padding: 8px 14px;
    border-radius: 16px;
    border: 2px solid #059669;
    box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.65), 0 0 0 2px rgba(5, 150, 105, 0.35);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 700;
    pointer-events: auto;
    transition: opacity 0.15s ease, transform 0.15s ease;
    user-select: none;
  }
  #te-floating-bar button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #1e293b;
    color: #ffffff;
    border: 1px solid #334155;
    padding: 7px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 800;
    line-height: 1;
    transition: all 0.15s ease;
  }
  #te-floating-bar button:hover {
    background: #334155;
    border-color: #64748b;
    transform: translateY(-1px);
  }
  #te-floating-bar button.te-primary-btn {
    background: #059669;
    color: #ffffff;
    border-color: #10b981;
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
  }
  #te-floating-bar button.te-primary-btn:hover {
    background: #047857;
    border-color: #059669;
    box-shadow: 0 6px 16px rgba(5, 150, 105, 0.6);
  }
  #te-floating-bar button.te-danger-btn {
    background: #450a0a;
    color: #fca5a5;
    border-color: #7f1d1d;
  }
  #te-floating-bar button.te-danger-btn:hover {
    background: #dc2626;
    color: #ffffff;
    border-color: #ef4444;
  }
  #te-floating-bar .te-divider {
    width: 1.5px;
    height: 24px;
    background: #334155;
    margin: 0 4px;
  }
  
  #te-repeater-add {
    position: fixed;
    z-index: 2147483647;
    display: none;
    align-items: center;
    gap: 6px;
    border: 2px solid #ffffff;
    border-radius: 12px;
    padding: 9px 18px;
    background: #059669;
    color: #fff;
    font: 800 13px/1 system-ui, sans-serif;
    box-shadow: 0 10px 25px rgba(5, 150, 105, 0.6);
    cursor: pointer;
    transition: transform 0.1s, background 0.15s;
  }
  #te-repeater-add:hover { background: #047857; transform: scale(1.04); }
</style>
<script data-te-bridge-node>
(function(){
  var sel = null;
  
  // Create Quick Action Toolbar
  var bar = document.createElement('div');
  bar.id = 'te-floating-bar';
  bar.setAttribute('data-te-bridge-node', '');
  document.body.appendChild(bar);

  // Hidden File Input for Direct 1-Click Image Replacement
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.setAttribute('data-te-bridge-node', '');
  document.body.appendChild(fileInput);

  var currentImageTargetId = null;
  fileInput.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file || !currentImageTargetId) return;
    var reader = new FileReader();
    reader.onload = function(evt){
      parent.postMessage({ source:'te', type:'image-replace', id: currentImageTargetId, dataUrl: evt.target.result }, '*');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Repeater Add Button
  var addButton = document.createElement('button');
  addButton.id = 'te-repeater-add';
  addButton.setAttribute('data-te-bridge-node', '');
  addButton.type = 'button';
  addButton.setAttribute('aria-label', 'Add repeater item');
  addButton.textContent = '+ Add Card / Item';
  document.body.appendChild(addButton);

  function idOf(el){
    while(el && el !== document.body){
      if(el.getAttribute && el.getAttribute('data-te-id')) return el.getAttribute('data-te-id');
      el = el.parentElement;
    }
    return null;
  }
  function repeaterItem(el){ return el && el.closest ? el.closest('[data-te-repeater-id][data-te-item]') : null; }

  function placeFloatingToolbar(el){
    if(!el){ bar.style.display = 'none'; return; }
    var rect = el.getBoundingClientRect();
    var tag = el.tagName.toLowerCase();
    var isImage = tag === 'img' || el.style.backgroundImage;
    var isLink = tag === 'a' || tag === 'button';
    var isHeading = /^h[1-6]$/.test(tag);
    var isText = tag === 'p' || tag === 'span' || tag === 'li' || isHeading || (!isImage && !isLink);

    var html = '';
    
    if(isText){
      html += '<button type="button" class="te-primary-btn" id="te-btn-edit-text">✏️ Edit Text</button>';
    }
    
    if(isImage){
      html += '<button type="button" class="te-primary-btn" id="te-btn-replace-img">📷 Replace Photo</button>';
    }

    if(isLink){
      html += '<button type="button" class="te-primary-btn" id="te-btn-edit-link">🔗 Edit Link</button>';
    }

    html += '<span class="te-divider"></span>';
    html += '<button type="button" id="te-btn-sidebar" title="Open Full Sidebar Settings">⚙️ More Styles</button>';
    html += '<button type="button" class="te-danger-btn" id="te-btn-hide" title="Hide this element from page">🗑️</button>';

    bar.innerHTML = html;
    bar.style.display = 'flex';

    // Position above element, or below if too close to top
    var barHeight = 48;
    var topPos = rect.top - barHeight - 12;
    if(topPos < 10){
      topPos = rect.bottom + 12;
    }
    var leftPos = Math.max(12, Math.min(window.innerWidth - bar.offsetWidth - 12, rect.left));
    bar.style.top = topPos + 'px';
    bar.style.left = leftPos + 'px';

    // Wire action clicks
    var btnEditText = bar.querySelector('#te-btn-edit-text');
    if(btnEditText){
      btnEditText.onclick = function(ev){
        ev.stopPropagation();
        startInlineEditing(el);
      };
    }

    var btnReplaceImg = bar.querySelector('#te-btn-replace-img');
    if(btnReplaceImg){
      btnReplaceImg.onclick = function(ev){
        ev.stopPropagation();
        currentImageTargetId = idOf(el);
        fileInput.click();
      };
    }

    var btnEditLink = bar.querySelector('#te-btn-edit-link');
    if(btnEditLink){
      btnEditLink.onclick = function(ev){
        ev.stopPropagation();
        var currentHref = el.getAttribute('href') || '';
        var newHref = prompt('Enter link destination (URL or #section):', currentHref);
        if(newHref !== null){
          parent.postMessage({ source:'te', type:'link-destination', id: idOf(el), href: newHref }, '*');
        }
      };
    }

    var btnSidebar = bar.querySelector('#te-btn-sidebar');
    if(btnSidebar){
      btnSidebar.onclick = function(ev){
        ev.stopPropagation();
        parent.postMessage({ source:'te', type:'open-tab', tab:'element', id: idOf(el) }, '*');
      };
    }

    var btnHide = bar.querySelector('#te-btn-hide');
    if(btnHide){
      btnHide.onclick = function(ev){
        ev.stopPropagation();
        parent.postMessage({ source:'te', type:'hide-element', id: idOf(el) }, '*');
        bar.style.display = 'none';
      };
    }
  }

  function startInlineEditing(el){
    if(!el) return;
    el.setAttribute('contenteditable','true');
    el.setAttribute('data-te-editing','');
    el.focus();

    // Select text range
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var selObj = window.getSelection();
      selObj.removeAllRanges();
      selObj.addRange(range);
    } catch(e){}

    bar.style.display = 'none';

    function finishEdit(){
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-te-editing');
      parent.postMessage({ source:'te', type:'text', id: idOf(el), value: el.textContent }, '*');
      placeFloatingToolbar(el);
    }

    el.addEventListener('blur', finishEdit, { once:true });
    el.addEventListener('keydown', function(evt){
      if(evt.key === 'Escape'){
        evt.preventDefault();
        el.blur();
      }
    });
  }

  function placeAddButton(el){
    var item = repeaterItem(el);
    if(!item){ addButton.style.display = 'none'; return; }
    var rect = item.getBoundingClientRect();
    addButton.style.display = 'flex';
    addButton.style.top = Math.max(8, rect.bottom + 8) + 'px';
    addButton.style.left = Math.max(8, Math.min(window.innerWidth - addButton.offsetWidth - 8, rect.right - addButton.offsetWidth)) + 'px';
    addButton.setAttribute('data-repeater-id', item.getAttribute('data-te-repeater-id') || '');
    addButton.setAttribute('data-source-index', item.getAttribute('data-te-source-index') || '0');
  }

  addButton.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    parent.postMessage({ source:'te', type:'repeater-add', repeaterId:addButton.getAttribute('data-repeater-id'), sourceIndex:Number(addButton.getAttribute('data-source-index') || 0) }, '*');
  });

  document.addEventListener('click', function(e){
    // Don't intercept clicks inside floating bridge tools
    if(e.target.closest('[data-te-bridge-node]')) return;

    var id = idOf(e.target);
    e.preventDefault();
    if(!id){
      if(sel) sel.removeAttribute('data-te-selected');
      sel = null;
      bar.style.display = 'none';
      addButton.style.display = 'none';
      parent.postMessage({ source:'te', type:'deselect' }, '*');
      return;
    }
    if(sel) sel.removeAttribute('data-te-selected');
    sel = document.querySelector('[data-te-id="'+id+'"]');
    if(sel) sel.setAttribute('data-te-selected','');
    placeFloatingToolbar(sel);
    placeAddButton(sel);
    parent.postMessage({ source:'te', type:'select', id: id }, '*');
  }, true);

  document.addEventListener('dblclick', function(e){
    if(e.target.closest('[data-te-bridge-node]')) return;
    var id = idOf(e.target);
    if(!id) return;
    var el = document.querySelector('[data-te-id="'+id+'"]');
    if(!el) return;
    if(el.tagName.toLowerCase() === 'img'){
      currentImageTargetId = id;
      fileInput.click();
      return;
    }
    startInlineEditing(el);
  }, true);

  window.addEventListener('scroll', function(){
    if(sel){
      placeFloatingToolbar(sel);
      placeAddButton(sel);
    }
  }, { passive:true });

  function nodeKey(node){
    if(node.nodeType !== Node.ELEMENT_NODE) return '';
    var el = node;
    return el.tagName + ':' + (el.getAttribute('data-te-id') || el.id || el.getAttribute('name') || el.getAttribute('property') || (el.tagName === 'LINK' ? el.getAttribute('rel') : '') || '');
  }
  function syncAttributes(current, next){
    Array.prototype.slice.call(current.attributes).forEach(function(attr){
      if(attr.name === 'data-te-selected' || attr.name === 'data-te-editing' || attr.name === 'contenteditable') return;
      if(!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    });
    Array.prototype.slice.call(next.attributes).forEach(function(attr){ current.setAttribute(attr.name, attr.value); });
  }
  function syncNode(current, next){
    if(current.nodeType !== next.nodeType || (current.nodeType === Node.ELEMENT_NODE && current.tagName !== next.tagName)){
      current.replaceWith(next.cloneNode(true));
      return;
    }
    if(current.nodeType === Node.TEXT_NODE){
      if(current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return;
    }
    if(current.tagName === 'SCRIPT') return;
    syncChildren(current, next);
  }
  function syncChildren(current, next){
    var existing = Array.prototype.slice.call(current.childNodes).filter(function(node){ return !(node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-te-bridge-node')); });
    var incoming = Array.prototype.slice.call(next.childNodes).filter(function(node){ return !(node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-te-bridge-node')); });
    var keyed = {};
    var retained = [];
    existing.forEach(function(node){ var key = nodeKey(node); if(key) keyed[key] = node; });
    var cursor = 0;
    incoming.forEach(function(nextNode){
      var match = null;
      var key = nodeKey(nextNode);
      if(key && keyed[key]) match = keyed[key];
      if(!match){
        while(existing[cursor] && existing[cursor].parentNode !== current) cursor++;
        var candidate = existing[cursor];
        if(candidate && candidate.nodeType === nextNode.nodeType && (candidate.nodeType !== Node.ELEMENT_NODE || candidate.tagName === nextNode.tagName)) match = candidate;
      }
      if(match){
        syncNode(match, nextNode);
        retained.push(match);
        if(match.parentNode === current && match !== current.childNodes[cursor]) current.insertBefore(match, current.childNodes[cursor] || null);
        cursor = Array.prototype.indexOf.call(current.childNodes, match) + 1;
      } else {
        current.insertBefore(nextNode.cloneNode(true), current.childNodes[cursor] || null);
        cursor++;
      }
    });
    Array.prototype.slice.call(current.childNodes).forEach(function(node){
      if(node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-te-bridge-node')) return;
      if(retained.indexOf(node) === -1) node.remove();
    });
  }
  function applySnapshot(html, selectedId){
    var next = new DOMParser().parseFromString(html, 'text/html');
    var x = window.scrollX, y = window.scrollY;
    syncChildren(document.head, next.head);
    syncChildren(document.body, next.body);
    if(sel) sel.removeAttribute('data-te-selected');
    sel = selectedId ? document.querySelector('[data-te-id="'+selectedId+'"]') : null;
    if(sel) sel.setAttribute('data-te-selected', '');
    placeAddButton(sel);
    window.scrollTo(x, y);
  }
  window.addEventListener('message', function(e){
    if(!e.data || e.data.source !== 'te-host') return;
    if(e.data.type === 'sync' && typeof e.data.html === 'string'){
      applySnapshot(e.data.html, e.data.selected || null);
      return;
    }
    if(e.data.type === 'focus'){
      if(sel) sel.removeAttribute('data-te-selected');
      sel = document.querySelector('[data-te-id="'+e.data.id+'"]');
      if(sel){ sel.setAttribute('data-te-selected',''); sel.scrollIntoView({behavior:'smooth', block:'center'}); placeAddButton(sel); }
    }
  });
  window.addEventListener('resize', function(){ placeAddButton(sel); });
  window.addEventListener('scroll', function(){ placeAddButton(sel); }, true);
})();
</script>`;

export function renderPage(
  analysis: TemplateAnalysis,
  page: PageAnalysis,
  state: EditorState,
  opts: { interactive?: boolean } = {},
): string {
  const doc = new DOMParser().parseFromString(page.html, "text/html");
  const edits = state.edits[page.id] ?? {};

  // 1. rebuild repeaters from editor state
  page.repeaters.forEach((r) => {
    const container = doc.querySelector(`[data-te-id="${r.containerId}"]`);
    if (!container) return;
    const originals = r.itemIds
      .map((id) => container.querySelector(`[data-te-id="${id}"]`))
      .filter(Boolean) as Element[];
    if (!originals.length) return;
    const templates = originals.map((o) => o.cloneNode(true) as Element);
    originals.forEach((o) => o.remove());
    const items = state.repeaters[r.id] ?? defaultRepeaterItems(r.itemIds);
    items.forEach((item) => {
      const src = templates[item.srcIndex] ?? templates[0];
      if (!src) return;
      const clone = src.cloneNode(true) as Element;
      const stamp = (el: Element) => {
        const base = el.getAttribute("data-te-id");
        if (base) el.setAttribute("data-te-id", `${item.key}::${base}`);
        Array.from(el.children).forEach(stamp);
      };
      stamp(clone);
      clone.setAttribute("data-te-item", item.key);
      clone.setAttribute("data-te-repeater-id", r.id);
      clone.setAttribute("data-te-source-index", String(item.srcIndex));
      container.appendChild(clone);
    });
  });

  // 2. apply element edits
  Object.entries(edits).forEach(([id, edit]) => {
    doc.querySelectorAll(`[data-te-id="${id}"]`).forEach((el) => applyEdit(el, edit));
  });

  // 3. swap missing assets for readable placeholders
  const missing = new Set(analysis.assets.filter((a) => a.missing).map((a) => a.url));
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (missing.has(src) || (!/^(https?:|data:)/.test(src) && !src.startsWith("blob:"))) {
      img.setAttribute("src", PLACEHOLDER(img.getAttribute("alt") || "image"));
    }
  });
  doc.querySelectorAll("video").forEach((v) => {
    const poster = v.getAttribute("poster") ?? "";
    if (!/^(https?:|data:|blob:)/.test(poster))
      v.setAttribute("poster", PLACEHOLDER("video poster"));
  });

  // 4. seo edits
  const seo = state.seo[page.id];
  if (seo) {
    if (seo.title !== undefined) {
      const t = doc.querySelector("title") ?? doc.head.appendChild(doc.createElement("title"));
      t.textContent = seo.title;
    }
    const setMeta = (sel: string, attr: string, key: string, value?: string) => {
      if (value === undefined) return;
      let el = doc.querySelector(sel);
      if (!el) {
        el = doc.createElement(sel.startsWith("link") ? "link" : "meta");
        el.setAttribute(attr, key);
        doc.head.appendChild(el);
      }
      el.setAttribute(sel.startsWith("link") ? "href" : "content", value);
    };
    setMeta('meta[name="description"]', "name", "description", seo.description);
    setMeta('meta[name="keywords"]', "name", "keywords", seo.keywords);
    setMeta('meta[name="robots"]', "name", "robots", seo.robots);
    setMeta('meta[property="og:title"]', "property", "og:title", seo.ogTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", seo.ogDescription);
    setMeta('meta[property="og:image"]', "property", "og:image", seo.ogImage);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", seo.twitterCard);
    setMeta('link[rel="canonical"]', "rel", "canonical", seo.canonical);
  }

  let html = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;

  // 5. live theme token substitution
  const hexToRgbStr = (hex: string) => {
    const clean = hex.replace("#", "");
    if (clean.length !== 6) return null;
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const pairs: [string, string][] = [];
  COLOR_TOKENS.forEach((k) => {
    const from = analysis.theme[k];
    const to = state.theme[k];
    if (from && to && from.toLowerCase() !== to.toLowerCase()) {
      pairs.push([from, to]);
      const fromRgb = hexToRgbStr(from);
      const toRgb = hexToRgbStr(to);
      if (fromRgb && toRgb) {
        pairs.push([fromRgb, toRgb]);
      }
    }
  });

  if (pairs.length) {
    pairs.forEach(([from, to]) => {
      const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      html = html.replace(re, to);
    });
  }

  const faLink = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />`;
  html = html.replace(
    "</head>",
    `${faLink}<style id="te-theme">${themeCss(state.theme)}</style></head>`,
  );
  if (opts.interactive) html = html.replace("</body>", `${BRIDGE}</body>`);
  return html;
}

export function exportTemplate(analysis: TemplateAnalysis, state: EditorState) {
  return analysis.pages.map((p) => ({ name: p.name, html: renderPage(analysis, p, state) }));
}
