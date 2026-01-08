// Constants
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES = [
    { id: 'region', label: 'Region', color: '#3b82f6' },
    { id: 'illegal', label: 'Illegal Activity', color: '#ef4444' },
    { id: 'form_changing', label: 'Form Changing', color: '#a855f7' },
    { id: 'entrance', label: 'Specific Entrance', color: '#22c55e' },
];

// State
let data = [];
let filteredData = [];
let selectedCategory = 'all';
let rotation = { x: -60, z: 45 };
let zoom = 1;
let isAutoRotating = false;
let autoRotateInterval = null;
let hoveredPoint = null;

// Generate mock data
function generateData(count = 150) {
    const result = [];
    for (let i = 0; i < count; i++) {
        const dayIndex = Math.floor(Math.random() * 7);
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        
        let baseAmp = Math.random() * 50;
        
        if (category.id === 'illegal' && (hour > 22 || hour < 4)) {
            baseAmp += 40;
        }
        if (category.id === 'entrance' && (hour > 8 && hour < 18)) {
            baseAmp += 20;
        }

        result.push({
            id: i,
            dayIndex,
            day: DAYS[dayIndex],
            time: hour + minute / 60,
            hour: hour,
            timeLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            category: category.id,
            categoryLabel: category.label,
            categoryColor: category.color,
            amplitude: Math.min(100, Math.max(10, baseAmp)),
        });
    }
    return result;
}

// 3D mapping - XZ floor, Y is height (vertical)
function getX(time) {
    // X-axis: Time (0-24h) - horizontal
    return (time / 24) * 400 - 200;
}

function getZ(dayIndex) {
    // Z-axis: Days (0-6) - horizontal
    return (dayIndex / 6) * 300 - 150;
}

function getY(amplitude) {
    // Y-axis: Audio amplitude - vertical height (toward sky)
    return amplitude * 2.5;
}

// Render grid on the XZ plane (floor at Y=0)
function renderGrid() {
    const gridLines = document.getElementById('gridLines');
    gridLines.innerHTML = '';
    
    // Lines parallel to X-axis (time direction)
    for (let i = 0; i <= 6; i++) {
        const line = document.createElement('div');
        line.className = 'grid-line x-line';
        // Positioned along Z, extending along X, at Y=0
        line.style.transform = `translate3d(-200px, 0px, ${i * 50 - 150}px) rotateY(90deg)`;
        gridLines.appendChild(line);
    }
    
    // Lines parallel to Z-axis (day direction)
    for (let i = 0; i <= 24; i += 3) {
        const line = document.createElement('div');
        line.className = 'grid-line z-line';
        // Positioned along X, extending along Z, at Y=0
        line.style.transform = `translate3d(${i * 400/24 - 200}px, 0px, -150px)`;
        gridLines.appendChild(line);
    }
}

// Render axis labels
function renderAxisLabels() {
    const container = document.getElementById('axisLabels');
    container.innerHTML = '';
    
    // Time labels (X-axis)
    for (let h = 0; h <= 24; h += 6) {
        const label = document.createElement('div');
        label.className = 'axis-label time-label';
        label.textContent = `${h}h`;
        label.style.transform = `translate3d(${getX(h)}px, 0px, ${170}px) rotateX(90deg)`;
        container.appendChild(label);
    }
    
    // Day labels (Z-axis)
    DAYS.forEach((day, i) => {
        const label = document.createElement('div');
        label.className = 'axis-label day-label';
        label.textContent = day;
        label.style.transform = `translate3d(${-230}px, 0px, ${getZ(i)}px) rotateX(90deg)`;
        container.appendChild(label);
    });
}

// Update scene transform
function updateSceneTransform() {
    const scene = document.getElementById('scene');
    scene.style.transform = `
        scale(${zoom})
        rotateX(${rotation.x}deg)
        rotateZ(${rotation.z}deg)
    `;
}

// Render data points - bars standing vertically on XZ floor
function renderDataPoints() {
    const container = document.getElementById('dataPoints');
    container.innerHTML = '';

    filteredData.forEach(d => {
        const xPos = getX(d.time);           // X position (time)
        const zPos = getZ(d.dayIndex);       // Z position (day)
        const height = getY(d.amplitude);    // Y height (amplitude - vertical)

        // Create point wrapper at XZ position on the floor (Y=0)
        const point = document.createElement('div');
        point.className = 'data-point';
        // Position on XZ plane at Y=0
        point.style.transform = `translate3d(${xPos}px, 0px, ${zPos}px)`;

        // Create vertical bar
        const bar = document.createElement('div');
        bar.className = 'data-bar';
        bar.style.height = `${height}px`;
        bar.style.background = `linear-gradient(to top, ${d.categoryColor}88, ${d.categoryColor})`;
        bar.style.boxShadow = `0 0 20px ${d.categoryColor}88`;

        // Create glowing top sphere
        const top = document.createElement('div');
        top.className = 'bar-top';
        top.style.background = d.categoryColor;
        top.style.boxShadow = `0 0 15px ${d.categoryColor}`;

        bar.appendChild(top);
        point.appendChild(bar);

        // Hover events
        point.addEventListener('mouseenter', () => {
            hoveredPoint = d;
            updateInfoPanel();
            bar.style.transform = 'scale(1.3)';
            bar.style.filter = 'brightness(1.5)';
        });

        point.addEventListener('mouseleave', () => {
            hoveredPoint = null;
            updateInfoPanel();
            bar.style.transform = 'scale(1)';
            bar.style.filter = 'brightness(1)';
        });

        container.appendChild(point);
    });

    console.log(`Rendered ${filteredData.length} data points`);
}

