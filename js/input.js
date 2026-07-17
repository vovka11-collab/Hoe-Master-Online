class InputManager {
  constructor() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.jump = false;
    this.attack = false;
    
    this.joystick = { active: false, dx: 0, dy: 0, startX: 0, startY: 0 };
    
    this.setupJoystick();
    this.setupActionButtons();
    this.setupKeyboard();
  }

  setupJoystick() {
    const zone = document.createElement('div');
    zone.id = 'joystick-zone';
    zone.innerHTML = `
      <div id="joystick-base"></div>
      <div id="joystick-stick"></div>
    `;
    document.getElementById('touch-controls').prepend(zone);

    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    let touchId = null;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      this.joystick.active = true;
      this.joystick.startX = cx;
      this.joystick.startY = cy;
      
      this.updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          this.resetJoystick();
          touchId = null;
          break;
        }
      }
    });
  }

  updateJoystick(clientX, clientY) {
    const maxDist = 50;
    const dx = clientX - this.joystick.startX;
    const dy = clientY - this.joystick.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxDist);
    
    const angle = Math.atan2(dy, dx);
    this.joystick.dx = Math.cos(angle) * (clampedDist / maxDist);
    this.joystick.dy = Math.sin(angle) * (clampedDist / maxDist);
    
    // Обновляем визуал стика
    const stick = document.getElementById('joystick-stick');
    const moveX = Math.cos(angle) * clampedDist;
    const moveY = Math.sin(angle) * clampedDist;
    stick.style.transform = `translate(${moveX}px, ${moveY}px)`;
    
    // Направления
    this.left = this.joystick.dx < -0.3;
    this.right = this.joystick.dx > 0.3;
    this.up = this.joystick.dy < -0.5;
    this.down = this.joystick.dy > 0.5;
  }

  resetJoystick() {
    this.joystick.active = false;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    
    const stick = document.getElementById('joystick-stick');
    if (stick) stick.style.transform = 'translate(0, 0)';
  }

  setupActionButtons() {
    const jumpBtn = document.getElementById('btn-jump');
    const attackBtn = document.getElementById('btn-attack');

    const setBtn = (btn, prop) => {
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); this[prop] = true; });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); this[prop] = false; });
    };

    setBtn(jumpBtn, 'jump');
    setBtn(attackBtn, 'attack');

    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  setupKeyboard() {
    const keys = {};
    
    document.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      this.updateFromKeys(keys);
    });

    document.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      this.updateFromKeys(keys);
    });
  }

  updateFromKeys(keys) {
    this.left = keys['ArrowLeft'] || keys['KeyA'];
    this.right = keys['ArrowRight'] || keys['KeyD'];
    this.up = keys['ArrowUp'] || keys['KeyW'];
    this.down = keys['ArrowDown'] || keys['KeyS'];
    this.jump = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
    this.attack = keys['KeyJ'] || keys['KeyK'] || keys['Enter'];
  }

  reset() {
    this.left = false;
    this.right = false;
    this.up = false;
    this.down = false;
    this.jump = false;
    this.attack = false;
    this.resetJoystick();
  }
}

const Input = new InputManager();
