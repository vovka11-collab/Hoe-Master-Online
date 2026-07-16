// Game State
const gameState = {
    active: true,
    paused: false,
    score: 0,
    maxHeight: 0,
    playerX: 0,
    playerY: 0,
    playerVelY: 0,
    cameraY: 0
};

const GRAVITY = 0.5;
const JUMP_POWER = 12;
const MOVE_SPEED = 4;
const PLAYER_SIZE = 30;
const GAME_WIDTH = window.innerWidth;
const GAME_HEIGHT = window.innerHeight - 150;

let platforms = [];
let enemies = [];
let controls = {
    left: false,
    right: false,
    jump: false
};

// DOM Elements
const gameArea = document.getElementById('gameArea');
const scoreEl = document.getElementById('score');
const altitudeEl = document.getElementById('altitude');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverScreen = document.getElementById('gameOver');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnJump = document.getElementById('btnJump');

// Initialize Game
function initGame() {
    gameState.playerX = GAME_WIDTH / 2;
    gameState.playerY = GAME_HEIGHT - 150;
    gameState.playerVelY = 0;
    gameState.cameraY = 0;
    gameState.score = 0;
    gameState.maxHeight = 0;
    
    platforms = [];
    enemies = [];
    
    // Generate starting platforms
    for (let i = 0; i < 10; i++) {
        platforms.push({
            x: Math.random() * (GAME_WIDTH - 100),
            y: GAME_HEIGHT - 150 - i * 80,
            width: 100,
            height: 15
        });
    }
    
    // Generate enemies
    for (let i = 0; i < 3; i++) {
        enemies.push({
            x: Math.random() * GAME_WIDTH,
            y: GAME_HEIGHT - 300 - i * 150,
            width: 25,
            height: 25,
            direction: Math.random() > 0.5 ? 1 : -1,
            speed: 2
        });
    }
}

// Setup Controls
function setupControls() {
    // Touch events for mobile
    if (btnLeft) {
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault();
            controls.left = true;
        });
        btnLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            controls.left = false;
        });
    }
    
    if (btnRight) {
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            controls.right = true;
        });
        btnRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            controls.right = false;
        });
    }
    
    if (btnJump) {
        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            controls.jump = true;
        });
        btnJump.addEventListener('touchend', (e) => {
            e.preventDefault();
            controls.jump = false;
        });
    }
    
    // Mouse events for testing
    if (btnLeft) {
        btnLeft.addEventListener('mousedown', () => controls.left = true);
        btnLeft.addEventListener('mouseup', () => controls.left = false);
    }
    
    if (btnRight) {
        btnRight.addEventListener('mousedown', () => controls.right = true);
        btnRight.addEventListener('mouseup', () => controls.right = false);
    }
    
    if (btnJump) {
        btnJump.addEventListener('mousedown', () => controls.jump = true);
        btnJump.addEventListener('mouseup', () => controls.jump = false);
    }
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'a' || e.key === 'A') controls.left = true;
        if (e.key === 'd' || e.key === 'D') controls.right = true;
        if (e.key === ' ') {
            e.preventDefault();
            controls.jump = true;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'a' || e.key === 'A') controls.left = false;
        if (e.key === 'd' || e.key === 'D') controls.right = false;
        if (e.key === ' ') controls.jump = false;
    });
}

// Update Game Logic
function updateGame() {
    if (!gameState.active || gameState.paused) return;
    
    // Movement
    if (controls.left) gameState.playerX -= MOVE_SPEED;
    if (controls.right) gameState.playerX += MOVE_SPEED;
    
    // Boundaries
    if (gameState.playerX < 0) gameState.playerX = 0;
    if (gameState.playerX + PLAYER_SIZE > GAME_WIDTH) gameState.playerX = GAME_WIDTH - PLAYER_SIZE;
    
    // Gravity
    gameState.playerVelY += GRAVITY;
    gameState.playerY += gameState.playerVelY;
    
    // Platform collision
    for (let platform of platforms) {
        if (gameState.playerVelY > 0 &&
            gameState.playerY + PLAYER_SIZE <= platform.y + 10 &&
            gameState.playerY + PLAYER_SIZE >= platform.y - 10 &&
            gameState.playerX + PLAYER_SIZE > platform.x &&
            gameState.playerX < platform.x + platform.width) {
            
            gameState.playerY = platform.y - PLAYER_SIZE;
            gameState.playerVelY = 0;
            
            if (controls.jump) {
                gameState.playerVelY = -JUMP_POWER;
            }
        }
    }
    
    // Enemy collision
    for (let enemy of enemies) {
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x < 0 || enemy.x + enemy.width > GAME_WIDTH) {
            enemy.direction *= -1;
        }
        
        if (gameState.playerX < enemy.x + enemy.width &&
            gameState.playerX + PLAYER_SIZE > enemy.x &&
            gameState.playerY < enemy.y + enemy.height &&
            gameState.playerY + PLAYER_SIZE > enemy.y) {
            endGame();
            return;
        }
    }
    
    // Update camera
    gameState.cameraY = Math.max(0, gameState.playerY - GAME_HEIGHT / 3);
    
    // Update score and altitude
    const altitude = Math.max(0, GAME_HEIGHT - 150 - gameState.playerY);
    gameState.maxHeight = Math.max(gameState.maxHeight, altitude);
    gameState.score = Math.floor(altitude / 10);
    
    // Generate new platforms
    if (gameState.playerY < platforms[platforms.length - 1].y - GAME_HEIGHT) {
        for (let i = 0; i < 5; i++) {
            platforms.push({
                x: Math.random() * (GAME_WIDTH - 100),
                y: platforms[platforms.length - 1].y - 80,
                width: 100,
                height: 15
            });
        }
    }
    
    // Remove old platforms
    platforms = platforms.filter(p => p.y > gameState.cameraY - 100);
    
    // Fall off screen
    if (gameState.playerY > gameState.cameraY + GAME_HEIGHT + 50) {
        endGame();
    }
}

// Render Game
function renderGame() {
    gameArea.innerHTML = '';
    
    // Render platforms
    platforms.forEach(p => {
        const screenY = p.y - gameState.cameraY;
        if (screenY > -50 && screenY < GAME_HEIGHT) {
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
    enemies.forEach(e => {
        const screenY = e.y - gameState.cameraY;
        if (screenY > -50 && screenY < GAME_HEIGHT) {
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
    if (playerScreenY > -50 && playerScreenY < GAME_HEIGHT) {
        const el = document.createElement('div');
        el.className = 'player';
        el.style.left = gameState.playerX + 'px';
        el.style.top = playerScreenY + 'px';
        el.textContent = '👤';
        gameArea.appendChild(el);
    }
    
    // Update UI
    scoreEl.textContent = gameState.score;
    altitudeEl.textContent = Math.floor(gameState.maxHeight);
}

// Game Loop
function gameLoop() {
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

// Pause Game
function togglePause() {
    gameState.paused = !gameState.paused;
    pauseMenu.classList.toggle('hidden');
}

// End Game
function endGame() {
    gameState.active = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('maxAltitude').textContent = Math.floor(gameState.maxHeight);
    gameOverScreen.classList.remove('hidden');
}

// Start Game
function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    initGame();
    setupControls();
    gameLoop();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.querySelector('[onclick="showModeScreen()"]');
    if (startBtn) {
        startBtn.onclick = () => startGame();
    }
});
