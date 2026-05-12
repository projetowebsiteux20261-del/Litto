// ============================================================
// LITTO – Mapa de Bibliotecas Públicas de São Paulo
// ============================================================

const BIBLIOTECAS_SP = [
  {
    nome: "Biblioteca Mário de Andrade",
    endereco: "R. da Consolação, 94 – República, São Paulo",
    lat: -23.5445, lng: -46.6438
  },
  {
    nome: "Biblioteca Pública Estadual – Monteiro Lobato",
    endereco: "R. Gen. Jardim, 485 – Vila Buarque, São Paulo",
    lat: -23.5496, lng: -46.6516
  },
  {
    nome: "Biblioteca Alceu Amoroso Lima (USP)",
    endereco: "Av. Prof. Luciano Gualberto, 403 – Butantã, São Paulo",
    lat: -23.5614, lng: -46.7291
  },
  {
    nome: "Biblioteca Pública Municipal Belmonte",
    endereco: "Pça. Coronel Custódio, s/n – Jabaquara, São Paulo",
    lat: -23.6403, lng: -46.6561
  },
  {
    nome: "Biblioteca Municipal Prefeito Prestes Maia",
    endereco: "Pça. Comandante Eduardo de Oliveira, s/n – Lapa, São Paulo",
    lat: -23.5195, lng: -46.7046
  },
  {
    nome: "Biblioteca Pública Municipal Jorge Amado",
    endereco: "R. Cristóvão Colombo, 567 – Santana, São Paulo",
    lat: -23.4882, lng: -46.6265
  },
  {
    nome: "Biblioteca Pública Municipal Érico Veríssimo",
    endereco: "Av. Eng. Luís Carlos Berrini, 200 – Brooklin, São Paulo",
    lat: -23.5986, lng: -46.6848
  },
  {
    nome: "CEU Meninos – Biblioteca",
    endereco: "R. Luís Fernandes de Sousa, 601 – Ipiranga, São Paulo",
    lat: -23.5892, lng: -46.6069
  },
  {
    nome: "Biblioteca Pública Municipal Viriato Corrêa",
    endereco: "R. Voluntários da Pátria, 4271 – Santana, São Paulo",
    lat: -23.4762, lng: -46.6252
  },
  {
    nome: "Biblioteca da Terceira Idade – SESC Pompeia",
    endereco: "R. Clélia, 93 – Pompeia, São Paulo",
    lat: -23.5254, lng: -46.6842
  }
];

let mapInstance = null;

export function initMap() {
  // Evita inicializar duas vezes
  if (mapInstance) {
    mapInstance.invalidateSize();
    return;
  }

  const container = document.getElementById("map");
  if (!container) return;

  mapInstance = L.map("map", {
    center: [-23.5505, -46.6333],
    zoom: 12,
    zoomControl: true
  });

  // Tiles gratuitos do OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(mapInstance);

  // Ícone customizado (neo-brutalista)
  const bookIcon = L.divIcon({
    className: "",
    html: `<div style="
      width:36px; height:36px;
      background:#5065ff;
      border:2px solid #1a1b24;
      box-shadow:3px 3px 0 0 #1a1b24;
      display:flex; align-items:center; justify-content:center;
      border-radius:2px;
    ">
      <span class="material-symbols-outlined" style="color:#fff;font-size:18px;">menu_book</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38]
  });

  BIBLIOTECAS_SP.forEach(bib => {
    const popup = `
      <h3>${bib.nome}</h3>
      <p>${bib.endereco}</p>
    `;
    L.marker([bib.lat, bib.lng], { icon: bookIcon })
      .addTo(mapInstance)
      .bindPopup(popup);
  });
}
