import type { PageAnalysis, TemplateAnalysis, EditorState, ElementEdit, ThemeTokens } from "./types";

const PLACEHOLDER = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><text x="50%" y="50%" font-family="system-ui" font-size="26" fill="#0f172a" text-anchor="middle">${label}</text></svg>`,
  )}`;

const COLOR_TOKENS = ["primary", "secondary", "accent", "background", "surface", "text", "muted", "border"] as const;

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
  if (edit.iconClass !== undefined) {
    // Replace any fa-* classes or set full icon class
    const currentClasses = (el.getAttribute("class") || "").split(/\s+/).filter((c) => !c.startsWith("fa-") && c !== "fa" && c !== "fas" && c !== "far" && c !== "fab" && c !== "fa-solid" && c !== "fa-regular" && c !== "fa-brands");
    el.setAttribute("class", [...currentClasses, ...edit.iconClass.split(/\s+/)].filter(Boolean).join(" "));
  }
  if (edit.className !== undefined) el.setAttribute("class", edit.className);
  if (edit.fill) el.querySelectorAll("path,circle,rect,polygon").forEach((p) => p.setAttribute("fill", edit.fill!));
  if (edit.stroke) el.querySelectorAll("path,circle,rect,polygon").forEach((p) => p.setAttribute("stroke", edit.stroke!));
  if (edit.hidden) el.setAttribute("style", `${el.getAttribute("style") ?? ""};display:none !important`);
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
    body { font-family: ${t.fontBody} !important; background: ${t.background} !important; color: ${t.text} !important; }
    h1,h2,h3,h4,h5 { font-family: ${t.fontHeading} !important; }
    .card, .btn-primary, .btn-secondary, input, textarea, button { border-radius: ${t.radius} !important; }
    .card { box-shadow: ${t.shadow}; }
    .sect { max-width: ${t.container} !important; }
  `;
}

const BRIDGE = `
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" data-te-bridge-node />
<style id="te-bridge-style" data-te-bridge-node>
  [data-te-id] { transition: outline 0.1s ease; }
  [data-te-id]:hover { outline: 2px dashed rgba(6,182,212,.75) !important; outline-offset: 2px; cursor: pointer; }
  [data-te-selected] { outline: 3px solid #06b6d4 !important; outline-offset: 2px; position: relative !important; }
  [data-te-editing] { outline: 3px solid #f59e0b !important; background: rgba(245,158,11,.08) !important; }
  
  #te-canvas-pill {
    position: fixed;
    z-index: 2147483647;
    display: none;
    align-items: center;
    gap: 3px;
    background: #0b1826;
    border: 1px solid #1e293b;
    border-radius: 9999px;
    padding: 3px 6px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 0 16px rgba(6,182,212,0.35);
    font-family: system-ui, -apple-system, sans-serif;
    color: #e2e8f0;
    pointer-events: auto;
    animation: te-pill-in 0.15s ease-out;
  }
  @keyframes te-pill-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  
  .te-pill-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.12s ease;
    height: 24px;
  }
  .te-pill-btn:hover {
    background: #1e293b;
    color: #38bdf8;
  }
  .te-pill-btn.active {
    background: rgba(6,182,212,0.25);
    color: #38bdf8;
  }
  .te-pill-divider {
    width: 1px;
    height: 14px;
    background: #334155;
    margin: 0 2px;
  }
  .te-pill-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #38bdf8;
    background: rgba(6,182,212,0.15);
    padding: 2px 7px;
    border-radius: 9999px;
    margin-right: 2px;
  }
