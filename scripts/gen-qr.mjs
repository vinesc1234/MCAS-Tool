// Generates a scannable QR code for the deployed app.
// Run with `npm run qr` after changing APP_URL.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import QRCode from 'qrcode';

const APP_URL = 'https://mcas-tool.vercel.app/';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'qr');

// High error correction so it still scans if the printout gets scuffed or
// partly covered.
const options = { errorCorrectionLevel: 'H', margin: 2, width: 1000 };

await QRCode.toFile(join(out, 'app-qr.png'), APP_URL, options);
await QRCode.toFile(join(out, 'app-qr.svg'), APP_URL, { ...options, type: 'svg' });

const dataUrl = await QRCode.toDataURL(APP_URL, options);

const page = `<!doctype html>
<meta charset="utf-8">
<title>MCAS Tracker — scan to install</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f7f4fd;
         color: #1f2937; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 24px; }
  .card { background: #fff; border-radius: 24px; padding: 40px; max-width: 460px; text-align: center;
          box-shadow: 0 2px 24px rgb(0 0 0 / .08); }
  h1 { color: #45326a; font-size: 24px; margin: 0 0 4px; }
  p.sub { color: #6b7280; margin: 0 0 24px; font-size: 15px; }
  img { width: 100%; max-width: 320px; height: auto; border-radius: 12px; }
  .url { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14px; color: #6544a0;
         background: #f7f4fd; border-radius: 8px; padding: 10px; margin-top: 20px; word-break: break-all; }
  ol { text-align: left; color: #374151; font-size: 14px; line-height: 1.7; margin: 24px 0 0; padding-left: 20px; }
  .note { margin-top: 20px; font-size: 12px; color: #9ca3af; }
  @media print { body { background: #fff; } .card { box-shadow: none; } }
</style>
<div class="card">
  <h1>MCAS Trigger Tracker</h1>
  <p class="sub">Scan with your phone camera to install</p>
  <img src="${dataUrl}" alt="QR code linking to the app">
  <div class="url">${APP_URL}</div>
  <ol>
    <li>Point your phone camera at the code and tap the link.</li>
    <li><strong>iPhone:</strong> Share → Add to Home Screen.<br><strong>Android:</strong> menu → Install app.</li>
    <li>Open it from the new home-screen icon.</li>
    <li>Settings → Reading labels from photos → enter the passcode → Save.</li>
  </ol>
  <p class="note">The passcode is deliberately not printed here. Get it from your password manager
  or the Vercel environment variables.</p>
</div>
`;

await writeFile(join(out, 'index.html'), page, 'utf8');

console.log('Wrote qr/app-qr.png, qr/app-qr.svg, qr/index.html');
console.log(`Encodes: ${APP_URL}`);
