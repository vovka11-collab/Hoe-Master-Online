// ===== ИГРА =====

class Game {
  constructor() {
    Game.instance = this;
    
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.roomIndex = 0;
    this.room = null;
    this.players = new Map();
    this.localPlayer = null;
    
    this.camera = { x: 0, y: 0 };
    this.gameState = 'lobby';
    
    this.lastTime = 0;
    this.previewTimer = 0;
    this.previewDuration = 3;

    this.setupNetworkHandlers();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupNetworkHandlers() {
    Network.onPlayerJoin = (peerId, meta) => {
      const p = new Player(peerId, meta.nickname || 'Player', meta.color || '#888', false);
      if (this.room) {
        p.x = this.room.spawn.x;
        p.y = this.room.spawn.y;
      }
      this.players.set(peerId, p);
      this.updateUI();
    };

    Network.onPlayerLeave = (peerId) => {
      this.players.delete(peerId);
      this.updateUI();
    };

    Network.onDataReceived = (from, data) => {
      this.handleNetworkData(from, data);
    };
  }

  handleNetworkData(from, data) {
    switch(data.type) {
      case 'playerState':
        const rp = this.players.get(data.peerId);
        if (rp) rp.setRemoteState(data.state);
        break;
      case 'playerDied':
        this.onPlayerDied(data.peerId);
        break;
      case 'chestOpened':
        for (const c of this.room.chests) {
          if (c.getId() === data.chestId) {
            c.opened = true;
            for (const p of this.players.values()) p.heal(1);
            break;
          }
        }
        break;
      case 'nextRoom':
        this.loadRoom(data.roomIndex);
        break;
      case 'playerList':
        this.updatePlayerList(data.players);
        break;
      case 'gameState':
        if (data.data && data.data.room) {
          // Восстанавливаем комнату от хоста
        }
        break;
    }
  }

  updatePlayerList(players) {
    const list = document.getElementById('connected-players');
    const count = document.getElementById('player-count');
    if (!list || !count) return;
    
    list.innerHTML = '';
    count.textContent = players.length;

    for (const p of players) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="player-dot" style="background:${p.color}"></span>${p.nickname}`;
      list.appendChild(li);
    }
  }

  start(nickname, color) {
    console.log('Game.start() called');
    
    this.localPlayer = new Player(Network.myId, nickname, color, true);
    this.players.set(Network.myId, this.localPlayer);
    console.log('Local player created');

    const lobby = document.getElementById('lobby-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (lobby) lobby.style.display = 'none';
    if (gameScreen) gameScreen.style.display = 'block';
    console.log('Screens switched');

    this.loadRoom(0);
    console.log('Room loaded, starting loop');
    
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadRoom(index) {
    this.roomIndex = index;
    this.room = new Room(index);
    
    for (const p of this.players.values()) {
      p.x = this.room.spawn.x;
      p.y = this.room.spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.hp = p.maxHp;
    }

    this.gameState = 'preview';
    this.previewTimer = this.previewDuration;
    this.showRoomPreview();
  }

  showRoomPreview() {
    const padding = 20;
    const scaleX = (this.canvas.width - padding * 2) / this.room.width;
    const scaleY = (this.canvas.height - padding * 2) / this.room.height;
    this.previewScale = Math.min(scaleX, scaleY);
    this.previewOffsetX = (this.canvas.width - this.room.width * this.previewScale) / 2;
    this.previewOffsetY = (this.canvas.height - this.room.height * this.previewScale) / 2;
  }

  nextRoom() {
    this.roomIndex++;
    Network.broadcast({ type: 'nextRoom', roomIndex: this.roomIndex });
    this.loadRoom(this.roomIndex);
  }

  loop(timestamp) {
    if (this.gameState === 'lobby') return;
    
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.gameState === 'preview') {
      this.previewTimer -= dt;
      if (this.previewTimer <= 0) {
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    const room = this.room;
    const allPlayers = Array.from(this.players.values());

    this.localPlayer.update(Input, room, room.enemies, dt);

    for (const p of this.players.values()) {
      if (!p.isLocal) {
        p.update(null, room, room.enemies, dt);
      }
    }

    for (const e of room.enemies) {
      e.update(room.platforms, allPlayers);
    }

    // Камера
    const targetCamX = this.localPlayer.x - this.canvas.width / 2;
    const targetCamY = this.localPlayer.y - this.canvas.height / 2;
    this.camera.x = Utils.lerp(this.camera.x, targetCamX, 0.1);
    this.camera.y = Utils.lerp(this.camera.y, targetCamY, 0.1);
    
    this.camera.x = Utils.clamp(this.camera.x, 0, room.width - this.canvas.width);
    this.camera.y = Utils.clamp(this.camera.y, 0, room.height - this.canvas.height);

    if (!Network.isSoloMode()) {
      Network.sendPlayerState(this.localPlayer.getState());
    }

    this.updateUI();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.gameState === 'preview') {
      this.renderPreview(ctx);
      return;
    }

    const cx = this.camera.x;
    const cy = this.camera.y;

    // Сетка
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    this.room.render(ctx, cx, cy);

    for (const c of this.room.chests) {
      c.render(ctx, cx, cy);
    }

    for (const e of this.room.enemies) {
      if (!e.dead) e.render(ctx, cx, cy);
    }

    const sorted = Array.from(this.players.values()).sort((a, b) => a.y - b.y);
    for (const p of sorted) {
      p.render(ctx, cx, cy);
    }

    // Стрелка к выходу
    const exit = this.room.exit;
    const ex = exit.x - cx;
    const ey = exit.y - cy;
    if (ex < 0 || ex > this.canvas.width || ey < 0 || ey > this.canvas.height) {
      const angle = Math.atan2(ey - this.canvas.height/2, ex - this.canvas.width/2);
      const arrowX = this.canvas.width/2 + Math.cos(angle) * 100;
      const arrowY = this.canvas.height/2 + Math.sin(angle) * 100;
      
      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);
      ctx.fillStyle = '#4ECDC4';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-5, 5);
      ctx.fill();
      ctx.restore();
    }

    this.renderUI(ctx);
  }

  renderPreview(ctx) {
    const s = this.previewScale;
    const ox = this.previewOffsetX;
    const oy = this.previewOffsetY;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.room.tiles.length; y++) {
      for (let x = 0; x < this.room.tiles[y].length; x++) {
        const tile = this.room.tiles[y][x];
        const px = ox + x * this.room.tileSize * s;
        const py = oy + y * this.room.tileSize * s;
        const ts = this.room.tileSize * s;

        if (tile === 0) continue;
        
        if (tile === 1) ctx.fillStyle = '#5a4a3a';
        else if (tile === 2) ctx.fillStyle = '#8B7355';
        else if (tile === 3) ctx.fillStyle = '#888';
        else if (tile === 4) ctx.fillStyle = '#4ECDC4';
        
        ctx.fillRect(px, py, ts + 1, ts + 1);
      }
    }

    for (const p of this.players.values()) {
      ctx.fillStyle = p.color;
      ctx.fillRect(ox + p.x * s, oy + p.y * s, p.w * s, p.h * s);
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Комната ${this.roomIndex + 1}`, this.canvas.width/2, 50);
    
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`Врагов: ${this.room.enemies.length}  |  Сундуков: ${this.room.chests.length}`, this.canvas.width/2, 80);
    
