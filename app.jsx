function App() {
  const [city, setCity] = React.useState("");
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

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
    <div className="container">
      <h1>Wydarzenia z Ticketmaster</h1>
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
        {events.map(ev => (
          <div className="card" key={ev.id}>
            <h2>{ev.name}</h2>
            <p>{ev.dates?.start?.localDate}</p>
            <p>{ev._embedded?.venues?.[0]?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
