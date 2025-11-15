// ---------------- CONFIG ----------------
const API_KEY = "c01cd64a1b66b6c56eb0d866eff33ce5";
let units = "metric";

// DOM
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const unitBtn = document.getElementById("unitBtn");
const themeToggle = document.getElementById("themeToggle");

const message = document.getElementById("message");
const weatherWrap = document.getElementById("weatherWrap");

const locationEl = document.getElementById("location");
const timeEl = document.getElementById("time");
const updateEl = document.getElementById("updateAt");
const descEl = document.getElementById("desc");
const iconImg = document.getElementById("wIcon");
const tempEl = document.getElementById("temp");
const feelsEl = document.getElementById("feels");
const humEl = document.getElementById("hum");
const windEl = document.getElementById("wind");
const presEl = document.getElementById("pres");
const sunEl = document.getElementById("sun");
const forecastEl = document.getElementById("forecast");

// message helpers
function showMsg(t, err = false){
  message.classList.remove("hidden");
  message.textContent = t;
  message.style.color = err ? "var(--danger)" : "var(--text)";
}
function hideMsg(){ message.classList.add("hidden"); }

// ---------------- TIME FIX ----------------
// Convert UTC → CITY LOCAL TIME using tzOffset (in seconds)
function cityLocalTime(ts, tzOffset){
  const localOffset = new Date().getTimezoneOffset() * 60;
  return new Date((ts + tzOffset + localOffset) * 1000);
}
function fmtTime(ts, tzOffset){
  return cityLocalTime(ts, tzOffset).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function fmtDateTime(ts, tzOffset){
  return cityLocalTime(ts, tzOffset).toLocaleString([], {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});
}

// Weather theme
function applyWeatherTheme(main, night){
  const b = document.body;
  b.className = "";  
  if(night) return b.classList.add("night");
  if(main.includes("Clear")) b.classList.add("clear");
  else if(main.includes("Cloud")) b.classList.add("clouds");
  else if(main.includes("Rain") || main.includes("Drizzle") || main.includes("Thunder")) b.classList.add("rain");
  else if(main.includes("Snow")) b.classList.add("snow");
  else if(main.includes("Mist") || main.includes("Fog") || main.includes("Haze")) b.classList.add("mist");
  else b.classList.add("clouds");
}

function setUnitLabel(){
  unitBtn.textContent = units === "metric" ? "°C" : "°F";
}

// Build forecast
function buildForecast(list, tz){
  forecastEl.innerHTML = "";
  const groups = {};
  list.forEach(i=>{
    const d = cityLocalTime(i.dt, tz);
    const day = d.toLocaleDateString([], {weekday:"short", day:"numeric", month:"short"});
    if(!groups[day]) groups[day] = [];
    groups[day].push(i);
  });

  Object.keys(groups).slice(0,5).forEach(k=>{
    const arr = groups[k];
    let best = arr.reduce((p,c)=>{
      return Math.abs(new Date(p.dt*1000).getHours()-12) <
             Math.abs(new Date(c.dt*1000).getHours()-12) ? p : c;
    });
    const card = document.createElement("div");
    card.className = "fcard";
    card.innerHTML = `
      <small>${k}</small>
      <img src="https://openweathermap.org/img/wn/${best.weather[0].icon}@2x.png" width="64"/>
      <div><b>${Math.round(best.main.temp)} ${units==="metric"?"°C":"°F"}</b></div>
      <small style="text-transform:capitalize">${best.weather[0].description}</small>
    `;
    forecastEl.appendChild(card);
  });
}

// Display weather
function displayWeather(cur, fc){
  hideMsg();
  weatherWrap.classList.remove("hidden");

  const tz = cur.timezone;

  locationEl.textContent = `${cur.name}, ${cur.sys.country}`;
  timeEl.textContent = fmtDateTime(cur.dt, tz);
  updateEl.textContent = "Updated: " + fmtDateTime(cur.dt, tz);

  descEl.textContent = cur.weather[0].description;
  tempEl.textContent = `${Math.round(cur.main.temp)} ${units==="metric"?"°C":"°F"}`;
  feelsEl.textContent = `Feels like ${Math.round(cur.main.feels_like)} ${units==="metric"?"°C":"°F"}`;

  humEl.textContent = cur.main.humidity + "%";
  windEl.textContent = cur.wind.speed + (units==="metric"?" m/s":" mph");
  presEl.textContent = cur.main.pressure + " hPa";

  sunEl.textContent = `${fmtTime(cur.sys.sunrise, tz)} / ${fmtTime(cur.sys.sunset, tz)}`;

  const icon = cur.weather[0].icon;
  iconImg.src = `https://openweathermap.org/img/wn/${icon}@4x.png`;

  applyWeatherTheme(cur.weather[0].main, icon.endsWith("n"));

  buildForecast(fc.list, tz);
}

// Fetch by city
async function fetchByCity(q){
  try{
    showMsg("Loading...");
    const curRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${API_KEY}&units=${units}`);
    if(!curRes.ok) return showMsg("City not found", true);

    const cur = await curRes.json();
    const fcRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${API_KEY}&units=${units}`);
    const fc = await fcRes.json();

    displayWeather(cur, fc);
  }catch(e){
    showMsg("Network error", true);
  }
}

// Fetch by geolocation
async function fetchByCoords(lat, lon){
  try{
    showMsg("Loading...");
    const curRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`);
    const cur = await curRes.json();

    const fcRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`);
    const fc = await fcRes.json();

    displayWeather(cur, fc);
  }catch(e){
    showMsg("Location error", true);
  }
}

// EVENTS
searchBtn.onclick = ()=> {
  const q = cityInput.value.trim();
  if(q) fetchByCity(q);
};
cityInput.addEventListener("keyup", e=>{
  if(e.key==="Enter"){
    const q = cityInput.value.trim();
    if(q) fetchByCity(q);
  }
});
geoBtn.onclick = ()=>{
  navigator.geolocation.getCurrentPosition(pos=>{
    fetchByCoords(pos.coords.latitude, pos.coords.longitude);
  }, ()=> showMsg("Location denied", true));
};

// toggle units
unitBtn.onclick = ()=>{
  units = units==="metric" ? "imperial" : "metric";
  setUnitLabel();
  const q = cityInput.value.trim();
  if(q) fetchByCity(q);
};

// theme toggle
themeToggle.onclick = ()=>{
  document.body.classList.toggle("light");
  themeToggle.textContent = document.body.classList.contains("light") ? "Dark" : "Light";
};

setUnitLabel();
