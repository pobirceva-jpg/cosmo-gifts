const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));  // для html/css/js

app.get('/', (req, res) => {
  res.send('Сервер Gifts Battle работает!');
});

app.listen(3000, () => {
  console.log('Сервер запущен → http://localhost:3000');
});