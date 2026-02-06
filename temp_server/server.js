const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3004;

// 启用CORS
app.use(cors());

// 提供静态文件
app.use(express.static(path.join(__dirname, '../risk_frontend/build')));

// 处理SPA路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../risk_frontend/build/index.html'), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});