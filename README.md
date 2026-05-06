# Basil Studio — 個人工作室網站

全端工程師 Basil 的個人工作室網站，包含關於我、服務項目、作品集、聯絡表單。

## 🚀 本地運行

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## 📁 架構

```
personal-site/
├── public/           # 靜態前端檔案 (GitHub Pages 部署此目錄)
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js
│   ├── assets/
│   ├── sitemap.xml
│   └── robots.txt
├── server.js         # Express 伺服器（本地開發用）
└── package.json
```

## 🌐 GitHub Pages 部署

1. 推送到 GitHub
2. 進入 Settings → Pages
3. Source 選 `main` branch，目錄選 `/public`
4. 儲存後等待幾分鐘，網站會發布在 `https://<username>.github.io/<repo-name>/`

## 📝 自定義

- 修改 `public/index.html` 中的個人資訊（email、GitHub 連結等）
- 修改 `public/sitemap.xml` 中的網址為實際 GitHub Pages 網址
- 修改 `public/robots.txt` 中的 Sitemap 網址
