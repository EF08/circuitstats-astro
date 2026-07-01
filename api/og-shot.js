// api/og-shot.js — share-preview image = a real screenshot of the top of the
// page being shared (?path=/uaa/u15/stats), instead of a custom-drawn card.
// Experimental swap-in for api/og.js, requested explicitly by Andy.
//
// Self-referential by design: it screenshots `https://<req.headers.host><path>`
// — whatever host actually received THIS request — so the exact same code
// works correctly on a preview deployment, staging, or production with no
// hardcoded domain. Needs a real browser, so this runs as a Node.js serverless
// function (not edge — edge has no child-process/binary support).
//
// Locally (no VERCEL env), falls back to the machine's installed Chrome so this
// is testable on a dev machine; on Vercel it uses the bundled Linux Chromium.
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  let browser;
  try {
    const host = req.headers.host;
    const proto = process.env.VERCEL ? 'https' : (req.headers['x-forwarded-proto'] || 'http');
    const { searchParams } = new URL(req.url, `${proto}://${host}`);
    const path = searchParams.get('path') || '/';
    if (!path.startsWith('/')) throw new Error('path must start with /');
    const targetUrl = `${proto}://${host}${path}`;

    const puppeteer = await import('puppeteer-core');
    let launchOpts;
    if (process.env.VERCEL) {
      const chromium = (await import('@sparticuz/chromium')).default;
      launchOpts = {
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      };
    } else {
      launchOpts = {
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        headless: true,
      };
    }
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(buf);
  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    res.status(500).send('og-shot error: ' + e.message);
  }
}
