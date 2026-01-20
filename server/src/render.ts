import path from "node:path";
import { chromium } from "playwright";
import fs from "node:fs/promises";

export type RenderOptions = {
    width: number;
    height: number;
    url: string;
    outPngPath: string;
};

export async function renderHtmlToPng(opts: RenderOptions): Promise<void> {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({
            viewport: { width: opts.width, height: opts.height },
            deviceScaleFactor: 1
        });

        // Debug hooks (keep these until stable)
        page.on("console", (msg) => console.log("[PAGE]", msg.type(), msg.text()));
        page.on("pageerror", (err) => console.log("[PAGE ERROR]", err));
        page.on("requestfailed", (req) =>
            console.log("[REQ FAILED]", req.url(), req.failure()?.errorText)
        );

        //const fileUrl = "file://" + path.resolve(opts.url).replace(/\\/g, "/");
        await page.goto(opts.url, { waitUntil: "domcontentloaded" });

        // Wait for the page to say it's ready OR expose a render error
        await page.waitForFunction(
            () => (window as any).__RENDER_DONE__ === true || (window as any).__RENDER_ERROR__,
            null,
            { timeout: 15000 }
        );

        const renderError = await page.evaluate(() => (window as any).__RENDER_ERROR__ || null);
        if (renderError) throw new Error("Template render failed:\n" + renderError);

        // Ensure white background
        await page.addStyleTag({ content: "body{background:#fff !important;}" });

        await fs.mkdir(path.dirname(opts.outPngPath), { recursive: true });
        await page.screenshot({ path: opts.outPngPath, fullPage: false });
    } finally {
        await browser.close();
    }
}
