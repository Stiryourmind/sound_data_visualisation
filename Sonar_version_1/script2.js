document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const CATEGORIES = [
        { id: 'region', label: 'Region', color: '#3b82f6' },      // Blue
        { id: 'illegal', label: 'Illegal', color: '#ef4444' },    // Red
        { id: 'form_changing', label: 'Form Change', color: '#a855f7' }, // Purple
        { id: 'entrance', label: 'Entrance', color: '#22c55e' },  // Green
    ];
    const RADIUS_STEP = 35;
    const INNER_RADIUS = 40;

    // --- State ---
    let allData = [];
    let activeCategory = 'all';
    let isScanning = true;

    // --- Data Generation ---
    function generateData(count = 250) {
        return Array.from({ length: count }).map((_, i) => {
            const dayIndex = Math.floor(Math.random() * 7);
            const hour = Math.floor(Math.random() * 24);
            const minute = Math.floor(Math.random() * 60);
            const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
            
            let baseAmp = Math.random() * 40 + 10;
            // Add some fake patterns
            if (category.id === 'illegal' && (hour > 20 || hour < 4)) baseAmp += 40;
            if (category.id === 'entrance' && (hour > 8 && hour < 10)) baseAmp += 30;

            return {
                id: i,
                dayIndex,
                day: DAYS[dayIndex],
                timeVal: hour + minute / 60,
                timeLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                category: category.id,
                color: category.color,
                categoryLabel: category.label,
                amplitude: Math.min(100, baseAmp),
            };
        });
    }

    // --- Math Helpers ---
    function getPosition(dayIndex, timeVal) {
        const r = INNER_RADIUS + (dayIndex * RADIUS_STEP);
        // -90deg puts 00:00 at the top
        const angle = (timeVal / 24) * 360 - 90; 
        const rad = (angle * Math.PI) / 180;
        const x = r * Math.cos(rad);
        const y = r * Math.sin(rad);
        return { x, y };
    }

    // --- Rendering ---
    function init() {
        allData = generateData();
        renderStaticLayer();
        renderFilters();
        renderDataPoints();
        setupInteractions();
    }

    function renderStaticLayer() {
        const layer = document.getElementById('static-layer');
        let svgContent = '';

        // Rings
        DAYS.forEach((day, i) => {
            const r = INNER_RADIUS + (i * RADIUS_STEP);
            svgContent += `
                <circle r="${r}" cx="0" cy="0" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="4 4" />
                <text x="0" y="${-r - 5}" text-anchor="middle" class="text-[9px] fill-slate-600 font-mono uppercase" style="font-size: 9px;">${day}</text>
            `;
        });

        // Hour Lines
        [0, 3, 6, 9, 12, 15, 18, 21].forEach(hour => {
            const angle = (hour / 24) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const outerR = INNER_RADIUS + (6 * RADIUS_STEP) + 20;
            const x = outerR * Math.cos(rad);
            const y = outerR * Math.sin(rad);
            svgContent += `
                <line x1="0" y1="0" x2="${x}" y2="${y}" stroke="#1e293b" stroke-width="1" opacity="0.5" />
                <text x="${x * 1.1}" y="${y * 1.1}" text-anchor="middle" alignment-baseline="middle" class="fill-slate-500 font-mono" style="font-size: 10px;">${hour}:00</text>
            `;
        });

        layer.innerHTML = svgContent;
    }

    function renderFilters() {
        const container = document.getElementById('filter-container');
        
        // All Button
        const allBtn = createFilterBtn('all', 'All Signals', '#fff', allData.length);
        container.appendChild(allBtn);

        // Category Buttons
        CATEGORIES.forEach(cat => {
            const count = allData.filter(d => d.category === cat.id).length;
            const btn = createFilterBtn(cat.id, cat.label, cat.color, count);
            container.appendChild(btn);
        });
    }

    function createFilterBtn(id, label, color, count) {
        const btn = document.createElement('button');
        btn.className = `flex items-center justify-between px-4 py-3 rounded-lg border transition-all filter-btn`;
        btn.dataset.id = id;
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full" style="background-color: ${id === 'all' ? '#94a3b8' : color}"></div>
                <span class="text-sm">${label}</span>
            </div>
            <span class="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full text-slate-300">${count}</span>
        `;
        
        btn.addEventListener('click', () => {
            activeCategory = id;
            updateFilterStyles();
            renderDataPoints();
        });
        
        return btn;
    }

    function updateFilterStyles() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            const isSelected = btn.dataset.id === activeCategory;
            if (isSelected) {
                btn.classList.add('bg-slate-800', 'border-slate-600', 'text-white', 'shadow-lg');
                btn.classList.remove('bg-transparent', 'border-slate-800', 'text-slate-400');
            } else {
                btn.classList.remove('bg-slate-800', 'border-slate-600', 'text-white', 'shadow-lg');
                btn.classList.add('bg-transparent', 'border-slate-800', 'text-slate-400');
            }
        });
    }

    function renderDataPoints() {
        const layer = document.getElementById('data-layer');
        layer.innerHTML = ''; // Clear existing

        const filtered = activeCategory === 'all' ? allData : allData.filter(d => d.category === activeCategory);

        filtered.forEach(d => {
            const pos = getPosition(d.dayIndex, d.timeVal);
            const size = (d.amplitude / 100) * 8 + 2;
            
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", size);
            circle.setAttribute("fill", d.color);
            circle.setAttribute("fill-opacity", "0.7");
            circle.setAttribute("class", "cursor-pointer hover:stroke-white hover:stroke-2 hover:fill-opacity-100");
            
            // Interaction
            circle.addEventListener('mouseenter', () => showDetails(d));
            circle.addEventListener('mouseleave', () => hideDetails());

            layer.appendChild(circle);
        });
    }

    // --- Interactions ---
    function showDetails(data) {
        const empty = document.getElementById('details-empty');
        const content = document.getElementById('details-content');
        
        empty.classList.add('hidden');
        content.classList.remove('hidden');
        // Trigger reflow for animation
        void content.offsetWidth; 
        content.classList.add('visible');

        document.getElementById('detail-time').textContent = data.timeLabel;
        document.getElementById('detail-day').textContent = `on ${data.day}`;
        document.getElementById('detail-amp').textContent = `${Math.round(data.amplitude)} dB`;
        
        const typeEl = document.getElementById('detail-type');
        typeEl.textContent = data.categoryLabel;
        typeEl.style.color = data.color;
    }

    function hideDetails() {
        const empty = document.getElementById('details-empty');
        const content = document.getElementById('details-content');
        
        content.classList.remove('visible');
        content.classList.add('hidden');
        empty.classList.remove('hidden');
    }

    function setupInteractions() {
        updateFilterStyles(); // Set initial state
        
        const scanBtn = document.getElementById('scan-toggle');
        const sweep = document.getElementById('radar-sweep');
        
        scanBtn.addEventListener('click', () => {
            isScanning = !isScanning;
            scanBtn.textContent = isScanning ? 'Stop Radar Sweep' : 'Start Radar Sweep';
            if(isScanning) {
                sweep.classList.remove('hidden');
            } else {
                sweep.classList.add('hidden');
            }
        });
    }

    // Run
    init();
});