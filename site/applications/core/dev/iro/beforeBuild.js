import config from "./vite.config.js";
import path from "node:path";
import fs from "node:fs";

const outDir = path.resolve(config.build.outDir);
try {
    if (fs.accessSync(outDir) !== undefined) {
        throw new Error();
    }
} catch (e) {
    e.message = `Cannot modify ${outDir}. This could be because the directory does not exist, however it could also be due to improperly configured file permissions.\n${e.message}`;
    console.warn(e);
    process.exit(0);
}

fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir);
console.log(`Cleared out ${outDir}`);
