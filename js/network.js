// ===== СЕТЬ: LAN P2P + Одиночный режим =====

class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.myId = null;
    this.isHost = false;
    this.hostId = null;
    this.connected = false;
    this.lanMode = false;
    
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onDataReceived = null;
    this.onConnected = null;
    this.onError = null;
    
    this.myNickname = '';
    this.myColor = '';
  }

  async init(nickname, color, hostId = null) {
    return new Promise((resolve, reject) => {
      this.myNickname = nickname;
      this.myColor = color;

      if (hostId === 'solo') {
        this.switchToSoloMode();
        resolve({ role: 'solo', id: this.myId });
        return;
      }

      try {
        this.peer = new Peer({
          config: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          },
          debug: 1
        });

        this.peer.on('open', (id) => {
          this.myId = id;

          if (!hostId) {
            this.isHost = true;
            this.hostId = id;
            this.connected = true;
            this.setupHost();
            if (this.onConnected) this.onConnected();
            resolve({ role: 'host', id });
          } else {
            this.isHost = false;
            this.hostId = hostId;
            this.connectToHost(hostId, nickname, color);
            resolve({ role: 'client', id });
          }
        });

        this.peer.on('error', (err) => {
          console.error('PeerJS error:', err.type, err.message);
          if (err.type === 'network' || err.type === 'server-error' || err.type === 'unavailable-id') {
            console.log('Switching to solo mode...');
            this.switchToSoloMode();
            resolve({ role: 'solo', id: this.myId });
          } else {
            if (this.onError) this.onError(err);
            reject(err);
          }
        });

      } catch (err) {
        console.error('PeerJS init failed:', err);
        this.switchToSoloMode();
        resolve({ role: 'solo', id: this.myId });
      }
    });
  }

  switchToSoloMode() {
    this.isHost = true;
    this.myId = 'solo_' + Date.now();
    this.connected = true;
    this.lanMode = true;
    
    if (this.peer) {
      try { this.peer.destroy(); } catch(e) {}
      this.peer = null;
    }
    
    console.log('Solo mode activated, ID:', this.myId);
    
    // Отправляем callback
    if (this.onConnected) this.onConnected();
  }

  setupHost() {
    if (!this.peer) return;
    
    this.peer.on('connection', (conn) => {
      console.log('Incoming connection:', conn.peer);
      
      conn.on('open', () => {
        this.connections.set(conn.peer, conn);
        this.broadcastPlayerList();
        
        if (this.onPlayerJoin) {
          this.onPlayerJoin(conn.peer, conn.metadata || {});
        }

        if (Game.instance) {
          conn.send({
            type: 'gameState',
            data: Game.instance.getFullState()
          });
        }
      });

      conn.on('data', (data) => {
        this.handleData(conn.peer, data);
      });

      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.broadcastPlayerList();
        if (this.onPlayerLeave) this.onPlayerLeave(conn.peer);
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        this.connections.delete(conn.peer);
      });
    });
  }

  connectToHost(hostId, nickname, color) {
    if (!this.peer) return;

    const conn = this.peer.connect(hostId, {
      metadata: { nickname, color, peerId: this.myId },
      reliable: true
    });

    conn.on('open', () => {
      this.connections.set(hostId, conn);
      this.connected = true;
      if (this.onConnected) this.onConnected();
    });

    conn.on('data', (data) => {
      this.handleData(hostId, data);
    });

    conn.on('close', () => {
      this.connections.delete(hostId);
      alert('Хост отключился! Переход в одиночный режим...');
      this.switchToSoloMode();
      if (Game.instance) {
        Game.instance.onHostDisconnected();
      }
    });

    conn.on('error', (err) => {
      console.error('Connection to host failed:', err);
      alert('Не удалось подключиться. Играем в одиночку!');
      this.switchToSoloMode();
    });

    setTimeout(() => {
      if (!this.connected) {
        console.log('Connection timeout, switching to solo');
        this.switchToSoloMode();
      }
    }, 5000);
  }

  handleData(fromPeerId, data) {
    if (!data || !data.type) return;

    if (this.isHost && data.type !== 'gameState' && data.type !== 'playerList') {
      this.broadcast(data, fromPeerId);
    }

    if (this.onDataReceived) {
      this.onDataReceived(fromPeerId, data);
    }
  }

  send(toPeerId, data) {
    if (this.lanMode) return;
    
    const conn = this.connections.get(toPeerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  broadcast(data, excludeId = null) {
    if (this.lanMode) return;
    
    for (const [peerId, conn] of this.connections) {
      if (peerId !== excludeId && conn.open) {
        conn.send(data);
      }
    }
  }

  sendPlayerState(state) {
    if (this.lanMode) return;
    
    this.broadcast({
      type: 'playerState',
      peerId: this.myId,
      state: state
    });
  }

  sendEvent(eventType, data) {
    if (this.lanMode) return;
    
    this.broadcast({
      type: 'event',
      eventType: eventType,
      peerId: this.myId,
      data: data
    });
  }

  broadcastPlayerList() {
    if (this.lanMode) {
      if (this.onDataReceived) {
        this.onDataReceived(null, {
          type: 'playerList',
          players: [{
            peerId: this.myId,
            nickname: this.myNickname,
            color: this.myColor
          }]
        });
      }
      return;
    }

    const players = [];
    for (const [peerId, conn] of this.connections) {
      if (conn.metadata) {
        players.push({
          peerId,
          nickname: conn.metadata.nickname,
          color: conn.metadata.color
        });
      }
    }
    players.push({
      peerId: this.myId,
      nickname: this.myNickname,
      color: this.myColor
    });

    this.broadcast({ type: 'playerList', players: players });
    
    if (this.onDataReceived) {
      this.onDataReceived(null, { type: 'playerList', players });
    }
  }

  getPlayerCount() {
    if (this.lanMode) return 1;
    let count = 1;
    for (const conn of this.connections.values()) {
      if (conn.open) count++;
    }
    return count;
  }

  isConnected() {
    return this.connected;
  }

  isSoloMode() {
    return this.lanMode;
  }

  disconnect() {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.connected = false;
  }

  getHostId() {
    return this.myId;
  }
}

const Network = new NetworkManager();
