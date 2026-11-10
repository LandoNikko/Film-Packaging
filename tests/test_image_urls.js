const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rawUrl = 'https://raw.githubusercontent.com/LandoNikko/Film-Packaging/master/film_packaging/archive/00001_000.jpg';
const item = { filename: '00001_000.jpg', imageUrl: rawUrl, thumbnailUrl: '/film_packaging/lowres/00001_000.jpg' };
const source = fs.readFileSync(path.join(__dirname, '../assets/js/archive-utils.js'), 'utf8');

function contextFor(href) {
    const events = { downloads: [], fetches: [], opened: [], timers: [], revoked: [] };
    class ImageURL extends URL {
        static createObjectURL() { return 'blob:https://filmpackagingarchive.com/download-test'; }
        static revokeObjectURL(url) { events.revoked.push(url); }
    }
    const context = {
        URL: ImageURL,
        window: {
            location: new URL(href),
            open: (...args) => events.opened.push(args),
            setTimeout: (callback) => events.timers.push(callback)
        },
        document: {
            addEventListener() {},
            body: { appendChild() {} },
            createElement: () => ({ click() { events.downloads.push({ href: this.href, filename: this.download }); }, remove() {} })
        },
        fetch: async (url) => {
            events.fetches.push(url);
            return { ok: true, blob: async () => ({}) };
        }
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return { context, events };
}

(async () => {
    const online = contextFor('https://filmpackagingarchive.com/gallery/');
    const onlineUrls = online.context.window.ArchiveUtils.resolveImageUrls(item);
    assert.equal(onlineUrls.imageUrl, rawUrl);
    assert.equal(onlineUrls.thumbnailUrl, '/film_packaging/lowres/00001_000.jpg');

    const local = contextFor('file:///D:/Film%20Packaging/index.html');
    const homeUrls = local.context.window.ArchiveUtils.resolveImageUrls(item);
    assert.equal(homeUrls.imageUrl, 'file:///D:/Film%20Packaging/film_packaging/archive/00001_000.jpg');
    assert.equal(homeUrls.thumbnailUrl, 'file:///D:/Film%20Packaging/film_packaging/lowres/00001_000.jpg');
    const galleryUrls = local.context.window.ArchiveUtils.resolveImageUrls(item, 'file:///D:/Film%20Packaging/');
    assert.equal(galleryUrls.imageUrl, homeUrls.imageUrl);

    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/gallery.js'), 'utf8'), online.context);
    const gallery = vm.runInContext('Object.create(FilmGallery.prototype)', online.context);
    await gallery.downloadImage(rawUrl);
    assert.deepEqual(online.events.fetches, [rawUrl]);
    assert.equal(online.events.downloads[0].href, 'blob:https://filmpackagingarchive.com/download-test');
    assert.equal(online.events.downloads[0].filename, item.filename);
    online.events.timers[0]();
    assert.equal(online.events.revoked.length, 1);

    online.context.fetch = async () => { throw new Error('Network unavailable'); };
    await gallery.downloadImage(rawUrl);
    assert.equal(online.events.opened[0][0], rawUrl);

    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/gallery.js'), 'utf8'), local.context);
    const localGallery = vm.runInContext('Object.create(FilmGallery.prototype)', local.context);
    await localGallery.downloadImage(homeUrls.imageUrl);
    assert.equal(local.events.fetches.length, 0);
    assert.equal(local.events.downloads[0].href, homeUrls.imageUrl);

    const generated = fs.readFileSync(path.join(__dirname, '../assets/js/gallery-data.js'), 'utf8');
    const dataContext = vm.createContext({ window: {} });
    vm.runInContext(generated, dataContext);
    vm.runInContext(generated, dataContext);
    assert(dataContext.window.GALLERY_DATA.length > 0);
    assert(dataContext.window.GALLERY_DATA.every((entry) => entry.imageUrl.startsWith('https://raw.githubusercontent.com/') && entry.thumbnailUrl.startsWith('/film_packaging/lowres/')));
    console.log('Image URL tests passed: hosted thumbnails, repository originals, local viewing, downloads, and data reloads.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
