/* global window, document, navigator, location, history, CustomEvent, Event, URL, crypto, TextEncoder, localStorage, sessionStorage */
/* Website foundation. Source: Projects/site-analytics/foundation/browser.js. */
(function () {
  'use strict';
  if (window.websiteAnalytics) return;
  // Embedded games forward their real milestones to the parent; no second SDK/PV.
  if (window.top && window.top !== window.self) return;
  var config = window.__SITE_FOUNDATION_CONFIG__ || {};
  var client = null, initializing = false, queue = [], lastRoute = null;
  var routeSeen = new Set(), attemptSeen = new Set(), attempts = new Map();
  var routeStarted = Date.now(), scrollScheduled = false, errors = new Set();
  var lastOpened = null;
  var originals = new Set(config.businessEvents || []);
  var standard = new Set(['content_opened', 'content_completed', 'scroll_depth', 'next_content_clicked', 'internal_search', 'share_clicked', 'share_completed', 'outbound_clicked', 'cta_clicked', 'favorite_added', 'favorite_removed', 'filter_changed', 'tool_started', 'tool_completed', 'game_started', 'game_completed', 'game_ended', 'signup_started', 'signup_completed', 'checkout_started', 'affiliate_clicked', 'client_error']);
  var stringProperties = new Set(['content_id', 'content_type', 'source', 'entry_source', 'category', 'platform', 'link_type', 'cta_name', 'cta_location', 'from_content', 'to_content', 'outcome', 'mode', 'attempt_id', 'destination_domain', 'merchant', 'product_id', 'currency', 'error_type', 'signature']);
  var numberProperties = new Set(['percent', 'duration', 'query_length', 'result_count', 'price', 'level', 'position']);
  var openEvents = new Set(['work_open', 'chapter_open', 'scenario_open', 'story_start', 'lesson_start', 'observe_start', 'edition_open', 'archive_open', 'artwork_open', 'exhibit_open', 'project_open']);
  var completedEvents = new Set(['chapter_complete', 'story_complete', 'lesson_complete', 'observe_complete', 'exhibit_complete']);
  var toolStarts = new Set(['practice_start', 'compare_start', 'session_start', 'experiment_start']);
  var toolEnds = new Set(['practice_complete', 'compare_complete', 'session_complete', 'experiment_complete', 'worksheet_complete', 'review_complete']);

  var qaStorageKey = 'website-foundation:qa:v1', qaMemory = null;
  function qaContext() {
    var value = qaMemory;
    try { value = JSON.parse(sessionStorage.getItem(qaStorageKey) || 'null') || value; } catch { /* A memory-only QA session is still explicit. */ }
    if (!value || !/^qa-[a-z0-9][a-z0-9_-]{7,79}$/.test(value.runId || '') || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 2 * 60 * 60 * 1000) return null;
    return value;
  }
  function qaRequested() {
    try { return Boolean(sessionStorage.getItem(qaStorageKey) || qaMemory); } catch { return Boolean(qaMemory); }
  }
  function beginQA(runId) {
    if (!/^qa-[a-z0-9][a-z0-9_-]{7,79}$/.test(runId || '')) return false;
    qaMemory = { runId: runId, expiresAt: Date.now() + 60 * 60 * 1000 };
    try { sessionStorage.setItem(qaStorageKey, JSON.stringify(qaMemory)); } catch { /* No persistent identifier is needed. */ }
    queue = []; lastRoute = null;
    if (client && typeof client.set_config === 'function') client.set_config({ before_send: beforeSend, opt_out_useragent_filter: true });
    initialize(); scheduleRoute();
    return allowed();
  }
  function endQA() {
    qaMemory = null;
    try { sessionStorage.removeItem(qaStorageKey); } catch { /* The memory-only context is cleared. */ }
    queue = []; lastRoute = null;
    if (client && typeof client.set_config === 'function') client.set_config({ before_send: beforeSend, opt_out_useragent_filter: false });
  }


  function optedOut() {
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return true;
    try {
      return localStorage.getItem('site-analytics:disabled') === '1' || localStorage.getItem('dongpo:metrics:disabled') === '1';
    } catch { return true; }
  }
  function routePath() {
    // Hash anchors and search/filter/UTM parameters do not create extra pageviews.
    var path = location.pathname;
    if (config.hashRouting && /^#\/[a-z0-9/_-]*$/i.test(location.hash)) path = location.hash.slice(1);
    return path.replace(/\/index\.html$/, '/') || '/';
  }
  function publicPath(path) {
    var parts = path.split('/').filter(Boolean);
    if (parts.some(function (part) { return (config.excludedPathSegments || []).indexOf(part.toLowerCase()) >= 0; })) return false;
    if (/\b(?:@|%40|%3f|%23)\b/i.test(path) || path.length > 300) return false;
    if (config.siteId === 'seen-person-kit' && /\/practice\/SC(?:10|11)(?:\/|$)/i.test(path)) return false;
    return (config.publicRoutePatterns || ['^/$']).some(function (pattern) { return new RegExp(pattern).test(path); });
  }
  function enabled() {
    if (!config.posthogKey || !config.posthogHost || config.enabled === false) return false;
    var local = ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) >= 0;
    if (config.mode === 'local') return local;
    if (qaRequested() && !qaContext()) return false;
    if (config.mode !== 'production' || local) return false;
    if (!qaContext() && (navigator.webdriver || /bot|crawler|spider|headless|lighthouse|preview|prerender/i.test(navigator.userAgent || ''))) return false;
    return location.protocol === 'https:' && (config.productionOrigins || []).indexOf(location.origin) >= 0;
  }
  function allowed() { return enabled() && !optedOut() && publicPath(routePath()); }
  function contentId(path) {
    return path.replace(/^\/(?:en|zh|zh-CN)(?=\/)/, '').split('/').filter(Boolean).pop() || 'home';
  }
  function contentType(path) {
    var first = path.replace(/^\/(?:en|zh|zh-CN)(?=\/)/, '/').split('/').filter(Boolean)[0];
    if (!first) return 'landing';
    if (/^(about|sources|credits|privacy|evidence)$/.test(first)) return 'information';
    if (/^(tools|practice|compare|experiments|labs)$/.test(first)) return 'tool';
    if (/^(play|games?|levels)$/.test(first)) return 'game';
    return 'content';
  }
  function source() {
    try {
      var value = new URL(location.href).searchParams.get('utm_source');
      var channels = { xhs: 'xiaohongshu', xiaohongshu: 'xiaohongshu', zhihu: 'zhihu', wechat: 'wechat', weixin: 'wechat', github: 'github', chatgpt: 'ai_search', perplexity: 'ai_search', gemini: 'ai_search', copilot: 'ai_search' };
      if (channels[value]) return channels[value];
      if (!document.referrer) return 'direct';
      var host = new URL(document.referrer).hostname;
      if (host === location.hostname) return 'internal';
      if (/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai)$/.test(host)) return 'ai_search';
      if (/(^|\.)(google\.[a-z.]+|bing\.com|baidu\.com|duckduckgo\.com)$/.test(host)) return 'search';
      return 'referral';
    } catch { return 'other'; }
  }
  var entrySource = source();
  try {
    var savedSource = JSON.parse(sessionStorage.getItem('website-foundation:source:v1') || 'null');
    if (savedSource && ['direct', 'search', 'referral', 'ai_search', 'xiaohongshu', 'zhihu', 'wechat', 'github', 'other'].indexOf(savedSource.source) >= 0 && Date.now() - savedSource.last < 30 * 60 * 1000) entrySource = savedSource.source;
    if (entrySource === 'internal') entrySource = 'direct';
    sessionStorage.setItem('website-foundation:source:v1', JSON.stringify({ source: entrySource, last: Date.now() }));
  } catch { /* Acquisition classification needs no identifier. */ }
  function safeTitle(path) { return config.pageTitles && config.pageTitles[path] || config.siteName; }
  function sanitize(properties) {
    var result = {};
    Object.entries(properties || {}).forEach(function (entry) {
      var key = entry[0], value = entry[1];
      if (numberProperties.has(key) && typeof value === 'number' && Number.isFinite(value) && value >= 0) result[key] = value;
      if (!stringProperties.has(key) || typeof value !== 'string' || value.length > 100) return;
      if (key === 'destination_domain') {
        if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) result[key] = value.toLowerCase();
      } else if (/^[a-z0-9][a-z0-9_.:/-]{0,99}$/i.test(value) && !/@|https?:|token|password|secret/i.test(value)) result[key] = value;
    });
    return result;
  }
  function properties(extra) {
    var path = routePath();
    try { sessionStorage.setItem('website-foundation:source:v1', JSON.stringify({ source: entrySource, last: Date.now() })); } catch { /* No persistent visitor information here. */ }
    return Object.assign({ site_id: config.siteId, site_name: config.siteName, environment: config.mode === 'local' ? 'local' : 'production', path: path, page_title: safeTitle(path), content_id: contentId(path), content_type: contentType(path), source: entrySource, entry_source: entrySource }, sanitize(extra));
  }
  function beforeSend(event) {
    if (!event || !allowed()) return null;
    if (event.event !== '$pageview' && event.event !== '$exception' && !standard.has(event.event) && !originals.has(event.event)) return null;
    var old = event.properties || {}, clean = sanitize(old);
    ['distinct_id', '$device_id', '$session_id', '$window_id', '$insert_id', '$lib', '$lib_version', '$time'].forEach(function (key) { if (old[key] != null) clean[key] = old[key]; });
    // The SDK's public ingestion token is required for transport authentication.
    // Always use the validated configuration, never a caller-supplied token.
    clean.token = config.posthogKey;
    clean.$process_person_profile = false;
    var path = typeof old.path === 'string' && publicPath(old.path) ? old.path : routePath();
    Object.assign(clean, { site_id: config.siteId, site_name: config.siteName, environment: config.mode === 'local' ? 'local' : 'production', path: path, page_title: old.page_title || config.siteName, $title: old.page_title || config.siteName, $current_url: location.origin + path, $pathname: path, $host: location.hostname, $geoip_disable: true });
    if (config.mode === 'local') { clean.test_run_id = config.testRunId || 'manual-local'; clean.is_test = true; }
    var qa = qaContext();
    if (qa) { clean.is_test = true; clean.test_run_id = qa.runId; clean.qa_source = 'release_acceptance'; }
    else if (old.is_test === true) {
      clean.is_test = true;
      if (/^[a-z0-9][a-z0-9_-]{7,99}$/i.test(old.test_run_id || '')) clean.test_run_id = old.test_run_id;
      if (old.qa_source === 'release_acceptance') clean.qa_source = old.qa_source;
    } else if (config.mode !== 'local') clean.is_test = false;
    clean.collection_version = 'foundation-qa-20261018';
    clean.traffic_kind = clean.is_test ? 'qa' : 'browser_candidate';
    // No raw errors, stack frames, queries, full referrers, person properties or form values.
    if (event.event === '$exception') clean.$exception_list = [{ type: 'Error', value: 'Runtime error; message and stack omitted' }];
    event.properties = clean;
    return event;
  }
  function flush() {
    if (!client || !allowed()) { if (optedOut()) queue = []; return; }
    var pending = queue; queue = [];
    pending.forEach(function (entry) {
      if (Date.now() - entry.at > 30000 || !publicPath(entry.props.path)) return;
      try { client.capture(entry.name, entry.props); } catch { /* Analytics cannot interrupt the product. */ }
    });
  }
  function initialize() {
    if (!allowed() || client || initializing) return;
    if (config.sdkAdapter === 'sushi') {
      client = window.__siteFoundationPosthog || null;
      if (client) flush();
      return;
    }
    initializing = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = '/vendor/posthog-1.435.9.js';
    script.onerror = function () { initializing = false; queue = []; };
    script.onload = function () {
      if (!allowed()) { initializing = false; return; }
      var sdk = window.posthog;
      if (!sdk || !sdk.init) { initializing = false; return; }
      // A pre-existing SDK has one owner; do not initialize it a second time.
      if (sdk.__loaded) { client = sdk; sdk.set_config({ capture_pageview: false, autocapture: false, persistence: config.anonymousSessionOnly ? 'memory' : 'localStorage', disable_persistence: config.anonymousSessionOnly === true, person_profiles: 'never', before_send: beforeSend, opt_out_useragent_filter: Boolean(qaContext()) }); flush(); return; }
      sdk.init(config.posthogKey, { api_host: config.posthogHost, defaults: '2026-05-30', capture_pageview: false, capture_pageleave: false, autocapture: false, capture_exceptions: false, capture_heatmaps: false, capture_dead_clicks: false, capture_performance: false, enable_recording_console_log: false, logs: { captureConsoleLogs: false }, disable_external_dependency_loading: true, disable_session_recording: true, disable_surveys: true, disable_product_tours: true, person_profiles: 'never', persistence: config.anonymousSessionOnly ? 'memory' : 'localStorage', disable_persistence: config.anonymousSessionOnly === true, respect_dnt: true, ip: false, before_send: beforeSend, opt_out_useragent_filter: Boolean(qaContext()), loaded: function (instance) { client = instance; flush(); } });
    };
    document.head.appendChild(script);
  }
  function capture(name, extra) {
    if (!allowed() || document.visibilityState === 'hidden') return false;
    var props = properties(extra);
    if (client) { try { client.capture(name, props); } catch { return false; } }
    else if (queue.length < 100) { queue.push({ name: name, props: props, at: Date.now() }); initialize(); }
    else return false;
    return true;
  }
  function trackEvent(name, extra) {
    if (!standard.has(name) && !originals.has(name)) return false;
    // Purchases are deliberately absent: a verified server webhook must own that event.
    if (!allowed()) return false;
    if (config.siteId === 'seen-person-kit' && /^SC(?:10|11)$/i.test(extra && extra.content_id || '')) return false;
    if (name === 'content_opened') {
      var openedId = extra && extra.content_id || contentId(routePath());
      if (lastOpened && lastOpened.id === openedId && Date.now() - lastOpened.at < 500) return false;
      lastOpened = { id: openedId, at: Date.now() };
    }
    if (name === 'content_completed' || name === 'scroll_depth') {
      var key = [name, extra && extra.content_id || contentId(routePath()), extra && extra.percent || ''].join('|');
      if (routeSeen.has(key)) return false;
      routeSeen.add(key);
    }
    if (name === 'tool_started' || name === 'game_started') {
      var id = extra && extra.content_id || contentId(routePath());
      extra = Object.assign({}, extra);
      extra.attempt_id = extra.attempt_id || crypto.randomUUID();
      attempts.set(id, { id: extra.attempt_id, started: Date.now() });
    }
    if (name === 'tool_completed' || name === 'game_completed' || name === 'game_ended') {
      var attempt = attempts.get(extra && extra.content_id || contentId(routePath()));
      extra = Object.assign({}, extra);
      if (attempt) { extra.attempt_id = extra.attempt_id || attempt.id; extra.duration = Math.round((Date.now() - attempt.started) / 1000); }
      var attemptKey = name + '|' + (extra.attempt_id || lastRoute) + '|' + (extra.content_id || 'primary');
      if (attemptSeen.has(attemptKey)) return false;
      attemptSeen.add(attemptKey);
    }
    return capture(name, extra);
  }
  function trackBusiness(name, detail) {
    if (!originals.has(name) || !allowed()) return false;
    detail = detail || {};
    if (config.siteId === 'seen-person-kit' && /^SC(?:10|11)$/i.test(detail.contentId || '')) return false;
    var data = sanitize({ content_id: detail.contentId, mode: detail.mode, outcome: detail.outcome, attempt_id: detail.attemptId, source: 'product' });
    // Keep native milestones and add a common funnel vocabulary at the same real trigger.
    var key = ['native', name, data.content_id, data.attempt_id || lastRoute].join('|');
    if (routeSeen.has(key)) return false;
    routeSeen.add(key);
    capture(name, data);
    if (openEvents.has(name)) trackEvent('content_opened', data);
    if (completedEvents.has(name)) trackEvent('content_completed', Object.assign({ duration: Math.round((Date.now() - routeStarted) / 1000) }, data));
    if (toolStarts.has(name)) trackEvent('tool_started', data);
    if (toolEnds.has(name)) trackEvent('tool_completed', data);
    if (name === 'game_start') trackEvent('game_started', data);
    if (name === 'game_end' || name === 'game_failure') trackEvent(data.outcome === 'completed' ? 'game_completed' : 'game_ended', data);
    if (name === 'chapter_next') trackEvent('next_content_clicked', data);
    if (name === 'share') trackEvent('share_clicked', Object.assign({ platform: 'copy' }, data));
    return true;
  }
  function pageView() {
    if (!allowed()) { lastRoute = null; queue = []; return; }
    var path = routePath();
    if (document.visibilityState === 'hidden' || path === lastRoute) return;
    lastRoute = path; routeSeen.clear(); lastOpened = null; routeStarted = Date.now();
    window.dispatchEvent(new Event('site-foundation:route'));
    if (config.sdkAdapter !== 'sushi') capture('$pageview');
    if (contentType(path) === 'content' && path.split('/').filter(Boolean).length >= 2) trackEvent('content_opened');
  }
  var routeScheduled = false;
  function scheduleRoute() {
    if (routeScheduled) return;
    routeScheduled = true;
    // Let the router commit its title before capturing the new path.
    window.setTimeout(function () { routeScheduled = false; pageView(); }, 0);
  }
  function bridge() {
    var legacy = window.portfolioAnalytics;
    if (!legacy) {
      window.portfolioAnalytics = { version: 4, __posthogBridge: true, action: trackBusiness, track: function (name) { if (name === 'share') return trackEvent('share_clicked', { platform: 'copy' }); return false; }, optOut: function (value) { window.websiteAnalytics.optOut(value); } };
      (window.__portfolioActions || []).slice(0, 40).forEach(function (entry) { trackBusiness(entry.name, entry.context); });
      window.__portfolioActions = [];
      return;
    }
    if (legacy.__posthogBridge) return;
    var action = legacy.action;
    if (typeof action === 'function') legacy.action = function (name, detail) { trackBusiness(name, detail); return action.apply(this, arguments); };
    var track = legacy.track;
    if (typeof track === 'function') legacy.track = function (name) { if (name === 'share') trackEvent('share_clicked', { platform: 'copy' }); return track.apply(this, arguments); };
    legacy.__posthogBridge = true;
  }
  function consentChanged() {
    if (optedOut()) { queue = []; routeSeen.clear(); client && client.opt_out_capturing(); lastRoute = null; }
    else { client && client.opt_in_capturing(); initialize(); scheduleRoute(); }
  }
  window.websiteAnalytics = {
    entrySource: entrySource,
    beginQA: beginQA, endQA: endQA,
    trackEvent: trackEvent, trackBusiness: trackBusiness,
    trackContentOpen: function (data) { return trackEvent('content_opened', data); },
    trackContentComplete: function (data) { return trackEvent('content_completed', data); },
    trackShare: function (data) { return trackEvent('share_clicked', data); },
    trackOutboundClick: function (data) { return trackEvent('outbound_clicked', data); },
    trackAffiliate: function (data) { return trackEvent('affiliate_clicked', data); },
    trackCTA: function (data) { return trackEvent('cta_clicked', data); },
    trackSignupStarted: function (data) { return trackEvent('signup_started', data); },
    trackSignupCompleted: function (data) { return trackEvent('signup_completed', data); },
    trackCheckoutStarted: function (data) { return trackEvent('checkout_started', data); },
    optOut: function (value) { try { localStorage.setItem('site-analytics:disabled', value === false ? '0' : '1'); } catch { return; } consentChanged(); window.dispatchEvent(new Event('site-analytics-preference')); },
    status: function () { var qa = qaContext(); return { enabled: enabled(), allowed: allowed(), ready: Boolean(client), queued: queue.length, site_id: config.siteId, environment: config.mode, path: routePath(), collection_version: 'foundation-qa-20261018', qa: Boolean(qa), qa_run_id: qa && qa.runId || null }; }
  };
  ['pushState', 'replaceState'].forEach(function (method) { var original = history[method]; history[method] = function () { var result = original.apply(this, arguments); scheduleRoute(); return result; }; });
  window.addEventListener('popstate', scheduleRoute);
  if (config.hashRouting) window.addEventListener('hashchange', scheduleRoute);
  window.addEventListener('pageshow', function (event) { if (event.persisted) { lastRoute = null; scheduleRoute(); } });
  ['site-analytics-preference', 'dongpo-metrics-preference', 'storage'].forEach(function (name) { window.addEventListener(name, consentChanged); });
  window.addEventListener('site-foundation:posthog-ready', function () { initialize(); flush(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { scheduleRoute(); flush(); } });
  document.addEventListener('portfolio-analytics:action', function (event) { var data = event.detail || {}; trackBusiness(data.name, data.context); });
  document.addEventListener('site-foundation:event', function (event) { var data = event.detail || {}; trackEvent(data.name, data.properties); });
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target : null;
    if (!target || !allowed()) return;
    var milestone = target.closest('[data-analytics-action]');
    if (milestone) trackBusiness(milestone.getAttribute('data-analytics-action'), { contentId: milestone.getAttribute('data-analytics-content'), mode: milestone.getAttribute('data-analytics-mode'), outcome: milestone.getAttribute('data-analytics-outcome') });
    var content = target.closest('[data-content-id]');
    if (content) trackEvent('content_opened', { content_id: content.getAttribute('data-content-id'), content_type: content.getAttribute('data-content-type') || 'content', source: 'card' });
    var share = target.closest('[data-share-platform]');
    if (share) trackEvent('share_clicked', { platform: share.getAttribute('data-share-platform') || 'copy' });
    var anchor = target.closest('a[href]');
    if (!anchor) return;
    try {
      var url = new URL(anchor.getAttribute('href'), location.href);
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.origin !== location.origin) trackEvent('outbound_clicked', { destination_domain: url.hostname, link_type: 'external' });
      else if (publicPath(url.pathname) && contentType(routePath()) === 'content' && contentType(url.pathname) === 'content' && url.pathname !== routePath()) trackEvent('next_content_clicked', { from_content: contentId(routePath()), to_content: contentId(url.pathname) });
    } catch { /* Ignore incomplete and non-web URLs. */ }
  }, true);
  window.addEventListener('scroll', function () {
    if (scrollScheduled || !allowed()) return;
    scrollScheduled = true;
    window.requestAnimationFrame(function () {
      scrollScheduled = false;
      var root = document.scrollingElement || document.documentElement;
      var maximum = root.scrollHeight - root.clientHeight;
      if (maximum < 100 || root.scrollTop <= 0) return;
      var depth = Math.min(100, root.scrollTop / maximum * 100);
      [50, 90].forEach(function (threshold) { if (depth >= threshold) trackEvent('scroll_depth', { percent: threshold }); });
    });
  }, { passive: true });
  window.addEventListener('error', async function (event) {
    if (!allowed() || !event.error || errors.size >= 10 || config.sdkAdapter === 'sushi' && config.mode === 'local') return;
    var kind = /^(TypeError|ReferenceError|RangeError|SyntaxError|URIError|EvalError)$/.test(event.error.name) ? event.error.name : 'Error';
    var file = 'external';
    try { var url = new URL(event.filename, location.origin); if (url.origin === location.origin) file = url.pathname; } catch { /* No message or full URL. */ }
    var seed = [kind, file, event.lineno || 0, event.colno || 0].join('|');
    if (errors.has(seed)) return;
    errors.add(seed);
    try { var hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)); trackEvent('client_error', { error_type: kind, signature: Array.from(new Uint8Array(hash)).map(function (value) { return value.toString(16).padStart(2, '0'); }).join('').slice(0, 32) }); } catch { /* Error reporting stays optional. */ }
  });
  var early = window.__siteFoundationEvents || []; window.__siteFoundationEvents = [];
  function start() {
    bridge(); pageView();
    early.slice(0, 100).forEach(function (entry) { trackEvent(entry.name, entry.properties); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());




/* BEGIN VERCEL NATIVE ANALYTICS 2026-10-11 */
window.__VERCEL_NATIVE_CONFIG__={"siteId":"learn","sdkVersion":"2.0.1","productionOrigins":["https://learn-gray-ten.vercel.app","https://learn-makesense2022s-projects.vercel.app"],"excludedPathSegments":["404","_not-found","_error","api","admin","private","auth","login","sign-in","sign-up","account","settings","journal","notes","notebook","records","health-profile","self-test","checkout","payment","review","preview","fixtures","debug","internal","saved","wishlist","chat","onboarding","my-practice","success","feedback","listen","demos","dashboard","workspace","messages","profile","users","tasks","todo","history"],"publicRoutePatterns":["^/$"]};
/* @vercel/analytics 2.0.1. Official inject/pageview with fleet privacy adapter.
The MIT License (MIT)

Copyright (c) 2026 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
(()=>{var S=()=>{window.va||(window.va=function(...i){window.vaq||(window.vaq=[]),window.vaq.push(i)})},_="@vercel/analytics",$="2.0.1";function b(){return typeof window<"u"}function E(){try{let t="production";if(t==="development"||t==="test")return"development"}catch{}return"production"}function A(t="auto"){if(t==="auto"){window.vam=E();return}window.vam=t}function j(){return(b()?window.vam:E())||"production"}function h(){return j()==="development"}function x(t){return t.scriptSrc?l(t.scriptSrc):h()?"https://va.vercel-scripts.com/v1/script.debug.js":t.basePath?l(`${t.basePath}/insights/script.js`):"/_vercel/insights/script.js"}function C(t,i){var a;let e=t;if(i)try{e={...(a=JSON.parse(i))==null?void 0:a.analytics,...t}}catch{}A(e.mode);let r={sdkn:_+(e.framework?`/${e.framework}`:""),sdkv:$};return e.disableAutoTrack&&(r.disableAutoTrack="1"),e.viewEndpoint&&(r.viewEndpoint=l(e.viewEndpoint)),e.eventEndpoint&&(r.eventEndpoint=l(e.eventEndpoint)),e.sessionEndpoint&&(r.sessionEndpoint=l(e.sessionEndpoint)),h()&&e.debug===!1&&(r.debug="false"),e.dsn&&(r.dsn=e.dsn),e.endpoint?r.endpoint=e.endpoint:e.basePath&&(r.endpoint=l(`${e.basePath}/insights`)),{beforeSend:e.beforeSend,src:x(e),dataset:r}}function l(t){return t.startsWith("http://")||t.startsWith("https://")||t.startsWith("/")?t:`/${t}`}function k(t={debug:!0},i){var a;if(!b())return;let{beforeSend:e,src:r,dataset:v}=C(t,i);if(S(),e&&((a=window.va)==null||a.call(window,"beforeSend",e)),document.head.querySelector(`script[src*="${r}"]`))return;let c=document.createElement("script");c.src=r;for(let[s,m]of Object.entries(v))c.dataset[s]=m;c.defer=!0,c.onerror=()=>{let s=h()?"Please check if any ad blockers are enabled and try again.":"Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.";console.log(`[Vercel Web Analytics] Failed to load script from ${r}. ${s}`)},document.head.appendChild(c)}function g({route:t,path:i}){var a;(a=window.va)==null||a.call(window,"pageview",{route:t,path:i})}var d=window.__VERCEL_NATIVE_CONFIG__;if(d&&!window.vercelNativeAnalytics&&window.top===window.self){let t=!1,i=null,a="/__vercel-native-bootstrap__",e={sdk:"@vercel/analytics",version:"2.0.1",initialized:!1,reason:"pending"},r=()=>{if(document.body&&!document.querySelector('a[href*="privacy"]')&&!document.getElementById("vercel-native-privacy-link")){let u=document.createElement("a");u.id="vercel-native-privacy-link",u.href="/vercel-analytics-privacy.html",u.textContent="\u8BBF\u95EE\u7EDF\u8BA1\u4E0E\u5173\u95ED\u9009\u9879",u.style.cssText="display:block;width:fit-content;margin:1.5rem auto;padding:.4rem;font:12px/1.5 system-ui;color:inherit;opacity:.7",document.body.append(u)}if(!/privacy(?:\.html)?\/?$/.test(location.pathname)||document.getElementById("vercel-native-privacy"))return;let n=document.createElement("section");n.id="vercel-native-privacy";let o=document.createElement("h2");o.textContent="Vercel \u8BBF\u95EE\u5206\u6790";let f=document.createElement("p");f.textContent="\u6B63\u5F0F Vercel \u57DF\u540D\u4F7F\u7528 Vercel Web Analytics \u7EDF\u8BA1\u7ECF\u8FC7\u7B5B\u9009\u7684\u516C\u5F00\u9875\u9762\u8BBF\u95EE\u3002\u6D4F\u89C8\u5668\u901A\u8FC7\u672C\u7AD9\u8DEF\u5F84\u53D1\u9001\u516C\u5F00\u9875\u9762\u5730\u5740\uFF1B\u672C\u63A5\u5165\u4F1A\u79FB\u9664\u67E5\u8BE2\u53C2\u6570\u3001\u7247\u6BB5\u548C\u539F\u59CB\u6765\u6E90\u7F51\u5740\uFF0C\u4E0D\u4E0A\u4F20\u8868\u5355\u3001\u641C\u7D22\u3001\u5065\u5EB7\u6216\u8D22\u52A1\u8F93\u5165\uFF0C\u4E0D\u8C03\u7528\u8EAB\u4EFD\u8BC6\u522B\u3001Cookie \u6216\u81EA\u5B9A\u4E49\u4E8B\u4EF6\u3002\u670D\u52A1\u7AEF\u53EF\u80FD\u6839\u636E\u7F51\u7EDC\u8BF7\u6C42\u7EDF\u8BA1\u7C97\u7565\u5730\u533A\u3001\u8BBE\u5907\u548C\u6D4F\u89C8\u5668\u4FE1\u606F\uFF0C\u57FA\u7840\u8BBE\u65BD\u65E5\u5FD7\u6309 Vercel \u7684\u9690\u79C1\u653F\u7B56\u5904\u7406\u3002";let p=document.createElement("p");p.textContent="\u4E0B\u65B9\u73B0\u6709\u5173\u95ED\u5F00\u5173\u3001Do Not Track \u548C Global Privacy Control \u540C\u65F6\u63A7\u5236\u672C\u6B21 Vercel \u63A5\u5165\u3002\u672C\u5730\u5F00\u53D1\u3001\u4E34\u65F6\u9884\u89C8\u53CA\u79C1\u6709\u8DEF\u5F84\u4E0D\u53D1\u9001\u6D4F\u89C8\u4E8B\u4EF6\u3002\u5173\u95ED\u53EA\u505C\u6B62\u540E\u7EED\u6536\u96C6\uFF0C\u4E0D\u4EE3\u8868\u5220\u9664\u5386\u53F2\u6570\u636E\u3002";let y=document.createElement("a");y.href="https://vercel.com/legal/privacy-policy",y.textContent="Vercel \u9690\u79C1\u653F\u7B56",n.append(o,f,p,y),(document.querySelector("[data-website-foundation-privacy]")||document.querySelector("main")||document.body).append(n)};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",r,{once:!0}):r();let v=()=>{if(navigator.doNotTrack==="1"||navigator.globalPrivacyControl===!0)return!0;try{return["site-analytics:disabled","dongpo:metrics:disabled"].some(n=>localStorage.getItem(n)==="1")}catch{return!0}},c=()=>location.protocol==="https:"&&d.productionOrigins.includes(location.origin)&&!v(),s=n=>n===a||n.length>300||/[%@]/.test(n)||n.split("/").some(o=>d.excludedPathSegments.includes(o.toLowerCase()))||d.siteId==="seen-person-kit"&&/\/practice\/SC(?:10|11)(?:\/|$)/i.test(n)?!1:d.publicRoutePatterns.some(o=>new RegExp(o).test(n)),m=n=>{if(!c()||n.type!=="pageview")return null;try{let o=new URL(n.url);return!d.productionOrigins.includes(o.origin)||!s(o.pathname)?null:(o.search="",o.hash="",o.username="",o.password="",{type:"pageview",url:o.href})}catch{return null}},w=()=>{let n=location.pathname.replace(/\/index\.html$/,"/")||"/";if(!c()||!s(n)){e.reason="environment-or-privacy",i=null;return}if(!t){if(document.querySelector('script[src*="/_vercel/insights/script.js"],script[src*="/va/script.js"]')){e.reason="existing-sdk";return}k({mode:"production",disableAutoTrack:!0,beforeSend:m}),window.va("reset"),g({path:a}),t=!0,e.initialized=!0}n!==i&&(i=n,g({path:n}),e.reason="active")};window.vercelNativeAnalytics={status:()=>({...e,allowed:c()&&s(location.pathname)})};for(let n of["pushState","replaceState"]){let o=history[n];history[n]=function(...f){let p=o.apply(this,f);return w(),p}}for(let n of["popstate","site-analytics-preference","dongpo-metrics-preference","storage"])window.addEventListener(n,w);w()}})();

/* END VERCEL NATIVE ANALYTICS */
