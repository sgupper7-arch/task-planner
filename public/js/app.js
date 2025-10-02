const form = document.getElementById('new-task-form');
const input = document.getElementById('task-input');
const dateInput = document.getElementById('task-date');
const categoryInput = document.getElementById('task-category');

const priorityInput = document.getElementById('task-priority');

const timeInput = document.getElementById('task-time');

const searchInput = document.getElementById('search');
const filterCategory = document.getElementById('filter-category');

const accountBtn = document.getElementById('account-btn');
const accountModal = document.getElementById('account-modal');
const closeAccount = document.getElementById('close-account');

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');

const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const authSection = document.getElementById('auth-section');
const logoutSection = document.getElementById('logout-section');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

const themeToggle = document.getElementById('theme-toggle');

const editModal = document.getElementById('edit-modal');
const editText = document.getElementById('edit-text');
const editDate = document.getElementById('edit-date');
const editTime = document.getElementById('edit-time');
const editCategory = document.getElementById('edit-category');
const editPriority = document.getElementById('edit-priority');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');

// Отключаем «залипание» автозаполнения в поиске
if (searchInput) searchInput.value = '';

let editingIndex = null; // индекс редактируемой задачи

let currentUser = null;
let tasks = [];
let viewMode = 'all'; // 'all' (обычный) или 'tasksToday' (режим кнопки «Задачи»)

// --- безопасные хелперы ---
const $  = (id) => document.getElementById(id);
const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn, false); };

// --- ссылки на пункты меню (после появления id в HTML) ---
const navTasks    = $('nav-tasks');
const navCalendar = $('nav-calendar');
const navMission  = $('nav-mission');
const navMore     = $('nav-more');

// --- Локальная дата YYYY-MM-DD (без UTC-сдвигов) ---
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Запрашиваем разрешение на уведомления
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

// --------------------
// 1) Загружаем задачи с сервера
// --------------------
async function loadTasks() {
  if (!currentUser) return;
  const res = await fetch(`/api/tasks/${currentUser}`);
  tasks = await res.json();
  renderTasks();
}

