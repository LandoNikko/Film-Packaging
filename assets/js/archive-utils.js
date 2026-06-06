(function (global) {
    const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

    function isUnknown(value) {
        return !value || value === 'Unknown';
    }

    function isMobileViewport() {
        return global.matchMedia(MOBILE_MEDIA_QUERY).matches;
    }

    function groupItemsByBaseFilename(items) {
        const grouped = {};

        items.forEach((item) => {
            const baseFilename = item.filename.replace(/_\d{3}\.jpg$/, '');

            if (!grouped[baseFilename]) {
                grouped[baseFilename] = {
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

        return {
            itemCount: entryCount,
            roundedItemCount: Math.floor(entryCount / 100) * 100,
            totalBrands: Math.ceil(brands.length / 5) * 5,
            totalFormats: formats.length,
            totalProcesses: processes.length,
            oldestExpiry: validExpiries.length ? String(validExpiries[0].year) : '',
            topContributors: Object.entries(contributors)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
        };
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
            `<a href="gallery.html" class="cta-button">` +
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
                groupItemsByBaseFilename(data).filter((entry) => entry.front)
            );
        }

        const picks = homeShowcasePicks.slice(0, getHomeShowcaseCount());

        const itemCards = picks.map(({ front, metadata }) => {
            const thumb = front.imageUrl.replace('/archive/', '/lowres/');
            const title = metadata.product || front.title;
            return (
                `<a class="gallery-item" href="gallery.html#${front.filename}">` +
                `<div class="bottom-flap"></div>` +
                `<div class="top-flap"></div>` +
                `<div class="image-container">` +
                `<img src="${thumb}" alt="${title}" loading="lazy" ` +
                `onerror="this.onerror=null; this.src='${front.imageUrl}';">` +
                `</div>` +
                `<div class="gallery-item-info">` +
                `<h2 class="gallery-item-title">${title}</h2>` +
                `</div>` +
                `</a>`
            );
        }).join('');

        grid.innerHTML = itemCards + renderHomeShowcaseMoreCell();
    }

    function initHomeShowcase(data) {
        renderHomeShowcase(data, true);

        const refreshBtn = document.getElementById('homeShowcaseRefresh');
        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.dataset.bound = 'true';
            refreshBtn.addEventListener('click', () => renderHomeShowcase(data, true));
        }

        const mobileQuery = global.matchMedia(MOBILE_MEDIA_QUERY);
        if (!homeShowcaseResizeBound) {
            mobileQuery.addEventListener('change', () => renderHomeShowcase(data, false));
            homeShowcaseResizeBound = true;
        }
    }

    function applyHomePageStats(data) {
        const stats = computeArchiveStats(data);
        setText('heroItemCount', `${stats.roundedItemCount}+`);
        applyHeaderStats(stats);
        initHomeShowcase(data);

        const grid = document.getElementById('contributorsGrid');
        if (!grid) return;

        grid.innerHTML = stats.topContributors.map(([name, count]) =>
            `<div class="contributor-card"><div class="contributor-info">` +
            `<h3>${name}</h3>` +
            `<span class="contribution-count">${count} contributions</span>` +
            `</div></div>`
        ).join('');
    }

    global.ArchiveUtils = {
        MOBILE_MEDIA_QUERY,
        isMobileViewport,
        groupItemsByBaseFilename,
        computeArchiveStats,
        applyHeaderStats,
        applyHomePageStats
    };
})(window);