// Update info panel
function updateInfoPanel() {
    const panel = document.getElementById('infoPanel');
    
    if (!hoveredPoint) {
        panel.innerHTML = '<div class="info-placeholder">Hover over a bar to see details</div>';
        return;
    }
    
    panel.innerHTML = `
        <div class="info-content">
            <div class="info-row">
                <span class="info-label">Time</span>
                <span class="info-value">${hoveredPoint.timeLabel}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Day</span>
                <span class="info-value">${hoveredPoint.day}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Category</span>
                <span class="category-badge" style="background-color: ${hoveredPoint.categoryColor}">${hoveredPoint.categoryLabel}</span>
            </div>
            <div class="info-row" style="border: none; padding-top: 0.25rem;">
                <span class="info-label">Amplitude</span>
                <div class="amplitude-bar">
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${hoveredPoint.amplitude}%"></div>
                    </div>
                    <span class="amplitude-value">${Math.round(hoveredPoint.amplitude)}dB</span>
                </div>
            </div>
        </div>
    `;
}

// Filter data
function filterData() {
    if (selectedCategory === 'all') {
        filteredData = [...data];
    } else {
        filteredData = data.filter(d => d.category === selectedCategory);
    }
    console.log(`Filtered to ${filteredData.length} points (category: ${selectedCategory})`);
    renderDataPoints();
}

// Setup event listeners
function setupEventListeners() {
    // Category filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedCategory = e.currentTarget.dataset.category;
            filterData();
        });
    });

    // Rotation controls
    const rotationZ = document.getElementById('rotationZ');
    const rotationX = document.getElementById('rotationX');
    const zoomSlider = document.getElementById('zoom');

    rotationZ.addEventListener('input', (e) => {
        rotation.z = parseFloat(e.target.value);
        document.getElementById('rotationZValue').textContent = `${Math.round(rotation.z)}°`;
        updateSceneTransform();
    });

    rotationX.addEventListener('input', (e) => {
        rotation.x = parseFloat(e.target.value);
        document.getElementById('rotationXValue').textContent = `${Math.round(rotation.x)}°`;
        updateSceneTransform();
    });

    zoomSlider.addEventListener('input', (e) => {
        zoom = parseFloat(e.target.value);
        document.getElementById('zoomValue').textContent = `${zoom.toFixed(1)}x`;
        updateSceneTransform();
    });

    // Auto rotate
    const autoRotateBtn = document.getElementById('autoRotateBtn');
    autoRotateBtn.addEventListener('click', () => {
        isAutoRotating = !isAutoRotating;
        
        if (isAutoRotating) {
            autoRotateBtn.classList.add('active');
            autoRotateBtn.textContent = 'Stop Rotation';
            
            autoRotateInterval = setInterval(() => {
                rotation.z = (rotation.z + 0.5) % 360;
                rotationZ.value = rotation.z;
                document.getElementById('rotationZValue').textContent = `${Math.round(rotation.z)}°`;
                updateSceneTransform();
            }, 50);
        } else {
            autoRotateBtn.classList.remove('active');
            autoRotateBtn.textContent = 'Auto Rotate';
            clearInterval(autoRotateInterval);
        }
    });

    // Mouse drag to rotate
    const viewport = document.getElementById('viewport');
    let isDragging = false;
    let startX, startY, startRotX, startRotZ;

    viewport.addEventListener('mousedown', (e) => {
        if (isAutoRotating) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startRotX = rotation.x;
        startRotZ = rotation.z;
        viewport.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        rotation.x = Math.max(-90, Math.min(0, startRotX - deltaY * 0.5));
        rotation.z = (startRotZ + deltaX * 0.5) % 360;
        
        document.getElementById('rotationX').value = rotation.x;
        document.getElementById('rotationZ').value = rotation.z;
        document.getElementById('rotationXValue').textContent = `${Math.round(rotation.x)}°`;
        document.getElementById('rotationZValue').textContent = `${Math.round(rotation.z)}°`;
        
        updateSceneTransform();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        viewport.style.cursor = 'move';
    });
}

// Initialize
function init() {
    console.log('Initializing 3D Seismic Visualization...');
    data = generateData(150);
    filteredData = [...data];
    console.log(`Generated ${data.length} data points`);
    setupEventListeners();
    renderGrid();
    renderAxisLabels();
    updateSceneTransform();
    renderDataPoints();
    updateInfoPanel();
}

// Start the app
init();