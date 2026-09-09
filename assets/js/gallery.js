class FilmGallery {
    constructor() {
        this.galleryData = [];
        this.filteredData = [];
        this.currentIndex = 0;
        this.defaultSort = { type: 'date_added', ascending: false };
        this.currentSort = { ...this.defaultSort };
        
        this.init();
    }

    isMobile() {
        return window.ArchiveUtils?.isMobileViewport() ?? window.innerWidth <= 768;
    }

    async init() {
        this.setupEventListeners();
        this.showLoading(true);
        try {
            await this.loadGalleryData();
            this.populateFilters();
            this.applyUrlFilters();
            this.currentSort = { ...this.defaultSort };
            this.filterGallery();
            this.updateInitialToggleText();
            this.updateSortIcons();
            this.updateResetButtonVisibility();
        } finally {
            this.showLoading(false);
        }
        
        // Dynamic URL handling for lightbox navigation
        this.handleUrlHash();
        window.addEventListener('hashchange', () => this.handleUrlHash());
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.filename) {
                this.handleUrlHash();
            } else if (window.location.hash) {
                this.handleUrlHash();
            } else {
                this.closeLightbox();
            }
        });
        
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            this.checkForUpdates();
            this.startAutoRefresh();
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', () => this.filterGallery());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterGallery();
        });



        document.querySelectorAll('.filter-toggle').forEach(toggle => {
            toggle.classList.add('collapsed');
            
            const toggleFilter = (toggle) => {
                const targetId = toggle.getAttribute('data-target');
                const content = document.getElementById(targetId);
                
                if (content.classList.contains('expanded')) {
                    content.classList.remove('expanded');
                    toggle.classList.add('collapsed');
                } else {
                    if (this.isMobile()) {
                        document.querySelectorAll('.filter-content').forEach(otherContent => {
                            if (otherContent !== content) {
                                otherContent.classList.remove('expanded');
                                otherContent.previousElementSibling.classList.add('collapsed');
                            }
                        });
                    }
                    content.classList.add('expanded');
                    toggle.classList.remove('collapsed');
                }
            };
            
            toggle.addEventListener('click', () => toggleFilter(toggle));
            
            const filterSection = toggle.closest('.filter-section');
            const icon = filterSection.querySelector('.filter-icon');
            if (!icon) return;

            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterType = toggle.getAttribute('data-target').replace('-section', '');

                if (filterType === 'sort') {
                    let mode = this.getSelectedFilterValues('sort_mode')[0];
                    if (!mode) {
                        const dateAddedInput = document.querySelector('input[name="sort_mode"][value="date_added"]');
                        if (dateAddedInput) dateAddedInput.checked = true;
                        mode = 'date_added';
                        this.updateToggleText('sort');
                    }
                    const sortType = mode === 'alphabetical' ? 'alphabetical' : 'date_added';

                    if (this.currentSort.type === sortType) {
                        this.currentSort.ascending = !this.currentSort.ascending;
                    } else {
                        this.currentSort.type = sortType;
                        this.currentSort.ascending = sortType === 'alphabetical';
                    }

                    this.sortGallery(sortType);
                    this.updateToggleText('sort');
                    return;
                }

                if (this.currentSort.type === filterType) {
                    this.currentSort.ascending = !this.currentSort.ascending;
                } else {
                    this.currentSort.type = filterType;
                    this.currentSort.ascending = true;
                }

                document.querySelectorAll('input[name="sort_mode"]').forEach((input) => {
                    input.checked = false;
                });
                this.updateToggleText('sort');
                this.sortGallery(filterType);
            });
        });

        document.addEventListener('click', (e) => {
            if (this.isMobile() && !e.target.closest('.filter-section')) {
                document.querySelectorAll('.filter-content').forEach(content => {
                    content.classList.remove('expanded');
                    content.previousElementSibling.classList.add('collapsed');
                });
            }
        });



        document.getElementById('lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') {
                this.closeLightbox();
            }
        });

        document.getElementById('lightbox').addEventListener('touchmove', (e) => {
            if (document.body.classList.contains('lightbox-open')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());

        document.getElementById('lightboxRandom').addEventListener('click', () => this.showRandomCard());
        
        const infoToggle = document.getElementById('infoToggle');
        const lightboxInfoMeta = document.querySelector('.lightbox-info-meta');
        
        infoToggle.addEventListener('click', () => {
            lightboxInfoMeta.classList.toggle('show');
        });
        document.querySelector('.lightbox-prev').addEventListener('click', () => {
            if (this.currentGroup && this.currentImageIndex > 0) {
                this.showPreviousImage();
            } else {
                this.showPreviousCard();
            }
        });
        document.querySelector('.lightbox-next').addEventListener('click', () => {
            if (this.currentGroup && this.currentImageIndex < this.getAvailableImages().length - 1) {
                this.showNextImage();
            } else {
                this.showNextCard();
            }
        });

        // Hotkeys
        document.addEventListener('keydown', (e) => {
            const lightboxOpen = document.body.classList.contains('lightbox-open');
            const typingInField = e.target.matches('input, textarea, select, [contenteditable="true"]');

            if (e.key === 'Escape') this.closeLightbox();
            if (!lightboxOpen || typingInField) return;

            if (e.key === 'ArrowLeft') {
                this.showPreviousCard();
            }
            if (e.key === 'ArrowRight') {
                this.showNextCard();
            }
            if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                this.showRandomCard();
            }
        });

        const resetFiltersHandler = () => {
            this.resetAllFilters();
        };

        document.getElementById('resetFilters').addEventListener('click', resetFiltersHandler);
        document.getElementById('sidebarResetFilters').addEventListener('click', resetFiltersHandler);

        this.setupZoomControls();
    }

    async refreshGallery() {
        this.showLoading(true);
        try {
            this.galleryData = [];
            this.filteredData = [];
            await this.loadGalleryData();
            this.populateFilters();
            this.updateHeaderStats();
            this.renderGallery();
        } finally {
            this.showLoading(false);
        }
    }

    async checkForUpdates() {
        try {
            await this.reloadGalleryData();
        } catch (error) {
        }
    }

    startAutoRefresh() {
        setInterval(async () => {
            try {
                await this.reloadGalleryData();
            } catch (error) {
            }
        }, 60 * 60 * 1000);
    }

    async reloadGalleryData() {
        try {
            const currentLength = this.galleryData.length;
            
            const oldScript = document.querySelector('script[src*="gallery-data.js"]');
            if (oldScript) {
                oldScript.remove();
            }
            
            if (typeof window.GALLERY_DATA !== 'undefined') {
                delete window.GALLERY_DATA;
            }
            
            const newScript = document.createElement('script');
            newScript.src = '/assets/js/gallery-data.js?' + Date.now();
            newScript.onload = () => {
                if (typeof GALLERY_DATA !== 'undefined' && currentLength !== GALLERY_DATA.length) {
                    this.refreshGallery();
                    window.SiteFooter?.updateLastUpdated();
                }
            };
            newScript.onerror = () => {
            };
            document.head.appendChild(newScript);
        } catch (error) {
        }
    }



    async loadGalleryData() {
        this.galleryData = GALLERY_DATA;
        this.filteredData = [...this.galleryData];
    }

    getSelectedFilterValues(name) {
        return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
    }

    populateFilters() {
        const brandFilter = document.getElementById('brandFilter');
        const brands = [...new Set(this.galleryData.map(item => item.brand).filter(brand => brand && brand !== 'Unknown'))];

        brandFilter.innerHTML = '';

        brands.sort().forEach(brand => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="checkbox" name="brand" value="${brand}"><span>${brand}</span><span class="checkmark">✓</span>`;
            brandFilter.appendChild(label);
        });

        const formatFilter = document.getElementById('formatFilter');
        const formats = [...new Set(this.galleryData.map(item => item.film_format).filter(format => format))];

        formatFilter.innerHTML = '';

        formats.sort().forEach(format => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="checkbox" name="format" value="${format}"><span>${format}</span><span class="checkmark">✓</span>`;
            formatFilter.appendChild(label);
        });

        const processFilter = document.getElementById('processFilter');
        const processes = [...new Set(this.galleryData.map(item => item.process).filter(process => process))];

        processFilter.innerHTML = '';

        processes.sort().forEach(process => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="checkbox" name="process" value="${process}"><span>${process}</span><span class="checkmark">✓</span>`;
            processFilter.appendChild(label);
        });

        const expiryFilter = document.getElementById('expiryFilter');
        const expiryDates = this.galleryData
            .map(item => item.expiry_date)
            .filter(date => date && date !== 'Unknown' && date.length === 6)
            .map(date => {
                const year = parseInt(date.substring(0, 4));
                return Math.floor(year / 10) * 10;
            });

        const decades = [...new Set(expiryDates)].sort((a, b) => b - a);

        const hasUnknownExpiry = this.galleryData.some(item =>
            !item.expiry_date || item.expiry_date === 'Unknown' || item.expiry_date.length !== 6
        );

        expiryFilter.innerHTML = '';

        decades.forEach(decade => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="checkbox" name="expiry" value="${decade}"><span>${decade}s</span><span class="checkmark">✓</span>`;
            expiryFilter.appendChild(label);
        });

        if (hasUnknownExpiry) {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="checkbox" name="expiry" value="unknown"><span>Unknown</span><span class="checkmark">✓</span>`;
            expiryFilter.appendChild(label);
        }

        const sortModeFilter = document.getElementById('sortModeFilter');
        sortModeFilter.innerHTML = '';

        [
            { value: 'date_added', label: 'Date added' },
            { value: 'alphabetical', label: 'Alphabetical' }
        ].forEach(({ value, label }) => {
            const option = document.createElement('label');
            option.className = 'filter-option';
            option.innerHTML = `<input type="checkbox" name="sort_mode" value="${value}"><span>${label}</span><span class="checkmark">✓</span>`;
            sortModeFilter.appendChild(option);
        });

        const dateAddedInput = sortModeFilter.querySelector('input[value="date_added"]');
        if (dateAddedInput) dateAddedInput.checked = true;

        this.attachFilterEventListeners();
        this.updateInitialToggleText();
        this.updateHeaderStats();
    }

    updateHeaderStats() {
        if (!window.ArchiveUtils) return;
        const stats = ArchiveUtils.computeArchiveStats(this.galleryData);
        ArchiveUtils.applyHeaderStats(stats);
    }

    updateInitialToggleText() {
        ['brand', 'format', 'process', 'expiry', 'sort'].forEach((filterType) => {
            this.updateToggleText(filterType);
        });
    }

    applySortMode(mode) {
        const sortType = mode === 'alphabetical' ? 'alphabetical' : 'date_added';
        const preserveDirection = this.currentSort.type === sortType;

        this.currentSort.type = sortType;
        if (!preserveDirection) {
            this.currentSort.ascending = sortType === 'alphabetical';
        }
    }

    getSortOrderLabel(mode) {
        if (mode === 'alphabetical') {
            const direction = this.currentSort.ascending ? 'A–Z' : 'Z–A';
            return `Order (${direction})`;
        }
        const direction = this.currentSort.ascending ? 'Oldest' : 'Newest';
        return `Order (${direction})`;
    }

    attachFilterEventListeners() {
        ['brand', 'format', 'process', 'expiry'].forEach((filterType) => {
            document.querySelectorAll(`input[name="${filterType}"]`).forEach((checkbox) => {
                checkbox.addEventListener('change', () => {
                    this.filterGallery();
                    this.updateToggleText(filterType);
                });
            });
        });

        document.querySelectorAll('input[name="sort_mode"]').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    document.querySelectorAll('input[name="sort_mode"]').forEach((other) => {
                        if (other !== checkbox) other.checked = false;
                    });
                    this.applySortMode(checkbox.value);
                } else if (!this.getSelectedFilterValues('sort_mode').length) {
                    const dateAddedInput = document.querySelector('input[name="sort_mode"][value="date_added"]');
                    if (dateAddedInput) dateAddedInput.checked = true;
                    this.applySortMode('date_added');
                }

                this.filterGallery();
                this.updateToggleText('sort');
            });
        });
    }

    applyUrlFilters() {
        const params = new URLSearchParams(window.location.search);
        const filterMap = {
            brand: 'brand',
            format: 'format',
            process: 'process'
        };
        let applied = false;

        Object.entries(filterMap).forEach(([param, name]) => {
            const value = params.get(param);
            if (!value) return;

            const checkbox = [...document.querySelectorAll(`input[name="${name}"]`)]
                .find((input) => input.value === value);
            if (!checkbox) return;

            checkbox.checked = true;
            this.updateToggleText(name);
            applied = true;
        });

        return applied;
    }

    updateToggleText(filterType) {
        const inputName = filterType === 'sort' ? 'sort_mode' : filterType;
        const selected = this.getSelectedFilterValues(inputName);
        const toggleButton = document.querySelector(`[data-target="${filterType}-section"]`);
        if (!toggleButton) return;
        const toggleText = toggleButton.querySelector('span:first-child');
        const defaultLabels = {
            brand: 'Brands',
            format: 'Formats',
            process: 'Processes',
            expiry: 'Expiry Dates',
            sort: 'Order'
        };

        if (selected.length === 0) {
            toggleText.textContent = defaultLabels[filterType];
        } else if (selected.length === 1) {
            const value = selected[0];
            if (filterType === 'expiry') {
                toggleText.textContent = value === 'unknown' ? 'Unknown' : `${value}s`;
            } else if (filterType === 'sort') {
                toggleText.textContent = this.getSortOrderLabel(value);
            } else {
                toggleText.textContent = value;
            }
        } else {
            toggleText.textContent = `${selected.length} selected`;
        }
    }

    matchesExpiryFilter(item, selectedExpiries) {
        if (selectedExpiries.length === 0) return true;

        const isUnknownItem = !item.expiry_date || item.expiry_date === 'Unknown' || item.expiry_date.length !== 6;
        if (isUnknownItem) {
            return selectedExpiries.includes('unknown');
        }

        const year = parseInt(item.expiry_date.substring(0, 4), 10);
        const itemDecade = String(Math.floor(year / 10) * 10);
        return selectedExpiries.includes(itemDecade);
    }

    filterGallery() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedBrands = this.getSelectedFilterValues('brand');
        const selectedFormats = this.getSelectedFilterValues('format');
        const selectedProcesses = this.getSelectedFilterValues('process');
        const selectedExpiries = this.getSelectedFilterValues('expiry');

        this.filteredData = this.galleryData.filter(item => {
            const matchesSearch = !searchTerm ||
                item.title.toLowerCase().includes(searchTerm) ||
                item.brand.toLowerCase().includes(searchTerm) ||
                item.product.toLowerCase().includes(searchTerm);

            const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(item.brand);
            const matchesFormat = selectedFormats.length === 0 || selectedFormats.includes(item.film_format);
            const matchesProcess = selectedProcesses.length === 0 || selectedProcesses.includes(item.process);
            const matchesExpiry = this.matchesExpiryFilter(item, selectedExpiries);

            return matchesSearch && matchesBrand && matchesFormat && matchesProcess && matchesExpiry;
        });

        if (this.currentSort.type) {
            this.sortGallery(this.currentSort.type);
        } else {
            this.renderGallery();
            this.updateResetButtonVisibility();
        }
    }

    hasActiveFilters() {
        const searchTerm = document.getElementById('searchInput')?.value.trim();
        if (searchTerm) return true;

        const filterNames = ['brand', 'format', 'process', 'expiry'];
        for (const name of filterNames) {
            if (this.getSelectedFilterValues(name).length > 0) return true;
        }

        const sortMode = this.getSelectedFilterValues('sort_mode');
        const isDefaultSortMode = sortMode.length === 1
            && sortMode[0] === 'date_added'
            && this.currentSort.type === this.defaultSort.type
            && this.currentSort.ascending === this.defaultSort.ascending;
        if (sortMode.length > 0 && !isDefaultSortMode) return true;

        return this.currentSort.type !== this.defaultSort.type
            || this.currentSort.ascending !== this.defaultSort.ascending;
    }

    updateResetButtonVisibility() {
        const btn = document.getElementById('sidebarResetFilters');
        const actions = document.querySelector('.filter-sidebar-actions');
        if (!btn || !actions) return;

        const active = this.hasActiveFilters();
        btn.hidden = !active;
        actions.classList.toggle('has-active-filters', active);
    }

    sortGallery(sortBy) {
        if (sortBy) {
            this.currentSort.type = sortBy;
        }

        const isUnknownSortValue = (value) => !value || value === 'unknown';

        this.filteredData.sort((a, b) => {
            let aValue, bValue;
            let aUnknown = false;
            let bUnknown = false;

            switch (sortBy) {
                case 'brand':
                    aValue = (a.brand || '').toLowerCase();
                    bValue = (b.brand || '').toLowerCase();
                    aUnknown = isUnknownSortValue(aValue);
                    bUnknown = isUnknownSortValue(bValue);
                    break;
                case 'format':
                    aValue = (a.film_format || '').toLowerCase();
                    bValue = (b.film_format || '').toLowerCase();
                    aUnknown = isUnknownSortValue(aValue);
                    bUnknown = isUnknownSortValue(bValue);
                    break;
                case 'process':
                    aValue = (a.process || '').toLowerCase();
                    bValue = (b.process || '').toLowerCase();
                    aUnknown = isUnknownSortValue(aValue);
                    bUnknown = isUnknownSortValue(bValue);
                    break;
                case 'expiry': {
                    aUnknown = !a.expiry_date || a.expiry_date === 'Unknown' || a.expiry_date.length !== 6;
                    bUnknown = !b.expiry_date || b.expiry_date === 'Unknown' || b.expiry_date.length !== 6;
                    aValue = aUnknown ? '' : a.expiry_date;
                    bValue = bUnknown ? '' : b.expiry_date;
                    break;
                }
                case 'date_added': {
                    aValue = parseInt(a.date_added, 10) || 0;
                    bValue = parseInt(b.date_added, 10) || 0;
                    aUnknown = !aValue;
                    bUnknown = !bValue;
                    break;
                }
                case 'alphabetical': {
                    aValue = `${(a.brand || '').toLowerCase()}\0${(a.product || '').toLowerCase()}`;
                    bValue = `${(b.brand || '').toLowerCase()}\0${(b.product || '').toLowerCase()}`;
                    aUnknown = isUnknownSortValue(a.brand);
                    bUnknown = isUnknownSortValue(b.brand);
                    break;
                }
                default:
                    return 0;
            }

            if (aUnknown !== bUnknown) {
                return aUnknown ? 1 : -1;
            }

            if (aUnknown && bUnknown) {
                return 0;
            }

            if (sortBy === 'date_added') {
                return this.currentSort.ascending
                    ? aValue - bValue
                    : bValue - aValue;
            }

            if (sortBy === 'alphabetical') {
                return this.currentSort.ascending
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return this.currentSort.ascending
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });

        this.updateSortIcons();
        this.renderGallery();
        this.updateResetButtonVisibility();
    }

    updateSortIcons() {
        document.querySelectorAll('.filter-section').forEach((section) => {
            const icon = section.querySelector('.filter-icon');
            const toggle = section.querySelector('.filter-toggle');
            if (!icon || !toggle) return;

            const filterType = toggle.getAttribute('data-target').replace('-section', '');
            const isActive = filterType === 'sort'
                ? (this.currentSort.type === 'date_added' || this.currentSort.type === 'alphabetical')
                : this.currentSort.type === filterType;
            let iconName = 'ri-sort-desc';

            if (isActive) {
                iconName = this.currentSort.ascending ? 'ri-sort-desc' : 'ri-sort-asc';
            }

            icon.className = `filter-icon ${iconName}`;
            icon.style.opacity = isActive ? '1' : '0.35';
        });
    }

    updateCounter() {
        const counter = document.getElementById('itemCounter');
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        counter.textContent = groupedData.length;
    }

    formatExpiryDate(expiryDate, yearOnly = false) {
        if (!expiryDate || expiryDate === 'Unknown') return 'Unknown';
        if (expiryDate.length === 6) {
            const year = expiryDate.substring(0, 4);
            return yearOnly ? year : `${year}-${expiryDate.substring(4, 6)}`;
        }
        return expiryDate;
    }

    renderGallery() {
        const container = document.getElementById('galleryContainer');
        const noResults = document.getElementById('noResults');

        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);

        this.updateCounter();

        if (groupedData.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        
        container.innerHTML = groupedData.map((group, index) => {
            const brandColor = window.BrandColors?.resolveBrand(group.metadata.brand);
            const textColor = window.BrandColors?.textColorForBrand(group.metadata.brand) || '#1A1A1A';
            const brandBackground = brandColor?.color || '#808080';
            const iso = group.metadata.film_speed_iso || '100';
            const format = group.metadata.film_format || '35mm';
            const process = group.metadata.process || 'C-41';
            const thumbnailItem = group.front || group.back;
            const expiry = this.formatExpiryDate(thumbnailItem?.expiry_date, true);
            const thumbnailUrl = thumbnailItem.imageUrl.replace('/archive/', '/lowres/');
            
            let viewType = '';
            if (group.front && group.back) {
                viewType = '1/2';
            } else if (group.front) {
                viewType = '1/1';
            }
            
            return `
                <article class="gallery-item" data-index="${index}" data-brand="${group.metadata.brand.toLowerCase()}" data-name="${group.metadata.title}">
                    <div class="bottom-flap"></div>
                    <div class="top-flap"></div>
                    <div class="image-container">
                        <img src="${thumbnailUrl}" alt="${group.metadata.title}" loading="lazy" 
                             onerror="this.onerror=null; this.src='${thumbnailItem.imageUrl}';">
                    </div>
                    <div class="brand-header" style="color: ${textColor}; background-color: ${brandBackground};">${group.metadata.brand}</div>
                    <div class="gallery-item-info">
                        <h2 class="gallery-item-title">${group.metadata.product}</h2>
                        <div class="gallery-item-details">
                            <div>${iso} <span>ISO</span></div>
                            <div>${format} <span>FORMAT</span></div>
                            <div>${process} <span>PROCESS</span></div>
                            <div>${expiry} <span>EXPIRY</span></div>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        container.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.openLightbox(index);
            });
        });
    }

    handleUrlHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        
        const targetItem = this.galleryData.find(item => item.filename === hash);
        if (!targetItem) return;
        
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        const targetGroupIndex = groupedData.findIndex(group => {
            return (group.front && group.front.filename === hash) || 
                   (group.back && group.back.filename === hash);
        });
        
        if (targetGroupIndex !== -1) {
            this.openLightbox(targetGroupIndex, hash);
        }
    }

    openLightbox(index, specificFilename = null) {
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        const group = groupedData[index];
        
        if (!group) return;
        
        this.currentGroup = group;
        this.currentImageIndex = 0;
        
        const availableImages = [];
        if (group.front) availableImages.push(group.front);
        if (group.back) availableImages.push(group.back);
        
        if (availableImages.length === 0) return;
        
        if (specificFilename) {
            const specificIndex = availableImages.findIndex(img => img.filename === specificFilename);
            if (specificIndex !== -1) {
                this.currentImageIndex = specificIndex;
            }
        }
        
        const displayItem = availableImages[this.currentImageIndex];
        
        const lightbox = document.getElementById('lightbox');
        const lightboxTitle = document.getElementById('lightboxTitle');
        const scrollToTopBtn = document.getElementById('scrollToTop');
        
        lightboxTitle.textContent = displayItem.title;
        
        this.currentIndex = index;
        document.body.classList.add('lightbox-open');
        window.closeSitePanels?.();
        lightbox.style.display = 'flex';
        window.dispatchEvent(new Event('resize'));
        
        this.updateUrl(displayItem.filename);
        
        if (scrollToTopBtn) {
            scrollToTopBtn.classList.remove('visible');
            scrollToTopBtn.setAttribute('hidden', '');
            scrollToTopBtn.style.pointerEvents = 'none';
        }
        
        this.showImage(displayItem);
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        prevBtn.onclick = () => this.showPreviousCard();
        nextBtn.onclick = () => this.showNextCard();
        
        if (this.resetZoom) {
            this.resetZoom();
        }
        
        if (this.updateViewControls) {
            this.updateViewControls();
        }
    }

    updateUrl(filename) {
        const newUrl = `${window.location.pathname}#${filename}`;
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes(`#${filename}`)) {
            window.history.pushState({ filename }, '', newUrl);
        }
    }

    closeLightbox() {
        document.getElementById('lightbox').style.display = 'none';
        document.body.classList.remove('lightbox-open');
        
        if (window.location.hash) {
            window.history.pushState({}, '', window.location.pathname);
        }
        
        const scrollToTopBtn = document.getElementById('scrollToTop');
        if (scrollToTopBtn) {
            scrollToTopBtn.style.removeProperty('pointer-events');
        }

        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));
    }



    showImage(item) {
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxScanCredit = document.getElementById('lightboxScanCredit');
        const lightboxResolution = document.getElementById('lightboxResolution');
        const lightboxFileSize = document.getElementById('lightboxFileSize');
        
        if (lightboxImage.src !== item.imageUrl) {
            lightboxImage.src = item.imageUrl;
            
            lightboxImage.onload = () => {
                this.updateImageMetadata(lightboxImage, item.imageUrl);
            };
        }
        lightboxImage.alt = item.title;
        
        this.updateUrl(item.filename);
        
        const availableImages = [];
        if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
        if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
        
        const lightboxISO = document.getElementById('lightboxISO');
        const lightboxFormat = document.getElementById('lightboxFormat');
        const lightboxProcess = document.getElementById('lightboxProcess');
        const lightboxExpiry = document.getElementById('lightboxExpiry');
        
        lightboxISO.innerHTML = `${item.film_speed_iso} <span>ISO</span>`;
        lightboxFormat.innerHTML = `${item.film_format} <span>FORMAT</span>`;
        lightboxProcess.innerHTML = `${item.process} <span>PROCESS</span>`;
        const formattedExpiry = this.formatExpiryDate(item.expiry_date);
        lightboxExpiry.innerHTML = `${formattedExpiry} <span>EXPIRY DATE</span>`;
        
        if (item.author && item.author.trim() !== '') {
            lightboxScanCredit.textContent = `Scan by ${item.author}`;
            lightboxScanCredit.style.display = 'block';
        } else {
            lightboxScanCredit.style.display = 'none';
        }
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }

    updateImageMetadata(imageElement, imageUrl) {
        const lightboxResolution = document.getElementById('lightboxResolution');
        const lightboxFileSize = document.getElementById('lightboxFileSize');
        const downloadBtn = document.getElementById('downloadImage');
        
        const resolution = `${imageElement.naturalWidth} × ${imageElement.naturalHeight}`;
        lightboxResolution.textContent = resolution;
        
        fetch(imageUrl, { method: 'HEAD' })
            .then(response => {
                const contentLength = response.headers.get('content-length');
                
                if (contentLength) {
                    const sizeInBytes = parseInt(contentLength);
                    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
                    lightboxFileSize.textContent = `${sizeInMB} MB`;
                } else {
                    const estimatedSize = this.estimateFileSize(imageElement.naturalWidth, imageElement.naturalHeight);
                    lightboxFileSize.textContent = `${estimatedSize} MB`;
                }
            })
            .catch(error => {
                const estimatedSize = this.estimateFileSize(imageElement.naturalWidth, imageElement.naturalHeight);
                lightboxFileSize.textContent = `${estimatedSize} MB`;
            });
        
        downloadBtn.style.display = 'block';
        downloadBtn.onclick = (e) => {
            e.preventDefault();
            this.downloadImage(imageUrl);
        };
    }

    estimateFileSize(width, height) {
        const pixels = width * height;
        const estimatedBytes = pixels * 0.15;
        const estimatedMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
        return estimatedMB;
    }

    downloadImage(imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = imageUrl.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showPreviousImage() {
        if (this.currentGroup) {
            const availableImages = [];
            if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
            if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
            
            if (this.currentImageIndex > 0) {
                this.currentImageIndex--;
                const displayItem = availableImages[this.currentImageIndex];
                
                this.showImage(displayItem);
                
                if (this.updateViewControls) {
                    this.updateViewControls();
                }
            }
        }
    }

    showNextImage() {
        if (this.currentGroup) {
            const availableImages = [];
            if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
            if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
            
            if (this.currentImageIndex < availableImages.length - 1) {
                this.currentImageIndex++;
                const displayItem = availableImages[this.currentImageIndex];
                
                this.showImage(displayItem);
                
                if (this.updateViewControls) {
                    this.updateViewControls();
                }
            }
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (!loadingIndicator) return;

        loadingIndicator.classList.toggle('is-active', show);
        loadingIndicator.toggleAttribute('hidden', !show);
        loadingIndicator.setAttribute('aria-busy', show ? 'true' : 'false');
    }



    getAvailableImages() {
        if (!this.currentGroup) return [];
        const availableImages = [];
        if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
        if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
        return availableImages;
    }

    showPreviousCard() {
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = groupedData.length - 1;
        }
        this.currentImageIndex = 0;
        this.openLightbox(this.currentIndex);
    }

    showNextCard() {
        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        if (this.currentIndex < groupedData.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0;
        }
        this.currentImageIndex = 0;
        this.openLightbox(this.currentIndex);
    }

    showRandomCard() {
        this.playRandomDiceAnimation();

        const groupedData = ArchiveUtils.groupItemsByBaseFilename(this.filteredData);
        if (groupedData.length <= 1) return;

        let randomIndex = this.currentIndex;
        while (randomIndex === this.currentIndex) {
            randomIndex = Math.floor(Math.random() * groupedData.length);
        }

        this.currentImageIndex = 0;
        this.openLightbox(randomIndex);
    }

    playRandomDiceAnimation() {
        const btn = document.getElementById('lightboxRandom');
        const icon = btn?.querySelector('i');
        if (!icon) return;

        icon.classList.remove('is-jumping');
        void icon.offsetWidth;
        icon.classList.add('is-jumping');
        icon.addEventListener('animationend', () => {
            icon.classList.remove('is-jumping');
        }, { once: true });
    }

    closeDropdownOnMobile(sectionId) {
        if (this.isMobile()) {
            const content = document.getElementById(sectionId);
            const toggle = content.previousElementSibling;
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                toggle.classList.add('collapsed');
            }
        }
    }

    resetAllFilters() {
        document.getElementById('searchInput').value = '';

        document.querySelectorAll('input[name="brand"], input[name="format"], input[name="process"], input[name="expiry"], input[name="sort_mode"]').forEach((input) => {
            input.checked = false;
        });

        const dateAddedInput = document.querySelector('input[name="sort_mode"][value="date_added"]');
        if (dateAddedInput) dateAddedInput.checked = true;

        this.currentSort = { ...this.defaultSort };
        this.updateInitialToggleText();
        this.filterGallery();
        
        document.querySelectorAll('.filter-content').forEach(content => {
            content.classList.remove('expanded');
            content.previousElementSibling.classList.add('collapsed');
        });

        this.updateResetButtonVisibility();
    }

    setupZoomControls() {
        let currentZoom = 1;
        let currentX = 0;
        let currentY = 0;
        let currentRotation = 0;
        const zoomStep = 0.25;
        const maxZoom = 3;
        const minZoom = 0.5;
        let lastZoom = 1;
        let lastX = 0;
        let lastY = 0;
        let lastRotation = 0;

        const lightboxImage = document.getElementById('lightboxImage');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomResetBtn = document.getElementById('zoomReset');
        const rotateBtn = document.getElementById('rotateBtn');
        const frontViewBtn = document.getElementById('frontView');
        const backViewBtn = document.getElementById('backView');

        let zoomInDisabled = false;
        let zoomOutDisabled = false;

        lightboxImage.style.willChange = 'transform';
        lightboxImage.style.transformOrigin = 'center center';
        
        const updateCursor = () => {
            lightboxImage.style.cursor = 'grab';
        };

        const updateTransform = () => {
            if (currentZoom !== lastZoom || currentX !== lastX || currentY !== lastY || currentRotation !== lastRotation) {
                lightboxImage.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentZoom}) rotate(${currentRotation}deg)`;
                
                lastZoom = currentZoom;
                lastX = currentX;
                lastY = currentY;
                lastRotation = currentRotation;
                
                setTimeout(updateCursor, 0);
            }
            
            const newZoomInDisabled = currentZoom >= maxZoom;
            const newZoomOutDisabled = currentZoom <= minZoom;
            
            if (newZoomInDisabled !== zoomInDisabled) {
                zoomInDisabled = newZoomInDisabled;
                zoomInBtn.disabled = zoomInDisabled;
                zoomInBtn.style.opacity = zoomInDisabled ? '0.5' : '1';
            }
            
            if (newZoomOutDisabled !== zoomOutDisabled) {
                zoomOutDisabled = newZoomOutDisabled;
                zoomOutBtn.disabled = zoomOutDisabled;
                zoomOutBtn.style.opacity = zoomOutDisabled ? '0.5' : '1';
            }
        };

        const updateTransformImmediate = () => {
            lightboxImage.style.transition = 'none';
            lightboxImage.offsetHeight;
            updateTransform();
            setTimeout(() => {
                lightboxImage.style.transition = 'transform 0.3s ease';
            }, 50);
        };



        zoomInBtn.addEventListener('click', () => {
            if (currentZoom < maxZoom) {
                currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
                updateTransformImmediate();
                setTimeout(updateCursor, 0);
            }
        });

        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom > minZoom) {
                currentZoom = Math.max(currentZoom - zoomStep, minZoom);
                updateTransformImmediate();
                setTimeout(updateCursor, 0);
            }
        });

        rotateBtn.addEventListener('click', () => {
            currentRotation += 90;
            if (currentRotation >= 360) {
                currentRotation = 0;
            }
            updateTransform();
        });

        zoomResetBtn.addEventListener('click', () => {
            currentZoom = 1;
            currentX = 0;
            currentY = 0;
            currentRotation = 0;
            lastZoom = 0;
            lastX = 1;
            lastY = 1;
            lastRotation = 1;
            updateTransform();
            setTimeout(updateCursor, 0);
        });

        this.resetZoom = () => {
            currentZoom = 1;
            currentX = 0;
            currentY = 0;
            currentRotation = 0;
            lastZoom = 0;
            lastX = 1;
            lastY = 1;
            lastRotation = 1;
            updateTransform();
            setTimeout(updateCursor, 0);
        };

        let isDragging = false;
        let isPinching = false;
        let startX = 0;
        let startY = 0;
        let startTranslateX = 0;
        let startTranslateY = 0;
        let initialDistance = 0;
        let initialZoom = 1;

        const getDistance = (touch1, touch2) => {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const getCenter = (touch1, touch2) => {
            return {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
        };

        const handleDragStart = (e) => {
            if (e.touches && e.touches.length === 2) {
                isPinching = true;
                isDragging = false;
                initialDistance = getDistance(e.touches[0], e.touches[1]);
                initialZoom = currentZoom;
                const center = getCenter(e.touches[0], e.touches[1]);
                startX = center.x;
                startY = center.y;
                startTranslateX = currentX;
                startTranslateY = currentY;
                e.preventDefault();
            } else {
                isDragging = true;
                isPinching = false;
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                startX = clientX;
                startY = clientY;
                startTranslateX = currentX;
                startTranslateY = currentY;
                lightboxImage.style.cursor = 'grabbing';
                e.preventDefault();
            }
        };

        const handleDragMove = (e) => {
            if (isPinching && e.touches && e.touches.length === 2) {
                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const scale = currentDistance / initialDistance;
                const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * scale));
                
                const center = getCenter(e.touches[0], e.touches[1]);
                const deltaX = center.x - startX;
                const deltaY = center.y - startY;
                
                currentZoom = newZoom;
                currentX = startTranslateX + deltaX;
                currentY = startTranslateY + deltaY;
                
                requestAnimationFrame(updateTransformImmediate);
                e.preventDefault();
            } else if (isDragging) {
                const clientX = e.clientX || (e.touches && e.touches[0].clientX);
                const clientY = e.clientY || (e.touches && e.touches[0].clientY);
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;
                
                currentX = startTranslateX + deltaX;
                currentY = startTranslateY + deltaY;
                
                requestAnimationFrame(updateTransformImmediate);
                e.preventDefault();
            }
        };

        const handleDragEnd = () => {
            isDragging = false;
            isPinching = false;
            lightboxImage.style.cursor = 'grab';
        };

        lightboxImage.addEventListener('mousedown', handleDragStart);
        lightboxImage.parentElement.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);

        lightboxImage.addEventListener('touchstart', handleDragStart, { passive: false });
        lightboxImage.parentElement.addEventListener('touchstart', handleDragStart, { passive: false });
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);

        const updateViewButtons = () => {
            if (this.currentGroup) {
                const hasFront = this.currentGroup.front !== null;
                const hasBack = this.currentGroup.back !== null;
                
                frontViewBtn.style.display = hasFront ? 'block' : 'none';
                backViewBtn.style.display = hasBack ? 'block' : 'none';
                
                if (this.currentImageIndex === 0) {
                    frontViewBtn.classList.add('active');
                    backViewBtn.classList.remove('active');
                } else {
                    frontViewBtn.classList.remove('active');
                    backViewBtn.classList.add('active');
                }
            }
        };

        frontViewBtn.addEventListener('click', () => {
            if (this.currentGroup && this.currentGroup.front) {
                this.currentImageIndex = 0;
                this.showImage(this.currentGroup.front);
                updateViewButtons();
                this.resetZoom();
            }
        });

        backViewBtn.addEventListener('click', () => {
            if (this.currentGroup && this.currentGroup.back) {
                this.currentImageIndex = 1;
                this.showImage(this.currentGroup.back);
                updateViewButtons();
                this.resetZoom();
            }
        });

        this.updateViewControls = updateViewButtons;
        
        setTimeout(updateCursor, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FilmGallery();
}); 