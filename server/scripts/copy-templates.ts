import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXT = new Set([".html", ".css"]);

async function copyDir(src: string, dst: string) {
  await fs.mkdir(dst, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, dstPath);
    } else {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXT.has(ext)) {
        await fs.copyFile(srcPath, dstPath);
      }
    }
  }
}

copyDir("templates", "dist/templates")
  .then(() => console.log("Templates copied (.html, .css only)"))
  .catch(console.error);