    ctx.fillStyle = '#FFEAA7';
    ctx.fillText(`${Math.ceil(this.previewTimer)}`, this.canvas.width/2, this.canvas.height - 30);
  }

  renderUI(ctx) {
    const mapSize = 100;
    const mapX = this.canvas.width - mapSize - 10;
    const mapY = 10;
    const scale = mapSize / Math.max(this.room.width, this.room.height);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    for (const p of this.players.values()) {
      ctx.fillStyle = p.isLocal ? '#fff' : p.color;
      ctx.fillRect(mapX + p.x * scale, mapY + p.y * scale, 3, 3);
    }

    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(mapX + this.room.exit.x * scale, mapY + this.room.exit.y * scale, 4, 4);
  }

  onPlayerDied(peerId) {
    this.gameState = 'dead';
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) deathScreen.style.display = 'flex';
    
    setTimeout(() => {
      this.restartRoom();
    }, 3000);
  }

  restartRoom() {
    for (const p of this.players.values()) {
      p.x = this.room.spawn.x;
      p.y = this.room.spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.hp = p.maxHp;
    }
    
    for (const e of this.room.enemies) {
      e.dead = false;
      e.hp = 2 + Math.floor(this.roomIndex / 3);
    }

    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) deathScreen.style.display = 'none';
    this.gameState = 'playing';
  }

  onHostDisconnected() {
    this.switchToSoloMode();
    for (const [peerId, player] of this.players) {
      if (!player.isLocal) {
        this.players.delete(peerId);
      }
    }
    this.updateUI();
  }

  switchToSoloMode() {
    Network.switchToSoloMode();
  }

  updateUI() {
    const hpBar = document.getElementById('hp-bar');
    if (!hpBar || !this.localPlayer) return;
    
    hpBar.innerHTML = '';
    for (let i = 0; i < this.localPlayer.maxHp; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart' + (i >= this.localPlayer.hp ? ' empty' : '');
      hpBar.appendChild(heart);
    }

    const playersHp = document.getElementById('players-hp');
    if (!playersHp) return;
    
    playersHp.innerHTML = '';
    for (const p of this.players.values()) {
      const div = document.createElement('div');
      div.className = 'player-hp';
      const hearts = [];
      for (let i = 0; i < p.maxHp; i++) hearts.push(i >= p.hp ? 'empty' : 'full');
      
      div.innerHTML = `
        <div class="name" style="color:${p.color}">${p.nickname}</div>
        <div class="hearts">${hearts.map(h => `<div class="heart ${h}"></div>`).join('')}</div>
      `;
      playersHp.appendChild(div);
    }

    const hoeLevel = document.querySelector('#hoe-level span');
    if (hoeLevel) hoeLevel.textContent = this.localPlayer.hoeLevel;
  }

  getFullState() {
    return {
      roomIndex: this.roomIndex,
      room: this.room ? this.room.getPreviewData() : null
    };
  }
}

let GameInstance = null;
