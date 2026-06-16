// Map State Parameters
let scale = 0.15; 
let offsetX = window.innerWidth / 2 - 160; 
let offsetY = window.innerHeight / 2;
let isDragging = false;
let startX, startY;

// Data Storage
let strongholds = [];
let userLocation = null;
const spawnPoint = { x: 0, z: 0 };

// DOM Selectors
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const poiContainer = document.getElementById('poi-container');
const form = document.getElementById('finder-form');

// Initialize Canvas Sizing
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawMap();
}
window.addEventListener('resize', resizeCanvas);

// Stronghold Generation Math Ring Settings (Minecraft Java 1.9+)
// Strongholds generate in 8 concentric rings centered around X:0, Z:0
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

// Simple Seed Hash Function to vary angles predictably per seed
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
            // Distribute strongholds evenly in a circle layout, modified slightly by seed hash
            const baseAngle = (2 * Math.PI * i) / ring.count;
            const variation = (seedMod * (ringIdx + 1) * 0.005);
            const angle = baseAngle + variation;
            
            const x = Math.round(avgRadius * Math.cos(angle));
            const z = Math.round(avgRadius * Math.sin(angle));
            
            strongholds.push({ x, z, ring: ringIdx + 1 });
        }
    });
}

// Render dynamic map grid lines and components
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Background Grid Layout
    ctx.strokeStyle = '#1e2230';
    ctx.lineWidth = 1;
    const gridSize = 500 * scale;
    
    // Vertical Grid Lines
    let startGridX = offsetX % gridSize;
    for (let x = startGridX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal Grid Lines
    let startGridY = offsetY % gridSize;
    for (let y = startGridY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw Ring Boundaries visually
    ringRules.forEach(ring => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.04)';
        ctx.lineWidth = (ring.maxRad - ring.minRad) * scale;
        const radius = ((ring.minRad + ring.maxRad) / 2) * scale;
        ctx.arc(offsetX, offsetY, radius, 0, 2 * Math.PI);
        ctx.stroke();
    });

    // Draw Axis lines intersecting spawn
    ctx.strokeStyle = '#2d3142';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, offsetY); ctx.lineTo(canvas.width, offsetY);
    ctx.moveTo(offsetX, 0); ctx.lineTo(offsetX, canvas.height);
    ctx.stroke();

    updateDOMMarkers();
}

// Map real block coordinates directly to screen pixels
function getScreenCoords(worldX, worldZ) {
    return {
        x: offsetX + (worldX * scale),
        y: offsetY + (worldZ * scale) // Z in minecraft acts as Y coordinate axis layout
    };
}

// Place UI interaction overlay objects exactly over the canvas
function updateDOMMarkers() {
    poiContainer.innerHTML = '';

    // Render Portal Eyes
    strongholds.forEach((sh, index) => {
        const pos = getScreenCoords(sh.x, sh.z);
        if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
            const div = document.createElement('div');
            div.className = 'poi eye-poi';
            div.style.left = `${pos.x}px`;
            div.style.top = `${pos.y}px`;
            
            div.innerHTML = `
                <img src="assets/eye.png" alt="Portal">
                <div class="poi-tooltip">Portal #${index+1}<br>X: ${sh.x} | Y: ~ | Z: ${sh.z}</div>
            `;
            poiContainer.appendChild(div);
        }
    });

    // Render User Custom Locator Pin
    if (userLocation) {
        const pos = getScreenCoords(userLocation.x, userLocation.z);
        if (pos.x >= 0 && pos.x <= canvas.width && pos.y >= 0 && pos.y <= canvas.height) {
            const div = document.createElement('div');
            div.className = 'poi locator-poi';
            div.style.left = `${pos.x}px`;
            div.style.top = `${pos.y}px`;
            
            div.innerHTML = `
                <img src="assets/locator.png" alt="You">
                <div class="poi-tooltip">Your Location<br>X: ${userLocation.x} | Z: ${userLocation.z}</div>
            `;
            poiContainer.appendChild(div);
        }
    }
}

// Dragging and Panning Engine Logic
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

// Zoom Functions
function adjustZoom(factor) {
    const oldScale = scale;
    scale = Math.max(0.01, Math.min(2, scale * factor));
    drawMap();
}

document.getElementById('zoom-in').addEventListener('click', () => adjustZoom(1.3));
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
    
    // Trigger reset center alignment target maps automatically
    offsetX = canvas.width / 2;
    offsetY = canvas.height / 2;
    drawMap();
});

document.getElementById('btn-teleport').addEventListener('click', () => {
    const x = parseInt(document.getElementById('custom-x').value);
    const z = parseInt(document.getElementById('custom-z').value);
    
    if (!isNaN(x) && !isNaN(z)) {
        userLocation = { x, z };
        // Instantly Pan to User Marker pin 
        offsetX = canvas.width / 2 - (x * scale);
        offsetY = canvas.height / 2 - (z * scale);
        drawMap();
    }
});

// Setup Initialization
resizeCanvas();
