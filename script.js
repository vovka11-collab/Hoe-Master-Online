// Game variables
const player = document.getElementById('player');
const gameArea = document.getElementById('gameArea');
const gameOverScreen = document.getElementById('gameOver');
const gameWinScreen = document.getElementById('gameWin');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const finalScoreDisplay = document.getElementById('finalScore');
const winScoreDisplay = document.getElementById('winScore');

// Game state
let playerX = 50;
let playerY = 300;
let playerVelocityY = 0;
let playerVelocityX = 0;
let isJumping = false;
let score = 0;
let lives = 3;
let gameActive = true;

// Keyboard controls
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ') {
        e.preventDefault();
        jump();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Physics constants
const GRAVITY = 0.6;
const JUMP_POWER = 15;
const MOVE_SPEED = 5;
const MAX_FALL_SPEED = 20;
const GAME_WIDTH = gameArea.offsetWidth;
const GAME_HEIGHT = gameArea.offsetHeight;

// Platform data
const platforms = [
    { x: 50, y: GAME_HEIGHT - 100, width: 150, height: 20 },
    { x: GAME_WIDTH - 200, y: GAME_HEIGHT - 220, width: 150, height: 20 },
    { x: GAME_WIDTH / 2 - 100, y: GAME_HEIGHT - 350, width: 200, height: 20 },
    { x: 50, y: GAME_HEIGHT - 480, width: 150, height: 20 }
];

// Enemy data
const enemies = [
    { x: GAME_WIDTH - 150, y: GAME_HEIGHT - 240, width: 35, height: 35, direction: 1, speed: 2 },
    { x: 100, y: GAME_HEIGHT - 520, width: 35, height: 35, direction: 1, speed: 1.5 }
];

// Coin data
const coins = [
    { x: GAME_WIDTH - 150, y: GAME_HEIGHT - 320, width: 25, height: 25, collected: false },
    { x: GAME_WIDTH / 2 - 50, y: GAME_HEIGHT - 470, width: 25, height: 25, collected: false },
    { x: 150, y: GAME_HEIGHT - 120, width: 25, height: 25, collected: false }
];

// Update positions
function update() {
    if (!gameActive) return;

    // Horizontal movement
    playerVelocityX = 0;
    if (keys['a'] || keys['arrowleft']) {
        playerVelocityX = -MOVE_SPEED;
    }
    if (keys['d'] || keys['arrowright']) {
        playerVelocityX = MOVE_SPEED;
    }

    playerX += playerVelocityX;

    // Boundaries
    if (playerX < 0) playerX = 0;
    if (playerX + 40 > GAME_WIDTH) playerX = GAME_WIDTH - 40;

    // Gravity
    playerVelocityY += GRAVITY;
    if (playerVelocityY > MAX_FALL_SPEED) {
        playerVelocityY = MAX_FALL_SPEED;
    }

    playerY += playerVelocityY;

    // Check platform collisions
    let onPlatform = false;
    for (let platform of platforms) {
        if (
            playerVelocityY >= 0 &&
            playerY + 50 <= platform.y + 5 &&
            playerY + 50 >= platform.y - 10 &&
            playerX + 40 > platform.x &&
            playerX < platform.x + platform.width
        ) {
            playerY = platform.y - 50;
            playerVelocityY = 0;
            isJumping = false;
            onPlatform = true;
            break;
        }
    }

    // Check if player fell off screen
    if (playerY > GAME_HEIGHT) {
        lives--;
        livesDisplay.textContent = lives;
        if (lives <= 0) {
            endGame();
        } else {
            resetPlayerPosition();
        }
    }

    // Update enemies
    for (let enemy of enemies) {
        enemy.x += enemy.speed * enemy.direction;

        // Bounce enemies off walls
        if (enemy.x <= 0 || enemy.x + enemy.width >= GAME_WIDTH) {
            enemy.direction *= -1;
        }

        // Check collision with player
        if (checkCollision(playerX, playerY, 40, 50, enemy.x, enemy.y, enemy.width, enemy.height)) {
            lives--;
            livesDisplay.textContent = lives;
            if (lives <= 0) {
                endGame();
            } else {
                resetPlayerPosition();
            }
        }
    }

    // Check coin collection
    for (let coin of coins) {
        if (!coin.collected && checkCollision(playerX, playerY, 40, 50, coin.x, coin.y, coin.width, coin.height)) {
            coin.collected = true;
            score += 10;
            scoreDisplay.textContent = score;
            
            // Hide coin
            const coinElement = document.getElementById(`coin${coins.indexOf(coin) + 1}`);
            if (coinElement) {
                coinElement.style.display = 'none';
            }

            // Check if all coins collected
            if (coins.every(c => c.collected)) {
                winGame();
            }
        }
    }

    render();
}

// Jump function
function jump() {
    if (!isJumping && gameActive) {
        playerVelocityY = -JUMP_POWER;
        isJumping = true;
        player.classList.add('jumping');
    }
}

// Collision detection
function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

// Render function
function render() {
    player.style.left = playerX + 'px';
    player.style.bottom = (GAME_HEIGHT - playerY - 50) + 'px';

    // Render enemies
    enemies.forEach((enemy, index) => {
        const enemyElement = document.getElementById(`enemy${index + 1}`);
        if (enemyElement) {
            enemyElement.style.left = enemy.x + 'px';
            enemyElement.style.bottom = (GAME_HEIGHT - enemy.y - enemy.height) + 'px';
        }
    });

    // Render coins
    coins.forEach((coin, index) => {
        const coinElement = document.getElementById(`coin${index + 1}`);
        if (coinElement && !coin.collected) {
            coinElement.style.left = coin.x + 'px';
            coinElement.style.bottom = (GAME_HEIGHT - coin.y - coin.height) + 'px';
        }
    });
}

// Reset player position
function resetPlayerPosition() {
    playerX = 50;
    playerY = 300;
    playerVelocityY = 0;
    playerVelocityX = 0;
    isJumping = false;
    player.classList.remove('jumping');
}

// End game
function endGame() {
    gameActive = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Win game
function winGame() {
    gameActive = false;
    winScoreDisplay.textContent = score;
    gameWinScreen.classList.remove('hidden');
}

// Game loop
function gameLoop() {
    update();
    requestAnimationFrame(gameLoop);
}

// Start game
render();
gameLoop();
