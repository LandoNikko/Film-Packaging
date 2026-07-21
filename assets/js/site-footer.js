(function (global) {
    const FOOTER_HTML = `
        <div class="footer-content">
            <div class="footer-section">
                <h3>About</h3>
                <div class="footer-copy">
                    <p>Film Packaging Archive is an open source project under the MIT license maintained by <a href="https://github.com/dekuNukem">dekuNukem</a>.
                    Following the license and open source principles, this website is a contribution to the main project by <a href="https://github.com/LandoNikko">Lando Nikko</a>, to make it more accessible and user-friendly for the general public.
                    </p>
                    <p>
                        The images are provided by individuals for the project. They are meant to be for reference, educational, and archival purposes.
                        The designs may be protected under copyright and trademark laws. Use at your own risk.
                    </p>
                    <p>The MIT License applies only to the non-image source codes.</p>
                </div>
            </div>
            <div class="footer-section">
                <h3>Links</h3>
                <nav class="footer-link-groups" aria-label="Footer links">
                    <div class="footer-link-group">
                        <ul class="footer-links">
                            <li>
                                <a href="https://github.com/LandoNikko/Film-Packaging">
                                    <i class="ri-github-fill" aria-hidden="true"></i>
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a href="mailto:landonikko@gmail.com">
                                    <i class="ri-mail-fill" aria-hidden="true"></i>
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="footer-link-group">
                        <ul class="footer-links">
                            <li>
                                <a href="https://discord.gg/yvBx7dVG4B">
                                    <i class="ri-discord-fill" aria-hidden="true"></i>
                                    Discord Community
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>
            </div>
        </div>`;

    function updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (!lastUpdatedElement) return;

        lastUpdatedElement.textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function renderSiteFooter() {
        const footer = document.getElementById('siteFooter');
        if (!footer) return;

        footer.innerHTML = FOOTER_HTML;
        updateLastUpdated();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSiteFooter);
    } else {
        renderSiteFooter();
    }

    global.SiteFooter = {
        render: renderSiteFooter,
        updateLastUpdated
    };
})(window);
