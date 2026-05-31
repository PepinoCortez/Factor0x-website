# Factor0x — Landing Page

Премиальный лендинг для Factor0x.

## Структура
```
factor0x/
├── index.html   — разметка
├── style.css    — стили
├── main.js      — анимации, частицы, scroll
└── README.md
```

## Запуск локально

```bash
# Просто открой index.html в браузере
# Или запусти локальный сервер:

npx serve .
# или
python -m http.server 8080
```

## Развёртывание

### Vercel (рекомендуется)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --dir=. --prod
```

### GitHub Pages
1. Создай репозиторий на GitHub
2. `git init && git add . && git commit -m "init"`
3. `git remote add origin https://github.com/USER/factor0x.git`
4. `git push -u origin main`
5. В Settings → Pages выбери `main` ветку

## Редактирование в VS Code
1. Открой папку: `File → Open Folder`
2. Установи расширение **Live Server** (ritwickdey.LiveServer)
3. Нажми `Go Live` внизу — сайт откроется с авто-перезагрузкой
