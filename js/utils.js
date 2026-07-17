// ===== УТИЛИТЫ =====

const Utils = {
  // Рандомное число [min, max]
  rand(min, max) {
    return Math.random() * (max - min) + min;
  },

  // Рандомное целое [min, max]
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Проверка столкновения AABB
  rectCollision(r1, r2) {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
  },

  // Расстояние между точками
  dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  },

  // Линейная интерполяция
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Ограничение значения
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // Уникальный ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // Сохранение в localStorage
  save(key, data) {
    localStorage.setItem('hoe_' + key, JSON.stringify(data));
  },

  load(key, fallback = null) {
    const data = localStorage.getItem('hoe_' + key);
    return data ? JSON.parse(data) : fallback;
  }
};
