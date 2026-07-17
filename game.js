// Game Configuration
const CONFIG = {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight - 140,
    GRAVITY: 0.5,
    JUMP_POWER: 12,
    MOVE_SPEED: 4,
    PLAYER_SIZE: 30,
    PLATFORM_WIDTH: 100,
    PLATFORM_HEIGHT: 15,
    PLATFORM_SPACING: 80
};

// Game State
let gameState = {
    active: false,
    paused: false,
    score: 0,
    maxHeight: 0,
    playerX: 0,
    playerY: 0,
    playerVelY: 0,
    cameraY: 0,
    platforms: [],
    enemies: []
};

// Controls
let controls = {
    left: false,
    right: false,
    jump: false
};

// DOM Elements
const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const heightEl = document.getElementById('height');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnJump = document.getElementById('btnJump');

// Setup Touch Controls
function setupControls() {
    // Left button
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); controls.left = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); controls.left = false; });
    btnLeft.addEventListener('mousedown', () => controls.left = true);
    btnLeft.addEventListener('mouseup', () => controls.left = false);

    // Right button
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); controls.right = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); controls.right = false; });
    btnRight.addEventListener('mousedown', () => controls.right = true);
    btnRight.addEventListener('mouseup', () => controls.right = false);

    // Jump button
    btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); controls.jump = true; });
    btnJump.addEventListener('touchend', (e) => { e.preventDefault(); controls.jump = false; });
    btnJump.addEventListener('mousedown', () => controls.jump = true);
    btnJump.addEventListener('mouseup', () => controls.jump = false);

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'a' || e.key === 'A') controls.left = true;
        if (e.key === 'd' || e.key === 'D') controls.right = true;
        if (e.key === ' ') { e.preventDefault(); controls.jump = true; }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'a' || e.key === 'A') controls.left = false;
        if (e.key === 'd' || e.key === 'D') controls.right = false;
        if (e.key === ' ') controls.jump = false;
    });
}

// Generate Platforms
function generatePlatforms() {
    gameState.platforms = [];
    for (let i = 0; i < 10; i++) {
        gameState.platforms.push({
            x: Math.random() * (CONFIG.WIDTH - CONFIG.PLATFORM_WIDTH),
            y: CONFIG.HEIGHT - 150 - i * CONFIG.PLATFORM_SPACING,
            width: CONFIG.PLATFORM_WIDTH,
            height: CONFIG.PLATFORM_HEIGHT
        });
    }
}

// Generate Enemies
function generateEnemies() {
    gameState.enemies = [];
    for (let i = 0; i < 3; i++) {
        gameState.enemies.push({
            x: Math.random() * CONFIG.WIDTH,
            y: CONFIG.HEIGHT - 300 - i * 200,
            width: 28,
            height: 28,
            direction: Math.random() > 0.5 ? 1 : -1,
            speed: 2
        });
    }
}

// Initialize Game
function initGame() {
    gameState.active = true;
    gameState.paused = false;
    gameState.score = 0;
    gameState.maxHeight = 0;
    gameState.playerX = CONFIG.WIDTH / 2;
    gameState.playerY = CONFIG.HEIGHT - 150;
    gameState.playerVelY = 0;
    gameState.cameraY = 0;
    
    generatePlatforms();
    generateEnemies();
    setupControls();
}

// Start Game
function startGame() {
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    
    initGame();
    gameLoop();
}

// Toggle Pause
function togglePause() {
    gameState.paused = !gameState.paused;
    
    if (gameState.paused) {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('pauseScreen').classList.add('active');
    } else {
        document.getElementById('gameScreen').classList.add('active');
        document.getElementById('pauseScreen').classList.remove('active');
    }
}

// Exit Game
function exitGame() {
    document.getElementById('startScreen').classList.add('active');
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    
    gameState.active = false;
}

