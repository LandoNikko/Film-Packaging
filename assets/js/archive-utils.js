(function (global) {
    const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

    function isUnknown(value) {
        return !value || value === 'Unknown';
    }

    function entryHasUnknownValue(entry) {
        const fields = [
            entry.metadata?.brand,
            entry.metadata?.product,
            entry.metadata?.film_format,
            entry.metadata?.film_speed_iso,
            entry.metadata?.process,
            entry.metadata?.author,
            entry.front?.expiry_date
        ];

        return fields.some(isUnknown);
    }

    function isMobileViewport() {
        return global.matchMedia(MOBILE_MEDIA_QUERY).matches;
    }

    function getEntryId(item) {
        if (!item || !item.filename) return '';
        return item.filename.replace(/_\d{3}\.jpg$/, '');
    }

    function groupItemsByBaseFilename(items) {
        const grouped = {};

        items.forEach((item) => {
            const baseFilename = getEntryId(item);

            if (!grouped[baseFilename]) {
                grouped[baseFilename] = {
                    entryId: baseFilename,
                    front: null,
                    back: null,
                    metadata: {
                        brand: item.brand,
                        product: item.product,
                        film_format: item.film_format,
                        film_speed_iso: item.film_speed_iso,
                        process: item.process,
                        author: item.author,
                        title: item.title
                    }
                };
            }

            if (item.filename.includes('_000.jpg')) {
                grouped[baseFilename].front = item;
            } else if (item.filename.includes('_001.jpg')) {
                grouped[baseFilename].back = item;
            }
        });

        return Object.values(grouped);
    }

    function computeArchiveStats(data) {
        const entryCount = groupItemsByBaseFilename(data).length;
        const brands = [...new Set(data.map((item) => item.brand).filter((brand) => !isUnknown(brand)))];
        const formats = [...new Set(data.map((item) => item.film_format).filter((format) => !isUnknown(format)))];
        const processes = [...new Set(data.map((item) => item.process).filter((process) => !isUnknown(process)))];

        const validExpiries = data
            .map((item) => item.expiry_date)
            .filter((date) => date && date !== 'Unknown' && date.length === 6)
            .map((date) => ({
                year: parseInt(date.substring(0, 4), 10),
                month: parseInt(date.substring(4, 6), 10)
            }))
            .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));

        const contributors = {};
        data.forEach((item) => {
            const author = item.author || 'Unknown';
            contributors[author] = (contributors[author] || 0) + 1;
        });

        const sortAlpha = (values) => [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        return {
            itemCount: entryCount,
            roundedItemCount: Math.floor(entryCount / 100) * 100,
            brands: sortAlpha(brands),
            formats: sortAlpha(formats),
            processes: sortAlpha(processes),
            totalBrands: Math.ceil(brands.length / 5) * 5,
            totalFormats: formats.length,
            totalProcesses: processes.length,
            oldestExpiry: validExpiries.length ? String(validExpiries[0].year) : '',
            contributors: Object.entries(contributors)
                .sort((a, b) => b[1] - a[1])
        };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderFeaturedChip(label, filterParam) {
        const href = `/gallery/?${filterParam}=${encodeURIComponent(label)}`;
        const brandColor = filterParam === 'brand'
            ? global.BrandColors?.resolveBrand(label)?.color
            : null;
        const style = brandColor ? ` style="--featured-accent: ${brandColor}"` : '';
        const accentClass = brandColor ? ' featured-chip--brand' : '';

        return (
            `<a class="featured-chip${accentClass}" href="${href}"${style}>` +
            `${escapeHtml(label)}` +
            `</a>`
        );
    }

    function renderFeaturedSection(stats) {
        const groups = [
            { id: 'featuredBrands', values: stats.brands, param: 'brand' },
            { id: 'featuredFormats', values: stats.formats, param: 'format' },
            { id: 'featuredProcesses', values: stats.processes, param: 'process' }
        ];

        groups.forEach(({ id, values, param }) => {
            const grid = document.getElementById(id);
            if (!grid) return;
            grid.innerHTML = values.map((value) => renderFeaturedChip(value, param)).join('');
        });
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function applyHeaderStats(stats) {
        setText('totalBrands', stats.totalBrands);
        setText('totalFormats', stats.totalFormats);
        setText('totalProcesses', stats.totalProcesses);
        setText('oldestExpiry', stats.oldestExpiry);
    }

    function shuffleArray(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    let homeShowcasePicks = null;
    let homeShowcaseResizeBound = false;

    function getHomeShowcaseCount() {
        return isMobileViewport() ? 5 : 8;
    }

    function renderHomeShowcaseMoreCell() {
        return (
            `<div class="home-showcase-more">` +
            `<p class="home-showcase-more-text">...and more!</p>` +
            `<a href="/gallery/" class="cta-button">` +
            `<i class="ri-gallery-line"></i>` +
            `Explore Gallery` +
            `</a>` +
            `</div>`
        );
    }

    function renderHomeShowcase(data, reshuffle = false) {
        const grid = document.getElementById('homeShowcaseGrid');
        if (!grid) return;

        if (reshuffle || !homeShowcasePicks) {
            homeShowcasePicks = shuffleArray(
                groupItemsByBaseFilename(data).filter((entry) =>
                    entry.front && !entryHasUnknownValue(entry)
                )
            );
        }

        const picks = homeShowcasePicks.slice(0, getHomeShowcaseCount());

        const itemCards = picks.map(({ front, metadata }) => {
            const thumb = front.imageUrl.replace('/archive/', '/lowres/');
            const title = metadata.product || front.title;
            const brand = metadata.brand || 'Unknown';
            const brandColor = global.BrandColors?.resolveBrand(brand);
            const textColor = global.BrandColors?.textColorForBrand(brand) || '#1A1A1A';
            const brandBackground = brandColor?.color || '#808080';

            return (
                `<a class="gallery-item" href="/gallery/#${front.filename}">` +
                `<div class="bottom-flap"></div>` +
                `<div class="top-flap"></div>` +
                `<div class="image-container">` +
                `<img src="${thumb}" alt="${escapeHtml(title)}" loading="lazy" ` +
                `onerror="this.onerror=null; this.src='${front.imageUrl}';">` +
                `</div>` +
                `<div class="brand-header" style="color: ${textColor}; background-color: ${brandBackground};">${escapeHtml(brand)}</div>` +
                `<div class="gallery-item-info">` +
                `<h2 class="gallery-item-title">${escapeHtml(title)}</h2>` +
                `</div>` +
                `</a>`
            );
        }).join('');

        grid.innerHTML = itemCards + renderHomeShowcaseMoreCell();
    }

    function playDiceAnimation(btn) {
        const icon = btn?.querySelector('i');
        if (!icon) return;

        icon.classList.remove('is-jumping');
        void icon.offsetWidth;
        icon.classList.add('is-jumping');
        icon.addEventListener('animationend', () => {
            icon.classList.remove('is-jumping');
        }, { once: true });
    }

    function initHomeShowcase(data) {
        renderHomeShowcase(data, true);

        const refreshBtn = document.getElementById('homeShowcaseRefresh');
        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.dataset.bound = 'true';
            refreshBtn.addEventListener('click', () => {
                playDiceAnimation(refreshBtn);
                renderHomeShowcase(data, true);
            });
        }

        const mobileQuery = global.matchMedia(MOBILE_MEDIA_QUERY);
        if (!homeShowcaseResizeBound) {
            mobileQuery.addEventListener('change', () => renderHomeShowcase(data, false));
            homeShowcaseResizeBound = true;
        }
    }

    function formatContributionCount(count) {
        return count === 1 ? '1 contribution' : `${count} contributions`;
    }

    function applyHomePageStats(data) {
        const stats = computeArchiveStats(data);
        setText('heroItemCount', `${stats.roundedItemCount}+`);
        applyHeaderStats(stats);
        initHomeShowcase(data);
        renderFeaturedSection(stats);

        const grid = document.getElementById('contributorsGrid');
        if (!grid) return;

        const contributeCard = (
            `<a class="contributor-card contributor-card--cta" ` +
            `href="https://github.com/dekuNukem/Film-Packaging/blob/master/contribution_guide.md" ` +
            `target="_blank" rel="noopener noreferrer">` +
            `<div class="contributor-info">` +
            `<h3>Contribute</h3>` +
            `<span class="contribution-count">Submit your own scans</span>` +
            `</div></a>`
        );

        grid.innerHTML = stats.contributors.map(([name, count]) => {
            const displayName = isUnknown(name) ? 'Anonymous' : name;
            return (
                `<div class="contributor-card"><div class="contributor-info">` +
                `<h3>${escapeHtml(displayName)}</h3>` +
                `<span class="contribution-count">${formatContributionCount(count)}</span>` +
                `</div></div>`
            );
        }).join('') + contributeCard;
    }

    global.ArchiveUtils = {
        MOBILE_MEDIA_QUERY,
        isMobileViewport,
        getEntryId,
        groupItemsByBaseFilename,
        computeArchiveStats,
        applyHeaderStats,
        applyHomePageStats
    };
})(window);
