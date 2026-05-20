// =========================
// FULLSTACK APP: Baku Services Board
// Stack: React + Express + SQLite + Tailwind
// =========================

// =========================
// 1. BACKEND (server.js)
// =========================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());

// DB setup
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    title TEXT,
    category TEXT,
    price TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API routes
app.get('/api/ads', (req, res) => {
  db.all('SELECT * FROM ads ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/api/ads', (req, res) => {
  const { name, title, category, price, description } = req.body;

  const stmt = db.prepare(`INSERT INTO ads (name, title, category, price, description) VALUES (?, ?, ?, ?, ?)`);
  stmt.run(name, title, category, price, description, function (err) {
    if (err) return res.status(500).json(err);
    res.json({ id: this.lastID });
  });
});

app.delete('/api/ads/:id', (req, res) => {
  db.run('DELETE FROM ads WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


// =========================
// 2. FRONTEND (React)
// =========================

// Create with: npx create-react-app client
// Then replace src files with below

// =========================
// client/src/App.js
// =========================

import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState({ name: '', title: '', category: '', price: '', description: '' });

  const fetchAds = async () => {
    const res = await axios.get('/api/ads');
    setAds(res.data);
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/ads', form);
    setForm({ name: '', title: '', category: '', price: '', description: '' });
    fetchAds();
  };

  const deleteAd = async (id) => {
    await axios.delete(`/api/ads/${id}`);
    fetchAds();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Доска услуг — Баку</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-6">
        <input className="border p-2 w-full mb-2" placeholder="Ваше имя" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="border p-2 w-full mb-2" placeholder="Заголовок" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        <input className="border p-2 w-full mb-2" placeholder="Категория" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
        <input className="border p-2 w-full mb-2" placeholder="Цена" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
        <textarea className="border p-2 w-full mb-2" placeholder="Описание" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <button className="bg-blue-500 text-white px-4 py-2 rounded">Добавить</button>
      </form>

      {/* Ads list */}
      <div className="grid md:grid-cols-2 gap-4">
        {ads.map(ad => (
          <div key={ad.id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold">{ad.title}</h2>
            <p className="text-sm text-gray-500">{ad.category}</p>
            <p className="mt-2">{ad.description}</p>
            <p className="mt-2 font-bold">{ad.price} AZN</p>
            <p className="text-sm">Автор: {ad.name}</p>
            <button onClick={() => deleteAd(ad.id)} className="mt-2 bg-red-500 text-white px-3 py-1 rounded">Удалить</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;


// =========================
// client/src/index.js
// =========================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);


// =========================
// client/src/index.css
// =========================

@tailwind base;
@tailwind components;
@tailwind utilities;


// =========================
// 3. Tailwind setup
// =========================

// client/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

// client/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};


// =========================
// 4. INSTALL & RUN
// =========================

/*
1. Install backend deps:
   npm init -y
   npm install express sqlite3

2. Create React app:
   npx create-react-app client
   cd client
   npm install axios tailwindcss postcss autoprefixer
   npx tailwindcss init -p

3. Replace files with provided code

4. Build frontend:
   npm run build

5. Run server:
   node server.js

6. Open:
   http://localhost:5000
*/
