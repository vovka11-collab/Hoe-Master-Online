// ===== СУНДУК =====

class Chest {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 35;
    this.opened = false;
    this.opening = false;
    this.openFrame = 0;
    
    // Тип награды
    this.rewardType = Math.random() < 0.5 ? 'hoe' : 'heal';
    this.rewardValue = this.rewardType === 'hoe' ? 1 : 2;
  }

  open(player) {
    if (this.opened || this.opening) return false;
    
    this.opening = true;
    
    // Применяем награду
    if (this.rewardType === 'hoe') {
      player.upgradeHoe();
    } else {
      player.heal(this.rewardValue);
    }

    // Отправляем по сети
    Network.broadcast({
      type: 'chestOpened',
      chestId: this.getId(),
      rewardType: this.rewardType,
      byPlayer: player.id
    });

    return true;
  }

  getId() {
    return `chest_${Math.floor(this.x)}_${Math.floor(this.y)}`;
  }

  update() {
    if (this.opening) {
      this.openFrame++;
      if (this.openFrame > 10) {
        this.opening = false;
        this.opened = true;
      }
    }
  }

  render(ctx, cameraX) {
    const sx = this.x - cameraX;
    
    // Свечение
    if (!this.opened) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;
    }

    // Корпус сундука
    ctx.fillStyle = this.opened ? '#8B6914' : '#DAA520';
    ctx.fillRect(sx, this.y, this.w, this.h);
    
    // Крышка
    const lidAngle = this.opening ? -this.openFrame * 3 : 0;
    ctx.save();
    ctx.translate(sx, this.y);
    ctx.rotate(lidAngle * Math.PI / 180);
    ctx.fillStyle = this.opened ? '#8B6914' : '#FFD700';
    ctx.fillRect(0, -5, this.w, 8);
    ctx.restore();

    // Замок
    if (!this.opened) {
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(sx + this.w/2 - 4, this.y + this.h/2 - 4, 8, 8);
    }

    ctx.shadowBlur = 0;

    // Иконка награды (плавающая)
    if (this.opening && this.openFrame > 5) {
      const floatY = this.y - this.openFrame * 2;
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.rewardType === 'hoe' ? '🌾' : '❤️', sx + this.w/2, floatY);
    }
  }
}
