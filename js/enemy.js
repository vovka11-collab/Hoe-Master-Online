// ===== ПРОТИВНИК =====

class Enemy {
  constructor(x, y, level = 1) {
    this.x = x;
    this.y = y;
    this.w = 35;
    this.h = 45;
    this.level = level;
    
    this.hp = 2 + level;
    this.damage = 1 + Math.floor(level / 2);
    this.speed = 1 + level * 0.3;
    
    this.vx = this.speed;
    this.vy = 0;
    this.gravity = 0.6;
    this.onGround = false;
    
    this.patrolStart = x - 100;
    this.patrolEnd = x + 100;
    this.facingRight = true;
    
    this.dead = false;
    this.hitFlash = 0;
    
    this.animFrame = 0;
    this.animTimer = 0;
  }

  update(platforms, players) {
    if (this.dead) return;

    // Патрулирование
    if (this.x <= this.patrolStart) {
      this.vx = this.speed;
      this.facingRight = true;
    } else if (this.x >= this.patrolEnd) {
      this.vx = -this.speed;
      this.facingRight = false;
    }

    // Гравитация
    this.vy += this.gravity;
    
    // Движение
    this.x += this.vx;
    this.y += this.vy;

    // Коллизии с платформами
    this.onGround = false;
    for (const plat of platforms) {
      if (Utils.rectCollision(this, plat)) {
        if (this.vy > 0 && this.y + this.h - this.vy <= plat.y + 5) {
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
    }

    // Преследование ближайшего игрока
    let closestPlayer = null;
    let closestDist = 200;
    
    for (const p of players) {
      const d = Utils.dist(this.x, this.y, p.x, p.y);
      if (d < closestDist) {
        closestDist = d;
        closestPlayer = p;
      }
    }

    if (closestPlayer && closestDist < 150) {
      if (closestPlayer.x > this.x) {
        this.vx = this.speed * 1.5;
        this.facingRight = true;
      } else {
        this.vx = -this.speed * 1.5;
        this.facingRight = false;
      }
    }

    // Анимация
    this.animTimer++;
    if (this.animTimer > 10) {
      this.animTimer = 0;
      this.animFrame++;
    }

    if (this.hitFlash > 0) this.hitFlash--;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 5;
    
    if (this.hp <= 0) {
      this.dead = true;
      // Шанс выпадения сундука
      if (Math.random() < 0.1) {
        // Создать сундук на месте смерти
      }
    }
  }

  render(ctx, cameraX) {
    if (this.dead) return;
    
    const sx = this.x - cameraX;
    
    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + this.w/2, this.y + this.h + 2, this.w/2, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Тело (временно прямоугольник)
    ctx.fillStyle = this.hitFlash > 0 ? '#FFF' : '#8B0000';
    ctx.fillRect(sx, this.y, this.w, this.h);

    // Глаза
    ctx.fillStyle = '#FF6B6B';
    const eyeOff = this.facingRight ? 4 : -4;
    ctx.fillRect(sx + this.w/2 + eyeOff - 2, this.y + 10, 5, 5);

    // HP полоска
    const hpW = 30;
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + this.w/2 - hpW/2, this.y - 8, hpW, 3);
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(sx + this.w/2 - hpW/2, this.y - 8, hpW * (this.hp / (2 + this.level)), 3);
  }
}
