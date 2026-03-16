const express = require("express");
const https = require("https");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Inicjalizacja bazy danych
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Błąd otwarcia bazy danych:', err.message);
  } else {
    console.log('Połączono z bazą danych SQLite.');
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Sesje
app.use(session({
  secret: 'tajny_klucz_sesji',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // W produkcji ustaw na true dla HTTPS
}));

const API_KEY = "CAhoJ1QvIdpfnH5HnOy9jnGrQV0ahSMH";

// Endpoint rejestracji
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Wszystkie pola są wymagane' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hashedPassword], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ error: 'Nazwa użytkownika lub email już istnieje' });
        }
        return res.status(500).json({ error: 'Błąd serwera' });
      }
      res.json({ message: 'Rejestracja udana' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Błąd hashowania hasła' });
  }
});

// Endpoint logowania
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nazwa użytkownika i hasło są wymagane' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Błąd serwera' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Nieprawidłowa nazwa użytkownika lub hasło' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.email = user.email;
    res.json({ message: 'Logowanie udane', user: { username: user.username, email: user.email } });
  });
});

// Endpoint wylogowania
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Błąd wylogowania' });
    }
    res.json({ message: 'Wylogowano' });
  });
});

// Endpoint profilu
app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  res.json({
    username: req.session.username,
    email: req.session.email,
    created_at: req.session.created_at // Możesz dodać więcej pól jeśli potrzebujesz
  });
});

app.get("/events", (req, res) => {
  const city = req.query.city;
  if (!city) {
    res.status(400).json({ error: "Brak parametru city" });
    return;
  }

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&locale=pl-PL&city=${encodeURIComponent(city)}`;

  https.get(url, (apiRes) => {
    let data = "";
    apiRes.on("data", chunk => data += chunk);
    apiRes.on("end", () => {
      try {
        const obj = JSON.parse(data);
        const events = obj._embedded?.events || [];
        res.json(events);
      } catch (err) {
        res.status(500).json({ error: "Błąd parsowania danych" });
      }
    });
  }).on("error", () => {
    res.status(500).json({ error: "Błąd pobierania z Ticketmaster" });
  });
});

app.listen(4000, () => console.log("Server działa na http://localhost:4000"));
