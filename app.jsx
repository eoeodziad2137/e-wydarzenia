const UserContext = React.createContext();

function MapComponent({ lat, lng, venueName }) {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);

  React.useEffect(() => {
    if (map.current) return;

    map.current = L.map(mapContainer.current).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    L.marker([lat, lng]).addTo(map.current).bindPopup(venueName || "Venue");
  }, [lat, lng, venueName]);

  return <div ref={mapContainer} className="map-container"></div>;
}

function App() {
  const [city, setCity] = React.useState("");
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showLoginPanel, setShowLoginPanel] = React.useState(false);
  const [showRegisterPanel, setShowRegisterPanel] = React.useState(false);
  const [regUsername, setRegUsername] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = React.useState("");
  const [hoveredEventId, setHoveredEventId] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [favorites, setFavorites] = React.useState([]);

  // Pobierz ulubione po zalogowaniu
  React.useEffect(() => {
    if (user) {
      fetch('/favorites', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setFavorites(data);
        });
    } else {
      setFavorites([]);
    }
  }, [user]);

  React.useEffect(() => {
    // Sprawdź sesję na początku
    fetch('/profile')
    .then(res => res.json())
    .then(data => {
      if (data.username) {
        setUser({ username: data.username, email: data.email });
      }
    })
    .catch(() => {});
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    if (username && password) {
      fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Logowanie udane') {
          setUser({ username: data.user.username, email: data.user.email });
          setUsername("");
          setPassword("");
          setShowLoginPanel(false);
        } else {
          alert(data.error);
        }
      })
      .catch(() => alert('Błąd logowania'));
    }
  }

  function handleLogout() {
    fetch('/logout', { method: 'POST' })
    .then(() => {
      setUser(null);
    })
    .catch(() => alert('Błąd wylogowania'));
  }

  function handleRegister(e) {
    e.preventDefault();
    if (regUsername && regEmail && regPassword && regPasswordConfirm) {
      if (regPassword !== regPasswordConfirm) {
        alert("Hasła się nie zgadzają!");
        return;
      }
      fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message === 'Rejestracja udana') {
          // Automatyczne logowanie po rejestracji
          fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: regUsername, password: regPassword })
          })
          .then(res => res.json())
          .then(loginData => {
            if (loginData.message === 'Logowanie udane') {
              setUser({ username: loginData.user.username, email: loginData.user.email });
              setRegUsername("");
              setRegEmail("");
              setRegPassword("");
              setRegPasswordConfirm("");
              setShowRegisterPanel(false);
            } else {
              alert('Rejestracja udana, ale błąd logowania: ' + loginData.error);
            }
          })
          .catch(() => alert('Rejestracja udana, ale błąd logowania'));
        } else {
          alert(data.error);
        }
      })
      .catch(() => alert('Błąd rejestracji'));
    }
  }

  function fetchEvents(e) {
    e.preventDefault();
    if (!city) return;
    setLoading(true);
    fetch(`/events?city=${encodeURIComponent(city)}`)
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  return (
    <div>
      <div className="navbar">
        <a href="index.html" className="logo-link">E-Wydarzenia</a>
        <div className="login-section">
          {user ? (
            <div className="user-info">
              <span>Zalogowany: {user.username}</span>
              <a href="profil.html" className="profile-link">Profil</a>
              <button onClick={handleLogout} className="logout-btn">
                Wyloguj się
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowLoginPanel(!showLoginPanel);
                  setShowRegisterPanel(false);
                }}
                className="login-btn"
              >
                Zaloguj się
              </button>
              <button
                onClick={() => {
                  setShowRegisterPanel(!showRegisterPanel);
                  setShowLoginPanel(false);
                }}
                className="register-btn"
              >
                Rejestracja
              </button>
            </>
          )}
        </div>
      </div>

      {showLoginPanel && (
        <div className="login-panel">
          <form onSubmit={handleLogin} className="login-form">
            <h3>Zaloguj się</h3>
            <input
              type="text"
              placeholder="Nazwa użytkownika"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button type="submit">Zaloguj</button>
            <div className="auth-switch">
              <p>Nie masz konta? <span className="link-btn" onClick={() => {
                setShowLoginPanel(false);
                setShowRegisterPanel(true);
              }}>Zarejestruj się</span></p>
            </div>
          </form>
        </div>
      )}

      {showRegisterPanel && (
        <div className="register-panel">
          <form onSubmit={handleRegister} className="register-form">
            <h3>Utwórz nowe konto</h3>
            <input
              type="text"
              placeholder="Nazwa użytkownika"
              value={regUsername}
              onChange={e => setRegUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Hasło"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Potwierdź hasło"
              value={regPasswordConfirm}
              onChange={e => setRegPasswordConfirm(e.target.value)}
              required
            />
            <button type="submit">Zarejestruj się</button>
          </form>
        </div>
      )}

      <div className="container">
        <h1>Wyszukaj wydarzenia</h1>
        <form onSubmit={fetchEvents} className="form">
          <input
            placeholder="Wpisz miasto"
            value={city}
            onChange={e => setCity(e.target.value)}
          />
          <button type="submit">Szukaj</button>
        </form>

        {loading && <p>Ładowanie...</p>}

        <div className="grid">
          {events.map(ev => {
            const venue = ev._embedded?.venues?.[0];
            const lat = venue?.location?.latitude;
            const lng = venue?.location?.longitude;
            const cancelled =
              ev?.status === "cancelled" ||
              ev?.status === "canceled" ||
              ev?.dates?.status?.code === "cancelled" ||
              ev?.dates?.status?.code === "canceled";

            // Link do mapy Google Maps po nazwie miejsca
            let mapUrl = null;
            if (venue?.name) {
              const venueQuery = encodeURIComponent(venue.name);
              mapUrl = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;
            } else if (lat && lng) {
              mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            }

            const isFavorite = favorites.includes(ev.id);
            return (
              <div className="card" key={ev.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 className={cancelled ? "event-title cancelled" : "event-title"} style={{ margin: 0 }}>
                    {ev.name}
                  </h2>
                  <button
                    type="button"
                    className="favorite-btn"
                    title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: isFavorite ? '#e74c3c' : '#aaa', marginLeft: 8 }}
                    onClick={e => {
                      e.stopPropagation();
                      if (!user) {
                        alert('Musisz być zalogowany, aby dodać do ulubionych!');
                        return;
                      }
                      if (isFavorite) {
                        fetch('/favorites', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: ev.id }),
                          credentials: 'include'
                        })
                          .then(res => res.json())
                          .then(() => setFavorites(favs => favs.filter(id => id !== ev.id)));
                      } else {
                        fetch('/favorites', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: ev.id }),
                          credentials: 'include'
                        })
                          .then(res => res.json())
                          .then(() => setFavorites(favs => [...favs, ev.id]));
                      }
                    }}
                  >
                    <span role="img" aria-label="serce">{isFavorite ? '♥' : '♡'}</span>
                  </button>
                </div>
                <div className="event-info">
                  <p className="event-date"><strong>Data:</strong> {ev.dates?.start?.localDate}</p>
                  <p className="event-venue">
                    <strong>Miejsce:</strong> {venue?.name}
                  </p>
                  {mapUrl && (
                    <p style={{ margin: 0 }}>
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline', fontWeight: 'normal', fontSize: 'inherit' }}>Otwórz mapę</a>
                    </p>
                  )}
                </div>
                {ev.description && (
                  <p className="event-description">{ev.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
