import path from "node:path";
import { chromium } from "playwright";
import fs from "node:fs/promises";

export type RenderOptions = {
    width: number;
    height: number;
    htmlPath: string;
    outPngPath: string;
};

export async function renderHtmlToPng(opts: RenderOptions): Promise<void> {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({
            viewport: { width: opts.width, height: opts.height },
            deviceScaleFactor: 1
        });

        // Load local HTML file that links to local CSS file
        const fileUrl = "file://" + path.resolve(opts.htmlPath).replace(/\\/g, "/");
        await page.goto(fileUrl, { waitUntil: "networkidle" });

        // Ensure a white background (important for e-ink)
        await page.addStyleTag({ content: "body{background:#fff !important;}" });

        // Screenshot full viewport
        await fs.mkdir(path.dirname(opts.outPngPath), { recursive: true });
        await page.screenshot({ path: opts.outPngPath, fullPage: false });
    } finally {
        await browser.close();
    }
}