// --------------------
// 2) Сохраняем задачи на сервер
// --------------------
async function saveTasks() {
  if (!currentUser) return;
  await fetch(`/api/tasks/${currentUser}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks)
  });
}

// --------------------
// 3) Рисуем задачи
// --------------------
function renderTasks() {
  // --- готовим ссылки на списки плиток ---
  const overUL = document.getElementById('overdue-list');
  const todayUL = document.getElementById('today-list');
  const upcUL   = document.getElementById('upcoming-list');
  
  const doneUL = document.getElementById('done-list');
  if (doneUL) doneUL.innerHTML = '';

  // если включён режим "Задачи" → особая логика
  let isTasksMode = (viewMode === 'tasksToday');

  if (overUL) overUL.innerHTML = '';
  if (todayUL) todayUL.innerHTML = '';
  if (upcUL)   upcUL.innerHTML   = '';

  // --- сводка в шапке (по всем задачам) ---
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // локальная полночь

  const totalEl   = document.getElementById('total');
  const doneEl    = document.getElementById('done');
  const overdueEl = document.getElementById('overdue');

  if (totalEl)   totalEl.textContent   = tasks.length;
  if (doneEl)    doneEl.textContent    = tasks.filter(t => t.done).length;
  if (overdueEl) {
    const ov = tasks.filter(t => {
      const d = new Date(t.date);
      const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return !t.done && dMid < todayMid;
    }).length;
    overdueEl.textContent = ov;
  }

  // --- фильтры поиска/категории ---
  const q   = (searchInput?.value || '').toLowerCase();
  const cat = filterCategory?.value || 'all';
  const filtered = tasks.filter(t => {
    const okText = t.text.toLowerCase().includes(q);
    const okCat  = (cat === 'all') || (t.category === cat);
    return okText && okCat;
  });

  // --- счётчики плиток (то, что реально отрисуем) ---
  let overdueCount = 0, todayCount = 0, upcomingCount = 0;

  filtered.forEach((task, index) => {
    // нормализуем дату задачи к полуночи (локально)
    const d = new Date(task.date);
    const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // собираем карточку
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');

    const pr = task.priority || 'Средний';
    if (pr === 'Низкий')  li.classList.add('priority-low');
    if (pr === 'Средний') li.classList.add('priority-medium');
    if (pr === 'Высокий') li.classList.add('priority-high');

    if (!task.done && dMid < todayMid) {
      li.classList.add('overdue');
    }

    const span = document.createElement('span');
    span.innerHTML = `
      <strong>${task.text}</strong><br>
      <small>${task.date} ${task.time || ''}</small><br>
      <em>Категория: ${task.category}, Приоритет: ${pr}</em>
    `;

    // кнопки
    const tools = document.createElement('div');
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.innerHTML = `<img src="./icons/check.png" alt="Готово" width="20">`;
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.innerHTML = `<img src="./icons/edit.png" alt="Редактировать" width="20">`;
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.innerHTML = `<img src="./icons/trash.png" alt="Удалить" width="20">`;
    tools.append(doneBtn, editBtn, delBtn);

    li.append(span, tools);

    // обработчики кнопок
    doneBtn.addEventListener('click', async () => {
      tasks[index].done = !tasks[index].done;
      await saveTasks();
      renderTasks();
    });

    delBtn.addEventListener('click', async () => {
      tasks.splice(index, 1);
      await saveTasks();
      renderTasks();
    });

    editBtn.addEventListener('click', () => {
      editingIndex       = index;
      editText.value     = task.text;
      editDate.value     = task.date;
      if (editTime) editTime.value = task.time || '';
      editCategory.value = task.category;
      editPriority.value = pr;
      editModal.style.display = 'flex';
    });

        if (isTasksMode) {
      // Режим "Задачи"
      if (!task.done && dMid < todayMid) {
        if (overUL) { overUL.appendChild(li); overdueCount++; }
      } else if (!task.done && dMid.getTime() === todayMid.getTime()) {
        if (todayUL) { todayUL.appendChild(li); todayCount++; }
      } else if (!task.done && dMid.getTime() === todayMid.getTime() + 24*60*60*1000) {
        // только завтрашние задачи → "Предстоящие"
        if (upcUL) { upcUL.appendChild(li); upcomingCount++; }
      } else if (task.done && dMid.getTime() === todayMid.getTime()) {
        // завершённые задачи только с сегодняшней датой
        if (doneUL) { doneUL.appendChild(li); }
      }
    } else {
      // Обычный режим
      if (!task.done && dMid < todayMid) {
        if (overUL) { overUL.appendChild(li); overdueCount++; }
      } else if (dMid.getTime() === todayMid.getTime()) {
        if (todayUL) { todayUL.appendChild(li); todayCount++; }
      } else if (dMid > todayMid) {
        if (upcUL)   { upcUL.appendChild(li); upcomingCount++; }
      } else if (task.done) {
        if (doneUL) doneUL.appendChild(li);
      }

    }  
    });

  // обновляем цифры на плитках
  const oc = document.getElementById('overdue-count');
  const tc = document.getElementById('today-count');
  const uc = document.getElementById('upcoming-count');
    const dc = document.getElementById('done-count-tile');
  if (oc) oc.textContent = overdueCount;
  if (tc) tc.textContent = todayCount;
  if (uc) uc.textContent = upcomingCount;
  if (dc) dc.textContent = (doneUL ? doneUL.children.length : 0);
}

// --------------------
// Напоминания о задачах (локальные даты/время, без UTC-сдвигов)
// --------------------
function checkReminders() {
  if (!tasks.length) return;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const nowTime  = now.toTimeString().slice(0,5); // HH:MM

  tasks.forEach(task => {
    if (task.done) return;
    if (!task.date || !task.time) return;
    if (task.date === todayStr && task.time === nowTime) {
      showNotification(`Напоминание: ${task.text} (${task.category || 'Без категории'})`);
    }
  });
}

function showNotification(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Напоминание", { body: message });
  } else {
    alert(message);
  }
}

// --------------------
// Тема (светлая/тёмная)
// --------------------
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark', isDark);
  // Иконка на кнопке: луна для света, солнце для темноты
  if (themeToggle) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
  localStorage.setItem('theme', theme);
}
// --------------------
// 4) Добавляем новую задачу
// --------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const text = input.value.trim();
  const date = dateInput.value; // берём дату из поля
  const time = timeInput.value; // берём время из поля
  if (!text || !date) return;

  tasks.push({
    text,
    done: false,
    date,
    time,
    category: categoryInput.value,
    priority: priorityInput.value
  });

  await saveTasks();
  renderTasks();

  input.value = '';
  dateInput.value = '';
  input.focus();
});

// --------------------
// Регистрация
registerBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return alert("Введите имя и пароль");

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    alert("Регистрация успешна, теперь войдите");
  } else {
    alert(data.error || "Ошибка регистрации");
  }
});

// Вход
loginBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) return alert("Введите имя и пароль");

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    currentUser = username;
    localStorage.setItem('currentUser', currentUser);
    localStorage.setItem('token', data.token);

    authSection.style.display = 'none';
    logoutSection.style.display = 'block';
    currentUserSpan.textContent = currentUser;
    accountModal.style.display = 'none';
    loadTasks();
  } else {
    alert(data.error || "Ошибка входа");
  }
});
// --------------------
// // 6) Проверяем, есть ли пользователь в памяти
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  currentUser = savedUser;

  // Подготовка модалки к состоянию «вошёл»
  authSection.style.display = 'none';
  logoutSection.style.display = 'block';
  currentUserSpan.textContent = currentUser;

  loadTasks();
}
// Применяем тему при старте
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);
// --------------------
// Модалка аккаунта: открыть/закрыть
// --------------------
if (accountBtn && accountModal) {
  accountBtn.addEventListener('click', () => {
    // показать нужный блок в модалке
    if (currentUser) {
      authSection.style.display = 'none';
      logoutSection.style.display = 'block';
      currentUserSpan.textContent = currentUser;
    } else {
      authSection.style.display = 'block';
      logoutSection.style.display = 'none';
    }
    accountModal.style.display = 'flex';
  });
}

if (closeAccount) {
  closeAccount.addEventListener('click', () => {
    accountModal.style.display = 'none';
  });
}

// Закрытие модалки аккаунта по клику вне окна
window.addEventListener('click', (e) => {
  if (e.target === accountModal) {
    accountModal.style.display = 'none';
  }
});
// --------------------
// 7) Выход пользователя
// --------------------
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  currentUser = null;
  tasks = [];
  renderTasks();

  authSection.style.display = 'block';
  logoutSection.style.display = 'none';
  accountModal.style.display = 'none';
});
// --------------------
// 8) Экспорт задач
// --------------------
exportBtn.addEventListener('click', () => {
  if (!tasks.length) return alert("Нет задач для экспорта");

  const dataStr = JSON.stringify(tasks, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentUser || "tasks"}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

// --------------------
// 9) Импорт задач
// --------------------
importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;

  const text = await file.text();
  try {
    const importedTasks = JSON.parse(text);
    if (!Array.isArray(importedTasks)) throw new Error("Неверный формат");

    // нормализуем импорт и сохраняем приоритет
    tasks = importedTasks.map(t => ({
      text: t.text,
      done: !!t.done,
      date: t.date || localDateStr(new Date()),
      time: t.time || "",
      category: t.category || "Другое",
      priority: t.priority || "Средний",   // ← ВАЖНО: сохраняем приоритет
      user: currentUser
    }));


  await saveTasks();   // сохраняем на сервер
  renderTasks();       // обновляем интерфейс
  alert("Задачи импортированы!");

  } catch (e) {
    alert("Ошибка при импорте файла");
  }
});
// --------------------
// Проверяем каждые 30 секунд
// --------------------
setInterval(checkReminders, 30 * 1000);

// --------------------
// 10) Поиск и фильтрация
// --------------------
searchInput.addEventListener('input', renderTasks);
filterCategory.addEventListener('change', renderTasks);

// --------------------
// Переключение темы
// --------------------
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });
}
// --------------------
// Модальное окно редактирования
// --------------------
saveEditBtn.addEventListener('click', async () => {
  if (editingIndex !== null) {
    tasks[editingIndex].text = editText.value.trim();
    tasks[editingIndex].date = editDate.value;
    tasks[editingIndex].time = editTime.value;
    tasks[editingIndex].category = editCategory.value;
    tasks[editingIndex].priority = editPriority.value;
    await saveTasks();
    renderTasks();
    editModal.style.display = 'none';
    editingIndex = null;
  }
});

cancelEditBtn.addEventListener('click', () => {
  editModal.style.display = 'none';
  editingIndex = null;
});

// Закрытие по клику вне окна
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    editModal.style.display = 'none';
    editingIndex = null;
  }
});

// --------------------
// Навигация (Задачи / Календарь / Миссия / Ещё)
// --------------------
const navItems = document.querySelectorAll('#main-nav .nav-item');
const taskSections = document.getElementById('task-sections');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    // сброс всех и выделение текущего
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const text = item.innerText.trim();

    if (text === "Задачи") {
      viewMode = 'tasksToday';            // ← включаем спец-режим
      taskSections.style.display = 'block';
      // (если используешь календарь, не забудь calendarContainer.style.display = 'none')
      renderTasks();
      return;
    }

    if (text === "Календарь") {
      // при переходе в другие разделы вернём обычный режим (на будущее)
      viewMode = 'all';
      alert("Здесь позже будет календарь 📅");
      return;
    }

    if (text === "Миссия") {
      viewMode = 'all';
      alert("Раздел 'Миссия' в разработке 🚀");
      return;
    }

    if (text === "Ещё") {
      viewMode = 'all';
      alert("Раздел 'Ещё' пока пуст ⚙️");
      return;
    }
  });
});

// Аккордеон для плиток
document.querySelectorAll('.section-header').forEach(header => {
  header.addEventListener('click', () => {
    const targetId = header.getAttribute('data-target');
    const list = document.getElementById(targetId);
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
  });
});


