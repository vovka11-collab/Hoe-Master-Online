// ===== ТОЧКА ВХОДА =====

console.log('=== MAIN.JS LOADED ===');

document.addEventListener('DOMContentLoaded', () => {
  console.log('=== DOM READY ===');

  // Проверяем элементы
  const nicknameInput = document.getElementById('nickname');
  const startBtn = document.getElementById('start-btn');
  const soloBtn = document.getElementById('solo-btn');
  
  console.log('nickname:', !!nicknameInput);
  console.log('startBtn:', !!startBtn);
  console.log('soloBtn:', !!soloBtn);

  if (!nicknameInput || !startBtn || !soloBtn) {
    console.error('CRITICAL: Missing elements!');
    return;
  }

  // Загрузка сохранённого ника
  const saved = Utils.load('player', {});
  if (saved.nickname) {
    nicknameInput.value = saved.nickname;
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
  soloBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== SOLO BUTTON CLICKED ===');
    
    const nickname = nicknameInput.value.trim() || 'Farmer';
    console.log('Starting solo mode, nick:', nickname);
    
    try {
      await Network.init(nickname, selectedColor, 'solo');
      console.log('Network init success');
      
      GameInstance = new Game();
      console.log('Game created');
      
      GameInstance.start(nickname, selectedColor);
      console.log('Game started!');
    } catch (err) {
      console.error('Solo mode error:', err);
      alert('Ошибка: ' + err.message);
    }
  });

  // === МУЛЬТИПЛЕЕР ===
  startBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== START BUTTON CLICKED ===');
    
    const nickname = nicknameInput.value.trim() || 'Farmer';
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hostId = urlParams.get('host');
      console.log('Host ID from URL:', hostId);

      await Network.init(nickname, selectedColor, hostId);
      
      if (Network.isHost && !Network.isSoloMode()) {
        showHostInfo(Network.getHostId());
      }

      GameInstance = new Game();
      GameInstance.start(nickname, selectedColor);

    } catch (err) {
      console.error('Network error:', err);
      // Fallback в solo
      await Network.init(nickname, selectedColor, 'solo');
      GameInstance = new Game();
      GameInstance.start(nickname, selectedColor);
    }
  });

  // Кнопка рестарта
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (GameInstance) {
        GameInstance.restartRoom();
      }
    });
  }

  console.log('=== ALL LISTENERS ATTACHED ===');
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
