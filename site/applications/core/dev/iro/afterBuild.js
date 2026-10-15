import config from "./vite.config.js";
import path from "node:path";
import fs from "node:fs";

const manifest = path.resolve(config.build.outDir, 'manifest.json');
const targetCopyLocation = path.resolve("..","..",'data');
try {
    if (fs.accessSync(manifest) !== undefined || fs.accessSync(targetCopyLocation) !== undefined) {
        throw new Error();
    }
} catch (e) {
    e.message = `Cannot read ${manifest} or access ${targetCopyLocation}. This could be because one of the paths does not exist, however it could also be due to improperly configured file permissions.\n${e.message}`;
    console.warn(e);
    process.exit(0);
}


fs.cpSync(manifest, path.resolve(targetCopyLocation, 'iroManifest.json'));
console.log(`Copied ${manifest} to ${targetCopyLocation}`);