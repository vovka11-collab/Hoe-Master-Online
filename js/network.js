// ===== СЕТЬ: LAN P2P + Одиночный режим =====

class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.myId = null;
    this.isHost = false;
    this.hostId = null;
    this.connected = false;
    this.lanMode = false; // true = работаем без внешнего сервера
    
    // Callbacks
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onDataReceived = null;
    this.onConnected = null;
    this.onError = null;
    
    // Для LAN discovery
    this.discoveryInterval = null;
    this.knownPeers = new Set();
  }

  // Инициализация сети
  async init(nickname, color, hostId = null) {
    return new Promise((resolve, reject) => {
      // Сохраняем данные игрока
      this.myNickname = nickname;
      this.myColor = color;

      // Если hostId === 'solo' — одиночный режим
      if (hostId === 'solo') {
        this.isHost = true;
        this.myId = 'solo_' + Utils.uid();
        this.connected = true;
        this.lanMode = true;
        console.log('Solo mode activated');
        if (this.onConnected) this.onConnected();
        resolve({ role: 'solo', id: this.myId });
        return;
      }

      // Пробуем PeerJS с кастомным конфигом для LAN
      try {
        this.peer = new Peer({
          // Используем TURN/STUN минимально — для LAN достаточно local
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' } // Fallback STUN
            ]
          },
          // Для LAN можно использовать простой ID
          debug: 1
        });

        this.peer.on('open', (id) => {
          this.myId = id;
          console.log('Peer ID:', id);

          if (!hostId) {
            // Я — хост
            this.isHost = true;
            this.hostId = id;
            this.connected = true;
            this.setupHost();
            this.startDiscovery();
            if (this.onConnected) this.onConnected();
            resolve({ role: 'host', id });
          } else {
            // Я — клиент
            this.isHost = false;
            this.hostId = hostId;
            this.connectToHost(hostId, nickname, color);
            resolve({ role: 'client', id });
          }
        });

        this.peer.on('error', (err) => {
          console.error('PeerJS error:', err.type, err.message);
          
          // Если ошибка сервера — переключаемся в solo режим
          if (err.type === 'network' || err.type === 'server-error' || err.type === 'unavailable-id') {
            console.log('Switching to solo/LAN mode...');
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

  // Переключение в одиночный режим
  switchToSoloMode() {
    this.isHost = true;
    this.myId = 'solo_' + Utils.uid();
    this.connected = true;
    this.lanMode = true;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.onConnected) this.onConnected();
  }

  // Хост: ждём подключений
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

        // Отправляем текущее состояние игры
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

  // Клиент: подключаемся к хосту
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
      // Хост отключился
      this.connections.delete(hostId);
      alert('Хост отключился! Переход в одиночный режим...');
      this.switchToSoloMode();
      if (Game.instance) {
        Game.instance.onHostDisconnected();
      }
    });

    conn.on('error', (err) => {
      console.error('Connection to host failed:', err);
      alert('Не удалось подключиться к хосту. Играем в одиночку!');
      this.switchToSoloMode();
    });

    // Таймаут подключения
    setTimeout(() => {
      if (!this.connected) {
        console.log('Connection timeout, switching to solo');
        this.switchToSoloMode();
      }
    }, 5000);
  }

  // Обработка данных
  handleData(fromPeerId, data) {
    if (!data || !data.type) return;

    // Ретрансляция от клиентов (если я хост)
    if (this.isHost && data.type !== 'gameState' && data.type !== 'playerList') {
      this.broadcast(data, fromPeerId);
    }

    if (this.onDataReceived) {
      this.onDataReceived(fromPeerId, data);
    }
  }

  // Отправка данных
  send(toPeerId, data) {
    if (this.lanMode && toPeerId.startsWith('solo_')) return; // Solo mode — не отправляем
    
    const conn = this.connections.get(toPeerId);
    if (conn && conn.open) {
      conn.send(data);
    }
  }

  // Broadcast всем
  broadcast(data, excludeId = null) {
    if (this.lanMode) return; // Solo — некому слать
    
    for (const [peerId, conn] of this.connections) {
      if (peerId !== excludeId && conn.open) {
        conn.send(data);
      }
    }
  }

  // Отправка состояния игрока
  sendPlayerState(state) {
    if (this.lanMode) return;
    
    this.broadcast({
      type: 'playerState',
      peerId: this.myId,
      state: state
    });
  }

  // Отправка события
  sendEvent(eventType, data) {
    if (this.lanMode) return;
    
    this.broadcast({
      type: 'event',
      eventType: eventType,
      peerId: this.myId,
      data: data
    });
  }

  // Обновление списка игроков
  broadcastPlayerList() {
    if (this.lanMode) {
      // Solo — только мы
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
    
    // Обновляем свой UI тоже
    if (this.onDataReceived) {
      this.onDataReceived(null, { type: 'playerList', players });
    }
  }

  // LAN discovery — пинг других устройств в сети
  startDiscovery() {
    // В реальном LAN можно использовать mDNS или просто перебор IP
    // Но для простоты — просто показываем свой ID для ручного ввода
    console.log('Host ID for friends:', this.myId);
  }

  getPlayerCount() {
    if (this.lanMode) return 1;
    let count = 1; // себя
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
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
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

  // Получить ID для подключения друзей
  getHostId() {
    return this.myId;
  }

  // Получить LAN IP для прямого подключения
  async getLanIp() {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      return new Promise((resolve) => {
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            resolve(null);
            return;
          }
          const ipMatch = ice.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
          resolve(ipMatch ? ipMatch[0] : null);
          pc.close();
        };
        
        setTimeout(() => {
          resolve(null);
          pc.close();
        }, 1000);
      });
    } catch (e) {
      return null;
    }
  }
}

const Network = new NetworkManager();
