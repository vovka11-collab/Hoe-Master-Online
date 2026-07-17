# Platformer Game

🎮 **Бесконечный платформер для мобильных устройств**

## Особенности

✨ **Основные возможности:**
- ✓ Бесконечная генерация платформ
- ✓ Враги для избегания
- ✓ Система очков и высоты
- ✓ Оптимизировано для мобильных
- ✓ Сенсорные кнопки управления
- ✓ Поддержка клавиатуры для ПК

## Управление

### Мобильные устройства:
- **◀ Влево** - кнопка левой стрелки
- **▶ Вправо** - кнопка правой стрелки
- **JUMP** - прыгнуть
- **⏸ Пауза** - остановить игру

### Клавиатура ПК:
- **A** - влево
- **D** - вправо
- **SPACE** - прыгнуть
- **ESC** - пауза

## Установка и запуск

### Локальный запуск (веб)
```bash
Откройте index.html в браузере
```

### Сборка APK
```bash
# Установите Cordova
npm install -g cordova

# Создайте проект
cordova create platformer-game com.platformer.game "Platformer Game"
cd platformer-game

# Добавьте Android платформу
cordova platform add android

# Скопируйте файлы игры
cp ../index.html www/
cp ../styles.css www/
cp ../game.js www/

# Соберите APK
cordova build android --release
```

## Структура проекта

```
.
├── index.html          # Главный HTML файл
├── styles.css          # Стили игры
├── game.js             # Логика игры
├── config.xml          # Конфигурация Cordova
├── package.json        # NPM конфигурация
└── .github/workflows/
    └── build-apk.yml   # GitHub Actions для сборки APK
```

## Автоматическая сборка APK

GitHub Actions автоматически собирает APK при каждом push в main ветку.

### Загрузка APK:
1. Перейдите на вкладку "Actions"
2. Выберите последний build
3. В разделе "Artifacts" скачайте `platformer-apk`

## Требования

**Для сборки APK:**
- Node.js 18+
- Java 11+
- Android SDK
- Cordova CLI

**Для запуска игры:**
- Современный браузер (Chrome, Firefox, Safari, Edge)
- Или Android 5.0+ для APK

## Версия

- v1.0.0 - Первый релиз

## Лицензия

MIT

## Разработка

Проект разработан для демонстрации мобильной разработки с использованием Cordova и Canvas API.
