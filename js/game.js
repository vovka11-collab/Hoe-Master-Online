// ===== ИГРА =====

class Game {
  constructor() {
    Game.instance = this;
    
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.level = new Level();
    this.players = new Map(); // peerId -> Player
    this.localPlayer = null;
    
    this.camera = { x: 0, y: 0 };
    this.gameState = 'lobby'; // lobby, playing, dead
    
    this.lastTime = 0;
    this.networkSyncTimer = 0;

    this.setupNetworkHandlers();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupNetworkHandlers() {
    Network.onPlayerJoin = (peerId, metadata) => {
      console.log('Player joined:', metadata.nickname);
      const player = new Player(peerId, metadata.nickname, metadata.color, false);
      this.players.set(peerId, player);
      this.updateUI();
    };

    Network.onPlayerLeave = (peerId) => {
      this.players.delete(peerId);
      this.updateUI();
    };

    Network.onDataReceived = (fromPeerId, data) => {
      this.handleNetworkData(fromPeerId, data);
    };
  }

  handleNetworkData(fromPeerId, data) {
    switch(data.type) {
      case 'playerState':
        const remotePlayer = this.players.get(data.peerId);
        if (remotePlayer) {
          remotePlayer.setRemoteState(data.state);
        }
        break;

      case 'playerDamaged':
        const p = this.players.get(data.peerId);
        if (p) p.hp = data.hp;
        this.updateUI();
        break;

      case 'playerDied':
        this.onPlayerDied(data.peerId);
        break;

      case 'chestOpened':
        // Найти и открыть сундук
        for (const chest of this.level.chests) {
          if (chest.getId() === data.chestId) {
            chest.opened = true;
            break;
          }
        }
        break;

      case 'gameState':
        // Полное состояние от хоста (для новых игроков)
        if (data.data.level) {
          this.level.platforms = data.data.level.platforms;
          this.level.rooms = data.data.level.rooms;
        }
        break;

      case 'event':
        if (data.eventType === 'attack') {
          // Визуализация атаки удалённого игрока
          const attacker = this.players.get(data.peerId);
          if (attacker) {
            attacker.isAttacking = true;
            attacker.attackFrame = 0;
          }
          // Проверка попадания по врагам (если я хост)
          if (Network.isHost) {
            this.checkAttackHit(data.data);
          }
        }
        break;

      case 'playerList':
        this.updatePlayerList(data.players);
        break;
    }
  }

  updatePlayerList(players) {
    const list = document.getElementById('connected-players');
    const count = document.getElementById('player-count');
    list.innerHTML = '';
    count.textContent = players.length;

    for (const p of players) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="player-dot" style="background:${p.color}"></span>${p.nickname}`;
      list.appendChild(li);
    }
  }

  start(nickname, color) {
    // Сохраняем данные игрока
    Utils.save('player', { nickname, color });

    // Создаём локального игрока
    this.localPlayer = new Player(Network.myId, nickname, color, true);
    this.players.set(Network.myId, this.localPlayer);

    // Генерируем уровень
    this.level.generateInitial();

    // UI
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('death-screen').style.display = 'none';
    
    this.gameState = 'playing';
    this.updateUI();

    // Запускаем игровой цикл
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(timestamp) {
    if (this.gameState !== 'playing') return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Обновление локального игрока
    const nearbyPlatforms = this.level.getPlatformsInRange(this.localPlayer.x, 800);
    const nearbyEnemies = this.level.getEnemiesInRange(this.localPlayer.x, 800);
    
    this.localPlayer.update(Input, nearbyPlatforms, nearbyEnemies, dt);

    // Проверка столкновения с врагами (урон игроку)
    for (const enemy of nearbyEnemies) {
      if (!enemy.dead && Utils.rectCollision(this.localPlayer, enemy)) {
        this.localPlayer.takeDamage(enemy.damage);
        // Отбрасывание
        this.localPlayer.vx = enemy.x > this.localPlayer.x ? -8 : 8;
        this.localPlayer.vy = -5;
      }
    }

    // Проверка столкновения с сундуками
    const nearbyChests = this.level.getChestsInRange(this.localPlayer.x, 100);
    for (const chest of nearbyChests) {
      if (Utils.rectCollision(this.localPlayer, chest)) {
        chest.open(this.localPlayer);
      }
      chest.update();
    }

    // Обновление врагов
    const allPlayers = Array.from(this.players.values());
    for (const enemy of this.level.enemies) {
      enemy.update(nearbyPlatforms, allPlayers);
    }

    // Обновление удалённых игроков (интерполяция уже внутри)
    for (const player of this.players.values()) {
      if (!player.isLocal) {
        player.update(null, nearbyPlatforms, nearbyEnemies, dt);
      }
    }

    // Генерация новых комнат
    this.level.addRoomIfNeeded(this.localPlayer.x);

    // Камера следует за игроком
    const targetCamX = this.localPlayer.x - this.canvas.width / 3;
    this.camera.x = Utils.lerp(this.camera.x, targetCamX, 0.1);
    this.camera.x = Math.max(0, this.camera.x);

    // Синхронизация по сети (20 раз в секунду)
    this.networkSyncTimer += dt;
    if (this.networkSyncTimer > 0.05) {
      this.networkSyncTimer = 0;
      Network.sendPlayerState(this.localPlayer.getState());
    }

    this.updateUI();
  }

  checkAttackHit(attackData) {
    // Хост проверяет попадания по врагам
    for (const enemy of this.level.enemies) {
      if (!enemy.dead && Utils.rectCollision(
        { x: attackData.x, y: attackData.y, w: attackData.w, h: attackData.h },
        enemy
      )) {
        enemy.takeDamage(attackData.damage);
        
        // Отправляем результат всем
        Network.broadcast({
          type: 'enemyDamaged',
          enemyId: this.level.enemies.indexOf(enemy),
          hp: enemy.hp,
          dead: enemy.dead
        });
      }
    }
  }

  onPlayerDied(peerId) {
    this.gameState = 'dead';
    document.getElementById('death-screen').style.display = 'flex';
    
    // Через 3 секунды автоперезапуск (или по кнопке)
    setTimeout(() => {
      this.restart();
    }, 3000);
  }

  restart() {
    // Сброс всех игроков в начало
    for (const player of this.players.values()) {
      player.x = 100;
      player.y = 300;
      player.hp = player.maxHp;
      player.vx = 0;
      player.vy = 0;
    }

    // Перегенерация уровня (новые комнаты)
    this.level.generateInitial();

    document.getElementById('death-screen').style.display = 'none';
    this.gameState = 'playing';
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  getFullState() {
    return {
      level: {
        platforms: this.level.platforms,
        rooms: this.level.rooms
      },
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        state: p.getState()
      }))
    };
  }
    onHostDisconnected() {
    // Хост отключился — все враги и мир остаются, но мультиплеер выключен
    Network.switchToSoloMode();
    
    // Удаляем всех удалённых игроков
    for (const [peerId, player] of this.players) {
      if (!player.isLocal) {
        this.players.delete(peerId);
      }
    }
    
    this.updateUI();
  }

  updateUI() {
    // HP локального игрока
    const hpBar = document.getElementById('hp-bar');
    hpBar.innerHTML = '';
    for (let i = 0; i < this.localPlayer.maxHp; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart' + (i >= this.localPlayer.hp ? ' empty' : '');
      hpBar.appendChild(heart);
    }

    // HP всех игроков
    const playersHp = document.getElementById('players-hp');
    playersHp.innerHTML = '';
    for (const player of this.players.values()) {
      const div = document.createElement('div');
      div.className = 'player-hp';
      
      const hearts = [];
      for (let i = 0; i < player.maxHp; i++) {
        hearts.push(i >= player.hp ? 'empty' : 'full');
      }
      
      div.innerHTML = `
        <div class="name" style="color:${player.color}">${player.nickname}</div>
        <div class="hearts">
          ${hearts.map(h => `<div class="heart ${h}"></div>`).join('')}
        </div>
      `;
      playersHp.appendChild(div);
    }

    // Уровень тяпки
    document.querySelector('#hoe-level span').textContent = this.localPlayer.hoeLevel;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Уровень
    this.level.render(ctx, this.camera.x);

    // Сундуки
    for (const chest of this.level.chests) {
      if (Math.abs(chest.x - this.camera.x) < this.canvas.width + 200) {
        chest.render(ctx, this.camera.x);
      }
    }

    // Враги
    for (const enemy of this.level.enemies) {
      if (Math.abs(enemy.x - this.camera.x) < this.canvas.width + 200) {
        enemy.render(ctx, this.camera.x);
      }
    }

    // Игроки (отсортированы по Y для псевдо-3D)
    const sortedPlayers = Array.from(this.players.values())
      .sort((a, b) => a.y - b.y);
    
    for (const player of sortedPlayers) {
      if (Math.abs(player.x - this.camera.x) < this.canvas.width + 200) {
        player.render(ctx, this.camera.x);
      }
    }
  }
}

// Глобальный экземпляр
let GameInstance = null;
