/**
 * WebGL 3D Maze Game
 * 
 * Team Members:
 * - Aran: Maze Architecture & Rendering Systems
 * - Shuja: AI Systems & Visual Effects  
 * - Nairran: Player Systems & Game Mechanics
 * 
 * Features:
 * 1. Player navigation with sphere
 * 2. Pellet collection system
 * 3. AI ghosts with pathfinding
 * 4. Multiple maze generation algorithms-perfect, imperfect, pacman
 * 5. Power-up system-overhead view, power pellets, ghost mode
 */

// Aran - WebGL Core Systems and Global Variables
let gl;
let program;

// Aran - Maze Configuration and Architecture
let maze = [];
let mazeSize = 10;
let mazeType = 'perfect'; // 'perfect', 'imperfect', 'pacman'
const cellSize = 0.15;
const wallHeight = 0.1;
const wallThickness = 0.02;

// Nairran - Game State Management
let gameState = {
    isPlaying: false,
    score: 0,
    lives: 3,
    pelletsCollected: 0,
    totalPellets: 0,
    powerPelletsCollected: 0,
    totalPowerPellets: 0,
    gameStatus: 'Ready',
    playerRespawning: false, // Track when player is respawning after death
    respawnProtectionTime: 0, // Time left for respawn protection
    lastPelletCollectionTime: 0, // Timestamp of last pellet collection
    brightnessDecayActive: false, // Flag to track if brightness is decaying
    waitingForRespawn: false // Track when player is waiting for manual respawn (Q key)
};

// Player system
let player = {
    x: 0,
    y: 0,
    worldX: 0,
    worldZ: 0,
    radius: 0.03,
    baseSpeed: 2.5, // Base speed (renamed from speed)
    speed: 2.5, // Current effective speed
    moving: false,
    targetX: 0,
    targetY: 0,
    animationProgress: 0
};

// Input handling
let keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    r: false,
    v: false,  // Added key for overhead view powerup
    q: false   // Added key for manual respawn
};

// Pellets system
let pellets = [];
const pelletRadius = 0.015;

// Power Pellets system
let powerPellets = [];
const powerPelletRadius = 0.035; // Larger than regular pellets
const powerPelletDuration = 8000; // 8 seconds of power mode
const powerPelletScore = 50; // Higher score than regular pellets
let powerMode = {
    active: false,
    timeLeft: 0,
    ghostsEaten: 0,
    bonusMultiplier: 1
};

// Dash system
let dashSystem = {
    active: false,
    duration: 3000, // 3 seconds
    timeLeft: 0,
    cooldown: 12000, // 12 seconds (reduced from 20)
    cooldownTimeLeft: 0,
    speedMultiplier: 1.5
};

// Overhead View System (separate powerup from dash and power pellets)
let overheadViewSystem = {
    active: false,
    duration: 7000, // 7 seconds (5-10 seconds range)
    timeLeft: 0,
    cooldown: 20000, // 20 seconds cooldown (reduced from 30)
    cooldownTimeLeft: 0,
    originalCameraAngle: 90 // Store the original angle when activated
};

// Shuja - Ghost AI Systems
let ghosts = [];
const ghostRadius = 0.04;

// Ghost states for power pellet system
const GHOST_STATES = {
    NORMAL: 'normal',
    FRIGHTENED: 'frightened',
    EATEN: 'eaten',
    RETURNING: 'returning',
    RESPAWNING: 'respawning'
};

const GHOST_SPEEDS = {
    NORMAL: 2.0,     // Player speed (2.5) * 0.8 = 2.0
    FRIGHTENED: 1.6, // Slower when frightened (player speed * 0.64)
    EATEN: 3.0,      // Fast return speed (reduced from 3.6)
    RETURNING: 3.0,  // Fast return speed (reduced from 3.6)
    RESPAWNING: 0.0  // No movement while respawning
};


// Aran - Camera and Rendering Systems
// Camera and view variables
let cameraAngle = 90;
let originalCameraAngle = 90;
let eye = vec3(0, 2, 0);
let at = vec3(0, 0, 0);
let up = vec3(0, 0, -1);

// Lighting parameters
const topRightDir = normalize(vec3(1.0, -1.0, 1.0));
let lightPosition = vec4(topRightDir[0], topRightDir[1], topRightDir[2], 0.0);
const ambientColor = vec4(0.2, 0.2, 0.2, 1.0);
const diffuseColor = vec4(0.8, 0.8, 0.8, 1.0);
const specularColor = vec4(1.0, 1.0, 1.0, 1.0);
const materialAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const materialDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
const materialShininess = 100.0;

// Visual control variables
let brightness = 1.0;

// Buffer objects for different geometry types
let wallsBuffer, wallsNormalBuffer, wallsColorBuffer, wallsIndexBuffer;
let playerBuffer, playerNormalBuffer, playerColorBuffer, playerIndexBuffer;
let pelletsBuffer, pelletsNormalBuffer, pelletsColorBuffer, pelletsIndexBuffer;
let powerPelletsBuffer, powerPelletsNormalBuffer, powerPelletsColorBuffer, powerPelletsIndexBuffer;
let particlesBuffer, particlesNormalBuffer, particlesColorBuffer, particlesIndexBuffer;
let ghostsBuffer, ghostsNormalBuffer, ghostsColorBuffer, ghostsIndexBuffer;

let wallsCount = 0;
let playerVertexCount = 0;
let pelletsCount = 0;
let powerPelletsCount = 0;
let particlesCount = 0;
let ghostsCount = 0;

// Time tracking
let lastTime = 0;
let deltaTime = 0;

// Ghost respawn system
const GHOST_RESPAWN_TIME = 15000; // 15 seconds in milliseconds

// Aran - WebGL Initialization and Main Loop
// Initialize WebGL and game systems
window.onload = function init() {
    const canvas = document.getElementById("gl-canvas");
    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.9;
    
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
        alert("WebGL is not available");
        return;
    }
    
    // WebGL setup
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);
    
    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // Set up UI event listeners
    setupUIControls();
    
    // Set up keyboard input
    setupKeyboardInput();
    
    // Generate initial maze
    generateMaze();
    createGeometry();
    updateUI();
    
    // Handle window resizing
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth * 0.9;
        canvas.height = window.innerHeight * 0.9;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    
    // Start render loop
    render();
};

// Nairran - UI Controls and Game State Management
// Set up UI control event listeners
function setupUIControls() {
    // Maze type selection
    document.getElementById("mazeType").addEventListener("change", function(event) {
        mazeType = event.target.value;
        if (!gameState.isPlaying) {
            regenerateMaze();
        }
    });
    
    // Camera angle control
    document.getElementById("cameraAngle").addEventListener("input", function(event) {
        cameraAngle = event.target.value;
            originalCameraAngle = cameraAngle;
        document.getElementById("angleValue").textContent = cameraAngle;
    });
    
    // Maze size control
    document.getElementById("mazeSize").addEventListener("input", function(event) {
        if (!gameState.isPlaying) {
        mazeSize = parseInt(event.target.value);
        document.getElementById("sizeValue").textContent = mazeSize;
        document.getElementById("sizeValueCopy").textContent = mazeSize;
            regenerateMaze();
        }
    });
    
    // Brightness control
    document.getElementById("brightness").addEventListener("input", function(event) {
        brightness = event.target.value;
        document.getElementById("brightnessValue").textContent = parseFloat(brightness).toFixed(1);
    });
    
    // Game control buttons
    document.getElementById("regenerate").addEventListener("click", function() {
        if (!gameState.isPlaying) {
            regenerateMaze();
        }
    });
    
    document.getElementById("startGame").addEventListener("click", startGame);
    document.getElementById("resetGame").addEventListener("click", resetGame);
}

// Set up keyboard input handling
function setupKeyboardInput() {
    document.addEventListener('keydown', function(event) {
        const key = event.key.toLowerCase();
        if (key in keys) {
            keys[key] = true;
            event.preventDefault();
        }
        
        // Handle special keys
        if (key === ' ') {
            keys.space = true;
            event.preventDefault();
        }
    });
    
    document.addEventListener('keyup', function(event) {
        const key = event.key.toLowerCase();
        if (key in keys) {
            keys[key] = false;
            event.preventDefault();
        }
        
        if (key === ' ') {
            keys.space = false;
            event.preventDefault();
        }
    });
}

