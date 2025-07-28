// Gallery functionality
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
        await this.loadGalleryData();
        this.populateBrandFilter();
        this.renderGallery();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', () => this.filterGallery());
        searchBtn.addEventListener('click', () => this.filterGallery());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterGallery();
        });

        // Filter controls
        document.getElementById('brandFilter').addEventListener('change', () => this.filterGallery());
        document.getElementById('formatFilter').addEventListener('change', () => this.filterGallery());
        document.getElementById('processFilter').addEventListener('change', () => this.filterGallery());

        // View controls
        document.getElementById('gridView').addEventListener('click', () => this.switchView('grid'));
        document.getElementById('listView').addEventListener('click', () => this.switchView('list'));
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshGallery());

        // Lightbox controls
        document.getElementById('lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') this.closeLightbox();
        });
        
        document.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
        document.querySelector('.lightbox-prev').addEventListener('click', () => this.showPrevious());
        document.querySelector('.lightbox-next').addEventListener('click', () => this.showNext());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeLightbox();
            if (e.key === 'ArrowLeft') this.showPrevious();
            if (e.key === 'ArrowRight') this.showNext();
        });
    }

    async refreshGallery() {
        console.log('🔄 Refreshing gallery...');
        this.galleryData = [];
        this.filteredData = [];
        await this.loadGalleryData();
        this.populateBrandFilter();
        this.renderGallery();
    }

    async loadGalleryData() {
        try {
            this.showLoading(true);
            console.log('Starting gallery data loading...');
            
            // Use embedded JavaScript data (no CORS issues)
            if (typeof window.GALLERY_DATA !== 'undefined') {
                this.galleryData = window.GALLERY_DATA;
                console.log('✅ Gallery data loaded from embedded JavaScript:', this.galleryData.length, 'items');
                console.log('First few items:', this.galleryData.slice(0, 3));
            } else {
                console.error('❌ GALLERY_DATA not found. Make sure gallery-data.js is loaded.');
                this.createSampleData();
            }

            this.filteredData = [...this.galleryData];
            this.updateStats();
            console.log('🎯 Final gallery data:', this.galleryData.length, 'items');
            console.log('🎯 Filtered data:', this.filteredData.length, 'items');
            
        } catch (error) {
            console.error('❌ Error loading gallery data:', error);
            this.createSampleData();
        } finally {
            this.showLoading(false);
        }
    }

    createSampleData() {
        console.log('🔄 Creating sample data...');
        // Create sample data based on known files
        const sampleData = [
            {
                filename: '00000_000.jpg',
                brand: 'Ilford',
                product: 'HP5 Plus',
                film_format: '120',
                film_speed_iso: '400',
                process: 'BW',
                item_type: 'film_box_outside',
                author: 'dekuNukem',
                imageUrl: 'film_packaging/archive/00000_000.jpg',
                title: 'Ilford HP5 Plus',
                details: '120 • ISO 400 • BW • film_box_outside'
            },
            {
                filename: '00001_000.jpg',
                brand: 'Alien Film',
                product: '5207/250D',
                film_format: '120',
                film_speed_iso: '250',
                process: 'ECN-2',
                item_type: 'film_box_outside',
                author: 'dekuNukem',
                imageUrl: 'film_packaging/archive/00001_000.jpg',
                title: 'Alien Film 5207/250D',
                details: '120 • ISO 250 • ECN-2 • film_box_outside'
            },
            {
                filename: '00002_000.jpg',
                brand: 'Efiniti',
                product: 'UXi super 200',
                film_format: '35mm',
                film_speed_iso: '200',
                process: 'C-41',
                item_type: 'film_box_outside',
                author: 'dekuNukem',
                imageUrl: 'film_packaging/archive/00002_000.jpg',
                title: 'Efiniti UXi super 200',
                details: '35mm • ISO 200 • C-41 • film_box_outside'
            }
        ];

        this.galleryData = sampleData;
        this.filteredData = [...this.galleryData];
        this.updateStats();
        console.log('🔄 Using sample data:', this.galleryData.length, 'items');
    }

    populateBrandFilter() {
        const brands = [...new Set(this.galleryData.map(item => item.brand))].sort();
        const brandFilter = document.getElementById('brandFilter');
        
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
        
        console.log('🏷️ Populated brand filter with:', brands.length, 'brands');
    }

    filterGallery() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const brandFilter = document.getElementById('brandFilter').value;
        const formatFilter = document.getElementById('formatFilter').value;
        const processFilter = document.getElementById('processFilter').value;

        this.filteredData = this.galleryData.filter(item => {
            const matchesSearch = !searchTerm || 
                item.brand.toLowerCase().includes(searchTerm) ||
                item.product.toLowerCase().includes(searchTerm) ||
                item.film_format.toLowerCase().includes(searchTerm) ||
                item.process.toLowerCase().includes(searchTerm);

            const matchesBrand = !brandFilter || item.brand === brandFilter;
            const matchesFormat = !formatFilter || item.film_format === formatFilter;
            const matchesProcess = !processFilter || item.process === processFilter;

            return matchesSearch && matchesBrand && matchesFormat && matchesProcess;
        });

        this.renderGallery();
        this.updateStats();
    }

    renderGallery() {
        const container = document.getElementById('galleryContainer');
        const noResults = document.getElementById('noResults');

        console.log('🎨 Rendering gallery with', this.filteredData.length, 'items');

        if (this.filteredData.length === 0) {
            container.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        
        container.innerHTML = this.filteredData.map((item, index) => `
            <div class="gallery-item" data-index="${index}">
                <img src="${item.imageUrl}" alt="${item.title}" loading="lazy" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                     onload="this.nextElementSibling.style.display='none';">
                <div class="image-error" style="display: block; padding: 20px; text-align: center; color: #666; background: #f5f5f5;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📷</div>
                    <div>Loading...</div>
                </div>
                <div class="gallery-item-info">
                    <div class="gallery-item-title">${item.title}</div>
                    <div class="gallery-item-details">${item.details}</div>
                    <div class="gallery-item-meta">
                        <span>By ${item.author}</span>
                        <span>${item.film_format}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click listeners to gallery items
        container.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.openLightbox(index);
            });
        });
        
        console.log('✅ Gallery rendered successfully');
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
        this.currentIndex = index;
        const item = this.filteredData[index];
        
        document.getElementById('lightboxImage').src = item.imageUrl;
        document.getElementById('lightboxTitle').textContent = item.title;
        document.getElementById('lightboxDetails').textContent = item.details;
        
        document.getElementById('lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        document.getElementById('lightbox').classList.remove('active');
        document.body.style.overflow = '';
    }

    showPrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            this.currentIndex = this.filteredData.length - 1;
        }
        this.openLightbox(this.currentIndex);
    }

    showNext() {
        if (this.currentIndex < this.filteredData.length - 1) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0;
        }
        this.openLightbox(this.currentIndex);
    }

    updateStats() {
        document.getElementById('totalCount').textContent = this.galleryData.length;
        document.getElementById('filteredCount').textContent = this.filteredData.length;
        console.log('📊 Stats updated:', this.galleryData.length, 'total,', this.filteredData.length, 'filtered');
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const galleryContainer = document.getElementById('galleryContainer');
        
        if (show) {
            loadingIndicator.style.display = 'block';
            galleryContainer.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
            galleryContainer.style.display = 'grid';
        }
    }

    showError(message) {
        const container = document.getElementById('galleryContainer');
        container.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 40px; color: var(--text-light);">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Try Again</button>
            </div>
        `;
    }
}

// Initialize the gallery when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Film Gallery...');
    new FilmGallery();
}); 