// server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Подключение к MongoDB
require('dotenv').config();

mongoose.connect("mongodb+srv://sgupper7_db_user:AjKgXqifPxYfeGeW@taskplannerdb.kwfu5xs.mongodb.net/?retryWrites=true&w=majority&appName=TaskPlannerDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB подключен"))
.catch(err => console.error("❌ Ошибка MongoDB:", err));

// 2) Миддлвары
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'))); // /public — твой фронтенд

// Модель пользователя
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const User = mongoose.model('User', userSchema);

// 3) Модель задачи
const taskSchema = new mongoose.Schema({
  text: String,
  date: String,
  time: String,
  category: String,
  priority: { type: String, default: 'Средний' },
  done: { type: Boolean, default: false },
  user: String,
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super_secret_key'; // ⚠️ лучше хранить в .env

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Укажите имя и пароль" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Ошибка при регистрации" });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Пользователь не найден" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Неверный пароль" });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Ошибка при входе" });
  }
});

// 4) Health-check (удобно для отладки и PM2)
app.get('/api/health', (req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  res.json({ ok: true, mongodb: state === 1 ? 'connected' : `state:${state}` });
});

// 5) API задач
// GET: получить задачи пользователя
app.get('/api/tasks/:user', async (req, res) => {
  try {
    const user = req.params.user;
    const tasks = await Task.find({ user }).sort({ createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks error:', err);
    res.status(500).json({ error: 'Ошибка при получении задач' });
  }
});

// POST: сохранить весь список задач пользователя (полная замена)
app.post('/api/tasks/:user', async (req, res) => {
  try {
    const user = req.params.user;
    const tasks = Array.isArray(req.body) ? req.body : [];

    // полная замена: сначала удаляем старые, затем вставляем новые
    await Task.deleteMany({ user });

    // важно: пользователь в каждом документе
    const docs = tasks.map(t => ({
      text: t.text,
      date: t.date,
      time: t.time || "",
      category: t.category || 'Другое',
      priority: t.priority || 'Средний',
      done: !!t.done,
      user,
    }));

    if (docs.length) {
      await Task.insertMany(docs, { ordered: true });
    }

    res.json({ success: true, count: docs.length });
  } catch (err) {
    console.error('POST /api/tasks error:', err);
    res.status(500).json({ error: 'Ошибка при сохранении задач' });
  }
});

// 6) Отдаём index.html для корня (на всякий случай)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 7) Старт
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});