// Game control functions
function startGame() {
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.pelletsCollected = 0;
    gameState.powerPelletsCollected = 0;
    gameState.gameStatus = 'Playing';
    gameState.playerRespawning = false; // Reset respawn state
    gameState.respawnProtectionTime = 0; // Reset protection timer
    gameState.lastPelletCollectionTime = Date.now(); // Initialize pellet collection timer
    gameState.brightnessDecayActive = false; // Reset brightness decay
    gameState.waitingForRespawn = false; // Reset manual respawn state
    
    // Set camera angle based on maze type
    let targetAngle = 50; // Default for perfect maze
    if (mazeType === 'imperfect') {
        targetAngle = 50;
    } else if (mazeType === 'pacman') {
        targetAngle = 65;
    }
    
    // Force camera angle and brightness to 2.0
    cameraAngle = targetAngle;
    originalCameraAngle = targetAngle;
    brightness = 2.0;
    
    // Update UI elements to reflect forced settings
    document.getElementById("cameraAngle").value = cameraAngle;
    document.getElementById("angleValue").textContent = cameraAngle;
    document.getElementById("brightness").value = brightness;
    document.getElementById("brightnessValue").textContent = parseFloat(brightness).toFixed(1);
    

    
    // Reset power mode
    powerMode.active = false;
    powerMode.timeLeft = 0;
    powerMode.ghostsEaten = 0;
    powerMode.bonusMultiplier = 1;
    
    // Reset dash system
    dashSystem.active = false;
    dashSystem.timeLeft = 0;
    dashSystem.cooldownTimeLeft = 0;
    player.speed = player.baseSpeed;
    
    // Reset overhead view system
    overheadViewSystem.active = false;
    overheadViewSystem.timeLeft = 0;
    overheadViewSystem.cooldownTimeLeft = 0;
    
    // Reset player position
    player.x = 0;
    player.y = 0;
    
    // Validate starting position and fix if necessary
    if (!isValidPlayerPosition(player.x, player.y)) {

        // Try to find a valid starting position near (0,0)
        let foundValidStart = false;
        for (let radius = 0; radius < 5 && !foundValidStart; radius++) {
            for (let dy = -radius; dy <= radius && !foundValidStart; dy++) {
                for (let dx = -radius; dx <= radius && !foundValidStart; dx++) {
                    const testX = Math.max(0, Math.min(mazeSize - 1, dx));
                    const testY = Math.max(0, Math.min(mazeSize - 1, dy));
                    
                    if (isValidPlayerPosition(testX, testY)) {
                        player.x = testX;
                        player.y = testY;
                        foundValidStart = true;

                    }
                }
            }
        }
        
        if (!foundValidStart) {

        }
    }
    
    updatePlayerWorldPosition();
    
    // Generate pellets
    generatePellets();
    
    // Generate power pellets
    generatePowerPellets();
    
    // Generate ghosts
    generateGhosts();
    
    // Test particle effect to verify system is working

    createParticleEffect(
        PARTICLE_TYPES.POWER_MODE_START,
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    
    // Update UI
    updateUI();
    updateGameButtons();
    
    // Recreate geometry with game objects
    createGeometry();
}

function resetGame() {
    gameState.isPlaying = false;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.pelletsCollected = 0;
    gameState.totalPellets = 0;
    gameState.powerPelletsCollected = 0;
    gameState.totalPowerPellets = 0;
    gameState.gameStatus = 'Ready';
    gameState.playerRespawning = false; // Reset respawn state
    gameState.respawnProtectionTime = 0; // Reset protection timer
    gameState.lastPelletCollectionTime = 0; // Reset pellet collection timer
    gameState.brightnessDecayActive = false; // Reset brightness decay
    gameState.waitingForRespawn = false; // Reset manual respawn state
    
    // Reset power mode
    powerMode.active = false;
    powerMode.timeLeft = 0;
    powerMode.ghostsEaten = 0;
    powerMode.bonusMultiplier = 1;
    
    // Reset dash system
    dashSystem.active = false;
    dashSystem.timeLeft = 0;
    dashSystem.cooldownTimeLeft = 0;
    player.speed = player.baseSpeed;
    
    // Reset overhead view system
    overheadViewSystem.active = false;
    overheadViewSystem.timeLeft = 0;
    overheadViewSystem.cooldownTimeLeft = 0;
    
    // Clear game objects
    pellets = [];
    powerPellets = [];
    ghosts = [];
    particles = []; // Clear particles
    
    // Reset player
    player.x = 0;
    player.y = 0;
    updatePlayerWorldPosition();
    
    // Reset camera
    cameraAngle = originalCameraAngle;
    
    updateUI();
    updateGameButtons();
    createGeometry();
}

function updateGameButtons() {
    const startBtn = document.getElementById("startGame");
    const resetBtn = document.getElementById("resetGame");
    const regenerateBtn = document.getElementById("regenerate");
    const mazeSizeSlider = document.getElementById("mazeSize");
    const mazeTypeSelect = document.getElementById("mazeType");
    
    if (gameState.isPlaying) {
        startBtn.disabled = true;
        startBtn.textContent = "Game Running";
        resetBtn.disabled = false;
        regenerateBtn.disabled = true;
        mazeSizeSlider.disabled = true;
        mazeTypeSelect.disabled = true;
    } else {
        startBtn.disabled = false;
        startBtn.textContent = "Start Game";
        resetBtn.disabled = true;
        regenerateBtn.disabled = false;
        mazeSizeSlider.disabled = false;
        mazeTypeSelect.disabled = false;
    }
}

function updateUI() {
    document.getElementById("gameStatus").textContent = gameState.gameStatus;
    document.getElementById("score").textContent = gameState.score;
    document.getElementById("lives").textContent = gameState.lives;
    document.getElementById("pelletsCollected").textContent = gameState.pelletsCollected;
    document.getElementById("totalPellets").textContent = gameState.totalPellets;
    document.getElementById("powerPelletsCollected").textContent = gameState.powerPelletsCollected;
    document.getElementById("totalPowerPellets").textContent = gameState.totalPowerPellets;
    document.getElementById("ghostsActive").textContent = ghosts.length;
    document.getElementById("particlesActive").textContent = particles.length;
    
    // Show respawn timers for eaten ghosts
    const respawningGhosts = ghosts.filter(ghost => ghost.isRespawning);
    if (respawningGhosts.length > 0) {
        const maxRespawnTime = Math.max(...respawningGhosts.map(ghost => ghost.respawnTimer));
        const secondsLeft = Math.ceil(maxRespawnTime / 1000);
        if (secondsLeft > 0) {
            document.getElementById("gameStatus").textContent = `Ghost Respawn: ${secondsLeft}s`;
        }
    }
    
    // Show respawn protection status
    if (gameState.playerRespawning && gameState.respawnProtectionTime > 0) {
        const secondsLeft = Math.ceil(gameState.respawnProtectionTime / 1000);
        document.getElementById("gameStatus").textContent = `Respawn Protection: ${secondsLeft}s`;

    }
    
    // Show manual respawn waiting status
    if (gameState.waitingForRespawn) {
        document.getElementById("gameStatus").textContent = `Press Q to Respawn`;

    }
    
    // Show power mode status
    if (powerMode.active) {
        const secondsLeft = Math.ceil(powerMode.timeLeft / 1000);
        document.getElementById("powerModeStatus").textContent = `Power Mode: ${secondsLeft}s`;
        document.getElementById("powerModeStatus").style.display = 'block';
    } else {
        document.getElementById("powerModeStatus").style.display = 'none';
    }
    
    // Show dash status
    if (dashSystem.active) {
        const secondsLeft = Math.ceil(dashSystem.timeLeft / 1000);
        document.getElementById("dashStatus").textContent = `Dash Active: ${secondsLeft}s`;
        document.getElementById("dashStatus").style.display = 'block';
    } else if (dashSystem.cooldownTimeLeft > 0) {
        const secondsLeft = Math.ceil(dashSystem.cooldownTimeLeft / 1000);
        document.getElementById("dashStatus").textContent = `Dash Cooldown: ${secondsLeft}s`;
        document.getElementById("dashStatus").style.display = 'block';
    } else {
        document.getElementById("dashStatus").textContent = `Dash: Ready`;
        document.getElementById("dashStatus").style.display = 'block';
    }
    
    // Show grace period timer if active
    if (gameState.isPlaying && ghosts.length > 0) {
        const currentTime = Date.now();
        let maxGracePeriodLeft = 0;
        
        for (const ghost of ghosts) {
            const gracePeriodLeft = Math.max(0, (ghost.spawnTime + ghost.initialGracePeriod) - currentTime);
            maxGracePeriodLeft = Math.max(maxGracePeriodLeft, gracePeriodLeft);
        }
        
        if (maxGracePeriodLeft > 0 && !powerMode.active) {
            const secondsLeft = Math.ceil(maxGracePeriodLeft / 1000);
            document.getElementById("gameStatus").textContent = `Grace Period: ${secondsLeft}s`;
        }
    }
    
    // Show overhead view status
    if (overheadViewSystem.active) {
        const secondsLeft = Math.ceil(overheadViewSystem.timeLeft / 1000);
        document.getElementById("overheadViewStatus").textContent = `Overhead View: ${secondsLeft}s`;
        document.getElementById("overheadViewStatus").style.display = 'block';
    } else if (overheadViewSystem.cooldownTimeLeft > 0) {
        const secondsLeft = Math.ceil(overheadViewSystem.cooldownTimeLeft / 1000);
        document.getElementById("overheadViewStatus").textContent = `Overhead Cooldown: ${secondsLeft}s`;
        document.getElementById("overheadViewStatus").style.display = 'block';
    } else {
        document.getElementById("overheadViewStatus").textContent = `Overhead View: Ready`;
        document.getElementById("overheadViewStatus").style.display = 'block';
    }
}

// Aran - Maze Generation Algorithms
// Regenerate the maze
function regenerateMaze() {

    
    // Generate new maze based on selected type
    generateMaze();
    
    // Update camera angle based on maze type (only when not playing)
    if (!gameState.isPlaying) {
        let targetAngle = 50; // Default for perfect maze
        if (mazeType === 'imperfect') {
            targetAngle = 50;
        } else if (mazeType === 'pacman') {
            targetAngle = 65;
        }
        
        cameraAngle = targetAngle;
        originalCameraAngle = targetAngle;
        
        // Update UI elements to reflect camera angle change
        document.getElementById("cameraAngle").value = cameraAngle;
        document.getElementById("angleValue").textContent = cameraAngle;
        

    }
    
    // If game is running, regenerate game objects
    if (gameState.isPlaying) {
        generatePellets();
        generateGhosts();
        // Reset player position
        player.x = 0;
        player.y = 0;
        updatePlayerWorldPosition();
    }
    
    // Recreate geometry
    createGeometry();
    updateUI();
}

// Generate maze based on selected type
function generateMaze() {
    // Clear existing maze
    maze = [];
    
    // Initialize maze grid with all walls intact
    for (let i = 0; i < mazeSize; i++) {
        maze[i] = [];
        for (let j = 0; j < mazeSize; j++) {
            maze[i][j] = {
                visited: false,
                walls: [true, true, true, true], // [top, right, bottom, left]
                hasPellet: false
            };
        }
    }
    
    switch (mazeType) {
        case 'perfect':
            generatePerfectMaze();
            break;
        case 'imperfect':
            generatePerfectMaze();
            createImperfectMaze();
            break;
        case 'pacman':
            generatePacmanStyleMaze();
            break;
        default:
            generatePerfectMaze();
    }
    
    // Set entrance and exit
    maze[0][0].walls[3] = false; // Remove left wall at entrance
    maze[mazeSize-1][mazeSize-1].walls[1] = false; // Remove right wall at exit
}

// Generate perfect maze using DFS
function generatePerfectMaze() {
    const stack = [];
    const startX = 0;
    const startY = 0;
    
    maze[startY][startX].visited = true;
    stack.push({x: startX, y: startY});
    
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(current.x, current.y);
        
        if (neighbors.length > 0) {
            const randomIndex = Math.floor(Math.random() * neighbors.length);
            const next = neighbors[randomIndex];
            
            removeWallBetween(current, next);
            maze[next.y][next.x].visited = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }
}

// Create imperfect maze by removing random walls
function createImperfectMaze() {
    // Significantly increase wall removal from 10% to 25% for more open maze
    const baseWallsToRemove = Math.floor(mazeSize * mazeSize * 0.25);
    
    // First pass: Random wall removal for general connectivity
    for (let i = 0; i < baseWallsToRemove; i++) {
        const x = Math.floor(Math.random() * mazeSize);
        const y = Math.floor(Math.random() * mazeSize);
        const wall = Math.floor(Math.random() * 4);
        
        // Remove wall if it exists and doesn't break maze boundaries
        if (canRemoveWall(x, y, wall)) {
            removeWallAtPosition(x, y, wall);
        }
    }
    
    // Second pass: Strategic loop creation to reduce dead ends
    createStrategicLoops();
    
    // Third pass: Connect isolated areas to prevent getting stuck
    ensureConnectivity();
}

// Create strategic loops to reduce dead ends and linear paths
function createStrategicLoops() {
    const loopsToCreate = Math.max(3, Math.floor(mazeSize / 3));
    
    for (let i = 0; i < loopsToCreate; i++) {
        // Try to create loops in different areas of the maze
        const areaX = Math.floor(Math.random() * (mazeSize - 4)) + 2;
        const areaY = Math.floor(Math.random() * (mazeSize - 4)) + 2;
        
        // Create a 2x2 or 3x3 loop area
        const loopSize = Math.random() < 0.5 ? 2 : 3;
        
        for (let dy = 0; dy < loopSize; dy++) {
            for (let dx = 0; dx < loopSize; dx++) {
                const x = Math.min(areaX + dx, mazeSize - 1);
                const y = Math.min(areaY + dy, mazeSize - 1);
                
                // Remove walls to create open areas (but not all walls)
                if (Math.random() < 0.7) { // 70% chance to remove each wall
                    // Remove right wall if not at boundary
                    if (x < mazeSize - 1 && canRemoveWall(x, y, 1)) {
                        removeWallAtPosition(x, y, 1);
                    }
                    // Remove bottom wall if not at boundary  
                    if (y < mazeSize - 1 && canRemoveWall(x, y, 2)) {
                        removeWallAtPosition(x, y, 2);
                    }
                }
            }
        }
    }
}

// Ensure connectivity by creating additional passages between sections
function ensureConnectivity() {
    // Create horizontal passages at regular intervals
    const horizontalPassages = Math.max(2, Math.floor(mazeSize / 4));
    for (let i = 0; i < horizontalPassages; i++) {
        const y = Math.floor((i + 1) * mazeSize / (horizontalPassages + 1));
        
        // Create passage across the maze
        for (let x = 1; x < mazeSize - 1; x += 2) {
            if (canRemoveWall(x, y, 1)) {
                removeWallAtPosition(x, y, 1);
            }
        }
    }
    
    // Create vertical passages at regular intervals
    const verticalPassages = Math.max(2, Math.floor(mazeSize / 4));
    for (let i = 0; i < verticalPassages; i++) {
        const x = Math.floor((i + 1) * mazeSize / (verticalPassages + 1));
        
        // Create passage across the maze
        for (let y = 1; y < mazeSize - 1; y += 2) {
            if (canRemoveWall(x, y, 2)) {
                removeWallAtPosition(x, y, 2);
            }
        }
    }
    
    // Add diagonal connections to create more complex routing options
    const diagonalConnections = Math.max(3, Math.floor(mazeSize / 3));
    for (let i = 0; i < diagonalConnections; i++) {
        const startX = Math.floor(Math.random() * (mazeSize - 3)) + 1;
        const startY = Math.floor(Math.random() * (mazeSize - 3)) + 1;
        
        // Create short diagonal passages
        for (let step = 0; step < 3 && startX + step < mazeSize - 1 && startY + step < mazeSize - 1; step++) {
            const x = startX + step;
            const y = startY + step;
            
            if (Math.random() < 0.8) { // 80% chance for each step
                // Alternate between right and down movements
                if (step % 2 === 0 && canRemoveWall(x, y, 1)) {
                    removeWallAtPosition(x, y, 1);
                } else if (canRemoveWall(x, y, 2)) {
                    removeWallAtPosition(x, y, 2);
                }
            }
        }
    }
}

// Generate Pac-Man style maze (more open design)
function generatePacmanStyleMaze() {
    // Clear all walls first to start with an open grid
    for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
            maze[i][j].walls = [false, false, false, false];
            maze[i][j].visited = true;
        }
    }
    
    // Create simplified Pac-Man style maze layout
    createSimplePacmanMaze();
    
    // Ensure entrance and exit are clear
    maze[0][0].walls[3] = false; // Remove left wall at entrance
    maze[mazeSize-1][mazeSize-1].walls[1] = false; // Remove right wall at exit
}

// Create simplified Pac-Man maze layout
function createSimplePacmanMaze() {
    // Create the outer boundary walls
    createOuterBoundary();
    
    // Create a simple, playable Pac-Man-like layout
    createSimplePacmanLayout();
}

// Create outer boundary walls
function createOuterBoundary() {
    for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
            // Top boundary
            if (i === 0) maze[i][j].walls[0] = true;
            // Right boundary  
            if (j === mazeSize - 1) maze[i][j].walls[1] = true;
            // Bottom boundary
            if (i === mazeSize - 1) maze[i][j].walls[2] = true;
            // Left boundary
            if (j === 0) maze[i][j].walls[3] = true;
        }
    }
}

// Create simple Pac-Man layout with clear corridors
function createSimplePacmanLayout() {
    const centerX = Math.floor(mazeSize / 2);
    const centerY = Math.floor(mazeSize / 2);
    
    // Only create essential structures for a playable maze
    
    // 1. Create corner blocks (small, simple rectangles)
    createSimpleCornerBlocks();
    
    // 2. Create central area (ghost house) - much smaller
    createSimpleGhostHouse(centerX, centerY);
    
    // 3. Create some strategic barriers for maze complexity
    createStrategicBarriers();
    
    // 4. Create horizontal tunnels if maze is large enough
    if (mazeSize >= 15) {
        createHorizontalTunnels(centerY);
    }
    
    // 5. Ensure main corridors are clear
    ensureMainCorridors();
}

// Create simple corner blocks
function createSimpleCornerBlocks() {
    const blockSize = Math.max(1, Math.floor(mazeSize / 12)); // Much smaller blocks
    const margin = 2; // Stay away from edges
    
    // Only create corner blocks if maze is large enough
    if (mazeSize >= 8) {
        // Top-left corner
        createSimpleBlock(margin, margin, blockSize, blockSize);
        
        // Top-right corner
        createSimpleBlock(margin, mazeSize - margin - blockSize, blockSize, blockSize);
        
        // Bottom-left corner
        createSimpleBlock(mazeSize - margin - blockSize, margin, blockSize, blockSize);
        
        // Bottom-right corner
        createSimpleBlock(mazeSize - margin - blockSize, mazeSize - margin - blockSize, blockSize, blockSize);
    }
}

// Create simple rectangular block
function createSimpleBlock(startY, startX, height, width) {
    for (let i = startY; i < Math.min(startY + height, mazeSize - 1); i++) {
        for (let j = startX; j < Math.min(startX + width, mazeSize - 1); j++) {
            if (i >= 1 && j >= 1) { // Avoid boundary
                addWallBlock(i, j);
            }
        }
    }
}

