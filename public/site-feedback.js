window.__SITE_FEEDBACK_CONFIG__ = {"enabled":true,"email":"zhangjunnan510@gmail.com","siteId":"learn","name":"Resume Assistant","tone":"light","sensitive":true,"allowIframe":false,"publicPaths":["/"]};
/* Projects feedback v1.0.0. No SDK, network submission, or persistent drafts. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.document) return;
  var config = window.__SITE_FEEDBACK_CONFIG__;
  if (!config || config.enabled === false || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(config.email || '')) return;
  if ((window.top !== window.self && !config.allowIframe) || document.querySelector('site-feedback')) return;
  var source = document.currentScript && document.currentScript.src;
  var cssUrl = config.cssText ? '' : new URL('site-feedback.css', source || document.baseURI).href;
  var kinds = { suggestion: '改进建议', problem: '使用问题', contact: '其他联系' };
  var host, shadow, dialog, textarea, status, launcher, gmail, mail, selected = 'suggestion';

  function interaction(action, domain) {
    // Only fixed enums reach the existing adapter. Never pass drafts, email addresses or URLs.
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    try {
      if (localStorage.getItem('site-analytics:disabled') === '1' || localStorage.getItem('dongpo:metrics:disabled') === '1') return;
    } catch (_) { return; }
    var analytics = window.websiteAnalytics;
    if (!analytics || typeof analytics.trackEvent !== 'function') return;
    try {
      if (domain) analytics.trackEvent('outbound_clicked', { destination_domain: domain, link_type: 'feedback_email' });
      else analytics.trackEvent('cta_clicked', { cta_name: 'feedback_' + action, cta_location: 'feedback_widget' });
    } catch (_) { /* Contact remains usable when the existing adapter is unavailable. */ }
  }
  function pageContext() {
    // Exact configured public paths only. Private routes, queries, fragments and document titles are absent.
    var path = location.pathname.replace(/\/$/, '') || '/';
    var paths = config.publicPaths || [];
    var publicPage = paths.some(function (item) { return (item.replace(/\/$/, '') || '/') === path; });
    if (config.sensitive || !publicPage) return '';
    if (!/^https?:$/.test(location.protocol)) return '';
    return location.origin + location.pathname;
  }
  function message() {
    var lines = ['项目：' + config.name, '项目标识：' + config.siteId, '类型：' + kinds[selected]];
    var checkbox = shadow.querySelector('#feedback-include-page');
    var page = pageContext();
    if (page && checkbox.checked) lines.push('公开页面：' + page);
    lines.push('', textarea.value.trim());
    return lines.join('\n');
  }
  function links() {
    var subject = '[' + config.name + '] ' + kinds[selected];
    var body = message();
    var url = new URL('https://mail.google.com/mail/');
    url.search = new URLSearchParams({ view: 'cm', fs: '1', to: config.email, su: subject, body: body }).toString();
    return { gmail: url.href, mail: 'mailto:' + config.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) };
  }
  function update() {
    var urls = links();
    gmail.href = urls.gmail;
    mail.href = urls.mail;
    shadow.querySelector('#feedback-count').textContent = textarea.value.length + ' / 1200';
    if (textarea.value.trim()) textarea.removeAttribute('aria-invalid');
  }
  function valid() {
    if (!textarea.value.trim()) {
      textarea.setAttribute('aria-invalid', 'true');
      status.textContent = '请先写下你遇到的问题或建议。';
      textarea.focus();
      return false;
    }
    update();
    return true;
  }
  async function copy(text, label) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      status.textContent = label + '已复制。';
      interaction('copy');
    } catch (_) {
      var fallback = shadow.querySelector('#feedback-copy-fallback');
      fallback.hidden = false;
      var field = fallback.querySelector('textarea');
      field.value = text;
      field.focus();
      field.select();
      status.textContent = '浏览器暂时无法复制，请选中下面的文字后手动复制。';
    }
  }
  function refreshVisibility() {
    var active = document.pointerLockElement || document.fullscreenElement;
    launcher.hidden = Boolean(active);
  }
  function open() {
    if (dialog.open) return;
    status.textContent = '';
    shadow.querySelector('#feedback-copy-fallback').hidden = true;
    var page = pageContext();
    shadow.querySelector('#feedback-page-option').hidden = !page;
    shadow.querySelector('#feedback-page-label').textContent = page ? '附上当前公开页面链接' : '';
    update();
    if (typeof dialog.showModal !== 'function') {
      // Older browsers can still contact the author without a custom modal implementation.
      location.href = 'mailto:' + config.email + '?subject=' + encodeURIComponent('[' + config.name + '] 联系作者');
      return;
    }
    dialog.showModal();
    launcher.setAttribute('aria-expanded', 'true');
    textarea.focus({ preventScroll: true });
    interaction('open');
  }
  function mount() {
    if (document.querySelector('site-feedback')) return;
    host = document.createElement('site-feedback');
    host.setAttribute('data-version', '1.0.0');
    host.setAttribute('lang', 'zh-CN');
    host.setAttribute('data-tone', config.tone === 'dark' ? 'dark' : 'light');
    host.setAttribute('data-nosnippet', '');
    host.className = 'ph-no-capture ph-no-record';
    host.hidden = true;
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button class="launcher" type="button" aria-haspopup="dialog" aria-controls="feedback-dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a7.8 7.8 0 0 1-.8 3.4 7.9 7.9 0 0 1-7.2 4.6 8 8 0 0 1-3.5-.8L4 20l1.3-4.5a8 8 0 0 1-.8-3.5 7.9 7.9 0 0 1 4.6-7.2 7.8 7.8 0 0 1 3.4-.8h.5a7.9 7.9 0 0 1 7 7v.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 10h6M9 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>联系 / 建议</span></button>' +
      '<dialog id="feedback-dialog" aria-labelledby="feedback-title" aria-describedby="feedback-description" closedby="any"><div class="heading"><div><p class="eyebrow">一起把这里变得更好</p><h2 id="feedback-title">你的想法，我想听听</h2></div><button class="close" type="button" aria-label="关闭反馈窗口">×</button></div>' +
      '<p id="feedback-description" class="description">发现问题、有个建议，或只是想联系我，都可以在这里说。</p><p class="project"><span class="project-dot" aria-hidden="true"></span><span id="feedback-project"></span></p>' +
      '<form novalidate><fieldset><legend>你想聊什么</legend><div class="kinds"><label><input type="radio" name="feedback-kind" value="problem"><span>使用问题</span></label><label><input type="radio" name="feedback-kind" value="suggestion" checked><span>改进建议</span></label><label><input type="radio" name="feedback-kind" value="contact"><span>其他联系</span></label></div></fieldset>' +
      '<div class="field-heading"><label for="feedback-message">写下你的想法</label><span id="feedback-count">0 / 1200</span></div><textarea id="feedback-message" name="feedback-message" rows="4" maxlength="1200" placeholder="例如：我在手机上打开这一页时，按钮被挡住了……" aria-describedby="feedback-privacy feedback-status"></textarea>' +
      '<label class="page-option" id="feedback-page-option" hidden><input id="feedback-include-page" type="checkbox" checked><span id="feedback-page-label"></span></label>' +
      '<p class="privacy" id="feedback-privacy"></p><div class="actions"><a class="primary" id="feedback-gmail" target="_blank" rel="noopener noreferrer">打开 Gmail 草稿 <span aria-hidden="true">↗</span></a><a class="secondary" id="feedback-mail">用其他邮箱</a><button class="secondary" id="feedback-copy-message" type="button">复制内容</button></div>' +
      '<p class="send-note">在邮箱里确认发送后，我才能收到这封邮件。</p><div class="copy-fallback" id="feedback-copy-fallback" hidden><label for="feedback-copy-text">可手动复制的内容</label><textarea id="feedback-copy-text" rows="4" readonly></textarea></div>' +
      '<p class="status" id="feedback-status" role="status" aria-live="polite"></p></form><div class="contact"><span>也可以直接写信</span><button id="feedback-copy-email" type="button"></button><span class="copy-hint">点击复制邮箱</span></div></dialog>';
    if (config.cssText) {
      var style = document.createElement('style');
      style.textContent = config.cssText;
      shadow.prepend(style);
      host.hidden = false;
    } else {
      var stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = cssUrl;
      stylesheet.addEventListener('load', function () { host.hidden = false; });
      shadow.prepend(stylesheet);
    }
    launcher = shadow.querySelector('.launcher');
    dialog = shadow.querySelector('dialog');
    textarea = shadow.querySelector('#feedback-message');
    status = shadow.querySelector('#feedback-status');
    gmail = shadow.querySelector('#feedback-gmail');
    mail = shadow.querySelector('#feedback-mail');
    shadow.querySelector('#feedback-project').textContent = config.name;
    shadow.querySelector('#feedback-copy-email').textContent = config.email;
    shadow.querySelector('#feedback-privacy').textContent = config.sensitive
      ? '只反馈网站的使用问题，请勿填写健康记录、财务数据或其他私人信息。内容临时留在本页；打开草稿时才交给所选邮箱服务。'
      : '内容临时留在本页，不进入访问统计。打开草稿时才交给所选邮箱服务；请勿填写敏感个人信息。';
    launcher.addEventListener('click', open);
    shadow.querySelector('.close').addEventListener('click', function () { dialog.close(); });
    // Some browser versions cross the Shadow DOM boundary while wrapping native dialog focus.
    dialog.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var controls = Array.from(dialog.querySelectorAll('button, a[href], input, textarea')).filter(function (element) {
        return !element.disabled && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      });
      var first = controls[0], last = controls[controls.length - 1], active = shadow.activeElement;
      if ((!event.shiftKey && active === last) || (event.shiftKey && active === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    });
    dialog.addEventListener('close', function () { launcher.setAttribute('aria-expanded', 'false'); launcher.focus({ preventScroll: true }); });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    shadow.querySelectorAll('input[name="feedback-kind"]').forEach(function (radio) {
      radio.addEventListener('change', function () { selected = radio.value; update(); });
    });
    textarea.addEventListener('input', update);
    shadow.querySelector('#feedback-include-page').addEventListener('change', update);
    shadow.querySelector('form').addEventListener('submit', function (event) { event.preventDefault(); if (valid()) gmail.click(); });
    gmail.addEventListener('click', function (event) {
      if (!valid()) { event.preventDefault(); return; }
      status.textContent = '请在打开的 Gmail 草稿里检查内容并确认发送。';
      interaction('gmail', 'mail.google.com');
    });
    mail.addEventListener('click', function (event) {
      if (!valid()) { event.preventDefault(); return; }
      status.textContent = '请在打开的邮件应用里检查内容并确认发送。';
      interaction('mail', 'gmail.com');
    });
    shadow.querySelector('#feedback-copy-message').addEventListener('click', function () { if (valid()) copy(message(), '反馈内容'); });
    shadow.querySelector('#feedback-copy-email').addEventListener('click', function () { copy(config.email, '邮箱地址'); });
    // Keep game/page shortcuts and pointer handlers outside this independent control.
    ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'].forEach(function (type) {
      host.addEventListener(type, function (event) { event.stopPropagation(); });
    });
    document.addEventListener('pointerlockchange', refreshVisibility);
    document.addEventListener('fullscreenchange', refreshVisibility);
    document.body.append(host);
    refreshVisibility();
    window.siteFeedback = Object.freeze({ version: '1.0.0', open: open });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
