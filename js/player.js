class Player {
  constructor(id, nickname, color, isLocal = false) {
    this.id = id;
    this.nickname = nickname;
    this.color = color;
    this.isLocal = isLocal;

    this.x = 60;
    this.y = 100;
    this.w = 32;
    this.h = 48;

    // Физика
    this.vx = 0;
    this.vy = 0;
    this.speed = 4;
    this.jumpPower = 13;
    this.wallJumpPower = { x: 6, y: 11 };
    this.gravity = 0.5;
    this.friction = 0.85;
    this.airFriction = 0.95;
    
    this.onGround = false;
    this.onWall = false;        // Прилипание к стене
    this.wallDirection = 0;     // -1 левая стена, 1 правая
    this.wallSlide = false;
    this.wallSlideGravity = 0.15; // Медленное скольжение по стене
    
    this.facingRight = true;
    this.groundPounding = false; // Удар снизу

    // HP
    this.maxHp = 5;
    this.hp = this.maxHp;

    // Тяпка
    this.hoeLevel = 1;
    this.hoeDamage = 1;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.attackFrame = 0;

    // Анимация
    this.animFrame = 0;
    this.animTimer = 0;
    this.state = 'idle';

    // Интерполяция
    this.targetX = this.x;
    this.targetY = this.y;
  }

  update(input, room, enemies, dt) {
    if (!this.isLocal) {
      this.x = Utils.lerp(this.x, this.targetX, 0.2);
      this.y = Utils.lerp(this.y, this.targetY, 0.2);
      return;
    }

    // === ДВИЖЕНИЕ ===
    if (input.left) {
      this.vx -= 0.8;
      this.facingRight = false;
    }
    if (input.right) {
      this.vx += 0.8;
      this.facingRight = true;
    }

    // Трение
    if (this.onGround) {
      this.vx *= this.friction;
    } else {
      this.vx *= this.airFriction;
    }

    // Ограничение скорости
    this.vx = Utils.clamp(this.vx, -this.speed, this.speed);

    // === ПРЫЖОК ===
    if (input.jump) {
      if (this.onGround) {
        this.vy = -this.jumpPower;
        this.onGround = false;
      } else if (this.onWall && !this.wallSlide) {
        // Wall jump
        this.vy = -this.wallJumpPower.y;
        this.vx = this.wallDirection * this.wallJumpPower.x;
        this.onWall = false;
      }
    }

    // === СКОЛЬЖЕНИЕ ПО СТЕНЕ ===
    if (this.onWall && !this.onGround && this.vy > 0) {
      // Если зажат стик в сторону стены — скользим
      if ((this.wallDirection === -1 && input.left) || 
          (this.wallDirection === 1 && input.right)) {
        this.wallSlide = true;
        this.vy = Math.min(this.vy, 2); // Медленное падение
      } else {
        this.wallSlide = false;
      }
    } else {
      this.wallSlide = false;
    }

    // === ГРАВИТАЦИЯ ===
    if (this.wallSlide) {
      this.vy += this.wallSlideGravity;
    } else {
      this.vy += this.gravity;
    }

    // === GROUND POUND (убийство снизу) ===
    if (input.attack && !this.onGround && this.vy > 2 && !input.left && !input.right) {
      this.groundPounding = true;
      this.vy = 12; // Ускоренное падение
    }

    // === ОБЫЧНАЯ АТАКА ===
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (input.attack && this.attackCooldown <= 0 && !this.groundPounding) {
      this.attack(room, enemies);
    }

    // === ПРИМЕНЕНИЕ СКОРОСТИ ===
    this.x += this.vx;
    this.y += this.vy;

    // === КОЛЛИЗИИ СО СТЕНАМИ И ПЛАТФОРМАМИ ===
    this.onGround = false;
    this.onWall = false;
    this.wallDirection = 0;

    for (const plat of room.platforms) {
      this.resolveCollision(plat);
    }

    // === ШИПЫ ===
    if (room.isSpike(this.x, this.y, this.w, this.h)) {
      this.die();
      return;
    }

    // === ВЫХОД ===
    if (room.isExit(this.x, this.y, this.w, this.h)) {
      if (Game.instance) Game.instance.nextRoom();
    }

    // === ПАДЕНИЕ В ПРОПАСТЬ ===
    if (this.y > room.height + 100) {
      this.die();
      return;
    }

    // === GROUND POUND УБИЙСТВО ===
    if (this.groundPounding && this.onGround) {
      this.groundPounding = false;
      // Ударная волна — убивает врагов рядом
      for (const enemy of enemies) {
        if (!enemy.dead && Utils.dist(this.x + this.w/2, this.y + this.h, enemy.x + enemy.w/2, enemy.y + enemy.h/2) < 80) {
          enemy.takeDamage(999); // Мгновенная смерть врагу
        }
      }
    }

    // === УРОН ОТ ВРАГОВ ===
    for (const enemy of enemies) {
      if (!enemy.dead && Utils.rectCollision(this, enemy)) {
        if (this.groundPounding && this.vy > 5) {
          // Ground pound на врага — убиваем
          enemy.takeDamage(999);
          this.vy = -8; // Отскок
        } else if (!this.isAttacking) {
          this.takeDamage(enemy.damage);
          this.vx = enemy.x > this.x ? -6 : 6;
          this.vy = -4;
        }
      }
    }

    // === СУНДУКИ ===
    for (const chest of room.chests) {
      if (!chest.opened && Utils.rectCollision(this, chest)) {
        chest.open(this);
      }
      chest.update();
    }

    // === АНИМАЦИЯ ===
    this.updateAnimation(dt);
  }

  resolveCollision(plat) {
    if (!Utils.rectCollision(this, plat)) return;

    // Перекрытие по осям
    const overlapX = Math.min(this.x + this.w - plat.x, plat.x + plat.w - this.x);
    const overlapY = Math.min(this.y + this.h - plat.y, plat.y + plat.h - this.y);

    if (overlapX < overlapY) {
      // Горизонтальная коллизия — стена
      if (this.x < plat.x) {
        this.x = plat.x - this.w;
        this.onWall = true;
        this.wallDirection = 1;
      } else {
        this.x = plat.x + plat.w;
        this.onWall = true;
        this.wallDirection = -1;
      }
      this.vx = 0;
    } else {
      // Вертикальная коллизия
      if (this.y < plat.y) {
        // Приземление сверху
        this.y = plat.y - this.h;
        this.vy = 0;
        this.onGround = true;
        this.groundPounding = false;
      } else {
        // Удар снизу
        this.y = plat.y + plat.h;
        this.vy = 0;
      }
    }
  }

  attack(room, enemies) {
    this.isAttacking = true;
    this.attackFrame = 0;
    this.attackCooldown = 15;

    const attackBox = {
      x: this.facingRight ? this.x + this.w : this.x - 50,
      y: this.y,
      w: 50,
      h: this.h
    };

    // Проверка попадания
    for (const enemy of enemies) {
      if (!enemy.dead && Utils.rectCollision(attackBox, enemy)) {
        enemy.takeDamage(this.hoeDamage);
      }
    }

    if (Network.connections.size > 0 || !Network.isSoloMode()) {
      Network.sendEvent('attack', {
        x: attackBox.x,
        y: attackBox.y,
        w: attackBox.w,
        h: attackBox.h,
        damage: this.hoeDamage,
        facingRight: this.facingRight
      });
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.state = 'hit';
    if (this.hp <= 0) this.die();
  }

  die() {
    this.hp = 0;
    Network.broadcast({ type: 'playerDied', peerId: this.id });
    if (Game.instance) Game.instance.onPlayerDied(this.id);
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  upgradeHoe() {
    this.hoeLevel++;
    this.hoeDamage = this.hoeLevel;
  }

  updateAnimation(dt) {
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame++;
    }
    
    if (this.onGround && Math.abs(this.vx) > 0.5) this.state = 'run';
    else if (!this.onGround) this.state = this.wallSlide ? 'wallslide' : 'jump';
    else this.state = 'idle';
  }

  setRemoteState(state) {
    this.targetX = state.x;
    this.targetY = state.y;
    this.hp = state.hp;
    this.hoeLevel = state.hoeLevel;
    this.facingRight = state.facingRight;
    this.state = state.state;
  }

  getState() {
    return {
      x: this.x, y: this.y, vx: this.vx, vy: this.vy,
      hp: this.hp, hoeLevel: this.hoeLevel,
      facingRight: this.facingRight, state: this.state,
      isAttacking: this.isAttacking, onGround: this.onGround
    };
  }

  render(ctx, cameraX, cameraY) {
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;

    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx + this.w/2, sy + this.h + 2, this.w/2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Тело
    ctx.fillStyle = this.color;
    ctx.fillRect(sx, sy, this.w, this.h);

    // Глаза
    ctx.fillStyle = 'white';
    const eyeOff = this.facingRight ? 4 : -4;
    ctx.fillRect(sx + this.w/2 + eyeOff - 2, sy + 10, 5, 5);
    ctx.fillRect(sx + this.w/2 + eyeOff + 3, sy + 10, 5, 5);

    // Тяпка
    if (this.isAttacking || this.groundPounding) {
      this.renderHoe(ctx, sx, sy);
    }

    // Ground pound индикатор
    if (this.groundPounding) {
      ctx.fillStyle = 'rgba(255, 107, 107, 0.5)';
      ctx.beginPath();
      ctx.arc(sx + this.w/2, sy + this.h + 10, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ник
    ctx.fillStyle = 'white';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.nickname, sx + this.w/2, sy - 8);

    // HP
    const hpW = 36;
    ctx.fillStyle = '#333';
    ctx.fillRect(sx + this.w/2 - hpW/2, sy - 5, hpW, 4);
    ctx.fillStyle = this.hp > 2 ? '#4ECDC4' : '#FF6B6B';
    ctx.fillRect(sx + this.w/2 - hpW/2, sy - 5, hpW * (this.hp / this.maxHp), 4);
  }

  renderHoe(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx + this.w/2, sy + this.h/2);
    
    let angle = this.facingRight ? -Math.PI/3 : Math.PI + Math.PI/3;
    if (this.groundPounding) angle = Math.PI/2;
    
    ctx.rotate(angle);
    
    // Древко
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-2, -25, 4, 35);
    
    // Лезвие
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(-10, -25);
    ctx.lineTo(10, -25);
    ctx.lineTo(0, -40);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