// Create simple ghost house in center
function createSimpleGhostHouse(centerX, centerY) {
    const houseSize = Math.max(2, Math.floor(mazeSize / 8)); // Smaller house
    
    const startX = centerX - Math.floor(houseSize / 2);
    const startY = centerY - Math.floor(houseSize / 2);
    
    // Create a simple rectangular house with entrance gaps
    for (let i = startY; i < startY + houseSize; i++) {
        for (let j = startX; j < startX + houseSize; j++) {
            if (i >= 1 && i < mazeSize - 1 && j >= 1 && j < mazeSize - 1) {
                // Only create walls on the perimeter, leave center open
                if (i === startY || i === startY + houseSize - 1 || 
                    j === startX || j === startX + houseSize - 1) {
                    // Leave entrance gaps on top and bottom
                    if (!(i === startY && j === centerX) && 
                        !(i === startY + houseSize - 1 && j === centerX)) {
                        addWallBlock(i, j);
                    }
                }
            }
        }
    }
}

// Create strategic barriers to add maze complexity without overdoing it
function createStrategicBarriers() {
    const quarterX = Math.floor(mazeSize / 4);
    const threeQuarterX = Math.floor(3 * mazeSize / 4);
    const quarterY = Math.floor(mazeSize / 4);
    const threeQuarterY = Math.floor(3 * mazeSize / 4);
    
    // Create small barriers only if maze is large enough
    if (mazeSize >= 10) {
        // Upper area barriers
        createSimpleBlock(quarterY, quarterX, 1, 2);
        createSimpleBlock(quarterY, threeQuarterX - 1, 1, 2);
        
        // Lower area barriers
        createSimpleBlock(threeQuarterY, quarterX, 1, 2);
        createSimpleBlock(threeQuarterY, threeQuarterX - 1, 1, 2);
    }
    
    // Add a few scattered single blocks for variety, but sparingly
        if (mazeSize >= 12) {
        const numRandomBlocks = Math.max(2, Math.floor(mazeSize / 8));
        for (let i = 0; i < numRandomBlocks; i++) {
            const randomX = 3 + Math.floor(Math.random() * (mazeSize - 6));
            const randomY = 3 + Math.floor(Math.random() * (mazeSize - 6));
            
            // Only add if not too close to center and not creating isolated areas
            const distanceFromCenter = Math.abs(randomX - Math.floor(mazeSize / 2)) + 
                                     Math.abs(randomY - Math.floor(mazeSize / 2));
            if (distanceFromCenter > 3) {
                addWallBlock(randomY, randomX);
            }
        }
    }
}

// Create horizontal tunnels for larger mazes
function createHorizontalTunnels(centerY) {
    // Left tunnel entrance
    for (let j = 0; j < 2; j++) {
        if (centerY >= 1 && centerY < mazeSize - 1) {
            clearWallsAroundCell(centerY, j);
            maze[centerY][j].walls[3] = false; // Remove left wall for tunnel effect
        }
    }
    
    // Right tunnel entrance
    for (let j = mazeSize - 2; j < mazeSize; j++) {
        if (centerY >= 1 && centerY < mazeSize - 1) {
            clearWallsAroundCell(centerY, j);
            maze[centerY][j].walls[1] = false; // Remove right wall for tunnel effect
        }
    }
}

// Ensure main corridors remain clear for gameplay
function ensureMainCorridors() {
    // Clear main horizontal corridors
    const mainHorizontalRows = [
        Math.floor(mazeSize / 3),
        Math.floor(2 * mazeSize / 3)
    ];
    
    for (const row of mainHorizontalRows) {
        if (row > 0 && row < mazeSize - 1) {
            for (let j = 1; j < mazeSize - 1; j++) {
                // Only clear if not part of a wall block
                if (!hasWallBlock(row, j)) {
                    // Clear walls to ensure corridor
                    if (row > 0) maze[row][j].walls[0] = false; // Top
                    if (row < mazeSize - 1) maze[row][j].walls[2] = false; // Bottom
                }
            }
        }
    }
    
    // Clear main vertical corridors
    const mainVerticalCols = [
        Math.floor(mazeSize / 3),
        Math.floor(2 * mazeSize / 3)
    ];
    
    for (const col of mainVerticalCols) {
        if (col > 0 && col < mazeSize - 1) {
            for (let i = 1; i < mazeSize - 1; i++) {
                // Only clear if not part of a wall block
                if (!hasWallBlock(i, col)) {
                    // Clear walls to ensure corridor
                    if (col > 0) maze[i][col].walls[3] = false; // Left
                    if (col < mazeSize - 1) maze[i][col].walls[1] = false; // Right
                }
            }
        }
    }
}

// Remove the old complex functions - they will be replaced by the simpler approach above

// Helper function to add a wall block
function addWallBlock(y, x) {
    if (y >= 0 && y < mazeSize && x >= 0 && x < mazeSize) {
        // Add walls around this cell to make it a solid block
        maze[y][x].walls = [true, true, true, true];
        
        // Also add walls to adjacent cells to prevent penetration
        if (y > 0) maze[y-1][x].walls[2] = true; // Bottom wall of cell above
        if (x < mazeSize - 1) maze[y][x+1].walls[3] = true; // Left wall of cell to right
        if (y < mazeSize - 1) maze[y+1][x].walls[0] = true; // Top wall of cell below
        if (x > 0) maze[y][x-1].walls[1] = true; // Right wall of cell to left
    }
}

// Helper function to check if a cell is a wall block
function hasWallBlock(y, x) {
    if (y < 0 || y >= mazeSize || x < 0 || x >= mazeSize) return true;
    const walls = maze[y][x].walls;
    return walls[0] && walls[1] && walls[2] && walls[3];
}

// Helper function to clear walls around a cell (make it passable)
function clearWallsAroundCell(y, x) {
    if (y >= 0 && y < mazeSize && x >= 0 && x < mazeSize) {
        maze[y][x].walls = [false, false, false, false];
    }
}

// Helper functions for maze generation
function canRemoveWall(x, y, wall) {
    const directions = [
        {dx: 0, dy: -1}, // up
        {dx: 1, dy: 0},  // right
        {dx: 0, dy: 1},  // down
        {dx: -1, dy: 0}  // left
    ];
    
    const dir = directions[wall];
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    return nx >= 0 && nx < mazeSize && ny >= 0 && ny < mazeSize;
}

function removeWallAtPosition(x, y, wall) {
    const oppositeWalls = [2, 3, 0, 1]; // opposite wall indices
    const directions = [
        {dx: 0, dy: -1}, // up
        {dx: 1, dy: 0},  // right
        {dx: 0, dy: 1},  // down
        {dx: -1, dy: 0}  // left
    ];
    
    maze[y][x].walls[wall] = false;
    
    const dir = directions[wall];
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    
    if (nx >= 0 && nx < mazeSize && ny >= 0 && ny < mazeSize) {
        maze[ny][nx].walls[oppositeWalls[wall]] = false;
    }
}

// Get unvisited neighbors of a cell
function getUnvisitedNeighbors(x, y) {
    const neighbors = [];
    
    // Directions: [up, right, down, left]
    const dx = [0, 1, 0, -1];
    const dy = [-1, 0, 1, 0];
    
    // Shuffle directions for more randomness
    const directions = [0, 1, 2, 3];
    shuffleArray(directions);
    
    // Check each direction in random order
    for (let i = 0; i < 4; i++) {
        const dir = directions[i];
        const newX = x + dx[dir];
        const newY = y + dy[dir];
        
        if (newX >= 0 && newX < mazeSize && 
            newY >= 0 && newY < mazeSize && 
            !maze[newY][newX].visited) {
            neighbors.push({x: newX, y: newY, direction: dir});
        }
    }
    
    return neighbors;
}

// Shuffle array elements using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Remove the wall between two cells
function removeWallBetween(a, b) {
    // Determine which walls to remove based on the direction
    if (b.direction === 0) { // Up
        maze[a.y][a.x].walls[0] = false;
        maze[b.y][b.x].walls[2] = false;
    } else if (b.direction === 1) { // Right
        maze[a.y][a.x].walls[1] = false;
        maze[b.y][b.x].walls[3] = false;
    } else if (b.direction === 2) { // Down
        maze[a.y][a.x].walls[2] = false;
        maze[b.y][b.x].walls[0] = false;
    } else if (b.direction === 3) { // Left
        maze[a.y][a.x].walls[3] = false;
        maze[b.y][b.x].walls[1] = false;
    }
}

// Aran - Geometry and Rendering Functions
// Create all geometry for the game
function createGeometry() {

    
    // Clear existing buffers
    clearBuffers();
    
    // Create geometry for different object types
    createWallsGeometry();
    createPlayerGeometry();
    createPelletsGeometry();
    createPowerPelletsGeometry();
    createGhostsGeometry();
    createParticlesGeometry();
}

function clearBuffers() {
    const buffersToDelete = [
        wallsBuffer, wallsNormalBuffer, wallsColorBuffer, wallsIndexBuffer,
        playerBuffer, playerNormalBuffer, playerColorBuffer, playerIndexBuffer,
        pelletsBuffer, pelletsNormalBuffer, pelletsColorBuffer, pelletsIndexBuffer,
        powerPelletsBuffer, powerPelletsNormalBuffer, powerPelletsColorBuffer, powerPelletsIndexBuffer,
        particlesBuffer, particlesNormalBuffer, particlesColorBuffer, particlesIndexBuffer,
        ghostsBuffer, ghostsNormalBuffer, ghostsColorBuffer, ghostsIndexBuffer
    ];
    
    buffersToDelete.forEach(buffer => {
        if (buffer) gl.deleteBuffer(buffer);
    });
}

// Create player sphere geometry
function createPlayerGeometry() {
    if (!gameState.isPlaying) {
        playerVertexCount = 0;
        return;
    }
    
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    
    // Create sphere for player
    createSphere(
        vertices, normals, colors, indices,
        player.worldX, wallHeight/2 + player.radius, player.worldZ,
        player.radius, vec4(0.0, 0.0, 1.0, 1.0), 0 // Blue player
    );
    
    // Set up buffers
    playerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, playerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    playerNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, playerNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    playerColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, playerColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    playerIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, playerIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    playerVertexCount = indices.length;
}

// Create pellets geometry
function createPelletsGeometry() {
    if (!gameState.isPlaying || pellets.length === 0) {
        pelletsCount = 0;
        return;
    }
    
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let indexOffset = 0;
    
    for (let pellet of pellets) {
        if (!pellet.collected) {
            createSphere(
                vertices, normals, colors, indices,
                pellet.worldX, wallHeight/2 + pelletRadius, pellet.worldZ,
                pelletRadius, vec4(1.0, 1.0, 0.0, 1.0), indexOffset // Yellow pellets
            );
            indexOffset += getSphereVertexCount();
        }
    }
    
    if (vertices.length === 0) {
        pelletsCount = 0;
        return;
    }
    
    // Set up buffers
    pelletsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    pelletsNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    pelletsColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    pelletsIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pelletsIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    pelletsCount = indices.length;
}

// Create power pellets geometry
function createPowerPelletsGeometry() {
    if (!gameState.isPlaying || powerPellets.length === 0) {
        powerPelletsCount = 0;
        return;
    }
    
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let indexOffset = 0;
    
    for (let powerPellet of powerPellets) {
        if (!powerPellet.collected) {
            createSphere(
                vertices, normals, colors, indices,
                powerPellet.worldX, wallHeight/2 + powerPelletRadius, powerPellet.worldZ,
                powerPelletRadius, powerPellet.color, indexOffset // Colored power pellets
            );
            indexOffset += getSphereVertexCount();
        }
    }
    
    if (vertices.length === 0) {
        powerPelletsCount = 0;
        return;
    }
    
    // Set up buffers
    powerPelletsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    powerPelletsNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    powerPelletsColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    powerPelletsIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, powerPelletsIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    powerPelletsCount = indices.length;
}

// Create ghosts geometry
function createGhostsGeometry() {
    if (!gameState.isPlaying || ghosts.length === 0) {
        ghostsCount = 0;
        return;
    }
    
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let indexOffset = 0;
    
    for (let ghost of ghosts) {
        // Only render ghosts that are not in respawning state or show them semi-transparent
        let ghostColor = ghost.color;
        if (ghost.isRespawning && ghost.state === GHOST_STATES.RESPAWNING) {
            // Make respawning ghosts semi-transparent
            ghostColor = vec4(ghost.color[0], ghost.color[1], ghost.color[2], 0.3);
        }
        
        createSphere(
            vertices, normals, colors, indices,
            ghost.worldX, wallHeight/2 + ghostRadius, ghost.worldZ,
            ghostRadius, ghostColor, indexOffset
        );
        indexOffset += getSphereVertexCount();
    }
    
    // Set up buffers
    ghostsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    ghostsNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    ghostsColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    ghostsIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ghostsIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    ghostsCount = indices.length;
}

// Create a sphere (used for player, pellets, and ghosts)
function createSphere(vertices, normals, colors, indices, x, y, z, radius, color, indexOffset) {
    const latBands = 8;
    const longBands = 8;
    
    // Generate vertices
    for (let lat = 0; lat <= latBands; lat++) {
        const theta = lat * Math.PI / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        
        for (let long = 0; long <= longBands; long++) {
            const phi = long * 2 * Math.PI / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            
            const vx = cosPhi * sinTheta;
            const vy = cosTheta;
            const vz = sinPhi * sinTheta;
            
            vertices.push(vec4(x + radius * vx, y + radius * vy, z + radius * vz, 1.0));
            normals.push(vec4(vx, vy, vz, 0.0));
            colors.push(color);
        }
    }
    
    // Generate indices
    for (let lat = 0; lat < latBands; lat++) {
        for (let long = 0; long < longBands; long++) {
            const first = (lat * (longBands + 1)) + long;
            const second = first + longBands + 1;
            
            indices.push(
                first + indexOffset,
                second + indexOffset,
                first + 1 + indexOffset,
                
                second + indexOffset,
                second + 1 + indexOffset,
                first + 1 + indexOffset
            );
        }
    }
}

function getSphereVertexCount() {
    const latBands = 8;
    const longBands = 8;
    return (latBands + 1) * (longBands + 1);
}

