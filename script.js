// Map View State variables
let scale = 0.04; 
let offsetX = window.innerWidth / 2 - 160; 
let offsetY = window.innerHeight / 2;
let isDragging = false;
let startX, startY;

// Storage Data Structure
let strongholds = [];
let userLocation = null;

// Select Dom Elements
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const poiContainer = document.getElementById('poi-container');
const form = document.getElementById('finder-form');

// Re-adjust size mapping elements
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawMap();
}
window.addEventListener('resize', resizeCanvas);

// Stronghold Generation Ring Metadata constraints for modern Minecraft (1.9 through 26.2)
const ringRules = [
    { count: 3, minRad: 1280, maxRad: 2816 },
    { count: 6, minRad: 4352, maxRad: 5888 },
    { count: 10, minRad: 7424, maxRad: 8960 },
    { count: 15, minRad: 10496, maxRad: 12032 },
    { count: 21, minRad: 13568, maxRad: 15104 },
    { count: 28, minRad: 16640, maxRad: 18176 },
    { count: 36, minRad: 19712, maxRad: 21248 },
    { count: 10, minRad: 22784, maxRad: 24320 }
];

// Seed Hashing logic to shift angles safely across infinite unique worlds
function getSeedModifier(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

function generateStrongholds(seed) {
    strongholds = [];
    const seedMod = getSeedModifier(seed);
    
    ringRules.forEach((ring, ringIdx) => {
        const avgRadius = (ring.minRad + ring.maxRad) / 2;
        
        for (let i = 0; i < ring.count; i++) {
            // Distribute strongholds evenly inside each concentric geometric circle perimeter
            const baseAngle = (2 * Math.PI * i) / ring.count;
            const variation = (seedMod * (ringIdx + 1) * 0.0075);
            const angle = baseAngle + variation;
            
            const x = Math.round(avgRadius * Math.cos(angle));
            const z = Math.round(avgRadius * Math.sin(angle));
            
            strongholds.push({ x, z, ring: ringIdx + 1 });
        }
    });
}

// Canvas Core Paint Brush Render Logic
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid Lines Configuration
    ctx.strokeStyle = '#1e2230';
    ctx.lineWidth = 1;
    const gridSize = 1000 * scale; 
    
    let startGridX = offsetX % gridSize;
    for (let x = startGridX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    
    let startGridY = offsetY % gridSize;
    for (let y = startGridY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw visual generation boundary circles matching rules
    ringRules.forEach(ring => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
        ctx.lineWidth = (ring.maxRad - ring.minRad) * scale;
        const radius = ((ring.minRad + ring.maxRad) / 2) * scale;
        ctx.arc(offsetX, offsetY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    });

    // Main World Center Intersection Lines
    ctx.strokeStyle = '#2d3142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, offsetY); ctx.lineTo(canvas.width, offsetY);
    ctx.moveTo(offsetX, 0); ctx.lineTo(offsetX, canvas.height);
    ctx.stroke();

    updateDOMMarkers();
}

// Translate world scale values straight to pixels screen space
function getScreenCoords(worldX, worldZ) {
    return {
        x: offsetX + (worldX * scale),
        y: offsetY + (worldZ * scale)
    };
}

// Create DOM overlay markers to allow clean pointer clicking
function updateDOMMarkers() {
    poiContainer.innerHTML = '';

    strongholds.forEach((sh, index) => {
        const pos = getScreenCoords(sh.x, sh.z);
        if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
            const div = document.createElement('div');
            div.className = 'poi';
            div.style.left = `${pos.x}px`;
            div.style.top = `${pos.y}px`;
            
            div.innerHTML = `
                <img src="assets/eye.png" alt="Portal Edge Target">
                <div class="poi-tooltip">
                    <strong>Stronghold #${index + 1}</strong><br>
                    X: ${sh.x}<br>
                    Y: ~ (Check Caves)<br>
                    Z: ${sh.z}
                </div>
            `;
            
            // Toggle active status card display layer on click event explicitly
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.poi').forEach(p => { if(p !== div) p.classList.remove('active'); });
                div.classList.toggle('active');
            });

            poiContainer.appendChild(div);
        }
    });

    // Custom imported coordinates marker
    if (userLocation) {
        const pos = getScreenCoords(userLocation.x, userLocation.z);
        if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
            const div = document.createElement('div');
            div.className = 'poi locator-poi';
            div.style.left = `${pos.x}px`;
            div.style.top = `${pos.y}px`;
            
            div.innerHTML = `
                <img src="assets/locator.png" alt="Player Pin Location">
                <div class="poi-tooltip">
                    <strong>Your Location</strong><br>
                    X: ${userLocation.x}<br>
                    Z: ${userLocation.z}
                </div>
            `;

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.poi').forEach(p => p.classList.remove('active'));
                div.classList.add('active');
            });

            poiContainer.appendChild(div);
        }
    }
}

// Global window event listener to clear tooltip popup selections safely
window.addEventListener('click', () => {
    document.querySelectorAll('.poi').forEach(p => p.classList.remove('active'));
});

// Drag and drop interface pan tracking events configuration
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    drawMap();
});

window.addEventListener('mouseup', () => isDragging = false);

// Scale modification steps
function adjustZoom(factor) {
    scale = Math.max(0.005, Math.min(0.5, scale * factor));
    drawMap();
}

document.getElementById('zoom-in').addEventListener('click', () => adjustZoom(1.4));
document.getElementById('zoom-out').addEventListener('click', () => adjustZoom(0.7));
document.getElementById('recenter').addEventListener('click', () => {
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    drawMap();
});

// Form and Data Submission Handles
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const seedInput = document.getElementById('seed').value;
    
    generateStrongholds(seedInput);
    document.getElementById('info-panel').classList.remove('hidden');
    
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    drawMap();
});

document.getElementById('btn-teleport').addEventListener('click', () => {
    const x = parseInt(document.getElementById('custom-x').value);
    const z = parseInt(document.getElementById('custom-z').value);
    
    if (!isNaN(x) && !isNaN(z)) {
        userLocation = { x, z };
        offsetX = canvas.width / 2 - (x * scale);
        offsetY = canvas.height / 2 - (z * scale);
        drawMap();
    }
});

// Run Setup Loop Initializer on Window Draw
resizeCanvas();
