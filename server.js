const express = require("express");
const https = require("https");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const app = express();

const uploadDb = require("./upload-db");


app.use(express.json());
app.use(express.static(__dirname));

// Sesje
app.use(session({
  secret: 'tajny_klucz_sesji',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // W produkcji ustaw na true dla HTTPS
}));

// Endpoint uploadu avatara jako BLOB do bazy
app.post('/upload-avatar', uploadDb.single('avatar'), (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  // Obsługa gotowego avatara (ścieżka string)
  if (req.body.avatar && typeof req.body.avatar === 'string' && req.body.avatar.startsWith('img/')) {
    db.run('UPDATE users SET avatar = ? WHERE id = ?', [req.body.avatar, req.session.userId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Błąd bazy danych' });
      }
      req.session.avatar = req.body.avatar;
      res.json({ message: 'Avatar zaktualizowany', avatar: req.body.avatar });
    });
    return;
  }
  // Obsługa uploadu pliku (BLOB)
  if (!req.file) {
    return res.status(400).json({ error: 'Brak pliku' });
  }
  const avatarBuffer = req.file.buffer;
  db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarBuffer, req.session.userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Błąd bazy danych' });
    }
    req.session.avatar = `/avatar/${req.session.userId}`;
    res.json({ message: 'Avatar zaktualizowany', avatar: `/avatar/${req.session.userId}` });
  });
});

// Endpoint pobierania avatara jako obrazka
app.get('/avatar/:userId', (req, res) => {
  const userId = req.params.userId;
  db.get('SELECT avatar FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row || !row.avatar) {
      // domyślna grafika jeśli brak
      return res.sendFile(__dirname + '/img/5.png');
    }
    // Jeśli avatar to string (ścieżka), wyślij plik z dysku
    if (typeof row.avatar === 'string' && row.avatar.startsWith('img/')) {
      return res.sendFile(__dirname + '/' + row.avatar);
    }
    // W przeciwnym razie traktuj jako BLOB (buffer)
    res.set('Content-Type', 'image/png');
    res.send(row.avatar);
  });
});

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
    // Dodaj kolumnę avatar jeśli nie istnieje
    db.run(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT 'img/5.png'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Błąd dodawania kolumny avatar:', err.message);
      }
    });
    // Tabela ulubionych wydarzeń
    db.run(`CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      UNIQUE(user_id, event_id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  }
});

// Pobierz ulubione wydarzenia użytkownika
app.get('/favorites', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  db.all('SELECT event_id FROM favorites WHERE user_id = ?', [req.session.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Błąd bazy danych' });
    res.json(rows.map(r => r.event_id));
  });
});

// Dodaj do ulubionych
app.post('/favorites', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Brak eventId' });
  db.run('INSERT OR IGNORE INTO favorites (user_id, event_id) VALUES (?, ?)', [req.session.userId, eventId], function(err) {
    if (err) return res.status(500).json({ error: 'Błąd bazy danych' });
    res.json({ message: 'Dodano do ulubionych' });
  });
});

// Usuń z ulubionych
app.delete('/favorites', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'Brak eventId' });
  db.run('DELETE FROM favorites WHERE user_id = ? AND event_id = ?', [req.session.userId, eventId], function(err) {
    if (err) return res.status(500).json({ error: 'Błąd bazy danych' });
    res.json({ message: 'Usunięto z ulubionych' });
  });
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

  const avatars = ['img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg', 'img/5.png'];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, email, password_hash, avatar) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, randomAvatar], function(err) {
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
    req.session.created_at = user.created_at;
    req.session.avatar = user.avatar;
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

// Endpoint aktualizacji profilu
app.put('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }

  const { username, email, password, avatar } = req.body;
  const updates = [];
  const values = [];

  if (username) {
    updates.push('username = ?');
    values.push(username);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    values.push(hashedPassword);
  }
  if (avatar) {
    updates.push('avatar = ?');
    values.push(avatar);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Brak pól do aktualizacji' });
  }

  values.push(req.session.userId);

  db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Nazwa użytkownika lub email już istnieje' });
      }
      return res.status(500).json({ error: 'Błąd serwera' });
    }
    // Zaktualizuj sesję
    if (username) req.session.username = username;
    if (email) req.session.email = email;
    if (avatar) req.session.avatar = avatar;
    res.json({ message: 'Profil zaktualizowany' });
  });
});

// Endpoint profilu
app.get('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowany' });
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    email: req.session.email,
    created_at: req.session.created_at,
    avatar: req.session.avatar
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

app.listen(5000, () => console.log("Server działa na http://localhost:5000"));