// Create the geometry for the maze walls
function createWallsGeometry() {
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    
    let indexOffset = 0;
    
    // Calculate maze center offset
    const offsetX = -((mazeSize * cellSize) / 2);
    const offsetZ = -((mazeSize * cellSize) / 2);
    
    // Create walls for each cell
    for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
            const x = j * cellSize + offsetX;
            const z = i * cellSize + offsetZ;
            
            // Create each wall if it exists
            if (maze[i][j].walls[0]) { // Top wall
                createWall(
                    vertices, normals, colors, indices,
                    x, 0, z,
                    x + cellSize, 0, z,
                    indexOffset
                );
                indexOffset += 8; // 8 vertices per wall
            }
            
            if (maze[i][j].walls[1]) { // Right wall
                createWall(
                    vertices, normals, colors, indices,
                    x + cellSize, 0, z,
                    x + cellSize, 0, z + cellSize,
                    indexOffset
                );
                indexOffset += 8;
            }
            
            if (maze[i][j].walls[2]) { // Bottom wall
                createWall(
                    vertices, normals, colors, indices,
                    x, 0, z + cellSize,
                    x + cellSize, 0, z + cellSize,
                    indexOffset
                );
                indexOffset += 8;
            }
            
            if (maze[i][j].walls[3]) { // Left wall
                createWall(
                    vertices, normals, colors, indices,
                    x, 0, z,
                    x, 0, z + cellSize,
                    indexOffset
                );
                indexOffset += 8;
            }
        }
    }
    
    // Create floor
    const floorSize = mazeSize * cellSize;
    createFloor(
        vertices, normals, colors, indices,
        offsetX, -wallHeight/2, offsetZ,
        floorSize, wallHeight/2, floorSize,
        indexOffset
    );
    
    // Set up buffer objects
    wallsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    wallsNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    wallsColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    wallsIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wallsIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    wallsCount = indices.length;
}

// Create a wall segment
function createWall(vertices, normals, colors, indices, x1, y, z1, x2, y, z2, indexOffset) {
    // Calculate the direction of the wall
    const isHorizontal = z1 === z2;
    
    // Set up vertices for a 3D wall
    if (isHorizontal) {
        // Horizontal wall (along x-axis)
        vertices.push(
            vec4(x1, y, z1, 1.0),                           // 0: bottom left
            vec4(x2, y, z2, 1.0),                           // 1: bottom right
            vec4(x2, y + wallHeight, z2, 1.0),              // 2: top right
            vec4(x1, y + wallHeight, z1, 1.0),              // 3: top left
            vec4(x1, y, z1 - wallThickness, 1.0),           // 4: back bottom left
            vec4(x2, y, z2 - wallThickness, 1.0),           // 5: back bottom right
            vec4(x2, y + wallHeight, z2 - wallThickness, 1.0), // 6: back top right
            vec4(x1, y + wallHeight, z1 - wallThickness, 1.0)  // 7: back top left
        );
        
        // Normals
        normals.push(vec4(0, 0, 1, 0));  // Front face
        normals.push(vec4(0, 0, 1, 0));
        normals.push(vec4(0, 0, 1, 0));
        normals.push(vec4(0, 0, 1, 0));
        normals.push(vec4(0, 0, -1, 0)); // Back face
        normals.push(vec4(0, 0, -1, 0));
        normals.push(vec4(0, 0, -1, 0));
        normals.push(vec4(0, 0, -1, 0));
    } else {
        // Vertical wall (along z-axis)
        vertices.push(
            vec4(x1, y, z1, 1.0),                           // 0: bottom left
            vec4(x1, y, z2, 1.0),                           // 1: bottom right
            vec4(x1, y + wallHeight, z2, 1.0),              // 2: top right
            vec4(x1, y + wallHeight, z1, 1.0),              // 3: top left
            vec4(x1 - wallThickness, y, z1, 1.0),           // 4: back bottom left
            vec4(x1 - wallThickness, y, z2, 1.0),           // 5: back bottom right
            vec4(x1 - wallThickness, y + wallHeight, z2, 1.0), // 6: back top right
            vec4(x1 - wallThickness, y + wallHeight, z1, 1.0)  // 7: back top left
        );
        
        // Normals
        normals.push(vec4(1, 0, 0, 0));  // Front face
        normals.push(vec4(1, 0, 0, 0));
        normals.push(vec4(1, 0, 0, 0));
        normals.push(vec4(1, 0, 0, 0));
        normals.push(vec4(-1, 0, 0, 0)); // Back face
        normals.push(vec4(-1, 0, 0, 0));
        normals.push(vec4(-1, 0, 0, 0));
        normals.push(vec4(-1, 0, 0, 0));
    }
    
    // Colors (gray for walls)
    const wallColor = vec4(0.7, 0.7, 0.7, 1.0); // Brighter gray for better visibility
    for (let i = 0; i < 8; i++) {
        colors.push(wallColor);
    }
    
    // Indices for all faces
    const faces = [
        [0, 1, 2, 3],     // Front face
        [4, 5, 6, 7],     // Back face
        [3, 2, 6, 7],     // Top face
        [0, 1, 5, 4],     // Bottom face
        [1, 2, 6, 5],     // Right face
        [0, 3, 7, 4]      // Left face
    ];
    
    // Add indices for each face
    for (const face of faces) {
        indices.push(
            face[0] + indexOffset,
            face[1] + indexOffset,
            face[2] + indexOffset,
            face[0] + indexOffset,
            face[2] + indexOffset,
            face[3] + indexOffset
        );
    }
}

// Create a floor
function createFloor(vertices, normals, colors, indices, x, y, z, width, height, depth, indexOffset) {
    // Vertices for the floor
    vertices.push(
        vec4(x, y, z, 1.0),                    // 0: bottom front left
        vec4(x + width, y, z, 1.0),            // 1: bottom front right
        vec4(x + width, y, z + depth, 1.0),    // 2: bottom back right
        vec4(x, y, z + depth, 1.0),            // 3: bottom back left
        vec4(x, y + height, z, 1.0),           // 4: top front left
        vec4(x + width, y + height, z, 1.0),   // 5: top front right
        vec4(x + width, y + height, z + depth, 1.0), // 6: top back right
        vec4(x, y + height, z + depth, 1.0)    // 7: top back left
    );
    
    // Normals
    // Top face
    normals.push(vec4(0, 1, 0, 0));
    normals.push(vec4(0, 1, 0, 0));
    normals.push(vec4(0, 1, 0, 0));
    normals.push(vec4(0, 1, 0, 0));
    // Bottom face
    normals.push(vec4(0, -1, 0, 0));
    normals.push(vec4(0, -1, 0, 0));
    normals.push(vec4(0, -1, 0, 0));
    normals.push(vec4(0, -1, 0, 0));
    
    // Colors (dark gray for the floor)
    const floorColor = vec4(0.3, 0.3, 0.3, 1.0);
    for (let i = 0; i < 8; i++) {
        colors.push(floorColor);
    }
    
    // Indices for the top face (only rendering top face)
    indices.push(
        4 + indexOffset,
        5 + indexOffset,
        6 + indexOffset,
        4 + indexOffset,
        6 + indexOffset,
        7 + indexOffset
    );
}

// Update the camera position based on the camera angle
function updateCamera() {
    // Convert angle to radians (0° = top view, 90° = side view)
    const rad = cameraAngle * Math.PI / 180.0;
    
    // Calculate camera position with elevation change
    // At 0°: camera is slightly angled above to see walls
    // At 90°: camera is at side level
    // Distance scales with maze size to keep entire maze visible
    const baseDistance = 3.0;
    const distance = baseDistance + (mazeSize - 10) * 0.2; // Scale distance with maze size
    
    // Add a small offset at 0° to ensure walls are visible
    const minAngleOffset = 0.1; // Minimum angle to see walls (about 6 degrees)
    const adjustedRad = Math.max(rad, minAngleOffset);
    
    eye = vec3(
        distance * Math.sin(adjustedRad), // X position: small value at top, max at side
        distance * Math.cos(adjustedRad), // Y position: slightly less than max at top, 0 at side
        0                                 // Z position: always 0 (looking along Z-axis)
    );
    
    // Always look at the center of the maze
    at = vec3(0, 0, 0);
    
    // Simple, consistent up vector
    // Always point "up" in the world Y direction
    up = vec3(0, 1, 0);
}

// Main render loop
function render(timestamp) {
    // Calculate time delta
    if (!lastTime) {
        lastTime = timestamp || 0;
    }
    deltaTime = (timestamp - lastTime) / 1000.0; // Convert to seconds
    lastTime = timestamp;
    
    // Update game systems
    if (gameState.isPlaying) {
        handlePlayerInput();
        updatePlayerAnimation();
        updateGhosts();
        updatePowerUps();
        updateParticles(); // Update particle system
        
        // Update dynamic geometry if needed
        if (player.moving) {
            createPlayerGeometry();
        }
        
        // Update ghost geometry if any ghost is moving
        let ghostsMoving = ghosts.some(ghost => ghost.moving);
        if (ghostsMoving) {
            createGhostsGeometry();
        }
        
        // Update particle geometry every frame (particles are always changing)
        createParticlesGeometry();
    }
    
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Update camera position
    updateCamera(); 
    
    // Set up matrices
    const modelViewMatrix = lookAt(eye, at, up);
    const projectionMatrix = perspective(45, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
    
    // Set uniform matrices
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "modelViewMatrix"), false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
    
    // Set up normal matrix
    const normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    gl.uniformMatrix3fv(gl.getUniformLocation(program, "normalMatrix"), false, flatten(normalMatrix));
    
    // Set up lighting
    const ambientProduct = mult(ambientColor, materialAmbient);
    const diffuseProduct = mult(diffuseColor, materialDiffuse);
    const specularProduct = mult(specularColor, materialSpecular);
    
    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);
    gl.uniform1f(gl.getUniformLocation(program, "brightness"), brightness);
    
    // Render all objects
    drawWalls();
    drawPlayer();
    drawPellets();
    drawPowerPellets();
    drawGhosts();
    drawParticles();
    
    // Request next frame
    requestAnimationFrame(render);
}

// Draw player sphere
function drawPlayer() {
    if (!gameState.isPlaying || playerVertexCount === 0) return;
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, playerBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, playerNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, playerColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, playerIndexBuffer);
    gl.drawElements(gl.TRIANGLES, playerVertexCount, gl.UNSIGNED_SHORT, 0);
}

// Draw pellets
function drawPellets() {
    if (!gameState.isPlaying || pelletsCount === 0) return;
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, pelletsColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pelletsIndexBuffer);
    gl.drawElements(gl.TRIANGLES, pelletsCount, gl.UNSIGNED_SHORT, 0);
}

// Draw power pellets
function drawPowerPellets() {
    if (!gameState.isPlaying || powerPelletsCount === 0) return;
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, powerPelletsColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, powerPelletsIndexBuffer);
    gl.drawElements(gl.TRIANGLES, powerPelletsCount, gl.UNSIGNED_SHORT, 0);
}

// Draw ghosts
function drawGhosts() {
    if (!gameState.isPlaying || ghostsCount === 0) return;
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, ghostsColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ghostsIndexBuffer);
    gl.drawElements(gl.TRIANGLES, ghostsCount, gl.UNSIGNED_SHORT, 0);
}

// Draw the maze walls
function drawWalls() {
    if (wallsCount === 0) return;
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, wallsColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wallsIndexBuffer);
    gl.drawElements(gl.TRIANGLES, wallsCount, gl.UNSIGNED_SHORT, 0);
} 

// Nairran - Player Movement and Controls
// Player movement and game logic
function updatePlayerWorldPosition() {
    const offsetX = -((mazeSize * cellSize) / 2);
    const offsetZ = -((mazeSize * cellSize) / 2);
    player.worldX = player.x * cellSize + offsetX + cellSize / 2;
    player.worldZ = player.y * cellSize + offsetZ + cellSize / 2;
}

function handlePlayerInput() {
    if (!gameState.isPlaying) return;
    
    // Handle manual respawn (Q key) - only works when waiting for respawn
    if (keys.q && gameState.waitingForRespawn) {
        const respawnSuccess = activateManualRespawn();
        if (respawnSuccess) {
            keys.q = false; // Prevent continuous activation
        }
        return; // Skip movement processing when handling respawn
    }
    
    // Prevent all movement if player is waiting for respawn (must press Q first)
    if (gameState.waitingForRespawn) {

        return;
    }
    
    // Allow input even during movement for more responsive controls
    let newX = player.x;
    let newY = player.y;
    
    // If currently moving, use target position for next move calculation
    if (player.moving) {
        newX = player.targetX;
        newY = player.targetY;
    }
    
    let nextX = newX;
    let nextY = newY;
    
    // Corrected WASD mapping to match 3D world coordinates:
    // W/S should control Z-axis (forward/backward in world)
    // A/D should control X-axis (left/right in world)
    if (keys.d && newY > 0 && !maze[newY][newX].walls[0]) {
        nextY = newY - 1; // W = move forward (decrease Y, which maps to -Z in world)
    } else if (keys.a && newY < mazeSize - 1 && !maze[newY][newX].walls[2]) {
        nextY = newY + 1; // S = move backward (increase Y, which maps to +Z in world)
    } else if (keys.w && newX > 0 && !maze[newY][newX].walls[3]) {
        nextX = newX - 1; // A = move left (decrease X, which maps to -X in world)
    } else if (keys.s && newX < mazeSize - 1 && !maze[newY][newX].walls[1]) {
        nextX = newX + 1; // D = move right (increase X, which maps to +X in world)
    }
    // Additional safety check: validate the target position is actually accessible
    if (nextX !== newX || nextY !== newY) {
        // Double-check that the target cell exists and is valid
        if (nextX >= 0 && nextX < mazeSize && nextY >= 0 && nextY < mazeSize) {
            // Verify there's no wall blocking this specific movement
            const canMove = validateMovement(newX, newY, nextX, nextY);
            if (!canMove) {
                // Reset to current position if movement is invalid
                nextX = newX;
                nextY = newY;
            }
        } else {
            // Out of bounds, reset to current position
            nextX = newX;
            nextY = newY;
        }
    }
    
    // Check if player is stuck (no valid moves available) when not moving
    if (!player.moving && (keys.w || keys.a || keys.s || keys.d)) {
        const hasValidMoves = checkPlayerHasValidMoves(newX, newY);
        if (!hasValidMoves) {

            emergencyPlayerRescue();
            return;
        }
    }
    
    // Handle power-up activation
    if (keys.space && !dashSystem.active && dashSystem.cooldownTimeLeft <= 0) {
        activateDash();
        keys.space = false; // Prevent continuous activation
    }
    
    // Handle camera reset
    if (keys.r) {
        cameraAngle = originalCameraAngle;
        document.getElementById("cameraAngle").value = cameraAngle;
        document.getElementById("angleValue").textContent = cameraAngle;
        keys.r = false;
    }
    
    // Handle overhead view activation (V key)
    if (keys.v && !overheadViewSystem.active && overheadViewSystem.cooldownTimeLeft <= 0) {
        activateOverheadView();
        keys.v = false; // Prevent continuous activation
    }
    
    // Only start new movement if not currently moving and position actually changed
    if ((nextX !== newX || nextY !== newY) && !player.moving) {
        movePlayer(nextX, nextY);
    }
}