</style>
<script data-te-bridge-node>
(function(){
  var sel = null;
  var hoverItem = null;

  // 1. Floating Quick Action & Rich Formatting Pill
  var pill = document.createElement('div');
  pill.id = 'te-canvas-pill';
  pill.setAttribute('data-te-bridge-node', '');
  pill.innerHTML = 
    '<span class="te-pill-tag" id="te-pill-label">Element</span>' +
    '<button type="button" class="te-pill-btn" id="te-pill-bold" title="Toggle Bold"><b>B</b></button>' +
    '<button type="button" class="te-pill-btn" id="te-pill-italic" title="Toggle Italic"><i>I</i></button>' +
    '<button type="button" class="te-pill-btn" id="te-pill-align" title="Cycle Alignment">≡</button>' +
    '<span class="te-pill-divider"></span>' +
    '<button type="button" class="te-pill-btn" id="te-pill-edit" title="Edit in Panel">✏️ Style</button>' +
    '<button type="button" class="te-pill-btn" id="te-pill-add" style="display:none" title="Add Card / Item">+ Add Next</button>' +
    '<button type="button" class="te-pill-btn" id="te-pill-del" title="Delete / Hide from page" style="color:#f87171;">🗑️ Delete</button>';
  document.body.appendChild(pill);

  var pillLabel = pill.querySelector('#te-pill-label');
  var pillBold = pill.querySelector('#te-pill-bold');
  var pillItalic = pill.querySelector('#te-pill-italic');
  var pillAlign = pill.querySelector('#te-pill-align');
  var pillEdit = pill.querySelector('#te-pill-edit');
  var pillAdd = pill.querySelector('#te-pill-add');
  var pillDel = pill.querySelector('#te-pill-del');

  pillBold.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(sel){
      var id = idOf(sel);
      var curWeight = sel.style.fontWeight || window.getComputedStyle(sel).fontWeight;
      var isBold = curWeight === 'bold' || Number(curWeight) >= 700;
      parent.postMessage({ source:'te', type:'style-patch', id: id, style: { 'font-weight': isBold ? 'normal' : 'bold' } }, '*');
    }
  });

  pillItalic.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(sel){
      var id = idOf(sel);
      var curStyle = sel.style.fontStyle || window.getComputedStyle(sel).fontStyle;
      var isItalic = curStyle === 'italic';
      parent.postMessage({ source:'te', type:'style-patch', id: id, style: { 'font-style': isItalic ? 'normal' : 'italic' } }, '*');
    }
  });

  pillAlign.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(sel){
      var id = idOf(sel);
      var curAlign = sel.style.textAlign || window.getComputedStyle(sel).textAlign || 'left';
      var nextAlign = curAlign === 'left' ? 'center' : curAlign === 'center' ? 'right' : 'left';
      parent.postMessage({ source:'te', type:'style-patch', id: id, style: { 'text-align': nextAlign } }, '*');
    }
  });

  pillEdit.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(sel){
      var id = idOf(sel);
      parent.postMessage({ source:'te', type:'open-tab', tab:'element', id: id }, '*');
    }
  });

  pillAdd.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    var repId = pillAdd.getAttribute('data-repeater-id');
    var srcIdx = Number(pillAdd.getAttribute('data-source-index') || 0);
    if(repId){
      parent.postMessage({ source:'te', type:'repeater-add', repeaterId: repId, sourceIndex: srcIdx }, '*');
    }
  });

  pillDel.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    if(sel){
      var id = idOf(sel);
      parent.postMessage({ source:'te', type:'delete-element', id: id }, '*');
    }
  });

  // 2. Repeater Floating Add Button
  var addButton = document.createElement('button');
  addButton.id = 'te-repeater-float-add';
  addButton.setAttribute('data-te-bridge-node', '');
  addButton.type = 'button';
  addButton.setAttribute('aria-label', 'Add repeater item');
  addButton.innerHTML = '<span style="font-size:14px;font-weight:bold;">+</span> Add Item';
  document.body.appendChild(addButton);

  function idOf(el){ while(el && el !== document.body){ if(el.getAttribute && el.getAttribute('data-te-id')) return el.getAttribute('data-te-id'); el = el.parentElement; } return null; }
  function repeaterItem(el){ return el && el.closest ? el.closest('[data-te-repeater-id][data-te-item]') : null; }
  
  function getFriendlyTag(el){
    if(!el) return 'Element';
    var tag = el.tagName.toLowerCase();
    if(tag === 'img') return 'Image';
    if(tag === 'button' || tag === 'a') return 'Button / Link';
    if(tag === 'i' || tag === 'svg') return 'Icon';
    if(/^h[1-6]$/.test(tag)) return tag.toUpperCase();
    if(tag === 'p') return 'Paragraph';
    return tag;
  }

  function placeOverlays(el){
    // Update Floating Pill for Selected Element
    if(sel){
      var sRect = sel.getBoundingClientRect();
      pillLabel.textContent = getFriendlyTag(sel);
      var repItem = repeaterItem(sel);
      if(repItem){
        pillAdd.style.display = 'inline-flex';
        pillAdd.setAttribute('data-repeater-id', repItem.getAttribute('data-te-repeater-id') || '');
        pillAdd.setAttribute('data-source-index', repItem.getAttribute('data-te-source-index') || '0');
      } else {
        pillAdd.style.display = 'none';
      }

      pill.style.display = 'flex';
      var topPos = sRect.top - 36;
      if(topPos < 10) topPos = sRect.bottom + 8;
      pill.style.top = Math.max(10, Math.min(window.innerHeight - 44, topPos)) + 'px';
      pill.style.left = Math.max(10, Math.min(window.innerWidth - pill.offsetWidth - 10, sRect.left)) + 'px';
    } else {
      pill.style.display = 'none';
    }

    // Update Floating Add button for Repeater hover
    var item = repeaterItem(el) || hoverItem;
    if(!item || sel){ addButton.style.display = 'none'; return; }
    var rect = item.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0){ addButton.style.display = 'none'; return; }
    addButton.style.display = 'flex';
    addButton.style.top = Math.min(window.innerHeight - 40, Math.max(8, rect.bottom + 6)) + 'px';
    addButton.style.left = Math.max(8, Math.min(window.innerWidth - addButton.offsetWidth - 8, rect.right - addButton.offsetWidth)) + 'px';
    addButton.setAttribute('data-repeater-id', item.getAttribute('data-te-repeater-id') || '');
    addButton.setAttribute('data-source-index', item.getAttribute('data-te-source-index') || '0');
  }

  addButton.addEventListener('click', function(e){
    e.preventDefault(); e.stopPropagation();
    parent.postMessage({
      source: 'te',
      type: 'repeater-add',
      repeaterId: addButton.getAttribute('data-repeater-id'),
      sourceIndex: Number(addButton.getAttribute('data-source-index') || 0)
    }, '*');
  });

  document.addEventListener('mouseover', function(e){
    var item = repeaterItem(e.target);
    if(item){
      hoverItem = item;
      placeOverlays(hoverItem);
    }
  }, true);

  var isInteractMode = false;

  // 0. Transparent Edit-Mode Click Shield
  var shield = document.createElement('div');
  shield.id = 'te-click-shield';
  shield.setAttribute('data-te-bridge-node', '');
  shield.style.cssText = 'position:fixed;inset:0;z-index:2147483640;cursor:pointer;background:transparent;';
  document.body.appendChild(shield);

  function updateShieldState(){
    shield.style.display = isInteractMode ? 'none' : 'block';
  }

  // Handle all selection through the shield so template JS event listeners never receive the click
  shield.addEventListener('mousemove', function(e){
    shield.style.pointerEvents = 'none';
    var under = document.elementFromPoint(e.clientX, e.clientY);
    shield.style.pointerEvents = 'auto';
    var item = repeaterItem(under);
    if(item){
      hoverItem = item;
      placeOverlays(hoverItem);
    }
  });

  shield.addEventListener('click', function(e){
    shield.style.pointerEvents = 'none';
    var target = document.elementFromPoint(e.clientX, e.clientY);
    shield.style.pointerEvents = 'auto';

    if(!target) return;
    if(target === addButton || addButton.contains(target) || target === pill || pill.contains(target)) return;

    var id = idOf(target);
    if(!id) return;
    if(sel) sel.removeAttribute('data-te-selected');
    sel = document.querySelector('[data-te-id="'+id+'"]');
    if(sel) sel.setAttribute('data-te-selected','');
    placeOverlays(sel);
    parent.postMessage({ source:'te', type:'select', id: id }, '*');
  });

  // Intercept all link clicks and form submissions in the iframe to prevent navigating away
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if(a){
      var href = a.getAttribute('href') || '';
      e.preventDefault();
      if(href && !href.startsWith('#') && !href.startsWith('javascript:')){
        // Notify editor parent to switch page if it's a page in this template
        parent.postMessage({ source:'te', type:'navigate', href: href }, '*');
      }
    }
  }, true);

  document.addEventListener('submit', function(e){
    e.preventDefault();
    e.stopPropagation();
  }, true);

  document.addEventListener('dblclick', function(e){
    e.preventDefault();
    e.stopPropagation();
    var id = idOf(e.target);
    if(!id) return;
    var el = document.querySelector('[data-te-id="'+id+'"]');
    if(!el || el.children.length > 0) return;
    el.setAttribute('contenteditable','true');
    el.setAttribute('data-te-editing','');
    el.focus();
    el.addEventListener('blur', function(){
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-te-editing');
      parent.postMessage({ source:'te', type:'text', id: id, value: el.textContent }, '*');
    }, { once:true });
  }, true);
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
    if(current.nodeType !== Node.ELEMENT_NODE) return;
    syncAttributes(current, next);
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
    placeOverlays(sel);
    window.scrollTo(x, y);
  }
  window.addEventListener('message', function(e){
    if(!e.data || e.data.source !== 'te-host') return;
    if(e.data.type === 'sync' && typeof e.data.html === 'string'){
      applySnapshot(e.data.html, e.data.selected || null);
      return;
    }
    if(e.data.type === 'set-interact-mode'){
      isInteractMode = !!e.data.interact;
      updateShieldState();
      if(isInteractMode && sel){
        sel.removeAttribute('data-te-selected');
        sel = null;
        placeOverlays(null);
      }
      return;
    }
    if(e.data.type === 'focus'){
      if(sel) sel.removeAttribute('data-te-selected');
      sel = document.querySelector('[data-te-id="'+e.data.id+'"]');
      if(sel){
        // If element is inside a hidden modal or drawer, temporarily force-reveal the modal in editor
        var hiddenAncestor = sel.closest('[style*="display:none"], [style*="display: none"], .hidden, [hidden], [aria-hidden="true"], dialog:not([open])');
        if(hiddenAncestor){
          hiddenAncestor.style.setProperty('display', 'block', 'important');
          hiddenAncestor.removeAttribute('hidden');
          hiddenAncestor.setAttribute('aria-hidden', 'false');
          if(hiddenAncestor.tagName === 'DIALOG') hiddenAncestor.setAttribute('open', '');
        }
        sel.setAttribute('data-te-selected','');
        sel.scrollIntoView({behavior:'smooth', block:'center'});
        placeOverlays(sel);
      }
    }
  });
  window.addEventListener('resize', function(){ placeOverlays(sel); });
  window.addEventListener('scroll', function(){ placeOverlays(sel); }, true);
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
    const originals = r.itemIds.map((id) => container.querySelector(`[data-te-id="${id}"]`)).filter(Boolean) as Element[];
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
    if (!/^(https?:|data:|blob:)/.test(poster)) v.setAttribute("poster", PLACEHOLDER("video poster"));
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
  const pairs = COLOR_TOKENS.map((k) => [analysis.theme[k], state.theme[k]] as const).filter(
    ([from, to]) => from && to && from.toLowerCase() !== to.toLowerCase(),
  );
  if (pairs.length) {
    const re = new RegExp(pairs.map(([from]) => from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
    html = html.replace(re, (m) => pairs.find(([from]) => from.toLowerCase() === m.toLowerCase())?.[1] ?? m);
  }

  const faLink = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />`;
  html = html.replace("</head>", `${faLink}<style id="te-theme">${themeCss(state.theme)}</style></head>`);
  if (opts.interactive) html = html.replace("</body>", `${BRIDGE}</body>`);
  return html;
}

export function exportTemplate(analysis: TemplateAnalysis, state: EditorState) {
  return analysis.pages.map((p) => ({ name: p.name, html: renderPage(analysis, p, state) }));
}
