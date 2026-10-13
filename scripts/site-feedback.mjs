import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Copy this adapter and its browser/CSS sources into each consumer. No sibling imports.
export function loadFeedback(root) {
  const file = path.join(root, 'site.feedback.json');
  if (!existsSync(file)) return null;
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (config.schemaVersion !== 1 || !config.name || !config.siteId || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(config.email || '')) throw Error('Invalid site.feedback.json');
  for (const directory of [config.publicDir || 'public', ...(config.outputs || [])]) {
    if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes('..')) throw Error('Feedback output must stay inside its consumer');
  }
  return config;
}
export function injectFeedback(html, script = '/site-feedback.js') {
  if (!/<\/body>/i.test(html) || /<script\b[^>]*\bsrc\s*=\s*["'][^"']*site-feedback\.js(?:\?[^"']*)?["']/i.test(html)) return html;
  const safe = script.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return html.replace(/<\/body>/i, '\n<script defer src="' + safe + '" data-site-feedback="v1"></script>\n</body>');
}
export function prepareFeedback(root) {
  const config = loadFeedback(root);
  if (!config) return null;
  const directory = path.join(root, config.publicDir || 'public');
  mkdirSync(directory, { recursive: true });
  const scriptDirectory = path.join(root, 'scripts');
  const source = readFileSync(path.join(scriptDirectory, 'site-feedback-browser.js'), 'utf8');
  const css = readFileSync(path.join(scriptDirectory, 'site-feedback.css'), 'utf8');
  const publicConfig = { enabled: config.enabled !== false, email: config.email, siteId: config.siteId, name: config.name, tone: config.tone, sensitive: Boolean(config.sensitive), allowIframe: Boolean(config.allowIframe), publicPaths: config.publicPaths || [] };
  const serialized = JSON.stringify(publicConfig).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  writeFileSync(path.join(directory, 'site-feedback.js'), 'window.__SITE_FEEDBACK_CONFIG__ = ' + serialized + ';\n' + source);
  writeFileSync(path.join(directory, 'site-feedback.css'), css);
  return config;
}
function htmlFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    if (item.name.startsWith('.') || ['node_modules', '_next', 'assets', 'vendor'].includes(item.name)) return [];
    const file = path.join(directory, item.name);
    return item.isDirectory() ? htmlFiles(file) : item.name.endsWith('.html') ? [file] : [];
  });
}
export function finalizeFeedback(root) {
  const config = prepareFeedback(root);
  if (!config) return { configured: false, outputs: [] };
  const publicDir = path.join(root, config.publicDir || 'public');
  const reports = [];
  for (const relative of config.outputs || []) {
    const directory = path.join(root, relative);
    if (!existsSync(directory)) { reports.push({ directory: relative, exists: false, htmlPages: 0 }); continue; }
    const files = htmlFiles(directory);
    if (!files.length) { reports.push({ directory: relative, exists: true, htmlPages: 0 }); continue; }
    if (config.bundledRuntime) {
      // Authored Data apps compile the module inside their protected bundle. Preserve its hash/manifest.
      reports.push({ directory: relative, exists: true, htmlPages: files.length, mode: 'authored-runtime' });
      continue;
    }
    for (const name of ['site-feedback.js', 'site-feedback.css']) {
      const from = path.join(publicDir, name), to = path.join(directory, name);
      if (path.resolve(from) !== path.resolve(to)) copyFileSync(from, to);
    }
    let count = 0;
    for (const file of files) {
      if ((config.excludedOutputFiles || []).includes(path.relative(directory, file).replaceAll(path.sep, '/'))) continue;
      const original = readFileSync(file, 'utf8');
      // Relative URLs also work in subdirectory/offline exports without guessing a domain.
      const resource = path.relative(path.dirname(file), path.join(directory, 'site-feedback.js')).replaceAll(path.sep, '/');
      const html = config.enabled === false ? original : injectFeedback(original, resource.startsWith('.') ? resource : './' + resource);
      if (original !== html) writeFileSync(file, html);
      count++;
    }
    reports.push({ directory: relative, exists: true, htmlPages: count });
  }
  for (const relative of config.portableFiles || []) {
    const file = path.join(root, relative);
    if (!existsSync(file)) continue;
    // Portable outputs sit outside the publish directory; keep their assets next to the HTML.
    for (const name of ['site-feedback.js', 'site-feedback.css']) copyFileSync(path.join(publicDir, name), path.join(path.dirname(file), name));
    writeFileSync(file, injectFeedback(readFileSync(file, 'utf8'), './site-feedback.js'));
  }
  return { configured: true, siteId: config.siteId, outputs: reports, deploymentPerformed: false, receiptVerified: false };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  console.log(JSON.stringify(process.argv.includes('--prepare') ? { configured: Boolean(prepareFeedback(root)), deploymentPerformed: false } : finalizeFeedback(root)));
}