// Check if the player has any valid moves from their current position
function checkPlayerHasValidMoves(x, y) {
    // Check all four directions
    const directions = [
        {dx: 0, dy: -1, wall: 0}, // Up
        {dx: 1, dy: 0, wall: 1},  // Right
        {dx: 0, dy: 1, wall: 2},  // Down
        {dx: -1, dy: 0, wall: 3}  // Left
    ];
    
    for (const dir of directions) {
        const newX = x + dir.dx;
        const newY = y + dir.dy;
        
        // Check bounds
        if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
            // Check if there's no wall blocking this direction
            if (!maze[y][x].walls[dir.wall]) {
                return true; // Found at least one valid move
            }
        }
    }
    
    return false; // No valid moves found
}

function movePlayer(newX, newY) {
    // Safety check: ensure the target position is valid before starting movement
    if (!isValidPlayerPosition(newX, newY)) {

        return;
    }
    
    player.moving = true;
    player.targetX = newX;
    player.targetY = newY;
    player.animationProgress = 0;
}

// Check if a position is valid for the player (not out of bounds, accessible)
function isValidPlayerPosition(x, y) {
    // Check bounds
    if (x < 0 || x >= mazeSize || y < 0 || y >= mazeSize) {
        return false;
    }
    
    // Check if the cell is accessible (not completely surrounded by walls)
    const cell = maze[y][x];
    const wallCount = cell.walls.filter(wall => wall).length;
    
    // If all 4 walls are present, the cell is inaccessible
    if (wallCount >= 4) {
        return false;
    }
    
    return true;
}

// Emergency function to move player to a safe position if they get stuck
function emergencyPlayerRescue() {

    
    // Try to find a nearby safe position
    const searchRadius = 3;
    for (let radius = 1; radius <= searchRadius; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (Math.abs(dx) + Math.abs(dy) === radius) { // Only check cells at current radius
                    const testX = player.x + dx;
                    const testY = player.y + dy;
                    
                    if (isValidPlayerPosition(testX, testY)) {

                        player.x = testX;
                        player.y = testY;
                        player.moving = false;
                        player.animationProgress = 0;
                        updatePlayerWorldPosition();
                        createPlayerGeometry();
                        return true;
                    }
                }
            }
        }
    }
    
    // If no nearby safe position found, move to starting position

    player.x = 0;
    player.y = 0;
    player.moving = false;
    player.animationProgress = 0;
    updatePlayerWorldPosition();
    createPlayerGeometry();
    return true;
}

function updatePlayerAnimation() {
    if (!player.moving) return;
    
    player.animationProgress += deltaTime * player.speed;
    
    if (player.animationProgress >= 1.0) {
        // Animation complete
        player.x = player.targetX;
        player.y = player.targetY;
        player.moving = false;
        player.animationProgress = 0;
        
        // Safety check: verify the player ended up in a valid position
        if (!isValidPlayerPosition(player.x, player.y)) {

            emergencyPlayerRescue();
            return;
        }
        
        updatePlayerWorldPosition();
        checkPelletCollection();
        checkPowerPelletCollection();
        checkGhostCollision();
        
        // Check win condition
        if (gameState.pelletsCollected >= gameState.totalPellets) {
            gameWin();
        }
    } else {
        // Interpolate position
        const t = player.animationProgress;
        const startX = player.x;
        const startY = player.y;
        const endX = player.targetX;
        const endY = player.targetY;
        
        const currentX = startX + (endX - startX) * t;
        const currentY = startY + (endY - startY) * t;
        
        const offsetX = -((mazeSize * cellSize) / 2);
        const offsetZ = -((mazeSize * cellSize) / 2);
        player.worldX = currentX * cellSize + offsetX + cellSize / 2;
        player.worldZ = currentY * cellSize + offsetZ + cellSize / 2;
    }
}

// Nairran - Pellet Collection System
// Pellet system
function generatePellets() {
    pellets = [];
    gameState.totalPellets = 0;
    
    for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
            // Skip player starting position and ghost spawn areas
            if ((i === 0 && j === 0) || isGhostSpawnArea(j, i)) {
                continue;
            }
            
            // Place pellets in open areas (cells without all walls)
            const cell = maze[i][j];
            const wallCount = cell.walls.filter(wall => wall).length;
            
            if (wallCount < 4 && Math.random() < 0.8) {
                const offsetX = -((mazeSize * cellSize) / 2);
                const offsetZ = -((mazeSize * cellSize) / 2);
                
                pellets.push({
                    x: j,
                    y: i,
                    worldX: j * cellSize + offsetX + cellSize / 2,
                    worldZ: i * cellSize + offsetZ + cellSize / 2,
                    collected: false
                });
                
                maze[i][j].hasPellet = true;
                gameState.totalPellets++;
            }
        }
    }
}

function checkPelletCollection() {
    for (let pellet of pellets) {
        if (!pellet.collected && pellet.x === player.x && pellet.y === player.y) {
            pellet.collected = true;
            maze[pellet.y][pellet.x].hasPellet = false;
            gameState.pelletsCollected++;
            gameState.score += 10;
            
            // Reset pellet collection timer and brightness decay
            gameState.lastPelletCollectionTime = Date.now();
            gameState.brightnessDecayActive = false;
            
            // Reset brightness to 2.0 when pellet is collected
            brightness = 2.0;
            document.getElementById("brightness").value = brightness;
            document.getElementById("brightnessValue").textContent = parseFloat(brightness).toFixed(1);
            
            // Create particle effect for pellet collection
            createParticleEffect(
                PARTICLE_TYPES.PELLET_COLLECT,
                pellet.worldX,
                wallHeight/2 + pelletRadius,
                pellet.worldZ
            );
            
            updateUI();
            
            // Recreate pellet geometry
            createPelletsGeometry();
            break;
        }
    }
}

// Shuja - Ghost AI and Pathfinding
// Ghost system
function generateGhosts() {
    ghosts = [];
    const numGhosts = Math.min(4, Math.floor(mazeSize / 5) + 1);
    
    const colors = [
        vec4(1.0, 0.0, 0.0, 1.0), // Red
        vec4(1.0, 0.5, 1.0, 1.0), // Pink
        vec4(0.0, 1.0, 1.0, 1.0), // Cyan
        vec4(1.0, 0.5, 0.0, 1.0)  // Orange
    ];
    
    // Enhanced AI behaviors using A* pathfinding
    const behaviors = ['chase', 'scatter', 'ambush', 'random'];
    
    // Define safe spawn zones (far from player start at 0,0)
    const minDistanceFromPlayer = Math.max(5, Math.floor(mazeSize / 3));
    
    for (let i = 0; i < numGhosts; i++) {
        let spawnX, spawnY;
        let attempts = 0;
        let distanceFromPlayer = 0;
        
        // Find valid spawn position far away from player and not in wall blocks
        do {
            spawnX = Math.floor(Math.random() * mazeSize);
            spawnY = Math.floor(Math.random() * mazeSize);
            distanceFromPlayer = Math.abs(spawnX - 0) + Math.abs(spawnY - 0); // Manhattan distance from player start
            attempts++;
            
            // If we can't find a good spot after many attempts, try corners first
            if (attempts > 100) {
                const corners = [
                    {x: mazeSize - 1, y: mazeSize - 1}, // Bottom right
                    {x: 0, y: mazeSize - 1},           // Bottom left  
                    {x: mazeSize - 1, y: 0},           // Top right
                ];
                const corner = corners[i % corners.length];
                spawnX = corner.x;
                spawnY = corner.y;
                distanceFromPlayer = Math.abs(spawnX - 0) + Math.abs(spawnY - 0);
                
                // Validate corner positions too
                if (!hasWallBlock(spawnY, spawnX) && isValidPlayerPosition(spawnX, spawnY)) {
                break;
            }
            }
        } while ((distanceFromPlayer < minDistanceFromPlayer || 
                 hasWallBlock(spawnY, spawnX) || 
                 !isValidPlayerPosition(spawnX, spawnY)) && 
                 attempts < 200); // Increased attempts to find valid positions
        
        // Final safety check - if still in wall block, find any valid position
        if (hasWallBlock(spawnY, spawnX) || !isValidPlayerPosition(spawnX, spawnY)) {

            let foundValidPosition = false;
            
            // Search for any valid position
            for (let y = 1; y < mazeSize - 1 && !foundValidPosition; y++) {
                for (let x = 1; x < mazeSize - 1 && !foundValidPosition; x++) {
                    if (!hasWallBlock(y, x) && isValidPlayerPosition(x, y)) {
                        spawnX = x;
                        spawnY = y;
                        foundValidPosition = true;

                    }
                }
            }
            
            if (!foundValidPosition) {

                spawnX = 1;
                spawnY = 1;
            }
        }
        
        const offsetX = -((mazeSize * cellSize) / 2);
        const offsetZ = -((mazeSize * cellSize) / 2);
        
        ghosts.push({
            x: spawnX,
            y: spawnY,
            spawnX: spawnX,  // Store original spawn position
            spawnY: spawnY,  // Store original spawn position
            worldX: spawnX * cellSize + offsetX + cellSize / 2,
            worldZ: spawnY * cellSize + offsetZ + cellSize / 2,
            targetX: spawnX,
            targetY: spawnY,
            moving: false,
            animationProgress: 0,
            color: colors[i % colors.length],
            originalColor: colors[i % colors.length], // Store original color
            behavior: behaviors[i % behaviors.length],
            state: GHOST_STATES.NORMAL, // Add ghost state
            speed: GHOST_SPEEDS.NORMAL, // Add speed based on state
            lastMoveTime: Date.now() + (i * 200), // Stagger initial movement by 200ms instead of 1000ms
            moveInterval: 400 + Math.random() * 200, // Much faster initial movement (0.4-0.6 seconds)
            direction: Math.floor(Math.random() * 4),
            pathfindingCooldown: 0,
            initialGracePeriod: 1500 + (i * 300), // Reduced grace period: 1.5-2.7 seconds instead of 3-5
            spawnTime: Date.now(), // Track when ghost was spawned
            respawnTimer: 0, // Timer for respawning after being eaten
            isRespawning: false // Flag to track respawn state
        });
        

    }
}

function updateGhosts() {
    if (!gameState.isPlaying) return;
    
    for (let ghost of ghosts) {
        updateGhostRespawn(ghost);
        updateGhostMovement(ghost);
        updateGhostAnimation(ghost);
    }
}

// Update ghost respawn timer and handle respawning
function updateGhostRespawn(ghost) {
    if (ghost.isRespawning && ghost.respawnTimer > 0) {
        ghost.respawnTimer -= deltaTime * 1000;
        
        // Check if respawn time is up
        if (ghost.respawnTimer <= 0) {
            // Respawn the ghost
            ghost.isRespawning = false;
            ghost.respawnTimer = 0;
            
            // Check if power mode is still active and set appropriate state
            if (powerMode.active) {
                ghost.state = GHOST_STATES.FRIGHTENED;
                ghost.color = vec4(0.0, 0.0, 1.0, 1.0); // Blue when frightened
                ghost.speed = GHOST_SPEEDS.FRIGHTENED;

            } else {
            ghost.state = GHOST_STATES.NORMAL;
            ghost.color = ghost.originalColor;
            ghost.speed = GHOST_SPEEDS.NORMAL;

            }
            
            // Reset position to spawn point
            ghost.x = ghost.spawnX;
            ghost.y = ghost.spawnY;
            ghost.targetX = ghost.spawnX;
            ghost.targetY = ghost.spawnY;
            ghost.moving = false;
            ghost.animationProgress = 0;
            
            // Update world position
            const offsetX = -((mazeSize * cellSize) / 2);
            const offsetZ = -((mazeSize * cellSize) / 2);
            ghost.worldX = ghost.x * cellSize + offsetX + cellSize / 2;
            ghost.worldZ = ghost.y * cellSize + offsetZ + cellSize / 2;
            

            
            // Create respawn particle effect
            createParticleEffect(
                PARTICLE_TYPES.POWER_MODE_START, // Reuse white particles for respawn effect
                ghost.worldX,
                wallHeight/2 + ghostRadius,
                ghost.worldZ
            );
        }
    }
}

