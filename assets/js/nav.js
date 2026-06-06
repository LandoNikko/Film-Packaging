(function () {
    const panels = [];

    function createPanel(config) {
        const toggle = document.getElementById(config.toggleId);
        const menu = document.getElementById(config.menuId);
        const backdrop = document.getElementById(config.backdropId);
        const closeBtn = menu?.querySelector('.mobile-menu-return');

        if (!toggle || !menu || !backdrop) return null;

        const panel = {
            toggle,
            menu,
            backdrop,
            bodyClass: config.bodyClass,
            close() {},
            open() {}
        };

        panel.close = () => {
            menu.classList.remove('is-open');
            backdrop.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
            document.body.classList.remove(panel.bodyClass);

            window.setTimeout(() => {
                if (!menu.classList.contains('is-open')) {
                    menu.hidden = true;
                    backdrop.hidden = true;
                }
            }, 250);
        };

        panel.open = () => {
            panels.forEach((other) => {
                if (other !== panel) other.close();
            });

            menu.hidden = false;
            backdrop.hidden = false;
            requestAnimationFrame(() => {
                menu.classList.add('is-open');
                backdrop.classList.add('is-open');
            });
            toggle.setAttribute('aria-expanded', 'true');
            menu.setAttribute('aria-hidden', 'false');
            document.body.classList.add(panel.bodyClass);
        };

        toggle.addEventListener('click', panel.open);
        closeBtn?.addEventListener('click', panel.close);
        backdrop.addEventListener('click', panel.close);

        menu.querySelectorAll('.mobile-menu-nav a').forEach((link) => {
            link.addEventListener('click', panel.close);
        });

        return panel;
    }

    const navPanel = createPanel({
        toggleId: 'mobileMenuToggle',
        menuId: 'mobileMenu',
        backdropId: 'mobileMenuBackdrop',
        bodyClass: 'mobile-menu-open'
    });

    const filtersPanel = createPanel({
        toggleId: 'mobileFiltersToggle',
        menuId: 'mobileFiltersMenu',
        backdropId: 'mobileFiltersBackdrop',
        bodyClass: 'mobile-filters-open'
    });

    if (navPanel) panels.push(navPanel);
    if (filtersPanel) panels.push(filtersPanel);

    window.closeSitePanels = () => {
        panels.forEach((panel) => {
            if (panel.menu.classList.contains('is-open')) {
                panel.close();
            }
        });
    };

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (document.body.classList.contains('lightbox-open')) return;

        panels.forEach((panel) => {
            if (panel.menu.classList.contains('is-open')) {
                panel.close();
            }
        });
    });

    function setupMobileFiltersPanel() {
        const sidebar = document.getElementById('filterSidebar');
        const panel = document.getElementById('mobileFiltersPanel');
        const container = document.querySelector('.gallery-container');
        if (!sidebar || !panel || !container) return;

        const mobileQuery = window.matchMedia(
            window.ArchiveUtils?.MOBILE_MEDIA_QUERY || '(max-width: 768px)'
        );

        const relocateFilters = () => {
            if (mobileQuery.matches) {
                panel.appendChild(sidebar);
            } else if (sidebar.parentElement !== container) {
                container.insertBefore(sidebar, container.firstChild);
            }
        };

        relocateFilters();
        mobileQuery.addEventListener('change', relocateFilters);

        if (filtersPanel) {
            sidebar.addEventListener('change', (event) => {
                if (!event.target.matches('input[type="radio"]')) return;
                if (!filtersPanel.menu.classList.contains('is-open')) return;
                filtersPanel.close();
            });
        }
    }

    setupMobileFiltersPanel();
})();
