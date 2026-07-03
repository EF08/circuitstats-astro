// api/og-shot.js — share-preview image = a real screenshot of the WHOLE page
// being shared (?path=/player/abri-fazliu), rendered at phone width so the
// preview shows the full stat sheet top-to-bottom, not just the upper crop.
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

// Phone-sized render. The viewport is grown to the page's full content height
// (capped so 100-row leaderboards don't produce a megapixel monster) before the
// shot, so position:fixed chrome like the bottom nav lands at the bottom of the
// image instead of floating mid-content.
const WIDTH = 430;
const MIN_HEIGHT = 932;
const MAX_HEIGHT = 2800;

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
    await page.setViewport({ width: WIDTH, height: MIN_HEIGHT, deviceScaleFactor: 2 });
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    const contentHeight = await page.evaluate(() =>
      Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
    );
    const height = Math.max(MIN_HEIGHT, Math.min(contentHeight, MAX_HEIGHT));
    await page.setViewport({ width: WIDTH, height, deviceScaleFactor: 2 });
    const buf = await page.screenshot({ type: 'png' });
    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(buf);
  } catch (e) {
    if (browser) { try { await browser.close(); } catch {} }
    res.status(500).send('og-shot error: ' + e.message);
  }
}
