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
              <button onClick={handleLogout} className="logout-btn">
                Wyloguj się
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginPanel(!showLoginPanel)}
              className="login-btn"
            >
              Zaloguj się
            </button>
          )}
        </div>
      </div>

      {showLoginPanel && !user && (
        <div className="login-panel">
          <form onSubmit={handleLogin} className="login-form">
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

            return (
              <div
                className="card"
                key={ev.id}
                onMouseEnter={() => setHoveredEventId(ev.id)}
                onMouseLeave={() => setHoveredEventId(null)}
              >
                <h2>{ev.name}</h2>
                <p>{ev.dates?.start?.localDate}</p>
                <p>{venue?.name}</p>
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
