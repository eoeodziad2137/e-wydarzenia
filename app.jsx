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
  const [user, setUser] = React.useState(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showLoginPanel, setShowLoginPanel] = React.useState(false);
  const [showRegisterPanel, setShowRegisterPanel] = React.useState(false);
  const [regUsername, setRegUsername] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = React.useState("");
  const [hoveredEventId, setHoveredEventId] = React.useState(null);

  function handleLogin(e) {
    e.preventDefault();
    if (username && password) {
      setUser({ username });
      setUsername("");
      setPassword("");
      setShowLoginPanel(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setShowLoginPanel(false);
  }

  function handleRegister(e) {
    e.preventDefault();
    if (regUsername && regEmail && regPassword && regPasswordConfirm) {
      if (regPassword !== regPasswordConfirm) {
        alert("Hasła się nie zgadzają!");
        return;
      }
      setUser({ username: regUsername });
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegPasswordConfirm("");
      setShowRegisterPanel(false);
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
        <h3>E-Wydarzenia</h3>
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

      {showLoginPanel && !user && (
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

      {showRegisterPanel && !user && (
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
            const isHovered = hoveredEventId === ev.id;
            // some event objects include a status field or nested dates.status.code
            const cancelled =
              ev?.status === "cancelled" ||
              ev?.status === "canceled" ||
              ev?.dates?.status?.code === "cancelled" ||
              ev?.dates?.status?.code === "canceled";

            return (
              <div
                className="card"
                key={ev.id}
                onMouseEnter={() => setHoveredEventId(ev.id)}
                onMouseLeave={() => setHoveredEventId(null)}
              >
                <h2 className={cancelled ? "event-title cancelled" : "event-title"}>
                  {ev.name}
                </h2>
                <div className="event-info">
                  <p className="event-date"><strong>Data:</strong> {ev.dates?.start?.localDate}</p>
                  <p className="event-venue"><strong>Miejsce:</strong> {venue?.name}</p>
                </div>
                {ev.description && (
                  <p className="event-description">{ev.description}</p>
                )}
                {lat && lng && isHovered && (
                  <MapComponent lat={lat} lng={lng} venueName={venue?.name} />
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
