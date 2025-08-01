class FilmGallery {
    constructor() {
        this.galleryData = [];
        this.filteredData = [];
        this.currentIndex = 0;
        this.isLoading = false;
        
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
        
        // Only enable auto-refresh on production (GitHub Pages)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Check for new data when page loads
            this.checkForUpdates();
            
            // Start periodic checks
            this.startAutoRefresh();
        } else {
            console.log('🔄 Auto-refresh disabled for local development');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', () => this.filterGallery());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterGallery();
        });



        // Collapsible filter sections
        document.querySelectorAll('.filter-toggle').forEach(toggle => {
            // Set initial collapsed state
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

        document.getElementById('gridView').addEventListener('click', () => this.switchView('grid'));
        document.getElementById('listView').addEventListener('click', () => this.switchView('list'));

        document.getElementById('lightbox').addEventListener('click', (e) => {
            // Close if clicking on the lightbox background only
            if (e.target.id === 'lightbox') {
                this.closeLightbox();
            }
        });
        
        document.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
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
                if (this.currentGroup && this.currentImageIndex > 0) {
                    this.showPreviousImage();
                } else {
                    this.showPreviousCard();
                }
            }
            if (e.key === 'ArrowRight') {
                if (this.currentGroup && this.currentImageIndex < this.getAvailableImages().length - 1) {
                    this.showNextImage();
                } else {
                    this.showNextCard();
                }
            }
        });

        this.setupScrollToTop();
        
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetAllFilters();
        });

        this.setupZoomControls();
    }

    async refreshGallery() {
        console.log('🔄 Refreshing gallery...');
        this.showLoading(true);
        this.galleryData = [];
        this.filteredData = [];
        await this.loadGalleryData();
        this.populateFilters();
        this.renderGallery();
        this.showLoading(false);
    }

    async checkForUpdates() {
        try {
            // Check for updated gallery data by reloading the script
            console.log('🔄 Checking for gallery data updates...');
            await this.reloadGalleryData();
        } catch (error) {
            console.log('Update check failed:', error);
        }
    }

    startAutoRefresh() {
        setInterval(async () => {
            try {
                // Check for updates every hour by reloading the script
                console.log('🔄 Periodic update check...');
                await this.reloadGalleryData();
            } catch (error) {
                console.log('Auto-refresh check failed:', error);
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    async reloadGalleryData() {
        try {
            // Store current data length for comparison
            const currentLength = this.galleryData.length;
            
            // Remove old script
            const oldScript = document.querySelector('script[src*="gallery-data.js"]');
            if (oldScript) {
                oldScript.remove();
            }
            
            // Clear the global variable to allow redeclaration
            if (typeof window.GALLERY_DATA !== 'undefined') {
                delete window.GALLERY_DATA;
            }
            
            // Add new script with cache busting
            const newScript = document.createElement('script');
            newScript.src = 'assets/js/gallery-data.js?' + Date.now();
            newScript.onload = () => {
                // Only refresh if new data is actually different
                if (typeof GALLERY_DATA !== 'undefined' && currentLength !== GALLERY_DATA.length) {
                    console.log('🔄 New data detected, refreshing gallery...');
                    this.refreshGallery();
                    this.updateLastUpdated();
                } else {
                    console.log('📊 No new data detected');
                }
            };
            newScript.onerror = () => {
                console.log('⚠️ Failed to load updated gallery data');
            };
            document.head.appendChild(newScript);
        } catch (error) {
            console.log('Reload failed:', error);
        }
    }



    async loadGalleryData() {
        try {
            if (typeof GALLERY_DATA !== 'undefined') {
                this.galleryData = GALLERY_DATA;
                this.filteredData = [...this.galleryData];
                console.log('📊 Loaded', this.galleryData.length, 'gallery items');
            } else {
                this.galleryData = this.createSampleData();
                this.filteredData = [...this.galleryData];
            }
        } catch (error) {
            this.galleryData = this.createSampleData();
            this.filteredData = [...this.galleryData];
        }
    }

    createSampleData() {
        return [
            {
                filename: "sample_000.jpg",
                brand: "Sample Brand",
                product: "Sample Film",
                film_format: "35mm",
                film_speed_iso: "400",
                process: "C-41",
                item_type: "film_box_outside",
                author: "sample",
                imageUrl: "film_packaging/archive/sample_000.jpg",
                title: "Sample Film",
                details: "35mm • ISO 400 • C-41 • film_box_outside"
            }
        ];
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
        // Populate brand filter
        const brandFilter = document.getElementById('brandFilter');
        const brands = [...new Set(this.galleryData.map(item => item.brand).filter(brand => brand && brand !== 'Unknown'))];
        
        // Clear existing options except "All Brands"
        brandFilter.innerHTML = '<label class="filter-option"><input type="radio" name="brand" value="" checked><span>All Brands</span></label>';
        
        // Add brand options
        brands.sort().forEach(brand => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="brand" value="${brand}"><span>${brand}</span><span class="checkmark">✓</span>`;
            brandFilter.appendChild(label);
        });

        // Populate format filter
        const formatFilter = document.getElementById('formatFilter');
        const formats = [...new Set(this.galleryData.map(item => item.film_format).filter(format => format))];
        
        // Clear existing options except "All Formats"
        formatFilter.innerHTML = '<label class="filter-option"><input type="radio" name="format" value="" checked><span>All Formats</span></label>';
        
        // Add format options
        formats.sort().forEach(format => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="format" value="${format}"><span>${format}</span><span class="checkmark">✓</span>`;
            formatFilter.appendChild(label);
        });

        // Populate process filter
        const processFilter = document.getElementById('processFilter');
        const processes = [...new Set(this.galleryData.map(item => item.process).filter(process => process))];
        
        // Clear existing options except "All Processes"
        processFilter.innerHTML = '<label class="filter-option"><input type="radio" name="process" value="" checked><span>All Processes</span></label>';
        
        // Add process options
        processes.sort().forEach(process => {
            const label = document.createElement('label');
            label.className = 'filter-option';
            label.innerHTML = `<input type="radio" name="process" value="${process}"><span>${process}</span><span class="checkmark">✓</span>`;
            processFilter.appendChild(label);
        });

        // Re-attach event listeners for the new radio buttons
        this.attachFilterEventListeners();
        
        // Update initial toggle text for selected options
        this.updateInitialToggleText();
    }

    updateInitialToggleText() {
        // Update brand toggle
        const selectedBrand = document.querySelector('input[name="brand"]:checked').value;
        this.updateToggleText('brand', selectedBrand);
        
        // Update format toggle
        const selectedFormat = document.querySelector('input[name="format"]:checked').value;
        this.updateToggleText('format', selectedFormat);
        
        // Update process toggle
        const selectedProcess = document.querySelector('input[name="process"]:checked').value;
        this.updateToggleText('process', selectedProcess);
    }

    attachFilterEventListeners() {
        // Radio button event listeners
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
    }

    updateToggleText(filterType, selectedValue) {
        const toggleButton = document.querySelector(`[data-target="${filterType}-section"]`);
        const toggleText = toggleButton.querySelector('span:first-child');
        
        if (selectedValue === '') {
            // Show "All [Type]s" for empty values
            const typeName = filterType.charAt(0).toUpperCase() + filterType.slice(1);
            if (filterType === 'brand') {
                toggleText.textContent = 'All Brands';
            } else if (filterType === 'format') {
                toggleText.textContent = 'All Formats';
            } else if (filterType === 'process') {
                toggleText.textContent = 'All Processes';
            } else {
                toggleText.textContent = `All ${typeName}s`;
            }
        } else {
            toggleText.textContent = selectedValue;
        }
    }

    filterGallery() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const brandFilter = document.querySelector('input[name="brand"]:checked').value;
        const formatFilter = document.querySelector('input[name="format"]:checked').value;
        const processFilter = document.querySelector('input[name="process"]:checked').value;

        this.filteredData = this.galleryData.filter(item => {
            const matchesSearch = !searchTerm || 
                item.title.toLowerCase().includes(searchTerm) ||
                item.brand.toLowerCase().includes(searchTerm) ||
                item.product.toLowerCase().includes(searchTerm);
            
            const matchesBrand = !brandFilter || item.brand === brandFilter;
            const matchesFormat = !formatFilter || item.film_format === formatFilter;
            const matchesProcess = !processFilter || item.process === processFilter;
            
            return matchesSearch && matchesBrand && matchesFormat && matchesProcess;
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
                default:
                    return 0;
            }
            
            return aValue.localeCompare(bValue);
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

        // Group the filtered data by base filename
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
        return 'other';
    }

    // Dynamic text color based on brand accent color luminance
    getTextColorForBrand(brand) {
        const brandClass = this.getBrandClass(brand);
        if (!brandClass || brandClass === 'other') return '#1A1A1A';
        
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

    switchView(view) {
        const container = document.getElementById('galleryContainer');
        const gridBtn = document.getElementById('gridView');
        const listBtn = document.getElementById('listView');

        if (view === 'list') {
            container.classList.add('list-view');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        } else {
            container.classList.remove('list-view');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        }
    }

    openLightbox(index) {
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        const group = groupedData[index];
        
        if (!group) return;
        
        this.currentGroup = group;
        this.currentImageIndex = 0;
        
        const availableImages = [];
        if (group.front) availableImages.push(group.front);
        if (group.back) availableImages.push(group.back);
        
        if (availableImages.length === 0) return;
        
        const displayItem = availableImages[this.currentImageIndex];
        
        const lightbox = document.getElementById('lightbox');
        const lightboxTitle = document.getElementById('lightboxTitle');
        
        lightboxTitle.textContent = displayItem.title;
        
        this.currentIndex = index;
        lightbox.style.display = 'flex';
        
        // Use showImage to properly initialize all content including scan credit
        this.showImage(displayItem);
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        prevBtn.onclick = () => this.showPreviousImage();
        nextBtn.onclick = () => this.showNextImage();
        
        if (this.resetZoom) {
            this.resetZoom();
        }
        
        if (this.updateViewControls) {
            this.updateViewControls();
        }
    }

    closeLightbox() {
        document.getElementById('lightbox').style.display = 'none';
    }



    showImage(item) {
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxDetails = document.getElementById('lightboxDetails');
        const lightboxScanCredit = document.getElementById('lightboxScanCredit');
        
        lightboxImage.src = item.imageUrl;
        lightboxImage.alt = item.title;
        
        const availableImages = [];
        if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
        if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
        
        let detailsText = item.details;
        if (availableImages.length > 1) {
            detailsText += ` (${this.currentImageIndex === 0 ? 'Front' : 'Back'} ${this.currentImageIndex + 1}/${availableImages.length})`;
        }
        lightboxDetails.textContent = detailsText;
        
        if (item.author && item.author.trim() !== '') {
            lightboxScanCredit.textContent = `Scan Credit: ${item.author}`;
            lightboxScanCredit.style.display = 'block';
        } else {
            lightboxScanCredit.style.display = 'none';
        }
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        prevBtn.style.display = this.currentImageIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = this.currentImageIndex < availableImages.length - 1 ? 'block' : 'none';
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

    showError(message) {
        const container = document.getElementById('galleryContainer');
        container.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Gallery</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
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
            this.openLightbox(this.currentIndex);
        }
    }

    showNextCard() {
        const groupedData = this.groupItemsByBaseFilename(this.filteredData);
        if (this.currentIndex < groupedData.length - 1) {
            this.currentIndex++;
            this.openLightbox(this.currentIndex);
        }
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

            if (currentScrollY > 300 && isScrollingUp) {
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
        
        this.updateInitialToggleText();
        this.filterGallery();
        
        if (this.isMobile()) {
            document.querySelectorAll('.filter-content').forEach(content => {
                content.classList.remove('expanded');
                content.previousElementSibling.classList.add('collapsed');
            });
        }
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

        const lightboxImage = document.getElementById('lightboxImage');
        const zoomInBtn = document.getElementById('zoomIn');
        const zoomOutBtn = document.getElementById('zoomOut');
        const zoomResetBtn = document.getElementById('zoomReset');
        const rotateBtn = document.getElementById('rotateBtn');
        const frontViewBtn = document.getElementById('frontView');
        const backViewBtn = document.getElementById('backView');

        const updateTransform = () => {
            lightboxImage.style.transform = `scale(${currentZoom}) translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg)`;
            
            zoomInBtn.disabled = currentZoom >= maxZoom;
            zoomOutBtn.disabled = currentZoom <= minZoom;
            
            zoomInBtn.style.opacity = currentZoom >= maxZoom ? '0.5' : '1';
            zoomOutBtn.style.opacity = currentZoom <= minZoom ? '0.5' : '1';
        };

        zoomInBtn.addEventListener('click', () => {
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                updateTransform();
            }
        });

        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                updateTransform();
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
            updateTransform();
        });

        this.resetZoom = () => {
            currentZoom = 1;
            currentX = 0;
            currentY = 0;
            currentRotation = 0;
            updateTransform();
        };

        // Drag functionality
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startTranslateX = 0;
        let startTranslateY = 0;

        lightboxImage.addEventListener('mousedown', (e) => {
            if (currentZoom > 1) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startTranslateX = currentX;
                startTranslateY = currentY;
                lightboxImage.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && currentZoom > 1) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                currentX = startTranslateX + deltaX;
                currentY = startTranslateY + deltaY;
                
                updateTransform();
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            lightboxImage.style.cursor = 'grab';
        });

        // Touch support for mobile
        lightboxImage.addEventListener('touchstart', (e) => {
            if (currentZoom > 1) {
                isDragging = true;
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTranslateX = currentX;
                startTranslateY = currentY;
                e.preventDefault();
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging && currentZoom > 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                currentX = startTranslateX + deltaX;
                currentY = startTranslateY + deltaY;
                
                updateTransform();
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });

        // View controls
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FilmGallery();
}); 