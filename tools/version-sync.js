
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const newVersion = process.argv[2];

if (!newVersion) {
    console.error("Please provide a version number: node version-sync.js 1.2.3");
    process.exit(1);
}

const tauriConfPath = join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const packageJsonPath = join(__dirname, '..', 'package.json');

try {
    // Update package.json
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json to version ${newVersion}`);

    // Update tauri.conf.json
    const tauriConfContent = readFileSync(tauriConfPath, 'utf-8');
    const tauriConf = JSON.parse(tauriConfContent);
    tauriConf.version = newVersion;
    writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log(`Updated tauri.conf.json to version ${newVersion}`);

} catch (e) {
    console.error("Error updating version:", e);
    process.exit(1);
}
