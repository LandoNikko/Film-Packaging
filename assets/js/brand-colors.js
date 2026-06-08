(function (global) {
    const BRAND_COLORS = [
        { match: "1shot", slug: "brand-1shot", color: "#A92D7A" },
        { match: "a girl has film", slug: "a-girl-has-film", color: "#56A92D" },
        { match: "adox", slug: "adox", color: "#2E8B57" },
        { match: "agfa", slug: "agfa", color: "#EF3E34" },
        { match: "alfo", slug: "alfo", color: "#FF6B35" },
        { match: "alien film", slug: "alien-film", color: "#00B4D8" },
        { match: "ansco", slug: "ansco", color: "#2D32A9" },
        { match: "arista.edu", slug: "arista-edu", color: "#A94D2D" },
        { match: "bergger", slug: "bergger", color: "#8B4513" },
        { match: "boots", slug: "boots", color: "#005EB8" },
        { match: "building 2", slug: "building-2", color: "#952DA9" },
        { match: "candido", slug: "candido", color: "#99A92D" },
        { match: "catlabs", slug: "catlabs", color: "#2D75A9" },
        { match: "cinestill", slug: "cinestill", color: "#D71F27" },
        { match: "club color", slug: "club-color", color: "#A92D50" },
        { match: "defender", slug: "defender", color: "#2DA92E" },
        { match: "efiniti", slug: "efiniti", color: "#FF6B6B" },
        { match: "efke", slug: "efke", color: "#9370DB" },
        { match: "escura", slug: "escura", color: "#522DA9" },
        { match: "famous brand labs", slug: "famous-brand-labs", color: "#A9762D" },
        { match: "ferrania", slug: "ferrania", color: "#2DA99B" },
        { match: "film corporation of america", slug: "film-corporation-of-america", color: "#A92D94" },
        { match: "film never die", slug: "film-never-die", color: "#6FA92D" },
        { match: "film photography project", slug: "film-photography-project", color: "#2D4BA9" },
        { match: "filmfabrik köpenick", slug: "filmfabrik-kopenick", color: "#A9332D" },
        { match: "foma", slug: "foma", color: "#4682B4" },
        { match: "foton", slug: "foton", color: "#2DA957" },
        { match: "freestyle", slug: "freestyle", color: "#7C2DA9" },
        { match: "fujifilm", slug: "fujifilm", color: "#00843D" },
        { match: "fukkatsu", slug: "fukkatsu", color: "#A9A02D" },
        { match: "gaf", slug: "gaf", color: "#FF8C00" },
        { match: "gevaert", slug: "gevaert", color: "#2D8EA9" },
        { match: "great films processing", slug: "great-films-processing", color: "#A92D6A" },
        { match: "gt photo", slug: "gt-photo", color: "#46A92D" },
        { match: "hands on film", slug: "hands-on-film", color: "#382DA9" },
        { match: "harman", slug: "harman", color: "#FF8C00" },
        { match: "hasselblad", slug: "hasselblad", color: "#000000" },
        { match: "hazenfilm", slug: "hazenfilm", color: "#FF1493" },
        { match: "herzog", slug: "herzog", color: "#2DA981" },
        { match: "hope film", slug: "hope-film", color: "#A52DA9" },
        { match: "ificolor", slug: "ificolor", color: "#89A92D" },
        { match: "ilford", slug: "ilford", color: "#555555" },
        { match: "illingworth's", slug: "illingworth-s", color: "#2D65A9" },
        { match: "impossible project", slug: "impossible-project", color: "#A92D41" },
        { match: "jch", slug: "jch", color: "#32CD32" },
        { match: "jessops", slug: "jessops", color: "#E30613" },
        { match: "kentmere", slug: "kentmere", color: "#8B4513" },
        { match: "kirkland signature", slug: "kirkland-signature", color: "#D71920" },
        { match: "klick", slug: "klick", color: "#FFD200" },
        { match: "kodak", slug: "kodak", color: "#FAB617" },
        { match: "konica", slug: "konica", color: "#E60012" },
        { match: "kosmo foto", slug: "kosmo-foto", color: "#FF4500" },
        { match: "lloyds pharmacy", slug: "lloyds-pharmacy", color: "#007A3D" },
        { match: "lomography", slug: "lomography", color: "#FF69B4" },
        { match: "lucky", slug: "lucky", color: "#622DA9" },
        { match: "marix", slug: "marix", color: "#A9862D" },
        { match: "max spielmann", slug: "max-spielmann", color: "#2DA8A9" },
        { match: "minolta", slug: "minolta", color: "#E30613" },
        { match: "minox", slug: "minox", color: "#A92D84" },
        { match: "mr. negative", slug: "mr-negative", color: "#60A92D" },
        { match: "mutascan", slug: "mutascan", color: "#2D3BA9" },
        { match: "nishika", slug: "nishika", color: "#A9432D" },
        { match: "northwest custom film processing", slug: "northwest-custom-film-processing", color: "#2DA967" },
        { match: "optik oldschool", slug: "optik-oldschool", color: "#8B2DA9" },
        { match: "orwo", slug: "orwo", color: "#4682B4" },
        { match: "perfect photo inc.", slug: "perfect-photo-inc", color: "#A3A92D" },
        { match: "perutz", slug: "perutz", color: "#9370DB" },
        { match: "photocité", slug: "photocite", color: "#2D7FA9" },
        { match: "phöbus-platten", slug: "phobus-platten", color: "#A92D5A" },
        { match: "polaroid", slug: "polaroid", color: "#FDC509" },
        { match: "porst", slug: "porst", color: "#20B2AA" },
        { match: "premium", slug: "premium", color: "#36A92D" },
        { match: "prinzcolor", slug: "prinzcolor", color: "#482DA9" },
        { match: "reflx lab", slug: "reflx-lab", color: "#A96D2D" },
        { match: "reto", slug: "reto", color: "#2DA991" },
        { match: "ricoh", slug: "ricoh", color: "#A92D9D" },
        { match: "robot", slug: "robot", color: "#79A92D" },
        { match: "rollei", slug: "rollei", color: "#4A90E2" },
        { match: "rossmann", slug: "rossmann", color: "#D0001B" },
        { match: "sakura", slug: "sakura", color: "#FF69B4" },
        { match: "santacolor", slug: "santacolor", color: "#20B2AA" },
        { match: "seagull", slug: "seagull", color: "#2D55A9" },
        { match: "shanghai", slug: "shanghai", color: "#FF6347" },
        { match: "sharan", slug: "sharan", color: "#A92D31" },
        { match: "space cat film", slug: "space-cat-film", color: "#2DA94D" },
        { match: "street candy film", slug: "street-candy-film", color: "#722DA9" },
        { match: "supasnaps", slug: "supasnaps", color: "#A9962D" },
        { match: "svema", slug: "svema", color: "#DC143C" },
        { match: "tasma", slug: "tasma", color: "#4169E1" },
        { match: "three film rolls", slug: "three-film-rolls", color: "#FF8C00" },
        { match: "triple-print film labs", slug: "triple-print-film-labs", color: "#2D98A9" },
        { match: "unknown", slug: "unknown", color: "#808080" },
        { match: "veb fotochemische werke berlin", slug: "veb-fotochemische-werke-berlin", color: "#A92D74" },
        { match: "walgreen", slug: "walgreen", color: "#E31837" },
        { match: "walkens", slug: "walkens", color: "#2F2DA9" },
        { match: "wolfen", slug: "wolfen", color: "#DC143C" },
        { match: "york photo labs", slug: "york-photo-labs", color: "#4169E1" }
    ];

    const UNKNOWN = { match: 'unknown', slug: 'unknown', color: "#808080" };

    function resolveBrand(brand) {
        const brandLower = (brand || '').toLowerCase();
        for (const entry of BRAND_COLORS) {
            if (brandLower.includes(entry.match)) return entry;
        }
        return UNKNOWN;
    }

    function injectCssVars() {
        if (document.getElementById('brand-accent-vars')) return;

        const vars = BRAND_COLORS.map((entry) => `--accent-${entry.slug}: ${entry.color}`).join('; ');
        const style = document.createElement('style');
        style.id = 'brand-accent-vars';
        style.textContent = `:root { ${vars}; --accent-unknown: ${UNKNOWN.color}; }`;
        document.head.appendChild(style);
    }

    function luminanceFromColor(color) {
        const probe = document.createElement('span');
        probe.style.color = color;
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).color.match(/\d+/g);
        document.body.removeChild(probe);
        if (!resolved || resolved.length < 3) return 0;
        const [r, g, b] = resolved.map(Number);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    function textColorForBrand(brand) {
        const { color } = resolveBrand(brand);
        return luminanceFromColor(color) > 0.5 ? '#1A1A1A' : '#FFFFFF';
    }

    injectCssVars();

    global.BrandColors = {
        BRAND_COLORS,
        resolveBrand,
        textColorForBrand
    };
})(window);
