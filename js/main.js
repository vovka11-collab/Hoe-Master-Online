// ===== ТОЧКА ВХОДА =====

document.addEventListener('DOMContentLoaded', () => {
  // Загрузка сохранённого ника
  const saved = Utils.load('player', {});
  if (saved.nickname) {
    document.getElementById('nickname').value = saved.nickname;
  }

  // Выбор цвета
  let selectedColor = saved.color || '#FF6B6B';
  const colorOptions = document.querySelectorAll('.color-option');
  
  colorOptions.forEach(opt => {
    if (opt.dataset.color === selectedColor) opt.classList.add('selected');
    
    opt.addEventListener('click', () => {
      colorOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedColor = opt.dataset.color;
    });
  });

  // === ОДИНОЧНЫЙ РЕЖИМ ===
  document.getElementById('solo-btn').addEventListener('click', async () => {
    const nickname = document.getElementById('nickname').value.trim() || 'Farmer';
    
    try {
      await Network.init(nickname, selectedColor, 'solo');
      GameInstance = new Game();
      GameInstance.start(nickname, selectedColor);
    } catch (err) {
      console.error('Solo mode error:', err);
    }
  });

  // === МУЛЬТИПЛЕЕР ===
  document.getElementById('start-btn').addEventListener('click', async () => {
    const nickname = document.getElementById('nickname').value.trim() || 'Farmer';
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hostId = urlParams.get('host');

      await Network.init(nickname, selectedColor, hostId);
      
      if (Network.isHost && !Network.isSoloMode()) {
        showHostInfo(Network.getHostId());
      }

      GameInstance = new Game();
      GameInstance.start(nickname, selectedColor);

    } catch (err) {
      console.error('Network error:', err);
      await Network.init(nickname, selectedColor, 'solo');
      GameInstance = new Game();
      GameInstance.start(nickname, selectedColor);
    }
  });

  // Кнопка рестарта
  document.getElementById('restart-btn').addEventListener('click', () => {
    if (GameInstance) {
      GameInstance.restart();
    }
  });
});

function showHostInfo(hostId) {
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a2e;
    border: 2px solid #4ECDC4;
    border-radius: 15px;
    padding: 20px;
    text-align: center;
    z-index: 1000;
    max-width: 90%;
    color: white;
  `;
  
  const shareUrl = `${window.location.origin}${window.location.pathname}?host=${hostId}`;
  
  infoDiv.innerHTML = `
    <h3 style="color:#4ECDC4;margin-bottom:10px;">🌐 Ты — хост!</h3>
    <p style="margin-bottom:10px;font-size:0.9rem;">Отправь эту ссылку друзьям:</p>
    <input type="text" value="${shareUrl}" readonly 
      style="width:100%;padding:8px;background:#0f0f23;border:1px solid #4ECDC4;color:#4ECDC4;border-radius:5px;margin-bottom:10px;font-size:0.8rem;"
      onclick="this.select()">
    <p style="font-size:0.8rem;color:#888;">Или скажи ID: <strong style="color:#FFEAA7;">${hostId}</strong></p>
    <button onclick="this.parentElement.remove()" style="margin-top:10px;padding:8px 20px;background:#4ECDC4;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Понятно!</button>
  `;
  
  document.body.appendChild(infoDiv);
}
