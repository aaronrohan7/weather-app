(() => {
  const { useState } = React;

  const WEATHERSTACK_API_KEY = "1cee5c8e707fea1915ec5eb0e51ee169";
  const BASE_URL = "http://api.weatherstack.com";

  const VIEWS = {
    CURRENT: "current",
    HISTORICAL: "historical",
    MARINE: "marine",
  };

  function buildUrl(view, location, date) {
    const params = new URLSearchParams();
    params.set("access_key", WEATHERSTACK_API_KEY);
    params.set("query", location || "Bangalore, India");
    if (view === VIEWS.HISTORICAL && date) {
      return `${BASE_URL}/historical?${params.toString()}&historical_date=${date}`;
    }
    // Weatherstack does not expose a dedicated marine endpoint on all plans;
    // use current conditions as a proxy for surface / coastal conditions.
    return `${BASE_URL}/current?${params.toString()}`;
  }

  function formatError(payload, fallback) {
    if (!payload) return fallback;
    if (payload.error && payload.error.info) return payload.error.info;
    return fallback;
  }

  function App() {
    const [activeView, setActiveView] = useState(VIEWS.CURRENT);
    const [location, setLocation] = useState("Bangalore, India");
    const [marineLocation, setMarineLocation] = useState("Chennai, India");
    const [historicalDate, setHistoricalDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);

    const [lastQuery, setLastQuery] = useState({ view: null, location: null, date: null });

    function handleViewChange(view) {
      setActiveView(view);
      setError("");
      setData(null);
    }

    async function fetchWeather(view) {
      const targetView = view || activeView;
      const effectiveLocation =
        targetView === VIEWS.MARINE ? marineLocation || "Chennai, India" : location || "Bangalore, India";
      const effectiveDate = targetView === VIEWS.HISTORICAL ? historicalDate : null;

      if (targetView === VIEWS.HISTORICAL && !effectiveDate) {
        setError("Choose a historical date within the allowed range.");
        return;
      }

      const cacheKey = `${targetView}|${effectiveLocation}|${effectiveDate || ""}`;
      const lastKey = `${lastQuery.view}|${lastQuery.location}|${lastQuery.date || ""}`;
      if (cacheKey === lastKey && data) return;

      setLoading(true);
      setError("");

      try {
        const url = buildUrl(targetView, effectiveLocation, effectiveDate);
        const res = await fetch(url);
        const payload = await res.json();

        if (!res.ok || payload.error) {
          throw new Error(
            formatError(payload, "We couldn’t fetch weather data right now. Check your key or try again.")
          );
        }

        setData(payload);
        setLastQuery({ view: targetView, location: effectiveLocation, date: effectiveDate });
      } catch (err) {
        setError(err.message || "Something went wrong while talking to the weather service.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    function renderMain() {
      if (!data) {
        return React.createElement(
          "div",
          { className: "helper-text" },
          activeView === VIEWS.CURRENT
            ? "Fetch current conditions for a city or region."
            : activeView === VIEWS.HISTORICAL
            ? "Select a date and fetch archived conditions for that day."
            : "Use a coastal or offshore location to approximate marine surface conditions."
        );
      }

      if (activeView === VIEWS.HISTORICAL && data.historical) {
        const dates = Object.keys(data.historical).sort();
        const day = data.historical[dates[0]];
        return renderWeatherBlock(day.current || day, data.location, "Historical snapshot");
      }

      // current / marine both use current payload
      if (data.current && data.location) {
        const label = activeView === VIEWS.MARINE ? "Marine surface snapshot" : "Live conditions";
        return renderWeatherBlock(data.current, data.location, label);
      }

      return React.createElement(
        "div",
        { className: "helper-text" },
        "Data returned, but in an unexpected format."
      );
    }

    function renderWeatherBlock(current, loc, contextLabel) {
      const temperature = current.temperature;
      const feels = current.feelslike;
      const humidity = current.humidity;
      const windSpeed = current.wind_speed;
      const windDir = current.wind_dir;
      const pressure = current.pressure;
      const visibility = current.visibility;
      const desc = Array.isArray(current.weather_descriptions)
        ? current.weather_descriptions.join(", ")
        : current.weather_descriptions;

      return React.createElement(
        "div",
        { className: "weather-main" },
        React.createElement(
          "div",
          { className: "weather-row" },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "weather-temp" },
              typeof temperature === "number" ? temperature : "--"
            ),
            React.createElement("span", { className: "weather-unit" }, "°C")
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "chips-row" },
              React.createElement(
                "span",
                { className: "chip" },
                desc || "Calm conditions"
              ),
              React.createElement(
                "span",
                { className: "chip" },
                loc ? loc.name + ", " + loc.country : "Unknown location"
              ),
              contextLabel
                ? React.createElement("span", { className: "chip" }, contextLabel)
                : null
            )
          )
        ),
        React.createElement(
          "div",
          { className: "weather-meta" },
          React.createElement("span", null, "Feels like ", feels, " °C"),
          React.createElement("span", null, "Humidity ", humidity, " %"),
          React.createElement("span", null, "Wind ", windSpeed, " km/h ", windDir || ""),
          React.createElement("span", null, "Pressure ", pressure, " hPa"),
          React.createElement("span", null, "Visibility ", visibility, " km")
        ),
        React.createElement(
          "div",
          { className: "weather-secondary" },
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement("div", { className: "stat-label" }, "LAT / LON"),
            React.createElement(
              "div",
              { className: "stat-value" },
              loc ? loc.lat + " / " + loc.lon : "–"
            )
          ),
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement("div", { className: "stat-label" }, "LOCAL TIME"),
            React.createElement(
              "div",
              { className: "stat-value" },
              loc && loc.localtime ? loc.localtime : "–"
            )
          )
        )
      );
    }

    function renderSide() {
      if (activeView === VIEWS.CURRENT) {
        return React.createElement(
          "div",
          { className: "side-panel-card" },
          React.createElement("div", { className: "side-panel-title" }, "Current weather"),
          React.createElement(
            "div",
            { className: "side-panel-body" },
            "A calm, single-surface view of what it feels like outside right now. No charts, no noise, just the essentials.",
            React.createElement(
              "ul",
              { className: "side-list" },
              React.createElement("li", null, "City or region input"),
              React.createElement("li", null, "Temperature, humidity, wind, visibility"),
              React.createElement("li", null, "Clear copy suitable for daily checks")
            )
          )
        );
      }

      if (activeView === VIEWS.HISTORICAL) {
        return React.createElement(
          "div",
          { className: "side-panel-card" },
          React.createElement("div", { className: "side-panel-title" }, "Historical snapshot"),
          React.createElement(
            "div",
            { className: "side-panel-body" },
            "Pull a single day’s conditions to anchor patterns or compare with planned travel.",
            React.createElement(
              "ul",
              { className: "side-list" },
              React.createElement("li", null, "Date picker for specific days"),
              React.createElement("li", null, "Same structure as live view"),
              React.createElement("li", null, "Ideal for past-event retrospectives")
            )
          )
        );
      }

      return React.createElement(
        "div",
        { className: "side-panel-card" },
        React.createElement("div", { className: "side-panel-title" }, "Marine surface view"),
        React.createElement(
          "div",
          { className: "side-panel-body" },
          "Approximate marine conditions by querying coastal locations and focusing on surface metrics.",
          React.createElement(
            "ul",
            { className: "side-list" },
            React.createElement("li", null, "Use ports and coastal cities"),
            React.createElement("li", null, "Pay attention to wind and visibility"),
            React.createElement("li", null, "Pair with other marine sources if needed")
          )
        )
      );
    }

    return React.createElement(
      "div",
      { className: "app-shell" },
      React.createElement(
        "header",
        { className: "app-shell__header" },
        React.createElement(
          "div",
          { className: "branding" },
          React.createElement("div", { className: "branding__title" }, "Weather Glass"),
          React.createElement(
            "div",
            { className: "branding__subtitle" },
            "A focused front-end for the Weatherstack API."
          )
        ),
        React.createElement(
          "div",
          { className: "view-switch" },
          React.createElement(
            "button",
            {
              className:
                "view-switch__button" +
                (activeView === VIEWS.CURRENT ? " view-switch__button--active" : ""),
              type: "button",
              onClick: () => handleViewChange(VIEWS.CURRENT),
            },
            "Current"
          ),
          React.createElement(
            "button",
            {
              className:
                "view-switch__button" +
                (activeView === VIEWS.HISTORICAL ? " view-switch__button--active" : ""),
              type: "button",
              onClick: () => handleViewChange(VIEWS.HISTORICAL),
            },
            "Historical"
          ),
          React.createElement(
            "button",
            {
              className:
                "view-switch__button" +
                (activeView === VIEWS.MARINE ? " view-switch__button--active" : ""),
              type: "button",
              onClick: () => handleViewChange(VIEWS.MARINE),
            },
            "Marine"
          )
        )
      ),
      React.createElement(
        "main",
        null,
        React.createElement(
          "section",
          { className: "glass-panel" },
          React.createElement(
            "div",
            { className: "panel-layout" },
            React.createElement(
              "div",
              { className: "panel-main" },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { className: "panel-heading" },
                  activeView === VIEWS.CURRENT
                    ? "Current weather"
                    : activeView === VIEWS.HISTORICAL
                    ? "Historical weather"
                    : "Marine weather"
                ),
                React.createElement(
                  "p",
                  { className: "panel-subtext" },
                  activeView === VIEWS.CURRENT
                    ? "Check what it feels like right now for any city or region, without leaving this calm surface."
                    : activeView === VIEWS.HISTORICAL
                    ? "Anchor conversations around specific dates by pulling a single day’s archive into the same layout."
                    : "Get a surface-level view for ports and coastal locations, focusing on metrics that matter on water."
                )
              ),
              React.createElement(
                "div",
                { className: "field-row" },
                activeView !== VIEWS.MARINE
                  ? React.createElement(
                      "div",
                      { className: "field field--grow" },
                      React.createElement(
                        "label",
                        { className: "label", htmlFor: "location-input" },
                        "Location"
                      ),
                      React.createElement("input", {
                        id: "location-input",
                        className: "input",
                        placeholder: "Example: Bangalore, India",
                        value: location,
                        onChange: (e) => setLocation(e.target.value),
                      })
                    )
                  : React.createElement(
                      "div",
                      { className: "field field--grow" },
                      React.createElement(
                        "label",
                        { className: "label", htmlFor: "marine-location-input" },
                        "Marine / coastal location"
                      ),
                      React.createElement("input", {
                        id: "marine-location-input",
                        className: "input",
                        placeholder: "Example: Chennai, India",
                        value: marineLocation,
                        onChange: (e) => setMarineLocation(e.target.value),
                      })
                    ),
                activeView === VIEWS.HISTORICAL &&
                  React.createElement(
                    "div",
                    { className: "field" },
                    React.createElement(
                      "label",
                      { className: "label", htmlFor: "historical-date" },
                      "Date"
                    ),
                    React.createElement("input", {
                      id: "historical-date",
                      type: "date",
                      className: "input",
                      value: historicalDate,
                      onChange: (e) => setHistoricalDate(e.target.value),
                    })
                  ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "button",
                    disabled: loading,
                    onClick: () => fetchWeather(),
                  },
                  loading ? "Fetching…" : "Fetch weather"
                )
              ),
              error &&
                React.createElement(
                  "div",
                  { className: "error-text" },
                  error
                ),
              renderMain()
            ),
            React.createElement("aside", { className: "panel-side" }, renderSide())
          ),
          React.createElement(
            "div",
            { className: "footer-note" },
            "This is a front-end-only demonstration built on top of the Weatherstack API. ",
            "For production use, keep API keys on a backend and handle rate limits and errors with more structure."
          )
        )
      )
    );
  }

  const rootEl = document.getElementById("root");
  if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(React.createElement(App));
  }
})();

