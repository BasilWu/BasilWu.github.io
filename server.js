const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 設定靜態檔案路徑
app.use(express.static(path.join(__dirname, 'public')));

// 所有路由都回傳 index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`✅ 伺服器已啟動：http://localhost:${PORT}`);
  console.log(`📝 按下 Ctrl + C 可以停止伺服器`);
});
