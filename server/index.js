const express = require("express");
const { createCanvas } = require("canvas");

const app = express();
const PORT = 3000;

// TRMNL 7.5" OG is 800x480 mono :contentReference[oaicite:2]{index=2}
const W = 800;
const H = 480;

// --- BMP helpers (1-bit, top-down) ---
function writeInt32LE(buf, offset, value) {
    buf.writeInt32LE(value, offset);
}
function writeUInt32LE(buf, offset, value) {
    buf.writeUInt32LE(value >>> 0, offset);
}
function writeUInt16LE(buf, offset, value) {
    buf.writeUInt16LE(value & 0xffff, offset);
}

// Converts RGBA canvas pixels -> 1-bit BMP buffer (top-down)
function canvasToBmp1bpp(canvas) {
    const ctx = canvas.getContext("2d");
    const { data } = ctx.getImageData(0, 0, W, H);

    // bytes per row (padded to 4-byte boundary)
    const rowBytesUnpadded = Math.ceil(W / 8);
    const rowStride = (rowBytesUnpadded + 3) & ~3; // 4-byte align

    const pixelDataSize = rowStride * H;

    // BMP headers:
    // BITMAPFILEHEADER (14) + BITMAPINFOHEADER (40) + palette (8) = 62 bytes
    const headerSize = 14 + 40 + 8;
    const fileSize = headerSize + pixelDataSize;

    const buf = Buffer.alloc(fileSize);

    // BITMAPFILEHEADER
    buf.write("BM", 0, 2, "ascii");
    writeUInt32LE(buf, 2, fileSize);
    writeUInt16LE(buf, 6, 0);
    writeUInt16LE(buf, 8, 0);
    writeUInt32LE(buf, 10, headerSize);

    // BITMAPINFOHEADER
    writeUInt32LE(buf, 14, 40);          // biSize
    writeInt32LE(buf, 18, W);            // biWidth
    writeInt32LE(buf, 22, -H);           // biHeight NEGATIVE => top-down rows
    writeUInt16LE(buf, 26, 1);           // biPlanes
    writeUInt16LE(buf, 28, 1);           // biBitCount = 1
    writeUInt32LE(buf, 30, 0);           // biCompression = BI_RGB
    writeUInt32LE(buf, 34, pixelDataSize);
    writeInt32LE(buf, 38, 2835);         // 72 DPI
    writeInt32LE(buf, 42, 2835);         // 72 DPI
    writeUInt32LE(buf, 46, 2);           // biClrUsed
    writeUInt32LE(buf, 50, 2);           // biClrImportant

    // Palette (2 entries, BGRA)
    // index 0 = black, index 1 = white (common)
    // You can swap if your panel renders inverted.
    buf[54] = 0x00; buf[55] = 0x00; buf[56] = 0x00; buf[57] = 0x00; // black
    buf[58] = 0xff; buf[59] = 0xff; buf[60] = 0xff; buf[61] = 0x00; // white

    // Pixel data (1-bit, MSB first per byte)
    let out = headerSize;

    // Simple threshold: anything darker than mid-gray becomes black
    const threshold = 160;

    for (let y = 0; y < H; y++) {
        // clear row
        buf.fill(0x00, out, out + rowStride);

        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];

            // perceived luminance
            const lum = (r * 0.299 + g * 0.587 + b * 0.114);

            // BMP bit: 0 or 1. We'll set 1 = white, 0 = black by palette choice above.
            const isWhite = lum >= threshold;

            const byteIndex = (x >> 3);
            const bit = 7 - (x & 7);

            if (isWhite) {
                buf[out + byteIndex] |= (1 << bit);
            }
        }

        out += rowStride;
    }

    return buf;
}

function renderDashboard() {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Simple layout
    ctx.fillStyle = "#000000";
    ctx.font = "bold 48px Sans";
    ctx.fillText("E-Ink Dashboard", 40, 80);

    ctx.font = "28px Sans";
    const now = new Date();
    ctx.fillText(`Server time: ${now.toLocaleString()}`, 40, 140);

    ctx.font = "24px Sans";
    ctx.fillText("Tip: refresh every 5–30 minutes to avoid ghosting.", 40, 200);
    ctx.fillText("Next: render Home Assistant / calendar / weather here.", 40, 240);

    // A simple border
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    return canvasToBmp1bpp(canvas);
}

app.get("/screen.bmp", (req, res) => {
    const bmp = renderDashboard();
    res.set("Content-Type", "image/bmp");
    res.set("Cache-Control", "no-store");
    res.send(bmp);
});

app.listen(PORT, () => {
    console.log(`E-ink server: http://0.0.0.0:${PORT}/screen.bmp`);
});
