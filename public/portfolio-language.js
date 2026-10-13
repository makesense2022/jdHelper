/* Independent, same-origin Chinese/English language runtime. No analytics or remote translation. */
/* eslint-disable no-console */
(() => {
  'use strict';
  if (window.PortfolioLanguage) return;
  const KEY = 'portfolio-language';
  const EVENT = 'portfolio-language:change';
  const normalize = value => {
    if (typeof value !== 'string') return null;
    const tag = value.trim().toLowerCase().split(/[;_-]/)[0];
    return tag === 'zh' || tag === 'en' ? tag : null;
  };
  const negotiate = (values, fallback = 'zh') => {
    const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
    return list.map((value, order) => {
      const [tag, ...params] = value.trim().split(';');
      const quality = params.find(p => /^\s*q\s*=/i.test(p));
      return { language: normalize(tag), order, q: quality ? Number(quality.split('=')[1].trim()) : 1 };
    }).filter(p => p.language && Number.isFinite(p.q) && p.q > 0 && p.q <= 1)
      .sort((a, b) => b.q - a.q || a.order - b.order)[0]?.language || fallback;
  };
  const cookie = name => {
    try {
      const part = document.cookie.split(';').map(p => p.trim()).find(p => p.startsWith(name + '='));
      return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
    }
    catch { return null; }
  };
  let config;
  let language;
  let dictionary = Object.create(null);
  let templates = [];
  let state = 'loading';
  let observer;
  let scheduled = false;
  let switcher;
  let placeSwitcher;
  let canvasInstalled = false;
  const textState = new WeakMap();
  const attributeState = new WeakMap();
  const observedRoots = new WeakSet();
  const normalized = value => value.replace(/\s+/g, ' ').trim();
  const protectedBase = '[translate="no"],[data-i18n-skip],[data-private],[data-user-content],[data-sensitive],[data-i18n-private],.user-content,.user-note,.user-text,.note-content,.record-note,.journal-entry,.saved-note,[contenteditable]:not([contenteditable="false" i]),script,style,noscript,template,pre,code';
  const protectedElement = element => {
    if (!element) return true;
    for (let current = element; current; current = current.getRootNode()?.host) {
      if (current.closest(protectedBase)) return true;
      if ((config?.excludeSelectors || []).some(selector => { try { return Boolean(current.closest(selector)); } catch { return false; } })) return true;
    }
    return false;
  };
  const safeJSON = async source => {
    const url = new URL(source, location.origin);
    if (url.origin !== location.origin) throw new Error('Language assets must belong to this website');
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
    if (!response.ok) throw new Error(`Language asset returned ${response.status}`);
    return response.json();
  };
  const remembered = () => {
    const values = [cookie(KEY), ...(config?.nativeCookies || []).map(cookie)];
    try { values.push(localStorage.getItem(KEY)); } catch { /* Optional storage. */ }
    return values.map(normalize).find(Boolean) || null;
  };
  const explicit = () => {
    const params = new URL(location.href).searchParams;
    const value = normalize(params.get('lang') || params.get('locale'));
    if (value) return value;
    if (config?.mode === 'native' && config?.strategy === 'prefix') {
      const segment = location.pathname.split('/')[1];
      if (segment === 'en' || segment === 'zh') return segment;
    }
    return null;
  };
  const choose = () => explicit() || remembered() || negotiate(navigator.languages?.length ? navigator.languages : navigator.language, config?.defaultLanguage || 'zh');
  const save = next => {
    try { localStorage.setItem(KEY, next); } catch { /* Cookie remains available. */ }
    for (const name of [KEY, ...(config?.nativeCookies || [])]) {
      const value = name === KEY ? next : config?.nativeCookieValues?.[next] || next;
      try { document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* A file or restricted context may rely on local storage. */ }
    }
  };
  const nativePath = (pathname, next) => {
    const plain = pathname.replace(/^\/(?:en|zh)(?=\/|$)/, '') || '/';
    const prefix = next === 'en' ? config.enPrefix || '/en' : config.zhPrefix || '';
    return prefix + (plain === '/' ? prefix ? '' : '/' : plain);
  };
  const knownNumberLabel = (source, locale) => {
    const numeric = '[-+]?\\d[\\d.,]*(?:\\s*[—–/%]\\s*\\d[\\d.,]*)*';
    let match = new RegExp('^(.+?)(\\s*' + numeric + ')$').exec(source);
    if (match) {
      const label = dictionary[normalized(match[1])]?.[locale];
      if (typeof label === 'string') return label + (locale === 'en' ? ' ' : match[2].match(/^\s*/)[0]) + match[2].trimStart();
    }
    match = new RegExp('^(' + numeric + '\\s*)([^0-9]+)$').exec(source);
    if (match) {
      const label = dictionary[normalized(match[2])]?.[locale];
      if (typeof label === 'string') return match[1].trimEnd() + (locale === 'en' ? ' ' : match[1].match(/\s*$/)[0]) + label;
    }
    return null;
  };
  const translate = (source, targetLanguage) => {
    if (typeof source !== 'string' || !source.trim()) return source;
    const locale = normalize(targetLanguage) || language;
    const value = dictionary[normalized(source)]?.[locale];
    if (typeof value === 'string') return source.replace(source.trim(), value);
    const plain = normalized(source);
    for (const template of templates) {
      const match = template.pattern.exec(plain);
      if (!match || typeof template[locale] !== 'string') continue;
      const values = Object.fromEntries(template.order.map((index, position) => [index, match[position + 1]]));
      const rendered = template[locale].replace(/\{(\d+)\}/g, (token, index) => values[Number(index)] ?? token);
      return source.replace(source.trim(), rendered);
    }
    const numberLabel = knownNumberLabel(plain, locale);
    if (numberLabel !== null) return source.replace(source.trim(), numberLabel);
    // Public lists such as person names or category / region labels are joined
    // by the app at runtime. Translate only complete, known fragments.
    const pieces = plain.split(/(\s*[·／/：:—–，；]\s*)/);
    if (pieces.length > 1) {
      let changed = false;
      let unknownChinese = false;
      const rendered = pieces.map((part, index) => {
        if (index % 2 || !part.trim()) return part;
        const pair = dictionary[normalized(part)];
        const value = pair?.[locale] ?? knownNumberLabel(part, locale);
        if (typeof value === 'string') { changed ||= value !== part; return value; }
        if (/[\u4e00-\u9fff]/.test(part)) unknownChinese = true;
        return part;
      }).join('');
      if (changed && !unknownChinese) return source.replace(source.trim(), rendered);
    }
    return source;
  };
  const translateNode = node => {
    const parent = node.parentElement;
    if (!parent || protectedElement(parent) || parent.closest('input,textarea')) return;
    const option = parent.closest('option');
    if (option && !option.hasAttribute('value')) option.setAttribute('value', option.textContent || '');
    let record = textState.get(node);
    if (!record || node.data !== record.last) record = { source: node.data, last: node.data };
    const result = translate(record.source);
    if (node.data !== result) node.data = result;
    record.last = result;
    textState.set(node, record);
  };
  const translateAttributes = element => {
    if (protectedElement(element)) return;
    let records = attributeState.get(element);
    if (!records) { records = Object.create(null); attributeState.set(element, records); }
    const attributes = ['aria-label', 'title', 'placeholder', 'alt'];
    if (element.tagName === 'META' && /^(description|og:title|og:description|twitter:title|twitter:description)$/.test(element.name || element.getAttribute('property') || '')) attributes.push('content');
    for (const attribute of attributes) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      let record = records[attribute];
      if (!record || current !== record.last) record = { source: current, last: current };
      const result = translate(record.source);
      if (current !== result) element.setAttribute(attribute, result);
      record.last = result; records[attribute] = record;
    }
  };
  const refresh = () => {
    if (!config || state !== 'ready') return;
    scheduled = false;
    const visit = (scope, translateScope) => {
      if (translateScope) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);let node;
        while ((node = walker.nextNode())) translateNode(node);
        scope.querySelectorAll('[aria-label],[title],[placeholder],[alt],meta[content]').forEach(translateAttributes);
      }
      for (const host of scope.querySelectorAll('*')) if (host.shadowRoot && (host.localName === 'site-feedback' || host.hasAttribute('data-i18n-public-shadow')) && !protectedElement(host)) {
        if (host.localName === 'site-feedback') host.lang = language === 'en' ? 'en' : 'zh-CN';
        if (observer && !observedRoots.has(host.shadowRoot)) { observer.observe(host.shadowRoot, { childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt','content'] });observedRoots.add(host.shadowRoot); }
        visit(host.shadowRoot,true);
      }
    };
    visit(document.documentElement,config.mode !== 'native');
    if (config.mode === 'native') return;
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
    document.documentElement.dataset.portfolioLanguage = language;
    if (switcher) {
      if (!switcher.isConnected || !switcher.getClientRects().length) placeSwitcher?.();
      switcher.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
      const label = language === 'en' ? 'Website language' : '网站语言';
      if (switcher.getAttribute('aria-label') !== label) switcher.setAttribute('aria-label', label);
    }
  };
  const schedule = () => {
    if (scheduled || state !== 'ready') return;
    scheduled = true;
    requestAnimationFrame(refresh);
  };
  const canvas = () => {
    if (config.canvasTranslation !== true || canvasInstalled || !window.CanvasRenderingContext2D) return;
    canvasInstalled = true;
    for (const method of ['fillText', 'strokeText', 'measureText']) {
      const original = CanvasRenderingContext2D.prototype[method];
      CanvasRenderingContext2D.prototype[method] = function (text, ...args) {
        return original.call(this, protectedElement(this.canvas) ? text : translate(String(text)), ...args);
      };
    }
  };
  const announceChange = source => window.dispatchEvent(new CustomEvent(EVENT, { detail: { language, source } }));
  const setLanguage = (next, options = {}) => {
    next = normalize(next);
    if (!next || !config) return;
    if (options.remember !== false) save(next);
    language = next;
    if (config.mode === 'native') {
      if (config.strategy === 'prefix') {
        const url = new URL(location.href); url.pathname = nativePath(url.pathname, next); url.searchParams.delete('lang');url.searchParams.delete('locale');
        location.assign(url.href); return;
      }
      const url = new URL(location.href); url.searchParams.set('lang', next); location.assign(url.href); return;
    }
    const url = new URL(location.href); url.searchParams.set('lang', next);
    try { history.replaceState(history.state, '', url.pathname + url.search + url.hash); } catch { /* Opaque offline documents can still switch in place. */ }
    refresh();
    announceChange(options.source || 'manual');
  };
  const mountSwitcher = () => {
    if (config.showSwitcher === false || document.querySelector('[data-portfolio-language-switcher]')) return;
    const style = document.createElement('style');
    style.textContent = '.portfolio-language-switcher{display:inline-flex;gap:2px;padding:3px;border:1px solid currentColor;border-radius:999px;color:inherit;background:inherit;vertical-align:middle;flex-shrink:0;max-width:100%;font:inherit;font-size:13px;line-height:1.2}.portfolio-language-switcher button{appearance:none;border:0;background:transparent;color:inherit;padding:8px 10px;min-height:36px;border-radius:999px;font:inherit;white-space:nowrap;cursor:pointer}.portfolio-language-switcher button[aria-pressed=true]{font-weight:700;background:color-mix(in srgb,currentColor 12%,transparent)}.portfolio-language-switcher button:focus-visible{outline:2px solid currentColor;outline-offset:1px}.portfolio-language-switcher[data-floating=true]{position:fixed;right:16px;bottom:84px;z-index:10000;background:Canvas;color:CanvasText;max-width:calc(100vw - 32px)}@media(max-width:640px){.portfolio-language-switcher[data-floating=true]{bottom:calc(140px + env(safe-area-inset-bottom))}}@media(prefers-reduced-motion:no-preference){.portfolio-language-switcher button{transition:background .12s ease}}';
    document.head.append(style);
    switcher = document.createElement('div'); switcher.className = 'portfolio-language-switcher';
    switcher.dataset.portfolioLanguageSwitcher = 'true'; switcher.setAttribute('translate', 'no'); switcher.setAttribute('role', 'group');
    for (const [code, text] of [['zh', '中文'], ['en', 'English']]) {
      const button = document.createElement('button');button.type = 'button';button.textContent = text;button.lang = code === 'zh' ? 'zh-CN' : 'en';button.dataset.language = code;
      button.setAttribute('aria-pressed', String(code === language));button.addEventListener('click', () => setLanguage(code));switcher.append(button);
    }
    const visible = element => {
      if (!element || !element.getClientRects().length) return false;
      const style = getComputedStyle(element);return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const place = () => {
      const selectors = [config.switcherSelector, 'header [data-language-tools]', 'header .header-actions', 'header .header-tools', 'header nav'].filter(Boolean);
      let host;
      if (innerWidth > 640) for (const selector of selectors) { host = [...document.querySelectorAll(selector)].find(visible);if (host) break; }
      const destination = host || document.body;
      if (switcher.parentElement !== destination) destination.append(switcher);
      if (host) delete switcher.dataset.floating;else switcher.dataset.floating = 'true';
      if (host) {
        const rectangle = switcher.getBoundingClientRect();
        const header = host.closest('header');
        if (rectangle.right > innerWidth || rectangle.left < 0 || (header && header.scrollWidth > header.clientWidth)) {
          document.body.append(switcher);switcher.dataset.floating = 'true';
        }
      }
    };
    placeSwitcher = place;place();window.addEventListener('resize',place,{passive:true});
  };
  const captureNativeChoice = event => {
    if (config?.mode !== 'native') return;
    const element = event.target instanceof Element ? event.target.closest('a,button,[role="menuitem"]') : null;
    if (!element || element.closest('[data-portfolio-language-switcher]')) return;
    const text = normalized(element.textContent || '');
    const label = element.getAttribute('aria-label') || '';
    let target = normalize(element.getAttribute('data-language') || element.getAttribute('lang') || element.getAttribute('hreflang'));
    if (!target && /切换(?:为|到|至)英文|switch to english/i.test(label)) target = 'en';
    if (!target && /切换(?:为|到|至)(?:简体)?中文|switch to chinese/i.test(label)) target = 'zh';
    if (!target && /^(EN|English)(?:\b|$)/i.test(text)) target = 'en';
    if (!target && /^(中文|简体中文|Chinese)(?:\b|$)/i.test(text)) target = 'zh';
    if (!target || (!/^(中文|EN|English|Chinese|简体中文)/i.test(text) && !/language|语言|切换|英文|中文/i.test(label))) return;
    save(target);
    language = target;refresh();
  };
  const waitForDOM = () => document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true })) : Promise.resolve();
  const waitForHydration = () => {
    if (!config.hydrationRequired || window.__portfolioLanguageHydrated) return Promise.resolve();
    return new Promise(resolve => window.addEventListener('portfolio-language:hydrated', resolve, { once: true }));
  };
  const start = async () => {
    config = window.__PORTFOLIO_LANGUAGE_CONFIG__ || await safeJSON('/portfolio-language.config.json');
    language = choose();
    const query = new URL(location.href).searchParams;
    if (normalize(query.get('lang') || query.get('locale'))) save(language);
    if (config.mode === 'native' && config.strategy === 'prefix') {
      const selected = nativePath(location.pathname, language);
      const normalizedPath = value => value.replace(/\/+$/, '') || '/';
      if (normalizedPath(selected) !== normalizedPath(location.pathname)) {
        const url = new URL(location.href); url.pathname = selected;location.replace(url.href);return;
      }
    }
    if (config.mode === 'native' && config.strategy === 'cookie' && !explicit() && normalize(document.documentElement.lang) !== language) {
      const url = new URL(location.href);url.searchParams.set('lang',language);location.replace(url.href);return;
    }
    await waitForDOM();await waitForHydration();
    const resource = window.__PORTFOLIO_LANGUAGE_MESSAGES__ || await safeJSON(config.messagesPath || '/portfolio-language.messages.json');
    dictionary = resource.phrases || resource;
    // Generated English text can become a new DOM node after an app rerender.
    // Only unambiguous aliases may restore its original Chinese meaning.
    const aliases = Object.create(null);
    for (const values of Object.values(dictionary)) for (const locale of ['zh','en']) {
      if (typeof values?.[locale] !== 'string') continue;
      const key = normalized(values[locale]);
      if (dictionary[key]) continue;
      if (aliases[key] && (aliases[key].zh !== values.zh || aliases[key].en !== values.en)) aliases[key] = null;
      else if (!(key in aliases)) aliases[key] = values;
    }
    for (const [key, values] of Object.entries(aliases)) if (values) dictionary[key] = values;
    const escapePattern = part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    templates = (resource.numericTemplates || []).filter(template => Array.isArray(template.parts) && template.parts.length > 1 && template.parts.length <= 9).flatMap(template => {
      const variants = [{ ...template, order: template.parts.slice(1).map((_, index) => index), pattern: new RegExp('^' + template.parts.map(part => escapePattern(String(part))).join('(-?\\d+(?:[.,]\\d+)*)') + '$') }];
      for (const locale of ['zh','en']) {
        if (typeof template[locale] !== 'string') continue;
        const source = normalized(template[locale]);
        const order = [...source.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1]));
        if (order.length !== template.parts.length - 1 || new Set(order).size !== order.length || order.some(index => index >= order.length)) continue;
        const parts = source.split(/\{\d+\}/g);
        variants.push({ ...template, order, pattern: new RegExp('^' + parts.map(escapePattern).join('(-?\\d+(?:[.,]\\d+)*)') + '$') });
      }
      return variants;
    });
    if (!Object.keys(dictionary).length) throw new Error('No paired language resources have been generated');
    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['aria-label','title','placeholder','alt','content'] });
    state = 'ready';
    if (config.mode === 'native') {
      document.addEventListener('click', captureNativeChoice, true);
      window.addEventListener(EVENT, event => { const next = normalize(event.detail?.language || event.detail);if (next) { language = next;refresh(); } });
      const pathLanguage = explicit();if (pathLanguage) document.documentElement.lang = pathLanguage === 'en' ? 'en' : 'zh-CN';
      refresh();return;
    }
    mountSwitcher();refresh();canvas();
    const updateLanguage = (next, source) => {
      const changed = next !== language;
      language = next;refresh();if (changed) announceChange(source);
    };
    window.addEventListener('popstate', () => updateLanguage(choose(), 'history'));
    window.addEventListener('storage', event => { if (!explicit() && event.key === KEY && normalize(event.newValue)) updateLanguage(normalize(event.newValue), 'storage'); });
    window.addEventListener('languagechange', () => { if (!explicit() && !remembered()) updateLanguage(choose(), 'browser'); });
    window.dispatchEvent(new CustomEvent('portfolio-language:ready', { detail: { language } }));
  };
  window.PortfolioLanguage = { get language() { return language; }, get state() { return state; }, normalize, negotiate, t: translate, setLanguage, refresh, ready: null };
  window.PortfolioLanguage.ready = start().catch(error => {
    state = 'failed';document.documentElement.dataset.portfolioLanguageState = 'failed';
    window.dispatchEvent(new CustomEvent('portfolio-language:error', { detail: { reason: error.message } }));
    console.warn('Website language resources could not be loaded:', error.message);
  });
})();
