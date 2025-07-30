class FilmGallery {
    constructor() {
        this.galleryData = [];
        this.filteredData = [];
        this.currentIndex = 0;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showLoading(true);
        await this.loadGalleryData();
        this.populateBrandFilter();
        this.renderGallery();
        this.showLoading(false);
        
        this.startAutoRefresh();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', () => this.filterGallery());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterGallery();
        });

        document.getElementById('brandFilter').addEventListener('change', () => this.filterGallery());
        document.getElementById('formatFilter').addEventListener('change', () => this.filterGallery());
        document.getElementById('processFilter').addEventListener('change', () => this.filterGallery());

        document.getElementById('gridView').addEventListener('click', () => this.switchView('grid'));
        document.getElementById('listView').addEventListener('click', () => this.switchView('list'));
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshGallery());

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
    }

    async refreshGallery() {
        console.log('🔄 Refreshing gallery...');
        this.showLoading(true);
        this.galleryData = [];
        this.filteredData = [];
        await this.loadGalleryData();
        this.populateBrandFilter();
        this.renderGallery();
        this.showLoading(false);
    }

    startAutoRefresh() {
        setInterval(async () => {
            try {
                // Try to fetch latest data from GitHub Actions
                const response = await fetch('assets/js/gallery-data.js?' + Date.now());
                if (response.ok) {
                    // Reload the script to get new data
                    await this.reloadGalleryData();
                }
            } catch (error) {
                console.log('Auto-refresh check failed:', error);
            }
        }, 60 * 60 * 1000);
    }

    async reloadGalleryData() {
        // Remove old script
        const oldScript = document.querySelector('script[src*="gallery-data.js"]');
        if (oldScript) {
            oldScript.remove();
        }
        
        // Add new script
        const newScript = document.createElement('script');
        newScript.src = 'assets/js/gallery-data.js?' + Date.now();
        newScript.onload = () => {
            this.refreshGallery();
        };
        document.head.appendChild(newScript);
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

    populateBrandFilter() {
        const brandFilter = document.getElementById('brandFilter');
        const brands = [...new Set(this.galleryData.map(item => item.brand).filter(brand => brand && brand !== 'Unknown'))];
        
        // Clear existing options except "All Brands"
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        
        // Add brand options
        brands.sort().forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    filterGallery() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const brandFilter = document.getElementById('brandFilter').value;
        const formatFilter = document.getElementById('formatFilter').value;
        const processFilter = document.getElementById('processFilter').value;

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
            const iso = group.metadata.film_speed_iso || '100';
            const format = group.metadata.film_format || '35mm';
            const process = group.metadata.process || 'C-41';
            
            const thumbnailItem = group.front || group.back;
            const thumbnailUrl = thumbnailItem.imageUrl.replace('/archive/', '/lowres/');
            
            let viewType = '';
            if (group.front && group.back) {
                viewType = 'Front & Back';
            } else if (group.front) {
                viewType = 'Front Only';
            } else if (group.back) {
                viewType = 'Back Only';
            }
            
            return `
                <article class="gallery-item" data-index="${index}" data-brand="${group.metadata.brand.toLowerCase()}" data-name="${group.metadata.title}">
                    <div class="bottom-flap"></div>
                    <div class="top-flap"></div>
                    <img src="${thumbnailUrl}" alt="${group.metadata.title}" loading="lazy" 
                         onerror="this.onerror=null; this.src='${thumbnailItem.imageUrl}'; this.nextElementSibling.style.display='none';"
                         onload="this.nextElementSibling.style.display='none';">
                    <div class="image-error" style="display: block; padding: 20px; text-align: center; color: #666; background: #f5f5f5;">
                        <div style="font-size: 2em; margin-bottom: 10px;">📷</div>
                        <div>Loading...</div>
                    </div>
                    <div class="brand-header">${group.metadata.brand}</div>
                    <div class="gallery-item-info">
                        <h2 class="gallery-item-title">${group.metadata.product}</h2>
                        <div class="gallery-item-details">
                            <div>${iso} <span>ISO</span></div>
                            <div>${format} <span>FORMAT</span></div>
                            <div>${process} <span>PROCESS</span></div>
                            <div>${viewType} <span>VIEW</span></div>
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
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxTitle = document.getElementById('lightboxTitle');
        const lightboxDetails = document.getElementById('lightboxDetails');
        
        lightboxImage.src = displayItem.imageUrl;
        lightboxImage.alt = displayItem.title;
        lightboxTitle.textContent = displayItem.title;
        
        // Update details to show which image is being displayed
        let detailsText = displayItem.details;
        if (availableImages.length > 1) {
            detailsText += ` (${this.currentImageIndex === 0 ? 'Front' : 'Back'} ${this.currentImageIndex + 1}/${availableImages.length})`;
        }
        lightboxDetails.textContent = detailsText;
        
        this.currentIndex = index;
        lightbox.style.display = 'flex';
        
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        
        prevBtn.style.display = this.currentImageIndex > 0 ? 'block' : 'none';
        nextBtn.style.display = this.currentImageIndex < availableImages.length - 1 ? 'block' : 'none';
        
        prevBtn.onclick = () => this.showPreviousImage();
        nextBtn.onclick = () => this.showNextImage();
    }

    closeLightbox() {
        document.getElementById('lightbox').style.display = 'none';
    }



    showPreviousImage() {
        if (this.currentGroup) {
            const availableImages = [];
            if (this.currentGroup.front) availableImages.push(this.currentGroup.front);
            if (this.currentGroup.back) availableImages.push(this.currentGroup.back);
            
            if (this.currentImageIndex > 0) {
                this.currentImageIndex--;
                const displayItem = availableImages[this.currentImageIndex];
                
                const lightboxImage = document.getElementById('lightboxImage');
                const lightboxDetails = document.getElementById('lightboxDetails');
                
                lightboxImage.src = displayItem.imageUrl;
                lightboxImage.alt = displayItem.title;
                
                let detailsText = displayItem.details;
                if (availableImages.length > 1) {
                    detailsText += ` (${this.currentImageIndex === 0 ? 'Front' : 'Back'} ${this.currentImageIndex + 1}/${availableImages.length})`;
                }
                lightboxDetails.textContent = detailsText;
                
                const prevBtn = document.querySelector('.lightbox-prev');
                const nextBtn = document.querySelector('.lightbox-next');
                
                prevBtn.style.display = this.currentImageIndex > 0 ? 'block' : 'none';
                nextBtn.style.display = this.currentImageIndex < availableImages.length - 1 ? 'block' : 'none';
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
                
                const lightboxImage = document.getElementById('lightboxImage');
                const lightboxDetails = document.getElementById('lightboxDetails');
                
                lightboxImage.src = displayItem.imageUrl;
                lightboxImage.alt = displayItem.title;
                
                let detailsText = displayItem.details;
                if (availableImages.length > 1) {
                    detailsText += ` (${this.currentImageIndex === 0 ? 'Front' : 'Back'} ${this.currentImageIndex + 1}/${availableImages.length})`;
                }
                lightboxDetails.textContent = detailsText;
                
                const prevBtn = document.querySelector('.lightbox-prev');
                const nextBtn = document.querySelector('.lightbox-next');
                
                prevBtn.style.display = this.currentImageIndex > 0 ? 'block' : 'none';
                nextBtn.style.display = this.currentImageIndex < availableImages.length - 1 ? 'block' : 'none';
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
}

document.addEventListener('DOMContentLoaded', () => {
    new FilmGallery();
}); 