import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const requiredFiles = [
    'index.html',
    'game.js',
    'style.css',
    'matter.min.js',
    'asset/cats/cat-01.png',
    'asset/cats/cat-10.png',
    'asset/cats/cat-room-bg.png',
    'asset/cats/meow-merge.mp3'
];
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.md']);
const errors = [];

for (const file of requiredFiles) {
    try {
        statSync(join(root, file));
    } catch {
        errors.push(`Missing required file: ${file}`);
    }
}

function walk(directory) {
    for (const entry of readdirSync(directory)) {
        if (['.git', 'dist', 'node_modules'].includes(entry)) continue;

        const path = join(directory, entry);
        const stat = statSync(path);
        const localPath = relative(root, path);

        if (/[\s\u0400-\u04ff]/.test(localPath)) {
            errors.push(`${localPath}: Yandex archive paths must not contain spaces or Cyrillic characters`);
        }

        if (stat.isDirectory()) {
            walk(path);
            continue;
        }

        if (!textExtensions.has(extname(path))) continue;

        const content = readFileSync(path, 'utf8');
        if (!content.endsWith('\n')) {
            errors.push(`${localPath}: file must end with a newline`);
        }
        content.split('\n').forEach((line, index) => {
            if (/[ \t]+$/.test(line)) {
                errors.push(`${localPath}:${index + 1}: trailing whitespace`);
            }
        });
        if (localPath === 'index.html' && !content.includes('src="/sdk.js"')) {
            errors.push('index.html: Yandex Games SDK must use /sdk.js for archive uploads');
        }
        const dataImageMarker = 'data:' + 'image';
        const base64Marker = 'base' + '64,';
        if (content.includes(dataImageMarker) || content.includes(base64Marker)) {
            errors.push(`${localPath}: embedded base64 assets are not allowed`);
        }
    }
}

walk(root);

if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Lint passed\n');
