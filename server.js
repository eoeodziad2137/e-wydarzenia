const express = require("express");
const https = require("https");
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const API_KEY = "CAhoJ1QvIdpfnH5HnOy9jnGrQV0ahSMH";

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
