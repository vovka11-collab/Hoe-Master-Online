// ===== КОМНАТА-ЛАБИРИНТ =====

class Room {
  constructor(index) {
    this.index = index;
    this.width = 800 + index * 200;  // Комнаты растут
    this.height = 600 + index * 100;
    this.tileSize = 40;
    
    this.tiles = [];        // 2D массив: 0=воздух, 1=стена, 2=платформа, 3=шипы, 4=выход
    this.platforms = [];    // Для коллизий
    this.spikes = [];       // Шипы — мгновенная смерть
    this.enemies = [];
    this.chests = [];
    this.exit = { x: 0, y: 0 };
    this.spawn = { x: 60, y: 100 };
    
    this.generate();
  }

  generate() {
    const cols = Math.ceil(this.width / this.tileSize);
    const rows = Math.ceil(this.height / this.tileSize);
    
    // Инициализация пустой комнаты
    this.tiles = Array(rows).fill(null).map(() => Array(cols).fill(0));
    
    // Границы — стены
    for (let x = 0; x < cols; x++) {
      this.tiles[0][x] = 1;
      this.tiles[rows-1][x] = 1;
    }
    for (let y = 0; y < rows; y++) {
      this.tiles[y][0] = 1;
      this.tiles[y][cols-1] = 1;
    }
    
    // Случайные платформы и стены (лабиринт)
    const complexity = 3 + Math.floor(this.index / 2);
    for (let i = 0; i < complexity * 5; i++) {
      const x = Utils.randInt(2, cols - 4);
      const y = Utils.randInt(2, rows - 4);
      const w = Utils.randInt(2, 6);
      const h = Utils.randInt(1, 4);
      
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (y + dy < rows - 1 && x + dx < cols - 1) {
            this.tiles[y + dy][x + dx] = 1;
          }
        }
      }
    }
    
    // Платформы-прыгалки (можно стоять)
    const platformCount = 5 + this.index * 2;
    for (let i = 0; i < platformCount; i++) {
      const x = Utils.randInt(3, cols - 5);
      const y = Utils.randInt(4, rows - 6);
      const w = Utils.randInt(2, 5);
      
      for (let dx = 0; dx < w; dx++) {
        this.tiles[y][x + dx] = 2;
      }
    }
    
    // Шипы внизу (опасные зоны)
    const spikeCount = Math.floor(this.index / 3);
    for (let i = 0; i < spikeCount; i++) {
      const x = Utils.randInt(2, cols - 4);
      const y = rows - 2;
      this.tiles[y][x] = 3;
      this.tiles[y][x+1] = 3;
    }
    
    // Выход (в правом верхнем углу)
    this.exit.x = (cols - 3) * this.tileSize;
    this.exit.y = 2 * this.tileSize;
    this.tiles[2][cols - 3] = 4;
    this.tiles[2][cols - 2] = 4;
    
    // Спавн (левый верх)
    this.spawn.x = 2 * this.tileSize;
    this.spawn.y = 2 * this.tileSize;
    
    // Конвертируем тайлы в платформы для коллизий
    this.buildPlatforms();
    
    // Враги
    const enemyCount = 2 + Math.floor(this.index / 2);
    for (let i = 0; i < enemyCount; i++) {
      let ex, ey;
      do {
        ex = Utils.randInt(100, this.width - 100);
        ey = Utils.randInt(100, this.height - 100);
      } while (this.isSolid(ex, ey));
      
      this.enemies.push(new Enemy(ex, ey, 1 + Math.floor(this.index / 3)));
    }
    
    // Сундуки (1-2 на комнату)
    const chestCount = Utils.randInt(1, 3);
    for (let i = 0; i < chestCount; i++) {
      let cx, cy;
      do {
        cx = Utils.randInt(100, this.width - 100);
        cy = Utils.randInt(100, this.height - 100);
      } while (this.isSolid(cx, cy));
      
      this.chests.push(new Chest(cx, cy));
    }
  }

  buildPlatforms() {
    this.platforms = [];
    this.spikes = [];
    
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const tile = this.tiles[y][x];
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        
        if (tile === 1 || tile === 2) {
          // Стена или платформа — твёрдая
          this.platforms.push({
            x: px,
            y: py,
            w: this.tileSize,
            h: this.tileSize,
            type: tile === 1 ? 'wall' : 'platform'
          });
        } else if (tile === 3) {
          // Шипы
          this.spikes.push({
            x: px,
            y: py,
            w: this.tileSize,
            h: this.tileSize
          });
        }
      }
    }
  }

  isSolid(x, y) {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    if (ty < 0 || ty >= this.tiles.length) return false;
    if (tx < 0 || tx >= this.tiles[ty].length) return false;
    return this.tiles[ty][tx] === 1 || this.tiles[ty][tx] === 2;
  }

  isSpike(x, y, w, h) {
    for (const spike of this.spikes) {
      if (Utils.rectCollision({ x, y, w, h }, spike)) return true;
    }
    return false;
  }

  isExit(x, y, w, h) {
    const ex = this.exit.x;
    const ey = this.exit.y;
    return (
      x < ex + this.tileSize * 2 &&
      x + w > ex &&
      y < ey + this.tileSize * 2 &&
      y + h > ey
    );
  }

  // Демонстрация комнаты (показываем всю комнату сверху)
  getPreviewData() {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      tileSize: this.tileSize,
      exit: this.exit,
      spawn: this.spawn,
      enemyCount: this.enemies.length,
      chestCount: this.chests.length
    };
  }

  render(ctx, cameraX, cameraY) {
    const startCol = Math.floor(cameraX / this.tileSize);
    const endCol = startCol + Math.ceil(ctx.canvas.width / this.tileSize) + 1;
    const startRow = Math.floor(cameraY / this.tileSize);
    const endRow = startRow + Math.ceil(ctx.canvas.height / this.tileSize) + 1;

    for (let y = Math.max(0, startRow); y < Math.min(this.tiles.length, endRow); y++) {
      for (let x = Math.max(0, startCol); x < Math.min(this.tiles[y].length, endCol); x++) {
        const tile = this.tiles[y][x];
        const px = x * this.tileSize - cameraX;
        const py = y * this.tileSize - cameraY;

        if (tile === 0) continue;

        switch(tile) {
          case 1: // Стена
            ctx.fillStyle = '#5a4a3a';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            // Кирпичная текстура
            ctx.fillStyle = '#6b5b4b';
            ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
            break;
            
          case 2: // Платформа
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(px, py, this.tileSize, 4);
            break;
            
          case 3: // Шипы
            ctx.fillStyle = '#333';
            ctx.fillRect(px, py + this.tileSize/2, this.tileSize, this.tileSize/2);
            // Шипы
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.moveTo(px + 5, py + this.tileSize/2);
            ctx.lineTo(px + this.tileSize/2, py);
            ctx.lineTo(px + this.tileSize - 5, py + this.tileSize/2);
            ctx.fill();
            break;
            
          case 4: // Выход
            ctx.fillStyle = `rgba(78, 205, 196, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
            ctx.fillRect(px, py, this.tileSize * 2, this.tileSize * 2);
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('EXIT', px + this.tileSize, py + this.tileSize + 4);
            break;
        }
      }
    }
  }
}