// Shuja - AI Pathfinding Algorithms
// A* Pathfinding Algorithm for Ghost AI
function aStarPathfinding(startX, startY, goalX, goalY) {
    // Add debug logging for pathfinding attempts
    const debugPathfinding = Math.random() < 0.05; // Debug 5% of pathfinding attempts
    if (debugPathfinding) {

    }
    
    // Node structure for A* algorithm
    function Node(x, y, g, h, parent) {
        this.x = x;
        this.y = y;
        this.g = g; // Cost from start
        this.h = h; // Heuristic cost to goal
        this.f = g + h; // Total cost
        this.parent = parent;
    }
    
    // Heuristic function (Manhattan distance)
    function heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    // Check if coordinates are valid and passable
    function isValidPosition(x, y) {
        return x >= 0 && x < mazeSize && y >= 0 && y < mazeSize;
    }
    
    // Check if there's a wall between two adjacent cells
    function canMoveBetween(fromX, fromY, toX, toY) {
        if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
            return false;
        }
        
        // Check if destination is a wall block
        if (hasWallBlock(toY, toX)) {
            return false;
        }
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        
        // Check wall based on direction
        if (dx === 1) return !maze[fromY][fromX].walls[1]; // Moving right
        if (dx === -1) return !maze[fromY][fromX].walls[3]; // Moving left
        if (dy === 1) return !maze[fromY][fromX].walls[2]; // Moving down
        if (dy === -1) return !maze[fromY][fromX].walls[0]; // Moving up
        
        return false;
    }
    
    const openList = [];
    const closedList = [];
    const openSet = new Set();
    const closedSet = new Set();
    
    // Add start node to open list
    const startNode = new Node(startX, startY, 0, heuristic(startX, startY, goalX, goalY), null);
    openList.push(startNode);
    openSet.add(`${startX},${startY}`);
    
    let iterations = 0;
    const maxIterations = mazeSize * mazeSize; // Prevent infinite loops
    
    while (openList.length > 0 && iterations < maxIterations) {
        iterations++;
        
        // Find node with lowest f cost
        let currentIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[currentIndex].f) {
                currentIndex = i;
            }
        }
        
        const currentNode = openList.splice(currentIndex, 1)[0];
        openSet.delete(`${currentNode.x},${currentNode.y}`);
        closedList.push(currentNode);
        closedSet.add(`${currentNode.x},${currentNode.y}`);
        
        // Check if we reached the goal
        if (currentNode.x === goalX && currentNode.y === goalY) {
            const path = [];
            let node = currentNode;
            while (node) {
                path.unshift({x: node.x, y: node.y});
                node = node.parent;
            }
            if (debugPathfinding) {

            }
            return path;
        }
        
        // Check all neighbors
        const neighbors = [
            {x: currentNode.x, y: currentNode.y - 1}, // Up
            {x: currentNode.x + 1, y: currentNode.y}, // Right
            {x: currentNode.x, y: currentNode.y + 1}, // Down
            {x: currentNode.x - 1, y: currentNode.y}  // Left
        ];
        
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (!isValidPosition(neighbor.x, neighbor.y) || 
                closedSet.has(neighborKey) ||
                !canMoveBetween(currentNode.x, currentNode.y, neighbor.x, neighbor.y)) {
                continue;
            }
            
            const g = currentNode.g + 1;
            const h = heuristic(neighbor.x, neighbor.y, goalX, goalY);
            
            // Check if this path to neighbor is better
            let existingNode = null;
            for (const node of openList) {
                if (node.x === neighbor.x && node.y === neighbor.y) {
                    existingNode = node;
                    break;
                }
            }
            
            if (!existingNode) {
                // Add new node to open list
                const newNode = new Node(neighbor.x, neighbor.y, g, h, currentNode);
                openList.push(newNode);
                openSet.add(neighborKey);
            } else if (g < existingNode.g) {
                // Update existing node with better path
                existingNode.g = g;
                existingNode.f = g + existingNode.h;
                existingNode.parent = currentNode;
            }
        }
    }
    
    // No path found
    if (debugPathfinding) {

    }
    return null;
}

function updateGhostMovement(ghost) {
    if (ghost.moving) return;
    
    // Don't move if ghost is respawning
    if (ghost.isRespawning) return;
    
    // Emergency check: if ghost is in a wall block, move it to a safe position
    if (hasWallBlock(ghost.y, ghost.x)) {

        
        // Try to find a nearby safe position
        let rescueSuccessful = false;
        for (let radius = 1; radius <= 3 && !rescueSuccessful; radius++) {
            for (let dy = -radius; dy <= radius && !rescueSuccessful; dy++) {
                for (let dx = -radius; dx <= radius && !rescueSuccessful; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) === radius) { // Check cells at current radius
                        const testX = ghost.x + dx;
                        const testY = ghost.y + dy;
                        
                        if (testX >= 0 && testX < mazeSize && testY >= 0 && testY < mazeSize &&
                            !hasWallBlock(testY, testX) && isValidPlayerPosition(testX, testY)) {
                            

                            ghost.x = testX;
                            ghost.y = testY;
                            ghost.targetX = testX;
                            ghost.targetY = testY;
                            ghost.moving = false;
                            ghost.animationProgress = 0;
                            
                            // Update world position
                            const offsetX = -((mazeSize * cellSize) / 2);
                            const offsetZ = -((mazeSize * cellSize) / 2);
                            ghost.worldX = ghost.x * cellSize + offsetX + cellSize / 2;
                            ghost.worldZ = ghost.y * cellSize + offsetZ + cellSize / 2;
                            
                            rescueSuccessful = true;
                        }
                    }
                }
            }
        }
        
        if (!rescueSuccessful) {

            ghost.x = ghost.spawnX;
            ghost.y = ghost.spawnY;
            ghost.targetX = ghost.spawnX;
            ghost.targetY = ghost.spawnY;
            ghost.moving = false;
            ghost.animationProgress = 0;
            
            // Update world position
            const offsetX = -((mazeSize * cellSize) / 2);
            const offsetZ = -((mazeSize * cellSize) / 2);
            ghost.worldX = ghost.x * cellSize + offsetX + cellSize / 2;
            ghost.worldZ = ghost.y * cellSize + offsetZ + cellSize / 2;
        }
        
        return; // Skip normal movement this frame
    }
    
    const currentTime = Date.now();
    
    // Check if ghost is still in grace period (based on spawn time)
    const isInGracePeriod = currentTime < (ghost.spawnTime + ghost.initialGracePeriod);
    
    // Calculate distance to player for dynamic behavior
    const distanceToPlayer = Math.abs(ghost.x - player.x) + Math.abs(ghost.y - player.y);
    
    // Much more aggressive movement intervals - faster tracking
    let baseInterval;
    if (isInGracePeriod) {
        // Even during grace period, move more frequently
        baseInterval = 600 + Math.random() * 400; // 0.6-1.0s during grace period
    } else {
        // Very aggressive tracking after grace period
        if (distanceToPlayer <= 3) {
            baseInterval = 200 + Math.random() * 200; // 0.2-0.4s when close
        } else if (distanceToPlayer <= 6) {
            baseInterval = 300 + Math.random() * 200; // 0.3-0.5s when medium distance
        } else {
            baseInterval = 400 + Math.random() * 200; // 0.4-0.6s when far
        }
    }
    
    if (currentTime - ghost.lastMoveTime < baseInterval) return;
    
    let newX = ghost.x;
    let newY = ghost.y;
    
    // Enhanced behavior selection - more aggressive tracking
    let effectiveBehavior = ghost.behavior;
    if (isInGracePeriod) {
        // During grace period, still track but less aggressively
        if (ghost.behavior === 'chase') {
            effectiveBehavior = distanceToPlayer > 5 ? 'chase' : 'scatter'; // Still chase if far away
        } else if (ghost.behavior === 'ambush') {
            effectiveBehavior = distanceToPlayer > 4 ? 'ambush' : 'scatter'; // Still ambush if far away
        }
        // scatter and random behaviors remain unchanged during grace period
    }
    
    // Priority override: flee from player when player is dead or respawning
    if (gameState.waitingForRespawn || gameState.playerRespawning) {
        effectiveBehavior = 'flee'; // Force all ghosts to flee from player during death/respawn states
        if (gameState.waitingForRespawn) {

        } else {

        }
    }
    // Override behavior if ghost is frightened during power mode
    else if (ghost.state === GHOST_STATES.FRIGHTENED) {
        effectiveBehavior = 'flee'; // Run away from player
    } else if (ghost.state === GHOST_STATES.RETURNING) {
        effectiveBehavior = 'return'; // Return to spawn
    }
    
    // Add debug logging for AI behavior
    if (Math.random() < 0.1) { // Log 10% of the time to avoid spam

    }
    
    switch (effectiveBehavior) {
        case 'flee':
            // Run away from player during power mode or respawn protection

            const fleeDirection = getFleeDirection(ghost);

            if (fleeDirection !== -1) {
                const moves = getValidMoves(ghost.x, ghost.y);

                if (moves[fleeDirection]) {
                    [newX, newY] = moves[fleeDirection];

                } else {

                }
            } else {

            }
            
            // If no good flee direction, move randomly
            if (newX === ghost.x && newY === ghost.y) {
                const validMoves = getValidMoves(ghost.x, ghost.y);
                const moveOptions = validMoves.filter(move => move !== null);

                if (moveOptions.length > 0) {
                    [newX, newY] = moveOptions[Math.floor(Math.random() * moveOptions.length)];

                }
            }
            break;
            
        case 'return':
            // Return to spawn point after being eaten
            const returnPath = aStarPathfinding(ghost.x, ghost.y, ghost.spawnX, ghost.spawnY);
            if (returnPath && returnPath.length > 1) {
                newX = returnPath[1].x;
                newY = returnPath[1].y;
                
                // Check if reached spawn point
                if (newX === ghost.spawnX && newY === ghost.spawnY) {
                    ghost.state = GHOST_STATES.RESPAWNING;
                    ghost.speed = GHOST_SPEEDS.RESPAWNING;
                    ghost.color = vec4(0.3, 0.3, 0.3, 0.5); // Semi-transparent gray while respawning
                    
                    // Set respawn timer based on whether power mode is active
                    // If power mode is active and will end soon, wait until it ends
                    if (powerMode.active && powerMode.timeLeft > 1000) {
                        // If power mode has more than 1 second left, wait for it to end
                        ghost.respawnTimer = powerMode.timeLeft + 1000; // Add 1 extra second buffer

                    } else {
                        ghost.respawnTimer = GHOST_RESPAWN_TIME; // Normal 15-second respawn

                    }
                    
                    ghost.isRespawning = true;
                }
            }
            break;
            
        case 'chase':
            // Enhanced A* pathfinding with multiple fallbacks
            let path = aStarPathfinding(ghost.x, ghost.y, player.x, player.y);
            if (path && path.length > 1) {
                // Move to next step in path (skip first element as it's current position)
                newX = path[1].x;
                newY = path[1].y;
            } else {
                // Fallback 1: Try direct movement toward player
                const direction = getDirectionToPlayer(ghost);
                const moves = getValidMoves(ghost.x, ghost.y);
                if (direction !== -1 && moves[direction]) {
                    [newX, newY] = moves[direction];
                } else {
                    // Fallback 2: Try heuristic chase
                    const heuristicMove = heuristicChase(ghost, player.x, player.y);
                    if (heuristicMove) {
                        [newX, newY] = heuristicMove;
                    } else {
                        // Fallback 3: Move toward player using best available direction
                        const bestMove = getBestMoveTowardPlayer(ghost, moves);
                        if (bestMove) {
                            [newX, newY] = bestMove;
                        }
                    }
                }
            }
            break;
            
        case 'scatter':
            // Enhanced heuristic chase with fallbacks
            const heuristicMove = heuristicChase(ghost, player.x, player.y);
            if (heuristicMove) {
                [newX, newY] = heuristicMove;
            } else {
                // Fallback to direct chase
                const direction = getDirectionToPlayer(ghost);
                const moves = getValidMoves(ghost.x, ghost.y);
                if (direction !== -1 && moves[direction]) {
                    [newX, newY] = moves[direction];
                } else {
                    const bestMove = getBestMoveTowardPlayer(ghost, moves);
                    if (bestMove) {
                        [newX, newY] = bestMove;
                    }
                }
            }
            break;
            
        case 'ambush':
            // Enhanced BFS pathfinding with multiple fallbacks
            let bfsPath = bfsPathfinding(ghost.x, ghost.y, player.x, player.y);
            if (bfsPath && bfsPath.length > 1) {
                // Move to next step in BFS path
                newX = bfsPath[1].x;
                newY = bfsPath[1].y;
            } else {
                // Fallback 1: Try A* pathfinding
                const aStarPath = aStarPathfinding(ghost.x, ghost.y, player.x, player.y);
                if (aStarPath && aStarPath.length > 1) {
                    newX = aStarPath[1].x;
                    newY = aStarPath[1].y;
                } else {
                    // Fallback 2: Try heuristic chase
                    const heuristicFallback = heuristicChase(ghost, player.x, player.y);
                    if (heuristicFallback) {
                        [newX, newY] = heuristicFallback;
                    } else {
                        // Fallback 3: Direct movement toward player
                        const moves = getValidMoves(ghost.x, ghost.y);
                        const bestMove = getBestMoveTowardPlayer(ghost, moves);
                        if (bestMove) {
                            [newX, newY] = bestMove;
                        }
                    }
                }
            }
            break;
            
        case 'random':
            // Even random movement should have some bias toward player
            const validMoves = getValidMoves(ghost.x, ghost.y);
            const moveOptions = validMoves.filter(move => move !== null);
            if (moveOptions.length > 0) {
                // 70% chance to move toward player, 30% random
                if (Math.random() < 0.7) {
                    const bestMove = getBestMoveTowardPlayer(ghost, validMoves);
                    if (bestMove) {
                        [newX, newY] = bestMove;
                    } else {
                        [newX, newY] = moveOptions[Math.floor(Math.random() * moveOptions.length)];
                    }
                } else {
                    [newX, newY] = moveOptions[Math.floor(Math.random() * moveOptions.length)];
                }
            }
            break;
    }
    
    // If no move was found, try any available move toward player
    if (newX === ghost.x && newY === ghost.y) {
        const validMoves = getValidMoves(ghost.x, ghost.y);
        const bestMove = getBestMoveTowardPlayer(ghost, validMoves);
        if (bestMove) {
            [newX, newY] = bestMove;
        } else {
            // Last resort: any valid move
            const moveOptions = validMoves.filter(move => move !== null);
            if (moveOptions.length > 0) {
                [newX, newY] = moveOptions[Math.floor(Math.random() * moveOptions.length)];
            }
        }
    }
    
    if (newX !== ghost.x || newY !== ghost.y) {
        ghost.targetX = newX;
        ghost.targetY = newY;
        ghost.moving = true;
        ghost.animationProgress = 0;
        ghost.lastMoveTime = currentTime;
    }
}

