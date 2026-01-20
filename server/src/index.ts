import express from "express";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

import { renderHtmlToPng } from "./render.js";
import { pngFileToBmp1bpp } from "./bmp1.js";

const app = express();
const PORT = 3000;

// TRMNL 7.5" OG: 800x480
const W = 800;
const H = 480;

const ROOT = path.resolve(".");
const TEMPLATE_HTML = path.join(ROOT, "templates", "weather", "index.html");
const TEMPLATE_URL = "http://127.0.0.1:3000/templates/weather/index.html";

const OUT_DIR = path.join(ROOT, "out");
const PNG_PATH = path.join(OUT_DIR, "screen.png");
const BMP_PATH = path.join(OUT_DIR, "screen.bmp");

async function ensureOutDir() {
    await fs.mkdir(OUT_DIR, { recursive: true });
}
app.use("/templates", express.static(path.join(ROOT, "templates")));

app.get("/screen.bmp", async (_req, res) => {
    try {
        await ensureOutDir();

        // Render HTML/CSS -> PNG
        await renderHtmlToPng({
            width: W,
            height: H,
            url: TEMPLATE_URL,
            outPngPath: PNG_PATH
        });

        // Convert PNG -> 1-bit BMP
        await pngFileToBmp1bpp(PNG_PATH, BMP_PATH);

        const bmp = await fs.readFile(BMP_PATH);
        res.setHeader("Content-Type", "image/bmp");
        res.setHeader("Cache-Control", "no-store");
        res.send(bmp);
    } catch (err: any) {
        res.status(500).send(String(err?.stack ?? err));
    }
});

// Handy: open in browser for debugging (PNG)
app.get("/screen.png", async (_req, res) => {
    try {
        await ensureOutDir();
        await renderHtmlToPng({ width: W, height: H, url: TEMPLATE_URL, outPngPath: PNG_PATH });
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "no-store");
        res.send(await fs.readFile(PNG_PATH));
    } catch (err: any) {
        res.status(500).send(String(err?.stack ?? err));
    }
});

app.listen(PORT, () => {
    const ifaces = os.networkInterfaces();
    const ips: string[] = [];
    for (const list of Object.values(ifaces)) {
        for (const it of list ?? []) {
            if (it.family === "IPv4" && !it.internal) ips.push(it.address);
        }
    }
    console.log(`Server running:`);
    console.log(`- http://localhost:${PORT}/screen.bmp`);
    console.log(`- http://localhost:${PORT}/screen.png`);
    if (ips.length) console.log(`LAN: http://${ips[0]}:${PORT}/screen.bmp`);
});
