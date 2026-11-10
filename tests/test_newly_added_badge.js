const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: { location: { protocol: 'https:' } } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/archive-utils.js'), 'utf8'), context);
const renderBadge = context.window.ArchiveUtils.renderNewlyAddedBadge;
const now = 1794333600000;
const week = 7 * 24 * 60 * 60 * 1000;
const group = (...timestamps) => ({ images: timestamps.map((first_seen_at) => ({ first_seen_at })) });

assert.match(renderBadge(group(now / 1000), now), /NEWLY ADDED!/);
assert.match(renderBadge(group((now - week + 1000) / 1000), now), /NEWLY ADDED!/);
assert.equal(renderBadge(group((now - week) / 1000), now), '');
assert.equal(renderBadge(group((now + 1000) / 1000), now), '');
assert.equal(renderBadge(group(undefined, 0, 'invalid'), now), '');
assert.match(renderBadge(group((now - week * 2) / 1000, now / 1000), now), /NEWLY ADDED!/);
assert.equal(renderBadge(group(), now), '');
console.log('Badge tests passed: recent arrivals, expiry, missing dates, and additional scans.');