function updateGhostAnimation(ghost) {
    if (!ghost.moving) return;
    
    // Use individual ghost speed instead of fixed ghostSpeed constant
    ghost.animationProgress += deltaTime * ghost.speed;
    
    if (ghost.animationProgress >= 1.0) {
        ghost.x = ghost.targetX;
        ghost.y = ghost.targetY;
        ghost.moving = false;
        ghost.animationProgress = 0;
        
        const offsetX = -((mazeSize * cellSize) / 2);
        const offsetZ = -((mazeSize * cellSize) / 2);
        ghost.worldX = ghost.x * cellSize + offsetX + cellSize / 2;
        ghost.worldZ = ghost.y * cellSize + offsetZ + cellSize / 2;
    } else {
        const t = ghost.animationProgress;
        const startX = ghost.x;
        const startY = ghost.y;
        const endX = ghost.targetX;
        const endY = ghost.targetY;
        
        const currentX = startX + (endX - startX) * t;
        const currentY = startY + (endY - startY) * t;
        
        const offsetX = -((mazeSize * cellSize) / 2);
        const offsetZ = -((mazeSize * cellSize) / 2);
        ghost.worldX = currentX * cellSize + offsetX + cellSize / 2;
        ghost.worldZ = currentY * cellSize + offsetZ + cellSize / 2;
    }
}

function getDirectionToPlayer(ghost) {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 1 : 3; // right : left
    } else {
        return dy > 0 ? 2 : 0; // down : up
    }
}

// Get direction to flee away from player
function getFleeDirection(ghost) {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    


    
    // Move in opposite direction from player
    if (Math.abs(dx) > Math.abs(dy)) {
        const direction = dx > 0 ? 3 : 1; // left : right (opposite of chase)

        return direction;
    } else {
        const direction = dy > 0 ? 0 : 2; // up : down (opposite of chase)

        return direction;
    }
}

function getValidMoves(x, y) {
    const moves = [null, null, null, null]; // [up, right, down, left]
    
    // Check each direction for valid movement
    if (y > 0 && !maze[y][x].walls[0] && !hasWallBlock(y - 1, x)) {
        moves[0] = [x, y - 1]; // Up
    }
    if (x < mazeSize - 1 && !maze[y][x].walls[1] && !hasWallBlock(y, x + 1)) {
        moves[1] = [x + 1, y]; // Right
    }
    if (y < mazeSize - 1 && !maze[y][x].walls[2] && !hasWallBlock(y + 1, x)) {
        moves[2] = [x, y + 1]; // Down
    }
    if (x > 0 && !maze[y][x].walls[3] && !hasWallBlock(y, x - 1)) {
        moves[3] = [x - 1, y]; // Left
    }
    
    return moves;
}

// Get the best available move toward the player
function getBestMoveTowardPlayer(ghost, validMoves) {
    let bestMove = null;
    let bestDistance = Infinity;
    
    for (let i = 0; i < validMoves.length; i++) {
        if (validMoves[i]) {
            const [moveX, moveY] = validMoves[i];
            // Calculate Manhattan distance to player from this potential position
            const distance = Math.abs(moveX - player.x) + Math.abs(moveY - player.y);
            
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = [moveX, moveY];
            }
        }
    }
    
    return bestMove;
}

function checkGhostCollision() {
    for (let ghost of ghosts) {
        // Check collision using both grid position and animation position
        const gridDistance = Math.abs(ghost.x - player.x) + Math.abs(ghost.y - player.y);
        
        // Also check if ghost is moving and might be colliding during animation
        let collisionDetected = false;
        
        if (gridDistance === 0) {
            collisionDetected = true;
        } else if (ghost.moving && gridDistance <= 1) {
            // If ghost is moving and close, check for collision during animation
            const targetDistance = Math.abs(ghost.targetX - player.x) + Math.abs(ghost.targetY - player.y);
            if (targetDistance === 0) {
                collisionDetected = true;
            }
        }
        
        if (collisionDetected) {
            // Add debug logging
            if (Math.random() < 0.1) { // Log 10% of collision checks to avoid spam

            }
            
            if (powerMode.active && ghost.state === GHOST_STATES.FRIGHTENED) {
                // Player eats ghost during power mode
                ghost.state = GHOST_STATES.EATEN;
                ghost.color = vec4(0.5, 0.5, 0.5, 1.0); // Gray color for eaten ghost
                ghost.speed = GHOST_SPEEDS.EATEN;
                ghost.respawnTimer = GHOST_RESPAWN_TIME; // Start 15-second respawn timer
                ghost.isRespawning = true;
                
                // Create particle effect for ghost eaten
                createParticleEffect(
                    PARTICLE_TYPES.GHOST_EATEN,
                    ghost.worldX,
                    wallHeight/2 + ghostRadius,
                    ghost.worldZ
                );
                
                // Award bonus points (increasing with each ghost eaten)
                const bonusPoints = 200 * Math.pow(2, powerMode.ghostsEaten); // 200, 400, 800, 1600...
                gameState.score += bonusPoints;
                powerMode.ghostsEaten++;
                

                
                // Start returning to spawn
                ghost.state = GHOST_STATES.RETURNING;
                ghost.targetX = ghost.spawnX;
                ghost.targetY = ghost.spawnY;
                
                updateUI();
                createGhostsGeometry(); // Update ghost appearance
            } else if (ghost.state === GHOST_STATES.NORMAL || ghost.state === GHOST_STATES.FRIGHTENED) {
                // Normal collision - player gets hit (only for active ghosts)

                playerHit();
                break;
            }
            // Ghosts in EATEN, RETURNING, or RESPAWNING states don't cause collisions
        }
    }
}

function isGhostSpawnArea(x, y) {
    // Define areas where ghosts might spawn (avoid player start)
    return false; // For now, allow ghosts anywhere except player start
}

