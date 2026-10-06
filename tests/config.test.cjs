const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, URL, process: { env }, Map, Date });
  return exports;
}
test('missing and placeholder configuration cannot attempt model analysis', () => {
  const { modelConfigurationReady: ready } = load('utils/model-config.ts');
  assert.equal(ready({}), false);
  assert.equal(ready({ DEEPSEEK_API_KEY: 'your_api_key_here', DEEPSEEK_API_BASE_URL: 'https://example.com/v1' }), false);
  assert.equal(ready({ DEEPSEEK_API_KEY: 'synthetic-test' }), false);
  assert.equal(ready({ DEEPSEEK_API_KEY: 'synthetic-test', DEEPSEEK_API_BASE_URL: 'http://example.com/v1' }), false);
  assert.equal(ready({ DEEPSEEK_API_KEY: 'synthetic-test', DEEPSEEK_API_BASE_URL: 'https://example.com/v1' }), true);
});
test('existing production guard keeps fail-closed configuration, auth and rate limit', () => {
  function response() { return { code: 0, setHeader() {}, status(code) { this.code = code; return this; }, json() {} }; }
  let guard = load('utils/api-guard.ts', { NODE_ENV: 'production' }).apiGuard;
  let res = response(); assert.equal(guard({ headers: {}, socket: { remoteAddress: 'local-test' } }, res), false); assert.equal(res.code, 503);
  guard = load('utils/api-guard.ts', { NODE_ENV: 'production', LEARN_API_KEY: 'synthetic-test' }).apiGuard;
  res = response(); assert.equal(guard({ headers: {}, socket: { remoteAddress: 'bad-key-test' } }, res), false); assert.equal(res.code, 401);
  const req = { headers: { 'x-api-key': 'synthetic-test' }, socket: { remoteAddress: 'good-key-test' } };
  res = response(); assert.equal(guard(req, res, { max: 1 }), true);
  res = response(); assert.equal(guard(req, res, { max: 1 }), false); assert.equal(res.code, 429);
});

test('the existing JSON output schema is formatted as a value, never parsed as template braces', async () => {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('utils/matchResumeToJD.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => name === './deepseekModel' ? { getDeepseekModel() { throw Error('No model calls in this test'); } } : require(name) });
  const prompt = await exports.promptTemplate.format({ resumeText: 'Local QA {resume}', jobDesc: 'Local QA {job}', formatInstructions: '{"type":"object","properties":{"matchScore":{"type":"number"}}}' });
  assert.match(prompt, /Local QA \{resume\}/);
  assert.match(prompt, /"matchScore"/);
});
