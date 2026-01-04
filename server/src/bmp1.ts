import fs from "node:fs/promises";
import { PNG } from "pngjs";

// Convert RGBA to 1-bit BMP buffer (top-down)
export function rgbaToBmp1bpp(width: number, height: number, rgba: Uint8Array): Buffer {
    const rowBytes = Math.ceil(width / 8);
    const rowStride = (rowBytes + 3) & ~3;
    const pixelDataSize = rowStride * height;

    const headerSize = 14 + 40 + 8;
    const fileSize = headerSize + pixelDataSize;
    const buf = Buffer.alloc(fileSize);

    // File header
    buf.write("BM", 0, 2, "ascii");
    buf.writeUInt32LE(fileSize, 2);
    buf.writeUInt32LE(0, 6);
    buf.writeUInt32LE(headerSize, 10);

    // Info header
    buf.writeUInt32LE(40, 14);
    buf.writeInt32LE(width, 18);
    buf.writeInt32LE(-height, 22); // top-down
    buf.writeUInt16LE(1, 26);
    buf.writeUInt16LE(1, 28); // 1bpp
    buf.writeUInt32LE(0, 30); // BI_RGB
    buf.writeUInt32LE(pixelDataSize, 34);
    buf.writeInt32LE(2835, 38);
    buf.writeInt32LE(2835, 42);
    buf.writeUInt32LE(2, 46);
    buf.writeUInt32LE(2, 50);

    // Palette (black, white) BGRA
    buf[54] = 0x00; buf[55] = 0x00; buf[56] = 0x00; buf[57] = 0x00;
    buf[58] = 0xff; buf[59] = 0xff; buf[60] = 0xff; buf[61] = 0x00;

    const threshold = 170;
    let out = headerSize;

    for (let y = 0; y < height; y++) {
        buf.fill(0x00, out, out + rowStride);

        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = rgba[i];
            const g = rgba[i + 1];
            const b = rgba[i + 2];

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const isWhite = lum >= threshold;

            const byteIndex = x >> 3;
            const bit = 7 - (x & 7);
            if (isWhite) buf[out + byteIndex] |= 1 << bit; // 1 = white
        }

        out += rowStride;
    }

    return buf;
}

export async function pngFileToBmp1bpp(pngPath: string, bmpPath: string): Promise<void> {
    const pngData = await fs.readFile(pngPath);
    const decoded = PNG.sync.read(pngData);

    // IMPORTANT: pngjs uses .data, not .rgba
    const bmp = rgbaToBmp1bpp(decoded.width, decoded.height, decoded.data);
    await fs.writeFile(bmpPath, bmp);
}
