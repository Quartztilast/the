import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const files = [
    'index.html',
    'game.js',
    'style.css',
    'audio-hide.css',
    'ad-banner-styles.css',
    'matter.min.js',
    'asset/bg-music.mp3',
    'README.md'
];
const directories = ['asset/cats'];

rmSync(dist, { force: true, recursive: true });
mkdirSync(dist, { recursive: true });

for (const file of files) {
    const target = join(dist, file);
    mkdirSync(join(target, '..'), { recursive: true });
    copyFileSync(join(root, file), target);
}

mkdirSync(join(dist, 'asset'), { recursive: true });
for (const directory of directories) {
    cpSync(join(root, directory), join(dist, directory), { recursive: true });
}

let totalSize = 0;
function walk(directory) {
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            walk(path);
        } else {
            totalSize += stat.size;
        }
    }
}

walk(dist);

for (const file of ['index.html', 'game.js', 'style.css', 'asset/cats/meow-merge.mp3']) {
    if (!existsSync(join(dist, file))) {
        throw new Error(`Build output missing: ${file}`);
    }
}

if (totalSize > 100 * 1024 * 1024) {
    throw new Error('Build output exceeds the 100 MB Yandex Games archive limit');
}

process.stdout.write(`Build passed (${Math.round(totalSize / 1024)} KB)\n`);
