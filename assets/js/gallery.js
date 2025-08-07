class FilmGallery {
    constructor() {
        this.galleryData = [];
        this.filteredData = [];
        this.currentIndex = 0;
        this.currentSort = { type: null, ascending: true };
        
        this.init();
    }

    isMobile() {
        return window.innerWidth <= 768;
    }

    async init() {
        this.setupEventListeners();
        this.showLoading(true);
        await this.loadGalleryData();
        this.populateFilters();
        this.sortGallery('brand');
        this.renderGallery();
        this.showLoading(false);
        
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
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const filterType = toggle.getAttribute('data-target').replace('-section', '');
                
                if (this.currentSort.type === filterType) {
                    this.currentSort.ascending = !this.currentSort.ascending;
                } else {
                    this.currentSort.type = filterType;
                    this.currentSort.ascending = true;
                }
                
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
        
        document.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
        
        const infoToggle = document.getElementById('infoToggle');
        const lightboxInfoMeta = document.querySelector('.lightbox-info-meta');
        
        infoToggle.addEventListener('click', () => {
            lightboxInfoMeta.classList.toggle('show');
            console.log('Toggle clicked, meta has show class:', lightboxInfoMeta.classList.contains('show'));
            console.log('Meta element:', lightboxInfoMeta);
            console.log('Meta computed display:', getComputedStyle(lightboxInfoMeta).display);
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

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeLightbox();
            if (e.key === 'ArrowLeft') {
                this.showPreviousCard();
            }
            if (e.key === 'ArrowRight') {
                this.showNextCard();
            }
        });

        this.setupScrollToTop();
        
        const resetFiltersHandler = () => {
            this.resetAllFilters();
        };
        
        document.getElementById('resetFilters').addEventListener('click', resetFiltersHandler);
        document.querySelector('.clickable-filters').addEventListener('click', resetFiltersHandler);



        this.setupZoomControls();
    }

    async refreshGallery() {
        this.showLoading(true);
        this.galleryData = [];
        this.filteredData = [];
        await this.loadGalleryData();
        this.populateFilters();
        this.updateHeaderStats();
        this.renderGallery();
        this.showLoading(false);
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
            newScript.src = 'assets/js/gallery-data.js?' + Date.now();
            newScript.onload = () => {
                if (typeof GALLERY_DATA !== 'undefined' && currentLength !== GALLERY_DATA.length) {
                    this.refreshGallery();
                    this.updateLastUpdated();
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

    groupItemsByBaseFilename(items) {
        const grouped = {};
        
        items.forEach(item => {
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

    populateFilters() {
        const brandFilter = document.getElementById('brandFilter');
        const brands = [...new Set(this.galleryData.map(item => item.brand).filter(brand => brand && brand !== 'Unknown'))];
        
        brandFilter.innerHTML = '<label class="filter-option"><input type="radio" name="brand" value="" checked><span>All Brands</span></label>';
        
        brands.sort().forEach(brand => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="brand" value="${brand}"><span>${brand}</span><span class="checkmark">✓</span>`;
            brandFilter.appendChild(label);
        });

        const formatFilter = document.getElementById('formatFilter');
        const formats = [...new Set(this.galleryData.map(item => item.film_format).filter(format => format))];
        
        formatFilter.innerHTML = '<label class="filter-option"><input type="radio" name="format" value="" checked><span>All Formats</span></label>';
        
        formats.sort().forEach(format => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="format" value="${format}"><span>${format}</span><span class="checkmark">✓</span>`;
            formatFilter.appendChild(label);
        });

        const processFilter = document.getElementById('processFilter');
        const processes = [...new Set(this.galleryData.map(item => item.process).filter(process => process))];
        
        processFilter.innerHTML = '<label class="filter-option"><input type="radio" name="process" value="" checked><span>All Processes</span></label>';
        
        processes.sort().forEach(process => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="process" value="${process}"><span>${process}</span><span class="checkmark">✓</span>`;
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
        
        expiryFilter.innerHTML = '<label class="filter-option"><input type="radio" name="expiry" value="" checked><span>All Expiry Dates</span></label>';
        
        decades.forEach(decade => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="expiry" value="${decade}"><span>${decade}s</span><span class="checkmark">✓</span>`;
            expiryFilter.appendChild(label);
        });
        
        if (hasUnknownExpiry) {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="expiry" value="unknown"><span>Unknown</span><span class="checkmark">✓</span>`;
            expiryFilter.appendChild(label);
        }

        this.attachFilterEventListeners();
        this.updateInitialToggleText();
        this.updateHeaderStats();
    }

    updateHeaderStats() {
        // Calculate total unique brands (rounded to nearest 5)
        const uniqueBrands = [...new Set(this.galleryData.map(item => item.brand).filter(brand => brand && brand !== 'Unknown'))];
        const totalBrands = Math.ceil(uniqueBrands.length / 5) * 5;
        
        // Calculate total unique formats
        const uniqueFormats = [...new Set(this.galleryData.map(item => item.film_format).filter(format => format && format !== 'Unknown'))];
        const totalFormats = uniqueFormats.length;
        
        // Calculate total unique processes
        const uniqueProcesses = [...new Set(this.galleryData.map(item => item.process).filter(process => process && process !== 'Unknown'))];
        const totalProcesses = uniqueProcesses.length;
        
        // Find oldest expiry date
        const validExpiryDates = this.galleryData
            .map(item => item.expiry_date)
            .filter(date => date && date !== 'Unknown' && date.length === 6)
            .map(date => {
                const year = parseInt(date.substring(0, 4));
                const month = parseInt(date.substring(4, 6));
                return { year, month, original: date };
            })
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
        
        let oldestExpiry = 'Unknown';
        if (validExpiryDates.length > 0) {
            const oldest = validExpiryDates[0];
            oldestExpiry = oldest.year.toString();
        }
        
        // Update the DOM elements
        document.getElementById('totalBrands').textContent = totalBrands;
        document.getElementById('totalFormats').textContent = totalFormats;
        document.getElementById('totalProcesses').textContent = totalProcesses;
        document.getElementById('oldestExpiry').textContent = oldestExpiry;
    }

    updateInitialToggleText() {
        const selectedBrand = document.querySelector('input[name="brand"]:checked').value;
        this.updateToggleText('brand', selectedBrand);
        
        const selectedFormat = document.querySelector('input[name="format"]:checked').value;
        this.updateToggleText('format', selectedFormat);
        
        const selectedProcess = document.querySelector('input[name="process"]:checked').value;
        this.updateToggleText('process', selectedProcess);
        
        const selectedExpiry = document.querySelector('input[name="expiry"]:checked').value;
        this.updateToggleText('expiry', selectedExpiry);
    }

    attachFilterEventListeners() {
        document.querySelectorAll('input[name="brand"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterGallery();
                this.updateToggleText('brand', radio.value);
                this.closeDropdownOnMobile('brand-section');
            });
        });
        document.querySelectorAll('input[name="format"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterGallery();
                this.updateToggleText('format', radio.value);
                this.closeDropdownOnMobile('format-section');
            });
        });
        document.querySelectorAll('input[name="process"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterGallery();
                this.updateToggleText('process', radio.value);
                this.closeDropdownOnMobile('process-section');
            });
        });
        document.querySelectorAll('input[name="expiry"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterGallery();
                this.updateToggleText('expiry', radio.value);
                this.closeDropdownOnMobile('expiry-section');
            });
        });
    }

    updateToggleText(filterType, selectedValue) {
        const toggleButton = document.querySelector(`[data-target="${filterType}-section"]`);
        const toggleText = toggleButton.querySelector('span:first-child');
        
        if (selectedValue === '') {
            const typeName = filterType.charAt(0).toUpperCase() + filterType.slice(1);
            if (filterType === 'brand') {
                toggleText.textContent = 'Brands';
            } else if (filterType === 'format') {
                toggleText.textContent = 'Formats';
            } else if (filterType === 'process') {
                toggleText.textContent = 'Processes';
            } else if (filterType === 'expiry') {
                toggleText.textContent = 'Expiry Dates';
            } else {
                toggleText.textContent = `All ${typeName}s`;
            }
        } else {
            if (filterType === 'expiry') {
                if (selectedValue === 'unknown') {
                    toggleText.textContent = 'Unknown';
                } else {
                    toggleText.textContent = `${selectedValue}s`;
                }
            } else {
                toggleText.textContent = selectedValue;
            }
        }
    }

    filterGallery() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const brandFilter = document.querySelector('input[name="brand"]:checked').value;
        const formatFilter = document.querySelector('input[name="format"]:checked').value;
        const processFilter = document.querySelector('input[name="process"]:checked').value;
        const expiryFilter = document.querySelector('input[name="expiry"]:checked').value;

        this.filteredData = this.galleryData.filter(item => {
            const matchesSearch = !searchTerm || 
                item.title.toLowerCase().includes(searchTerm) ||
                item.brand.toLowerCase().includes(searchTerm) ||
                item.product.toLowerCase().includes(searchTerm);
            
            const matchesBrand = !brandFilter || item.brand === brandFilter;
            const matchesFormat = !formatFilter || item.film_format === formatFilter;
            const matchesProcess = !processFilter || item.process === processFilter;
            
            let matchesExpiry = true;
            if (expiryFilter && expiryFilter !== 'unknown') {
                if (item.expiry_date && item.expiry_date !== 'Unknown' && item.expiry_date.length === 6) {
                    const year = parseInt(item.expiry_date.substring(0, 4));
                    const itemDecade = Math.floor(year / 10) * 10;
                    matchesExpiry = itemDecade === parseInt(expiryFilter);
                } else {
                    matchesExpiry = false;
                }
            } else if (expiryFilter === 'unknown') {
                matchesExpiry = !item.expiry_date || item.expiry_date === 'Unknown' || item.expiry_date.length !== 6;
            }
            
            return matchesSearch && matchesBrand && matchesFormat && matchesProcess && matchesExpiry;
        });

        this.renderGallery();
    }

    sortGallery(sortBy) {
        this.filteredData.sort((a, b) => {
            let aValue, bValue;
            
            switch(sortBy) {
                case 'brand':
                    aValue = a.brand.toLowerCase();
                    bValue = b.brand.toLowerCase();
                    break;
                case 'format':
                    aValue = (a.film_format || '').toLowerCase();
                    bValue = (b.film_format || '').toLowerCase();
                    break;
                case 'process':
                    aValue = (a.process || '').toLowerCase();
                    bValue = (b.process || '').toLowerCase();
                    break;
                case 'expiry':
                    const aExpiry = a.expiry_date && a.expiry_date !== 'Unknown' ? a.expiry_date : '000000';
                    const bExpiry = b.expiry_date && b.expiry_date !== 'Unknown' ? b.expiry_date : '000000';
                    aValue = aExpiry;
                    bValue = bExpiry;
                    break;
                default:
                    return 0;
            }
            
            if (sortBy === 'expiry') {
                return this.currentSort.ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else {
                return this.currentSort.ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
        });
        
        this.renderGallery();
    }

    updateCounter() {
        const counter = document.getElementById('itemCounter');
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        counter.textContent = groupedData.length;
    }

    renderGallery() {
        const container = document.getElementById('galleryContainer');
        const noResults = document.getElementById('noResults');

        const groupedData = this.groupItemsByBaseFilename(this.filteredData);

        this.updateCounter();

        if (groupedData.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        
        container.innerHTML = groupedData.map((group, index) => {
            const brandClass = this.getBrandClass(group.metadata.brand);
            const textColor = this.getTextColorForBrand(group.metadata.brand);
            const iso = group.metadata.film_speed_iso || '100';
            const format = group.metadata.film_format || '35mm';
            const process = group.metadata.process || 'C-41';
            
            const thumbnailItem = group.front || group.back;
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
                    <div class="brand-header" style="color: ${textColor};">${group.metadata.brand}</div>
                    <div class="gallery-item-info">
                        <h2 class="gallery-item-title">${group.metadata.product}</h2>
                        <div class="gallery-item-details">
                            <div>${iso} <span>ISO</span></div>
                            <div>${format} <span>FORMAT</span></div>
                            <div>${process} <span>PROCESS</span></div>
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

    getBrandClass(brand) {
        const brandLower = brand.toLowerCase();
        if (brandLower.includes('fujifilm')) return 'fujifilm';
        if (brandLower.includes('kodak')) return 'kodak';
        if (brandLower.includes('ilford')) return 'ilford';
        if (brandLower.includes('agfa')) return 'agfa';
        if (brandLower.includes('cinestill')) return 'cinestill';
        if (brandLower.includes('alien film')) return 'alien-film';
        if (brandLower.includes('efiniti')) return 'efiniti';
        if (brandLower.includes('harman')) return 'harman';
        if (brandLower.includes('rollei')) return 'rollei';
        if (brandLower.includes('lomography')) return 'lomography';
        if (brandLower.includes('lloyds pharmacy')) return 'lloyds-pharmacy';
        if (brandLower.includes('kentmere')) return 'kentmere';
        if (brandLower.includes('polaroid')) return 'polaroid';
        if (brandLower.includes('konica')) return 'konica';
        if (brandLower.includes('efke')) return 'efke';
        if (brandLower.includes('jessops')) return 'jessops';
        if (brandLower.includes('porst')) return 'porst';
        if (brandLower.includes('wolfen')) return 'wolfen';
        if (brandLower.includes('shanghai')) return 'shanghai';
        if (brandLower.includes('york photo labs')) return 'york-photo-labs';
        if (brandLower.includes('gaf')) return 'gaf';
        if (brandLower.includes('unknown')) return 'unknown';
        return 'unknown';
    }

    // Dynamic text color based on brand accent color luminance
    getTextColorForBrand(brand) {
        const brandClass = this.getBrandClass(brand);
        if (!brandClass) return '#1A1A1A';
        
        const testElement = document.createElement('div');
        testElement.style.backgroundColor = `var(--accent-${brandClass})`;
        document.body.appendChild(testElement);
        const computedColor = getComputedStyle(testElement).backgroundColor;
        document.body.removeChild(testElement);
        
        const rgb = computedColor.match(/\d+/g);
        if (!rgb || rgb.length < 3) return '#1A1A1A';
        
        const [r, g, b] = rgb.map(Number);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
    }



    handleUrlHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;
        
        const targetItem = this.galleryData.find(item => item.filename === hash);
        if (!targetItem) return;
        
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        const targetGroupIndex = groupedData.findIndex(group => {
            return (group.front && group.front.filename === hash) || 
                   (group.back && group.back.filename === hash);
        });
        
        if (targetGroupIndex !== -1) {
            this.openLightbox(targetGroupIndex, hash);
        }
    }

    openLightbox(index, specificFilename = null) {
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
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
        lightbox.style.display = 'flex';
        
        this.updateUrl(displayItem.filename);
        
        if (scrollToTopBtn) {
            scrollToTopBtn.classList.remove('visible');
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
        
        if (window.location.hash) {
            window.history.pushState({}, '', window.location.pathname);
        }
        
        const scrollToTopBtn = document.getElementById('scrollToTop');
        if (scrollToTopBtn) {
            scrollToTopBtn.style.removeProperty('pointer-events');
        }
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
        let formattedExpiry = 'Unknown';
        if (item.expiry_date && item.expiry_date !== 'Unknown') {
            const expiry = item.expiry_date;
            if (expiry.length === 6) {
                const year = expiry.substring(0, 4);
                const month = expiry.substring(4, 6);
                formattedExpiry = `${year}-${month}`;
            } else {
                formattedExpiry = expiry;
            }
        }
        lightboxExpiry.innerHTML = `${formattedExpiry} <span>EXPIRY DATE</span>`;
        
        if (item.author && item.author.trim() !== '') {
            lightboxScanCredit.textContent = `Scan by ${item.author}`;
            lightboxScanCredit.style.display = 'block';
        } else {
            lightboxScanCredit.style.display = 'none';
        }
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
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
        if (show) {
            loadingIndicator.style.display = 'flex';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }



    getAvailableImages() {
        if (!this.currentGroup) return [];
        const availableImages = [];
        if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
        if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
        return availableImages;
    }

    showPreviousCard() {
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = groupedData.length - 1;
        }
        this.currentImageIndex = 0;
        this.openLightbox(this.currentIndex);
    }

    showNextCard() {
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        if (this.currentIndex < groupedData.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0;
        }
        this.currentImageIndex = 0;
        this.openLightbox(this.currentIndex);
    }

    setupScrollToTop() {
        const scrollToTopBtn = document.getElementById('scrollToTop');
        
        const checkMobileAndSetup = () => {
            if (!this.isMobile()) {
                scrollToTopBtn.style.display = 'none';
                return false;
            }
            
            scrollToTopBtn.style.display = 'flex';
            return true;
        };

        if (!checkMobileAndSetup()) return;

        let lastScrollY = window.pageYOffset;
        let isScrollingUp = false;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.pageYOffset;
            isScrollingUp = currentScrollY < lastScrollY;
            lastScrollY = currentScrollY;

            if (currentScrollY > 200 && isScrollingUp) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        window.addEventListener('resize', () => {
            checkMobileAndSetup();
        });
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
        
        document.querySelectorAll('input[name="brand"]').forEach(radio => {
            if (radio.value === '') {
                radio.checked = true;
            }
        });
        
        document.querySelectorAll('input[name="format"]').forEach(radio => {
            if (radio.value === '') {
                radio.checked = true;
            }
        });
        
        document.querySelectorAll('input[name="process"]').forEach(radio => {
            if (radio.value === '') {
                radio.checked = true;
            }
        });
        
        document.querySelectorAll('input[name="expiry"]').forEach(radio => {
            if (radio.value === '') {
                radio.checked = true;
            }
        });
        
        this.updateInitialToggleText();
        this.filterGallery();
        
        document.querySelectorAll('.filter-content').forEach(content => {
            content.classList.remove('expanded');
            content.previousElementSibling.classList.add('collapsed');
        });
    }

    updateLastUpdated() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        const formattedDate = now.toLocaleDateString('en-US', options);
        
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = formattedDate;
        }
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