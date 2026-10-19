const ENC = "app--BKl06il.enc";
const STORE = "static-magic-link:/web-app/";
const MAGIC = [0x53, 0x4d, 0x4c, 0x31];
const MESSAGES = {
'missing-key': 'This page needs its link. Ask whoever shared it for the full link.',
'wrong-key': 'This link is not valid. Check that you copied all of it.',
'bad-file': 'The site files look wrong. Try again later.',
'no-crypto': 'Open this site over https.',
'fetch-failed': 'Could not load the site. Check your connection.',
};
function fail(code) {
const root = document.getElementById('root') || document.body;
root.innerHTML = '<p style="font:16px system-ui;margin:40px auto;max-width:32em;text-align:center">' + MESSAGES[code] + '</p>';
throw new Error('static-magic-link: ' + code);
}
function fromBase64url(s) {
const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
const load = () => { try { return localStorage.getItem(STORE); } catch { return null; } };
const save = (k) => { try { localStorage.setItem(STORE, k); } catch {} };
const forget = () => { try { localStorage.removeItem(STORE); } catch {} };
async function decrypt(key, iv, body) {
const k = await crypto.subtle.importKey('raw', fromBase64url(key), { name: 'AES-GCM' }, false, ['decrypt']);
return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, body);
}
async function main() {
const fromUrl = new URLSearchParams(location.hash.slice(1)).get('key');
const saved = load();
if (!fromUrl && !saved) fail('missing-key');
if (!globalThis.crypto?.subtle) fail('no-crypto');
let raw;
try {
const res = await fetch(new URL('./' + ENC, import.meta.url));
if (!res.ok) throw new Error(String(res.status));
raw = new Uint8Array(await res.arrayBuffer());
} catch { fail('fetch-failed'); }
if (raw.length < 32 || MAGIC.some((b, i) => raw[i] !== b)) fail('bad-file');
let js;
for (const key of [fromUrl, saved]) {
if (!key || js) continue;
try { js = await decrypt(key, raw.subarray(4, 16), raw.subarray(16)); save(key); } catch {}
}
if (!js) {
if (saved) forget();
fail(fromUrl ? 'wrong-key' : 'missing-key');
}
const url = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
try { await import(url); } finally { URL.revokeObjectURL(url); }
}
main();
