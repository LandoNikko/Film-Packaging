(function () {
    const nav = document.getElementById('siteNav');
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (!nav && !scrollToTopBtn) return;

    let lastScrollY = window.scrollY;
    let ticking = false;
    const threshold = 80;

    const syncNavOffset = () => {
        if (!nav) return;
        const navCollapsed = nav.classList.contains('nav-hidden');
        const lightboxOpen = document.body.classList.contains('lightbox-open');
        const height = nav.offsetHeight;
        document.body.style.setProperty('--site-nav-height', `${height}px`);
        // Keep body padding fixed
        document.body.style.setProperty(
            '--site-nav-offset',
            navCollapsed && !lightboxOpen ? '0px' : `${height}px`
        );
    };

    const setNavVisibility = (hidden) => {
        if (!nav) return;
        nav.classList.toggle('nav-hidden', hidden);
        syncNavOffset();
    };

    const setScrollToTopVisible = (visible) => {
        if (!scrollToTopBtn) return;
        scrollToTopBtn.classList.toggle('visible', visible);
        scrollToTopBtn.toggleAttribute('hidden', !visible);
    };

    const isLightboxOpen = () => document.body.classList.contains('lightbox-open');

    const updateScrollChrome = () => {
        const currentScrollY = window.scrollY;
        const scrollingUp = currentScrollY < lastScrollY;
        const pastThreshold = currentScrollY > threshold;

        if (nav && !isLightboxOpen()) {
            setNavVisibility(pastThreshold && !scrollingUp);
        }

        if (scrollToTopBtn && scrollToTopBtn.style.pointerEvents !== 'none') {
            setScrollToTopVisible(pastThreshold && scrollingUp);
        }

        lastScrollY = currentScrollY;
        ticking = false;
    };

    const onScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateScrollChrome);
            ticking = true;
        }
    };

    syncNavOffset();
    window.addEventListener('resize', syncNavOffset, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
        });
    }

    updateScrollChrome();
})();