// Shuja - Power-up Systems
// Power-up system
function activateDash() {
    dashSystem.active = true;
    dashSystem.timeLeft = dashSystem.duration;
    dashSystem.cooldownTimeLeft = dashSystem.cooldown;
    player.speed = dashSystem.speedMultiplier * player.baseSpeed;
    
    // Create dash activation particle effect
    createParticleEffect(
        PARTICLE_TYPES.POWER_MODE_START, // Reuse blue particles for dash effect
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    

}

// Overhead View System activation
function activateOverheadView() {
    overheadViewSystem.active = true;
    overheadViewSystem.timeLeft = overheadViewSystem.duration;
    overheadViewSystem.cooldownTimeLeft = overheadViewSystem.cooldown;
    
    // Store current camera angle and switch to overhead view
    overheadViewSystem.originalCameraAngle = cameraAngle;
    cameraAngle = 0; // Switch to top-down overhead view
    
    // Update camera angle slider to reflect change
    document.getElementById("cameraAngle").value = cameraAngle;
    document.getElementById("angleValue").textContent = cameraAngle;
    
    // Create overhead view activation particle effect (using different color)
    createParticleEffect(
        PARTICLE_TYPES.POWER_MODE_END, // Reuse gold particles for overhead view effect
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    

}

function updatePowerUps() {
    // Update brightness decay system (only during active gameplay)
    if (gameState.isPlaying && gameState.lastPelletCollectionTime > 0) {
        const timeSinceLastPellet = Date.now() - gameState.lastPelletCollectionTime;
        const decayThreshold = 3000; // 3 seconds
        
        if (timeSinceLastPellet >= decayThreshold) {
            if (!gameState.brightnessDecayActive) {
                gameState.brightnessDecayActive = true;

            }
            
            // Reduce brightness by 0.2 every 3 seconds, minimum 0.1
            const decayInterval = 3000; // Decay every 3 seconds
            const timeSinceDecayStart = timeSinceLastPellet - decayThreshold;
            const decaySteps = Math.floor(timeSinceDecayStart / decayInterval);
            const targetBrightness = Math.max(0.1, 2.0 - (decaySteps * 0.2));
            
            if (brightness > targetBrightness) {
                brightness = targetBrightness;
                document.getElementById("brightness").value = brightness;
                document.getElementById("brightnessValue").textContent = parseFloat(brightness).toFixed(1);
                
                if (Math.random() < 0.1) { // Log occasionally to avoid spam

                }
            }
        }
    }
    
    // Update respawn protection system
    if (gameState.playerRespawning && gameState.respawnProtectionTime > 0) {
        gameState.respawnProtectionTime -= deltaTime * 1000;
        
        // Log every second for debugging
        if (Math.floor(gameState.respawnProtectionTime / 1000) !== Math.floor((gameState.respawnProtectionTime + deltaTime * 1000) / 1000)) {
            const secondsLeft = Math.ceil(gameState.respawnProtectionTime / 1000);

        }
        
        if (gameState.respawnProtectionTime <= 0) {
            gameState.playerRespawning = false;
            gameState.respawnProtectionTime = 0;

        }
    }
    
    // Update power mode
    if (powerMode.active) {
        powerMode.timeLeft -= deltaTime * 1000;
        
        // Flash warning when power mode is about to end
        const warningTime = 2000; // 2 seconds warning
        if (powerMode.timeLeft <= warningTime && powerMode.timeLeft > 0) {
            // Flash ghosts between blue and white
            const flashInterval = 200; // Flash every 200ms
            const shouldFlash = Math.floor(powerMode.timeLeft / flashInterval) % 2 === 0;
            
            for (let ghost of ghosts) {
                if (ghost.state === GHOST_STATES.FRIGHTENED) {
                    ghost.color = shouldFlash ? 
                        vec4(1.0, 1.0, 1.0, 1.0) : // White flash
                        vec4(0.0, 0.0, 1.0, 1.0);   // Blue normal
                }
            }
        }
        
        // End power mode
        if (powerMode.timeLeft <= 0) {
            powerMode.active = false;
            powerMode.timeLeft = 0;
            
            // Create power mode end particle effect at player position
            createParticleEffect(
                PARTICLE_TYPES.POWER_MODE_END,
                player.worldX,
                wallHeight/2 + player.radius,
                player.worldZ
            );
            
            // Restore all ghosts to normal state
            for (let ghost of ghosts) {
                if (ghost.state === GHOST_STATES.FRIGHTENED) {
                    ghost.state = GHOST_STATES.NORMAL;
                    ghost.color = ghost.originalColor;
                    ghost.speed = GHOST_SPEEDS.NORMAL;
                }
            }
            

        }
    }
    
    // Update dash system
    if (dashSystem.active) {
        dashSystem.timeLeft -= deltaTime * 1000;
        if (dashSystem.timeLeft <= 0) {
            dashSystem.active = false;
            player.speed = player.baseSpeed;

        }
    }
    
    // Update dash cooldown
    if (dashSystem.cooldownTimeLeft > 0) {
        dashSystem.cooldownTimeLeft -= deltaTime * 1000;
        if (dashSystem.cooldownTimeLeft <= 0) {

        }
    }
    
    // Update overhead view system
    if (overheadViewSystem.active) {
        overheadViewSystem.timeLeft -= deltaTime * 1000;
        if (overheadViewSystem.timeLeft <= 0) {
            overheadViewSystem.active = false;
            
            // Return to appropriate camera angle based on maze type
            let targetAngle = 50; // Default for perfect maze
            if (mazeType === 'imperfect') {
                targetAngle = 50;
            } else if (mazeType === 'pacman') {
                targetAngle = 65;
            }
            
            cameraAngle = targetAngle;
            originalCameraAngle = targetAngle;
            document.getElementById("cameraAngle").value = cameraAngle;
            document.getElementById("angleValue").textContent = cameraAngle;
            

            
            // Create overhead view end particle effect
            createParticleEffect(
                PARTICLE_TYPES.POWER_MODE_START, // Blue particles for end effect
                player.worldX,
                wallHeight/2 + player.radius,
                player.worldZ
            );
        }
    }
    
    // Update overhead view cooldown
    if (overheadViewSystem.cooldownTimeLeft > 0) {
        overheadViewSystem.cooldownTimeLeft -= deltaTime * 1000;
        if (overheadViewSystem.cooldownTimeLeft <= 0) {

        }
    }
}

// Game state functions
function playerHit() {
    // Create particle effect for player hit
    createParticleEffect(
        PARTICLE_TYPES.PLAYER_HIT,
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    
    gameState.lives--;
    updateUI();
    
    if (gameState.lives <= 0) {
        gameOver();
    } else {
        // Set player into waiting for respawn state (manual respawn with Q key)
        gameState.waitingForRespawn = true;
        gameState.playerRespawning = false; // Not automatically respawning
        gameState.respawnProtectionTime = 0; // No automatic timer
        
        // Keep player at death location - they can't move until Q is pressed



    }
}

// Manual respawn function (triggered by Q key)
function activateManualRespawn() {
    // Only allow respawn if player is waiting for respawn and not currently alive/moving
    if (!gameState.waitingForRespawn || gameState.playerRespawning) {

        return false;
    }
    
    // Activate respawn protection system for 3 seconds
    gameState.waitingForRespawn = false;
    gameState.playerRespawning = true;
    gameState.respawnProtectionTime = 3000; // 3 seconds of protection
    
    // Player stays at death location during protection



    
    // Create respawn activation particle effect
    createParticleEffect(
        PARTICLE_TYPES.POWER_MODE_START, // Blue particles for respawn activation
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    
    return true;
}

function gameWin() {
    gameState.gameStatus = 'You Win!';
    gameState.isPlaying = false;
    updateUI();
    updateGameButtons();
}

function gameOver() {
    gameState.gameStatus = 'Game Over';
    gameState.isPlaying = false;
    updateUI();
    updateGameButtons();
}

// New function to validate movement between two cells
function validateMovement(fromX, fromY, toX, toY) {
    // Check bounds
    if (toX < 0 || toX >= mazeSize || toY < 0 || toY >= mazeSize) {
        return false;
    }
    
    // Check if it's a valid adjacent move (only one cell difference)
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    if (Math.abs(dx) + Math.abs(dy) !== 1) {
        return false; // Not an adjacent cell
    }
    
    // Check walls based on movement direction
    if (dx === 1) {
        // Moving right: check right wall of current cell
        return !maze[fromY][fromX].walls[1];
    } else if (dx === -1) {
        // Moving left: check left wall of current cell
        return !maze[fromY][fromX].walls[3];
    } else if (dy === 1) {
        // Moving down: check bottom wall of current cell
        return !maze[fromY][fromX].walls[2];
    } else if (dy === -1) {
        // Moving up: check top wall of current cell
        return !maze[fromY][fromX].walls[0];
    }
    
    return false;
}

// BFS Pathfinding Algorithm for Ghost AI
function bfsPathfinding(startX, startY, goalX, goalY) {
    // Check if coordinates are valid and passable
    function isValidPosition(x, y) {
        return x >= 0 && x < mazeSize && y >= 0 && y < mazeSize;
    }
    
    // Check if there's a wall between two adjacent cells
    function canMoveBetween(fromX, fromY, toX, toY) {
        if (!isValidPosition(fromX, fromY) || !isValidPosition(toX, toY)) {
            return false;
        }
        
        // Check if destination is a wall block
        if (hasWallBlock(toY, toX)) {
            return false;
        }
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        
        // Check wall based on direction
        if (dx === 1) return !maze[fromY][fromX].walls[1]; // Moving right
        if (dx === -1) return !maze[fromY][fromX].walls[3]; // Moving left
        if (dy === 1) return !maze[fromY][fromX].walls[2]; // Moving down
        if (dy === -1) return !maze[fromY][fromX].walls[0]; // Moving up
        
        return false;
    }
    
    const queue = [{x: startX, y: startY, path: [{x: startX, y: startY}]}];
    const visited = new Set();
    visited.add(`${startX},${startY}`);
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Check if we reached the goal
        if (current.x === goalX && current.y === goalY) {
            return current.path;
        }
        
        // Check all neighbors
        const neighbors = [
            {x: current.x, y: current.y - 1}, // Up
            {x: current.x + 1, y: current.y}, // Right
            {x: current.x, y: current.y + 1}, // Down
            {x: current.x - 1, y: current.y}  // Left
        ];
        
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            if (!visited.has(neighborKey) && 
                isValidPosition(neighbor.x, neighbor.y) &&
                canMoveBetween(current.x, current.y, neighbor.x, neighbor.y)) {
                
                visited.add(neighborKey);
                const newPath = [...current.path, {x: neighbor.x, y: neighbor.y}];
                queue.push({x: neighbor.x, y: neighbor.y, path: newPath});
            }
        }
    }
    
    // No path found
    return null;
}

// Heuristic-based pathfinding for Scatter behavior
function heuristicChase(ghost, targetX, targetY) {
    // Calculate Manhattan distance to target
    function manhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }
    
    // Get all valid moves
    const validMoves = getValidMoves(ghost.x, ghost.y);
    const moveOptions = [];
    
    // Evaluate each possible move using heuristics
    for (let i = 0; i < validMoves.length; i++) {
        if (validMoves[i]) {
            const [newX, newY] = validMoves[i];
            const distance = manhattanDistance(newX, newY, targetX, targetY);
            
            // Add some randomness to make behavior less predictable
            const randomFactor = Math.random() * 0.3; // 30% randomness
            const score = distance + randomFactor;
            
            moveOptions.push({
                x: newX,
                y: newY,
                score: score,
                direction: i
            });
        }
    }
    
    if (moveOptions.length === 0) {
        return null;
    }
    
    // Sort by score (lower is better for chasing)
    moveOptions.sort((a, b) => a.score - b.score);
    
    // Return the best move
    return [moveOptions[0].x, moveOptions[0].y];
}

// Generate power pellets in strategic locations
function generatePowerPellets() {
    powerPellets = [];
    gameState.totalPowerPellets = 0;
    
    // Place power pellets in corners and strategic locations
    const powerPelletLocations = [];
    
    // Corner positions (if accessible)
    const corners = [
        {x: 1, y: 1},                           // Top-left area
        {x: mazeSize - 2, y: 1},                // Top-right area
        {x: 1, y: mazeSize - 2},                // Bottom-left area
        {x: mazeSize - 2, y: mazeSize - 2}      // Bottom-right area
    ];
    
    // Add corners if they are accessible
    for (const corner of corners) {
        if (isValidPlayerPosition(corner.x, corner.y)) {
            powerPelletLocations.push(corner);
        }
    }
    
    // Add some strategic middle positions
    const centerX = Math.floor(mazeSize / 2);
    const centerY = Math.floor(mazeSize / 2);
    
    const strategicPositions = [
        {x: centerX, y: 2},                     // Top center
        {x: centerX, y: mazeSize - 3},          // Bottom center
        {x: 2, y: centerY},                     // Left center
        {x: mazeSize - 3, y: centerY}           // Right center
    ];
    
    for (const pos of strategicPositions) {
        if (isValidPlayerPosition(pos.x, pos.y) && 
            !powerPelletLocations.some(p => p.x === pos.x && p.y === pos.y)) {
            powerPelletLocations.push(pos);
        }
    }
    
    // Limit to 4 power pellets maximum
    const maxPowerPellets = Math.min(4, powerPelletLocations.length);
    
    // Shuffle and select power pellet positions
    shuffleArray(powerPelletLocations);
    
    for (let i = 0; i < maxPowerPellets; i++) {
        const location = powerPelletLocations[i];
        
        // Make sure it's not too close to player start or regular pellets
        const distanceFromStart = Math.abs(location.x - 0) + Math.abs(location.y - 0);
        if (distanceFromStart < 3) continue; // Skip if too close to start
        
        const offsetX = -((mazeSize * cellSize) / 2);
        const offsetZ = -((mazeSize * cellSize) / 2);
        
        powerPellets.push({
            x: location.x,
            y: location.y,
            worldX: location.x * cellSize + offsetX + cellSize / 2,
            worldZ: location.y * cellSize + offsetZ + cellSize / 2,
            collected: false,
            pulseTime: 0, // For animation effect
            color: vec4(1.0, 0.8, 0.0, 1.0) // Golden color for power pellets
        });
        
        gameState.totalPowerPellets++;
    }
    

}

// Check for power pellet collection
function checkPowerPelletCollection() {
    for (let powerPellet of powerPellets) {
        if (!powerPellet.collected && powerPellet.x === player.x && powerPellet.y === player.y) {
            powerPellet.collected = true;
            gameState.powerPelletsCollected++;
            gameState.score += powerPelletScore;
            
            // Create particle effect for power pellet collection
            createParticleEffect(
                PARTICLE_TYPES.POWER_PELLET_COLLECT,
                powerPellet.worldX,
                wallHeight/2 + powerPelletRadius,
                powerPellet.worldZ
            );
            
            // Activate power mode
            activatePowerMode();
            
            updateUI();
            
            // Recreate power pellet geometry
            createPowerPelletsGeometry();
            break;
        }
    }
}

// Activate power mode when power pellet is collected
function activatePowerMode() {
    powerMode.active = true;
    powerMode.timeLeft = powerPelletDuration;
    powerMode.ghostsEaten = 0;
    powerMode.bonusMultiplier = 1;
    
    // Create power mode start particle effect at player position
    createParticleEffect(
        PARTICLE_TYPES.POWER_MODE_START,
        player.worldX,
        wallHeight/2 + player.radius,
        player.worldZ
    );
    
    // Change all ghosts to frightened state
    for (let ghost of ghosts) {
        if (ghost.state !== GHOST_STATES.EATEN && ghost.state !== GHOST_STATES.RETURNING) {
            ghost.state = GHOST_STATES.FRIGHTENED;
            ghost.frightenedStartTime = Date.now();
            // Store original color and change to blue when frightened
            if (!ghost.originalColor) {
                ghost.originalColor = ghost.color;
            }
            ghost.color = vec4(0.0, 0.0, 1.0, 1.0); // Blue when frightened
            ghost.speed = GHOST_SPEEDS.FRIGHTENED;
        }
    }
    

}

// Shuja - Particle Effects System
// Particle System for visual effects
let particles = [];
const maxParticles = 200;
const particleLifetime = 2000; // 2 seconds

// Particle types for different effects
const PARTICLE_TYPES = {
    PELLET_COLLECT: 'pellet_collect',
    POWER_PELLET_COLLECT: 'power_pellet_collect',
    GHOST_EATEN: 'ghost_eaten',
    POWER_MODE_START: 'power_mode_start',
    POWER_MODE_END: 'power_mode_end',
    PLAYER_HIT: 'player_hit'
};

// Particle configurations for different effects
const PARTICLE_CONFIGS = {
    [PARTICLE_TYPES.PELLET_COLLECT]: {
        count: 8,
        color: vec4(1.0, 1.0, 0.0, 1.0), // Yellow
        speed: 0.5,
        size: 0.008,
        gravity: -0.3,
        spread: 0.6
    },
    [PARTICLE_TYPES.POWER_PELLET_COLLECT]: {
        count: 8,
        color: vec4(1.0, 0.8, 0.0, 1.0), // Golden
        speed: 0.5,
        size: 0.01,
        gravity: -0.3,
        spread: 0.6
    },
    [PARTICLE_TYPES.GHOST_EATEN]: {
        count: 10,
        color: vec4(0.5, 0.5, 0.5, 1.0), // Gray
        speed: 0.5,
        size: 0.01,
        gravity: -0.3,
        spread: 0.6
    },
    [PARTICLE_TYPES.POWER_MODE_START]: {
        count: 10,
        color: vec4(0.0, 0.0, 1.0, 1.0), // Blue
        speed: 0.5,
        size: 0.01,
        gravity: -0.3,
        spread: 0.6
    },
    [PARTICLE_TYPES.POWER_MODE_END]: {
        count: 10,
        color: vec4(1.0, 1.0, 1.0, 1.0), // White
        speed: 0.5,
        size: 0.01,
        gravity: -0.3,
        spread: 0.6
    },
    [PARTICLE_TYPES.PLAYER_HIT]: {
        count: 10,
        color: vec4(1.0, 0.0, 0.0, 1.0), // Red
        speed: 0.5,
        size: 0.01,
        gravity: -0.3,
        spread: 0.6
    }
};

// Create particle effect at specified location
function createParticleEffect(type, worldX, worldY, worldZ) {
    const config = PARTICLE_CONFIGS[type];
    if (!config) {

        return;
    }
    

    
    for (let i = 0; i < config.count; i++) {
        // Random direction and speed
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI * 0.5;
        const speed = config.speed * (0.5 + Math.random() * 0.5);
        
        const velocityX = Math.cos(angle) * Math.cos(elevation) * speed * config.spread;
        const velocityY = Math.sin(elevation) * speed;
        const velocityZ = Math.sin(angle) * Math.cos(elevation) * speed * config.spread;
        
        particles.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            velocityX: velocityX,
            velocityY: velocityY,
            velocityZ: velocityZ,
            size: config.size * (0.8 + Math.random() * 0.4),
            color: vec4(
                config.color[0] + (Math.random() - 0.5) * 0.2,
                config.color[1] + (Math.random() - 0.5) * 0.2,
                config.color[2] + (Math.random() - 0.5) * 0.2,
                config.color[3]
            ),
            life: particleLifetime,
            maxLife: particleLifetime,
            gravity: config.gravity,
            type: type
        });
    }
    
    // Remove old particles if we exceed max count
    if (particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
    }
    

}

// Update all particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position
        particle.x += particle.velocityX * deltaTime;
        particle.y += particle.velocityY * deltaTime;
        particle.z += particle.velocityZ * deltaTime;
        
        // Apply gravity
        particle.velocityY += particle.gravity * deltaTime;
        
        // Update life
        particle.life -= deltaTime * 1000;
        
        // Fade out particle as it dies
        const lifeRatio = particle.life / particle.maxLife;
        particle.color[3] = lifeRatio; // Alpha fade
        
        // Remove dead particles
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Create particles geometry
function createParticlesGeometry() {
    if (particles.length === 0) {
        particlesCount = 0;
        return;
    }
    

    
    const vertices = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let indexOffset = 0;
    
    for (let particle of particles) {
        createSphere(
            vertices, normals, colors, indices,
            particle.x, particle.y, particle.z,
            particle.size, particle.color, indexOffset
        );
        indexOffset += getSphereVertexCount();
    }
    
    if (vertices.length === 0) {
        particlesCount = 0;

        return;
    }
    

    
    // Set up buffers
    particlesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    particlesNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    
    particlesColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    particlesIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particlesIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    particlesCount = indices.length;

}

// Draw particles
function drawParticles() {
    if (particlesCount === 0) {
        // Only log when there should be particles but count is 0
        if (particles.length > 0) {

        }
        return;
    }
    
    // Enable blending for particle transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesBuffer);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesNormalBuffer);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.bindBuffer(gl.ARRAY_BUFFER, particlesColorBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particlesIndexBuffer);
    gl.drawElements(gl.TRIANGLES, particlesCount, gl.UNSIGNED_SHORT, 0);
    
    // Disable blending
    gl.disable(gl.BLEND);
} 

// Get direction to move away from respawn area (0,0) during player respawning
function getDirectionAwayFromRespawn(ghost) {
    const respawnX = 0;
    const respawnY = 0;
    const dx = respawnX - ghost.x;
    const dy = respawnY - ghost.y;
    
    // Move in opposite direction from respawn area
    if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 1 : 3; // right : left (away from respawn)
    } else {
        return dy > 0 ? 2 : 0; // down : up (away from respawn)
    }
}

// Check if ghost is too close to respawn area (within protection radius)
function isGhostTooCloseToRespawn(ghost) {
    const respawnX = 0;
    const respawnY = 0;
    const protectionRadius = 4; // 4-cell radius around respawn point
    
    const distance = Math.abs(ghost.x - respawnX) + Math.abs(ghost.y - respawnY);
    return distance <= protectionRadius;
}

// Get best move away from respawn area
function getBestMoveAwayFromRespawn(ghost, validMoves) {
    const respawnX = 0;
    const respawnY = 0;
    let bestMove = null;
    let bestDistance = -1;
    
    for (let i = 0; i < validMoves.length; i++) {
        if (validMoves[i]) {
            const [moveX, moveY] = validMoves[i];
            // Calculate Manhattan distance from respawn area after this move
            const distance = Math.abs(moveX - respawnX) + Math.abs(moveY - respawnY);
            
            if (distance > bestDistance) {
                bestDistance = distance;
                bestMove = [moveX, moveY];
            }
        }
    }
    
    return bestMove;
}
