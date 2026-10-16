const API_URL = "https://graphql.anilist.co";
const DEMO_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const state = {
  view: "home",
  search: "",
  genre: "",
  sort: "popular",
  page: 1,
  perPage: 20,
  hasNextPage: true,
  loading: false,
  items: [],
  favorites: readFavorites(),
  selected: null
};

const grid = document.querySelector("#anime-grid");
const statusMessage = document.querySelector("#status-message");
const searchInput = document.querySelector("#search-input");
const genreFilter = document.querySelector("#genre-filter");
const sortFilter = document.querySelector("#sort-filter");
const loadMoreButton = document.querySelector("#load-more");
const detailDialog = document.querySelector("#detail-dialog");

function readFavorites() {
  try { return JSON.parse(localStorage.getItem("anido-favorites") || "[]"); }
  catch { return []; }
}
function saveFavorites() {
  localStorage.setItem("anido-favorites", JSON.stringify(state.favorites));
  updateFavoriteCount();
}
function updateFavoriteCount() {
  document.querySelector("#favorite-count").textContent = state.favorites.length;
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function plainText(html = "") {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent || node.innerText || "";
}
function formatType(item) {
  return item.countryOfOrigin === "CN" ? "DONGHUA" : "ANIME";
}
function titleOf(item) {
  return item.title?.english || item.title?.romaji || item.title?.native || "Judul belum tersedia";
}
function yearOf(item) {
  return item.startDate?.year || "Tahun tidak diketahui";
}
function coverOf(item) {
  return item.coverImage?.extraLarge || item.coverImage?.large || "";
}
function isFavorite(id) {
  return state.favorites.some(item => item.id === id);
}

async function fetchCatalog(reset = true) {
  if (state.loading) return;
  state.loading = true;
  if (reset) {
    state.page = 1;
    state.items = [];
    grid.innerHTML = "";
  }
  statusMessage.textContent = "Mengambil katalog dari AniList…";
  loadMoreButton.hidden = true;

  const searchTerm = state.search.trim();
  const country = state.view === "donghua" ? "CN" : state.view === "anime" ? "JP" : null;
  const sort = state.sort === "newest" ? "START_DATE_DESC" :
               state.sort === "title" ? "TITLE_ROMAJI" : "POPULARITY_DESC";

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $country: CountryCode, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, search: $search, countryOfOrigin: $country, sort: $sort, isAdult: false) {
          id
          title { romaji english native }
          description(asHtml: false)
          coverImage { large extraLarge }
          averageScore
          episodes
          seasonYear
          startDate { year }
          genres
          format
          status
          countryOfOrigin
          siteUrl
        }
      }
    }`;

  const variables = {
    page: state.page,
    perPage: state.perPage,
    sort: [sort],
    ...(searchTerm ? { search: searchTerm } : {}),
    ...(country ? { country } : {})
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) throw new Error("Katalog sedang tidak bisa diakses. Coba lagi sebentar.");
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "Terjadi kesalahan API.");
    const pageData = json.data.Page;
    state.hasNextPage = pageData.pageInfo.hasNextPage;
    state.items = reset ? pageData.media : state.items.concat(pageData.media);
    renderCatalog();
    statusMessage.textContent = `${state.items.length} judul ditemukan · sumber metadata AniList`;
    loadMoreButton.hidden = !state.hasNextPage || state.view === "favorites";
  } catch (error) {
    statusMessage.textContent = "Tidak bisa memuat katalog. Periksa internet lalu coba lagi.";
    if (state.items.length === 0) {
      grid.innerHTML = `<div class="empty-state"><strong>Katalog belum tersedia</strong>${escapeHTML(error.message)}<br><br><button class="secondary-btn" id="retry-button">Coba lagi</button></div>`;
      document.querySelector("#retry-button")?.addEventListener("click", () => fetchCatalog(true));
    }
  } finally {
    state.loading = false;
  }
}

function renderCatalog() {
  let items = [...state.items];
  if (state.view === "favorites") {
    const favoriteIds = new Set(state.favorites.map(item => item.id));
    items = items.filter(item => favoriteIds.has(item.id));
  }
  if (state.genre) items = items.filter(item => item.genres?.includes(state.genre));
  if (state.search && state.view === "favorites") {
    const needle = state.search.toLowerCase();
    items = items.filter(item => titleOf(item).toLowerCase().includes(needle));
  }
  if (state.sort === "title") items.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  if (state.sort === "newest") items.sort((a, b) => yearOf(b) - yearOf(a));

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><strong>${state.view === "favorites" ? "Belum ada favorit" : "Tidak ada judul ditemukan"}</strong>${state.view === "favorites" ? "Tekan ikon ♡ pada kartu anime untuk menyimpannya di sini." : "Coba kata pencarian atau genre lain."}</div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const title = titleOf(item);
    const cover = coverOf(item);
    return `<article class="anime-card" data-open="${item.id}" tabindex="0" role="button" aria-label="Lihat detail ${escapeHTML(title)}">
      <div class="poster-wrap">
        ${cover ? `<img class="poster" src="${escapeHTML(cover)}" alt="Poster ${escapeHTML(title)}" loading="lazy">` : ""}
        <div class="poster-shade"></div>
        <span class="type-tag">${formatType(item)}</span>
        <span class="score-tag">★ ${item.averageScore ? (item.averageScore / 10).toFixed(1) : "—"}</span>
        <button class="fav-btn ${isFavorite(item.id) ? "is-favorite" : ""}" data-fav="${item.id}" aria-label="${isFavorite(item.id) ? "Hapus dari" : "Tambah ke"} favorit">${isFavorite(item.id) ? "♥" : "♡"}</button>
      </div>
      <h3 class="card-title">${escapeHTML(title)}</h3>
      <div class="card-meta"><span>${escapeHTML(String(yearOf(item)))}</span><span>·</span><span>${escapeHTML(item.format || "ANIME")}</span>${item.episodes ? `<span>· ${item.episodes} eps</span>` : ""}</div>
    </article>`;
  }).join("");

  grid.querySelectorAll("[data-open]").forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("[data-fav]")) return;
      openDetails(Number(card.dataset.open));
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetails(Number(card.dataset.open));
      }
    });
  });
  grid.querySelectorAll("[data-fav]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      toggleFavorite(Number(button.dataset.fav));
    });
  });
  updateGenreOptions();
}

function updateGenreOptions() {
  const previous = state.genre;
  const genres = [...new Set(state.items.flatMap(item => item.genres || []))].sort();
  genreFilter.innerHTML = `<option value="">Semua genre</option>` + genres.map(genre =>
    `<option value="${escapeHTML(genre)}">${escapeHTML(genre)}</option>`
  ).join("");
  genreFilter.value = genres.includes(previous) ? previous : "";
  state.genre = genreFilter.value;
}

function toggleFavorite(id) {
  const item = state.items.find(entry => entry.id === id) ||
               state.favorites.find(entry => entry.id === id);
  if (!item) return;
  if (isFavorite(id)) state.favorites = state.favorites.filter(entry => entry.id !== id);
  else state.favorites.unshift(item);
  saveFavorites();
  if (state.view === "favorites") renderCatalog();
  else renderCatalog();
  if (state.selected?.id === id) updateDetailFavoriteButton();
}

function updateDetailFavoriteButton() {
  const button = document.querySelector("#detail-favorite");
  if (!button || !state.selected) return;
  button.textContent = isFavorite(state.selected.id) ? "♥ Tersimpan" : "♡ Tambah favorit";
}

function openDetails(id) {
  const item = state.items.find(entry => entry.id === id) ||
               state.favorites.find(entry => entry.id === id);
  if (!item) return;
  state.selected = item;
  const title = titleOf(item);
  const description = plainText(item.description || "Sinopsis belum tersedia.");
  const genres = (item.genres || []).map(genre => `<span class="pill">${escapeHTML(genre)}</span>`).join("");
  const episodeCount = Math.min(Number(item.episodes) || 1, 12);
  document.querySelector("#detail-content").innerHTML = `
    <div class="detail-head">
      <img class="detail-poster" src="${escapeHTML(coverOf(item))}" alt="Poster ${escapeHTML(title)}">
      <div class="detail-info">
        <div class="detail-badges"><span class="pill">${formatType(item)}</span><span class="pill">${escapeHTML(item.format || "ANIME")}</span><span class="pill">${escapeHTML(String(yearOf(item)))}</span></div>
        <h2>${escapeHTML(title)}</h2>
        <p class="detail-desc">${escapeHTML(description.slice(0, 560))}${description.length > 560 ? "…" : ""}</p>
        <div class="detail-badges">${genres}</div>
        <div class="detail-actions">
          <button class="primary-btn" id="demo-play">▶ Tonton demo</button>
          <button class="secondary-btn" id="detail-favorite">♡ Tambah favorit</button>
          <a class="secondary-btn" href="${escapeHTML(item.siteUrl || "https://anilist.co/")}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Info AniList ↗</a>
        </div>
      </div>
    </div>
    <section class="episode-section">
      <h3>Daftar episode ${item.episodes ? `· ${item.episodes} episode tercatat` : ""}</h3>
      <p class="detail-desc">Daftar berikut hanya contoh antarmuka. Episode asli harus dihubungkan ke sumber resmi yang memiliki izin distribusi.</p>
      ${Array.from({length: episodeCount}, (_, index) => `<div class="episode-row"><div><strong>Episode ${index + 1}</strong><br><small>${index === 0 ? "Contoh pemutar video" : "Tautan episode resmi belum diatur"}</small></div><button data-episode="${index + 1}">${index === 0 ? "Putar demo" : "Belum tersedia"}</button></div>`).join("")}
    </section>
    <section class="video-wrap" id="video-area" hidden>
      <video controls playsinline preload="metadata" src="${DEMO_VIDEO}"></video>
      <p class="video-caption">Video demonstrasi bunga dari MDN, bukan episode anime. Ganti dengan URL video yang kamu miliki atau yang secara eksplisit berlisensi untuk streaming.</p>
    </section>`;
  updateDetailFavoriteButton();
  document.querySelector("#detail-favorite").addEventListener("click", () => toggleFavorite(item.id));
  document.querySelector("#demo-play").addEventListener("click", playDemo);
  document.querySelectorAll("[data-episode]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.episode === "1") playDemo();
      else alert("Episode ini belum terhubung. Gunakan sumber streaming resmi yang berlisensi.");
    });
  });
  detailDialog.showModal();
}
function playDemo() {
  const area = document.querySelector("#video-area");
  area.hidden = false;
  area.scrollIntoView({ behavior: "smooth", block: "center" });
  area.querySelector("video").play().catch(() => {});
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-btn").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  const titles = { home: "Jelajahi katalog", anime: "Anime Jepang", donghua: "Donghua China", favorites: "Favoritmu" };
  document.querySelector("#section-title").textContent = titles[view] || titles.home;
  document.querySelector("#hero").hidden = view !== "home";
  document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  if (view === "favorites") {
    state.items = [...state.favorites];
    state.search = searchInput.value;
    renderCatalog();
    statusMessage.textContent = `${state.favorites.length} judul tersimpan di perangkat ini`;
    loadMoreButton.hidden = true;
  } else {
    fetchCatalog(true);
  }
}

document.querySelectorAll(".nav-btn").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector("#explore-button").addEventListener("click", () => document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" }));
searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  if (state.view === "favorites") renderCatalog();
  else fetchCatalog(true);
});
genreFilter.addEventListener("change", () => {
  state.genre = genreFilter.value;
  renderCatalog();
});
sortFilter.addEventListener("change", () => {
  state.sort = sortFilter.value;
  fetchCatalog(true);
});
loadMoreButton.addEventListener("click", () => {
  if (!state.hasNextPage || state.loading) return;
  state.page += 1;
  fetchCatalog(false);
});
document.querySelector("#close-dialog").addEventListener("click", () => detailDialog.close());
detailDialog.addEventListener("click", event => {
  if (event.target === detailDialog) detailDialog.close();
});

let installPrompt = null;
const installButton = document.querySelector("#install-button");
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installButton.hidden = true;
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => console.log("Service worker gagal:", error));
  });
}

updateFavoriteCount();
fetchCatalog(true);