// Update Game
function updateGame() {
    if (!gameState.active || gameState.paused) return;
    
    // Movement
    if (controls.left) gameState.playerX -= CONFIG.MOVE_SPEED;
    if (controls.right) gameState.playerX += CONFIG.MOVE_SPEED;
    
    // Boundaries
    if (gameState.playerX < 0) gameState.playerX = 0;
    if (gameState.playerX + CONFIG.PLAYER_SIZE > CONFIG.WIDTH) 
        gameState.playerX = CONFIG.WIDTH - CONFIG.PLAYER_SIZE;
    
    // Gravity
    gameState.playerVelY += CONFIG.GRAVITY;
    gameState.playerY += gameState.playerVelY;
    
    // Platform collision
    for (let platform of gameState.platforms) {
        if (gameState.playerVelY > 0 &&
            gameState.playerY + CONFIG.PLAYER_SIZE <= platform.y + 10 &&
            gameState.playerY + CONFIG.PLAYER_SIZE >= platform.y - 10 &&
            gameState.playerX + CONFIG.PLAYER_SIZE > platform.x &&
            gameState.playerX < platform.x + platform.width) {
            
            gameState.playerY = platform.y - CONFIG.PLAYER_SIZE;
            gameState.playerVelY = 0;
            
            if (controls.jump) {
                gameState.playerVelY = -CONFIG.JUMP_POWER;
            }
        }
    }
    
    // Enemy collision
    for (let enemy of gameState.enemies) {
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x < 0 || enemy.x + enemy.width > CONFIG.WIDTH) {
            enemy.direction *= -1;
        }
        
        if (checkCollision(gameState.playerX, gameState.playerY, 
                          CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE,
                          enemy.x, enemy.y, enemy.width, enemy.height)) {
            endGame();
            return;
        }
    }
    
    // Update camera
    gameState.cameraY = Math.max(0, gameState.playerY - CONFIG.HEIGHT / 3);
    
    // Update score
    const height = Math.max(0, CONFIG.HEIGHT - 150 - gameState.playerY);
    gameState.maxHeight = Math.max(gameState.maxHeight, height);
    gameState.score = Math.floor(height / 10);
    
    // Generate new platforms
    if (gameState.playerY < gameState.platforms[gameState.platforms.length - 1].y - CONFIG.HEIGHT) {
        for (let i = 0; i < 5; i++) {
            gameState.platforms.push({
                x: Math.random() * (CONFIG.WIDTH - CONFIG.PLATFORM_WIDTH),
                y: gameState.platforms[gameState.platforms.length - 1].y - CONFIG.PLATFORM_SPACING,
                width: CONFIG.PLATFORM_WIDTH,
                height: CONFIG.PLATFORM_HEIGHT
            });
        }
    }
    
    // Remove old platforms
    gameState.platforms = gameState.platforms.filter(p => p.y > gameState.cameraY - 100);
    
    // Fall off screen
    if (gameState.playerY > gameState.cameraY + CONFIG.HEIGHT + 50) {
        endGame();
    }
}

// Collision detection
function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// Render Game
function renderGame() {
    gameArea.innerHTML = '';
    
    // Render platforms
    gameState.platforms.forEach(p => {
        const screenY = p.y - gameState.cameraY;
        if (screenY > -50 && screenY < CONFIG.HEIGHT) {
            const el = document.createElement('div');
            el.className = 'platform';
            el.style.left = p.x + 'px';
            el.style.top = screenY + 'px';
            el.style.width = p.width + 'px';
            el.style.height = p.height + 'px';
            gameArea.appendChild(el);
        }
    });
    
    // Render enemies
    gameState.enemies.forEach(e => {
        const screenY = e.y - gameState.cameraY;
        if (screenY > -50 && screenY < CONFIG.HEIGHT) {
            const el = document.createElement('div');
            el.className = 'enemy';
            el.style.left = e.x + 'px';
            el.style.top = screenY + 'px';
            el.textContent = '👾';
            gameArea.appendChild(el);
        }
    });
    
    // Render player
    const playerScreenY = gameState.playerY - gameState.cameraY;
    if (playerScreenY > -50 && playerScreenY < CONFIG.HEIGHT) {
        const el = document.createElement('div');
        el.className = 'player';
        el.style.left = gameState.playerX + 'px';
        el.style.top = playerScreenY + 'px';
        el.textContent = '👤';
        gameArea.appendChild(el);
    }
    
    // Update UI
    scoreEl.textContent = gameState.score;
    heightEl.textContent = Math.floor(gameState.maxHeight);
}

// Game Loop
function gameLoop() {
    updateGame();
    renderGame();
    
    if (gameState.active) {
        requestAnimationFrame(gameLoop);
    }
}

// End Game
function endGame() {
    gameState.active = false;
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.add('active');
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalHeight').textContent = Math.floor(gameState.maxHeight);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Game is ready
});