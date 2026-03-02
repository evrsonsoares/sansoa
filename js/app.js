/* ===== OUZADIA D'VILLA FC - APP LOGIC ===== */

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  Utils.setupNavbar();
  Utils.setupScrollAnimations();
  Utils.createParticles('hero-particles');

  const page = document.body.dataset.page;
  const pages = {
    'home': initHome,
    'jogos': initJogos,
    'galeria': initGaleria,
    'noticias': initNoticias,
    'noticia': initNoticiaDetalhe,
    'parceiros': initParceiros,
    'produtos': initProdutos
  };
  if (pages[page]) pages[page]();
});

/* ============================================================
   HOME PAGE
============================================================ */
function initHome() {
  renderHeroStats();
  renderUpcomingGames();
  renderLastResults();
  renderNews();
  renderClassificationHome();
  renderChampionshipsHome();
  setupCounters();
}

function renderHeroStats() {
  const stats = DB.getTeamStats();
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-wins', stats.wins);
  el('stat-draws', stats.draws);
  el('stat-losses', stats.losses);
  el('stat-goals', stats.goalsFor);
  el('stat-games', stats.total);
}

function renderUpcomingGames() {
  const container = document.getElementById('upcoming-games');
  if (!container) return;
  const games = DB.get(DB.KEYS.GAMES).filter(g => !g.played)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const championships = DB.get(DB.KEYS.CHAMPIONSHIPS);
  if (!games.length) {
    container.innerHTML = '<p class="text-center" style="color:var(--gray-light);padding:20px">Nenhum jogo agendado</p>';
    return;
  }
  container.innerHTML = games.map(g => {
    const champ = championships.find(c => c.id === g.championshipId);
    const d = new Date(g.date + 'T00:00:00');
    const day = d.toLocaleDateString('pt-BR', { day: '2-digit' });
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
    const opponent = g.homeTeam === "Ouzadia D'Villa FC" ? g.awayTeam : g.homeTeam;
    const venue = g.homeTeam === "Ouzadia D'Villa FC" ? '🏠 Casa' : '✈️ Fora';
    return `
      <div class="upcoming-game animate-on-scroll">
        <div class="upcoming-date"><span class="day">${day}</span><span class="month">${month}</span></div>
        <div class="upcoming-info">
          <div class="upcoming-teams">Ouzadia D'Villa FC vs ${opponent}</div>
          <div class="upcoming-champ">${champ ? champ.name : 'Amistoso'} ${venue}</div>
          <div class="upcoming-venue">${g.time || ''} · ${Utils.formatType(g.type)}</div>
        </div>
      </div>`;
  }).join('');
  Utils.setupScrollAnimations();
}

function renderLastResults() {
  const container = document.getElementById('last-results');
  if (!container) return;
  const games = DB.get(DB.KEYS.GAMES).filter(g => g.played)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  if (!games.length) { container.innerHTML = '<div class="empty-state"><span class="icon">⚽</span><p>Nenhum resultado disponível</p></div>'; return; }
  container.innerHTML = games.map(g => createGameCard(g)).join('');
  Utils.setupScrollAnimations();
}

function renderNews() {
  const container = document.getElementById('news-home');
  if (!container) return;
  const news = DB.get(DB.KEYS.NEWS).filter(n => n.published)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!news.length) { container.innerHTML = '<div class="empty-state"><span class="icon">📰</span><p>Nenhuma notícia disponível</p></div>'; return; }
  container.innerHTML = news.map(n => createNewsCard(n)).join('');
  Utils.setupScrollAnimations();
}

function renderClassificationHome() {
  const container = document.getElementById('classification-home');
  if (!container) return;
  const championships = DB.get(DB.KEYS.CHAMPIONSHIPS).filter(c => c.type === 'campo' && c.status === 'active');
  const champ = championships[0];
  if (!champ) { container.innerHTML = '<p style="color:var(--gray-light);padding:20px;text-align:center">Tabela não disponível</p>'; return; }
  const classification = DB.getClassification(champ.id);
  renderClassificationTable(container, classification, champ.name);
}

function renderChampionshipsHome() {
  const container = document.getElementById('championships-home');
  if (!container) return;
  const championships = DB.get(DB.KEYS.CHAMPIONSHIPS).filter(c => c.status === 'active');
  container.innerHTML = championships.map(c => `
    <div class="card animate-on-scroll" style="padding:20px;display:flex;align-items:center;gap:16px;">
      <div style="font-size:2.5rem">${c.type === 'salao' ? '🏟️' : '⚽'}</div>
      <div>
        <h3 style="font-weight:800;color:var(--white);font-size:1rem;margin-bottom:4px">${c.name}</h3>
        <p style="font-size:0.82rem;color:var(--blue)">${c.year} · ${Utils.formatType(c.type)}</p>
        <p style="font-size:0.8rem;color:var(--gray-light);margin-top:4px">${c.format}</p>
      </div>
      <span style="margin-left:auto;padding:4px 10px;border-radius:50px;font-size:0.7rem;font-weight:700;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3)">ATIVO</span>
    </div>
  `).join('');
  Utils.setupScrollAnimations();
}

function setupCounters() {
  const stats = DB.getTeamStats();
  const counterEls = document.querySelectorAll('[data-counter]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const key = entry.target.dataset.counter;
        Utils.animateCount(entry.target, stats[key] || 0);
        observer.unobserve(entry.target);
      }
    });
  });
  counterEls.forEach(el => observer.observe(el));
}

/* ============================================================
   JOGOS PAGE
============================================================ */
function initJogos() {
  let filteredGames = DB.get(DB.KEYS.GAMES);
  const championships = DB.get(DB.KEYS.CHAMPIONSHIPS);

  function render() {
    const champFilter = document.getElementById('filter-champ')?.value || '';
    const typeFilter = document.getElementById('filter-type')?.value || '';
    const resultFilter = document.getElementById('filter-result')?.value || '';
    const playedFilter = document.getElementById('filter-played')?.value || '';
    let games = DB.get(DB.KEYS.GAMES);
    if (champFilter) games = games.filter(g => g.championshipId === champFilter);
    if (typeFilter) games = games.filter(g => g.type === typeFilter);
    if (resultFilter) games = games.filter(g => g.result === resultFilter);
    if (playedFilter === 'played') games = games.filter(g => g.played);
    if (playedFilter === 'upcoming') games = games.filter(g => !g.played);
    games = games.sort((a, b) => b.date.localeCompare(a.date));

    const stats = { wins: 0, losses: 0, draws: 0, total: 0, goals: 0 };
    const playedGames = games.filter(g => g.played);
    stats.total = playedGames.length;
    stats.wins = playedGames.filter(g => g.result === 'win').length;
    stats.losses = playedGames.filter(g => g.result === 'loss').length;
    stats.draws = playedGames.filter(g => g.result === 'draw').length;
    stats.goals = playedGames.reduce((s, g) => {
      return s + (parseInt(g.homeTeam === "Ouzadia D'Villa FC" ? g.homeScore : g.awayScore) || 0);
    }, 0);

    ['total', 'wins', 'losses', 'draws', 'goals'].forEach(k => {
      const el = document.getElementById(`games-${k}`);
      if (el) el.textContent = stats[k];
    });

    const container = document.getElementById('games-list');
    if (!container) return;
    if (!games.length) {
      container.innerHTML = '<div class="empty-state"><span class="icon">⚽</span><h3>Nenhum jogo encontrado</h3><p>Tente ajustar os filtros</p></div>';
      return;
    }
    container.innerHTML = games.map(g => createGameCard(g, true)).join('');
    Utils.setupScrollAnimations();
  }

  // Populate championship filter
  const champSelect = document.getElementById('filter-champ');
  if (champSelect) {
    championships.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      champSelect.appendChild(opt);
    });
  }

  document.querySelectorAll('.filter-select').forEach(s => s.addEventListener('change', render));

  // Render classification tabs
  const tabsContainer = document.getElementById('classification-tabs');
  const tableContainer = document.getElementById('classification-container');
  if (tabsContainer && tableContainer) {
    const champsTabs = DB.get(DB.KEYS.CHAMPIONSHIPS).filter(c => c.type === 'campo');
    tabsContainer.innerHTML = champsTabs.map((c, i) =>
      `<button class="champ-tab${i === 0 ? ' active' : ''}" data-id="${c.id}">${c.name}</button>`
    ).join('');
    tabsContainer.querySelectorAll('.champ-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.champ-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cl = DB.getClassification(btn.dataset.id);
        const champ = DB.findById(DB.KEYS.CHAMPIONSHIPS, btn.dataset.id);
        renderClassificationTable(tableContainer, cl, champ?.name || '');
      });
    });
    if (champsTabs[0]) {
      const cl = DB.getClassification(champsTabs[0].id);
      renderClassificationTable(tableContainer, cl, champsTabs[0].name);
    }
  }

  render();
}

/* ============================================================
   GALERIA PAGE
============================================================ */
function initGaleria() {
  const tab = document.querySelector('.tab-btn');
  setupTabs();

  // Albums
  const albumsContainer = document.getElementById('albums-grid');
  if (albumsContainer) {
    const albums = DB.get(DB.KEYS.ALBUMS);
    if (!albums.length) {
      albumsContainer.innerHTML = '<div class="empty-state"><span class="icon">📷</span><h3>Nenhum álbum ainda</h3></div>';
    } else {
      albumsContainer.innerHTML = albums.map(a => `
        <div class="album-card animate-on-scroll" onclick="openAlbum('${a.id}')">
          ${a.coverImage ? `<img src="${a.coverImage}" alt="${a.name}" onerror="this.parentNode.innerHTML='<div class=\\'album-card-overlay\\'><span class=\\'album-name\\'>${a.name}</span></div>'">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--bordo-dark),var(--dark3));"></div>`}
          <div class="album-card-overlay">
            <span class="album-name">${a.name}</span>
            <span class="album-count">${a.photos.length} fotos · ${Utils.formatDate(a.date)}</span>
          </div>
        </div>
      `).join('');
    }
  }

  // Players
  renderPlayersGallery('players-grid', DB.get(DB.KEYS.PLAYERS));
  renderPlayersGallery('ex-players-grid', DB.get(DB.KEYS.EX_PLAYERS), true);

  Utils.setupScrollAnimations();
  Utils.setupLightbox();
}

function renderPlayersGallery(containerId, players, isEx = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!players.length) {
    container.innerHTML = '<div class="empty-state"><span class="icon">👤</span><h3>Nenhum jogador cadastrado</h3></div>';
    return;
  }
  container.innerHTML = players.map(p => createPlayerCard(p, isEx)).join('');
}

function openAlbum(albumId) {
  const album = DB.findById(DB.KEYS.ALBUMS, albumId);
  if (!album) return;
  const modal = document.getElementById('album-modal');
  if (!modal) return;
  modal.querySelector('.modal-title').textContent = album.name;
  const body = modal.querySelector('#album-photos');
  if (!album.photos.length) {
    body.innerHTML = '<div class="empty-state"><span class="icon">📷</span><h3>Álbum vazio</h3><p>Nenhuma foto adicionada ainda</p></div>';
  } else {
    body.innerHTML = `<div class="gallery-grid">${album.photos.map((photo, i) => `
      <div class="gallery-item" data-lightbox data-src="${photo.url}" data-index="${i}">
        <img src="${photo.url}" alt="${photo.caption || ''}">
        <div class="gallery-item-overlay"><span>${photo.caption || ''}</span></div>
      </div>
    `).join('')}</div>`;
    Utils.setupLightbox();
  }
  modal.classList.add('open');
}

/* ============================================================
   NOTICIAS PAGE
============================================================ */
function initNoticias() {
  let news = DB.get(DB.KEYS.NEWS).filter(n => n.published).sort((a, b) => b.date.localeCompare(a.date));
  const container = document.getElementById('news-grid');
  if (!container) return;

  function render(list) {
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><span class="icon">📰</span><h3>Nenhuma notícia encontrada</h3></div>';
      return;
    }
    container.innerHTML = list.map(n => createNewsCard(n, true)).join('');
    // Add click handlers
    container.querySelectorAll('[data-news-id]').forEach(el => {
      el.addEventListener('click', () => openNews(el.dataset.newsId));
    });
    Utils.setupScrollAnimations();
  }

  render(news);

  // Filter by category
  const filterBtns = document.querySelectorAll('.filter-cat-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      render(cat === 'all' ? news : news.filter(n => n.category === cat));
    });
  });

  // Search
  const searchInput = document.getElementById('news-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      render(news.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)));
    });
  }
}

function initNoticiaDetalhe() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = 'noticias.html'; return; }
  const news = DB.findById(DB.KEYS.NEWS, id);
  if (!news) { window.location.href = 'noticias.html'; return; }

  document.title = `${news.title} - Ouzadia D'Villa FC`;
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.innerHTML = val; };
  el('noticia-title', news.title);
  el('noticia-date', `📅 ${Utils.formatDate(news.date)}`);
  el('noticia-category', news.category);
  el('noticia-content', news.content.split('\n\n').map(p => `<p>${p}</p>`).join(''));

  const cover = document.getElementById('noticia-cover');
  if (cover) {
    if (news.coverImage) cover.innerHTML = `<img src="${news.coverImage}" alt="${news.title}" style="width:100%;border-radius:12px;margin-bottom:24px">`;
    else cover.innerHTML = `<div style="background:linear-gradient(135deg,var(--bordo-dark),var(--dark3));border-radius:12px;height:300px;display:flex;align-items:center;justify-content:center;font-size:4rem;margin-bottom:24px">📰</div>`;
  }

  // Related news
  const related = DB.get(DB.KEYS.NEWS).filter(n => n.published && n.id !== id && n.category === news.category).slice(0, 3);
  const relContainer = document.getElementById('related-news');
  if (relContainer) {
    relContainer.innerHTML = related.map(n => createNewsCard(n, true)).join('');
    relContainer.querySelectorAll('[data-news-id]').forEach(el => {
      el.addEventListener('click', () => { window.location.href = `noticia-detalhe.html?id=${el.dataset.newsId}`; });
    });
  }
}

function openNews(id) {
  window.location.href = `noticia-detalhe.html?id=${id}`;
}

/* ============================================================
   PARCEIROS PAGE
============================================================ */
function initParceiros() {
  const container = document.getElementById('partners-grid');
  if (!container) return;
  const partners = DB.get(DB.KEYS.PARTNERS).filter(p => p.active);
  if (!partners.length) {
    container.innerHTML = '<div class="empty-state"><span class="icon">🤝</span><h3>Nenhum parceiro cadastrado</h3></div>';
    return;
  }
  container.innerHTML = partners.map(p => createPartnerCard(p)).join('');
  Utils.setupScrollAnimations();
}

/* ============================================================
   PRODUTOS PAGE
============================================================ */
function initProdutos() {
  renderProducts();
  updateCartUI();

  // Cart button
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', () => openCart());

  // Filter
  const filterBtns = document.querySelectorAll('.filter-cat-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(btn.dataset.cat);
    });
  });
}

function renderProducts(category = '') {
  const container = document.getElementById('products-grid');
  if (!container) return;
  let products = DB.get(DB.KEYS.PRODUCTS);
  if (category && category !== 'all') products = products.filter(p => p.category === category);
  if (!products.length) {
    container.innerHTML = '<div class="empty-state"><span class="icon">👕</span><h3>Nenhum produto encontrado</h3></div>';
    return;
  }
  container.innerHTML = products.map(p => createProductCard(p)).join('');
  // Event listeners
  container.querySelectorAll('[data-add-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      DB.addToCart(btn.dataset.addCart);
      updateCartUI();
      Utils.toast('Produto adicionado ao carrinho! 🛒', 'success');
    });
  });
  container.querySelectorAll('[data-buy-whatsapp]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = DB.findById(DB.KEYS.PRODUCTS, btn.dataset.buyWhatsapp);
      if (!p) return;
      const settings = DB.getOne(DB.KEYS.SETTINGS);
      const msg = `Olá! Gostaria de comprar: *${p.name}* - ${Utils.formatPrice(p.price)}`;
      window.open(Utils.getWhatsAppLink(settings.whatsapp || '54981156726', msg), '_blank');
    });
  });
  Utils.setupScrollAnimations();
}

function updateCartUI() {
  const cart = DB.getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const countEl = document.querySelector('.cart-count');
  if (countEl) countEl.textContent = total;
}

function openCart() {
  const modal = document.getElementById('cart-modal');
  if (!modal) return;
  const cart = DB.getCart();
  const products = DB.get(DB.KEYS.PRODUCTS);
  const body = modal.querySelector('#cart-items');
  const settings = DB.getOne(DB.KEYS.SETTINGS);

  if (!cart.length) {
    body.innerHTML = '<div class="empty-state"><span class="icon">🛒</span><h3>Carrinho vazio</h3><p>Adicione produtos para continuar</p></div>';
    modal.querySelector('#cart-total').textContent = '';
    modal.querySelector('#cart-checkout')?.setAttribute('disabled', 'true');
  } else {
    const total = DB.cartTotal();
    body.innerHTML = cart.map(item => {
      const p = products.find(pr => pr.id == item.productId);
      if (!p) return '';
      return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:8px;">
          <div style="font-size:2rem">👕</div>
          <div style="flex:1">
            <div style="font-weight:700;color:var(--white)">${p.name}</div>
            <div style="font-size:0.85rem;color:var(--gold)">${Utils.formatPrice(p.price)} x ${item.qty}</div>
          </div>
          <button onclick="removeFromCart('${item.productId}')" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:6px 10px;border-radius:6px;cursor:pointer;">✕</button>
        </div>`;
    }).join('');
    modal.querySelector('#cart-total').innerHTML = `<strong style="color:var(--gold);font-size:1.2rem">Total: ${Utils.formatPrice(total)}</strong>`;
    const checkoutBtn = modal.querySelector('#cart-checkout');
    if (checkoutBtn) {
      checkoutBtn.removeAttribute('disabled');
      checkoutBtn.onclick = () => {
        const items = cart.map(item => {
          const p = products.find(pr => pr.id == item.productId);
          return p ? `${p.name} (${item.qty}x) - ${Utils.formatPrice(p.price * item.qty)}` : '';
        }).filter(Boolean).join('\n');
        const msg = `Olá! Gostaria de fazer um pedido:\n\n${items}\n\n*Total: ${Utils.formatPrice(total)}*`;
        window.open(Utils.getWhatsAppLink(settings.whatsapp || '54981156726', msg), '_blank');
      };
    }
  }

  modal.classList.add('open');
}

function removeFromCart(productId) {
  DB.removeFromCart(productId);
  updateCartUI();
  openCart();
}

/* ============================================================
   REUSABLE CARD BUILDERS
============================================================ */
function createGameCard(g, detailed = false) {
  const champ = DB.findById(DB.KEYS.CHAMPIONSHIPS, g.championshipId);
  const resultClass = g.played ? (g.result || '') : '';
  const isHome = g.homeTeam === "Ouzadia D'Villa FC";
  const typeIcon = g.type === 'salao' ? '🏟️' : '⚽';
  const catBadge = g.category === 'friendly' ? '<span class="game-badge badge-friendly">Amistoso</span>' : `<span class="game-badge badge-champ">${champ ? champ.name : 'Campeonato'}</span>`;
  const typeBadge = `<span class="game-badge ${g.type === 'salao' ? 'badge-salao' : 'badge-campo'}">${typeIcon} ${g.type === 'salao' ? 'Futsal' : 'Campo'}</span>`;

  if (!g.played) {
    return `
      <div class="game-card animate-on-scroll">
        <div class="result-bar" style="background:var(--gray)"></div>
        <div class="game-card-inner">
          <div class="game-meta">
            ${catBadge}${typeBadge}
            <span style="font-size:0.78rem;color:var(--gray-light)">📅 ${Utils.formatDate(g.date)} ${g.time ? '· ' + g.time : ''}</span>
          </div>
          <div class="game-score">
            <div class="game-team home"><span class="game-team-name">${g.homeTeam}</span></div>
            <div class="game-score-box"><span class="score" style="font-size:1rem;color:var(--gray-light)">Em breve</span></div>
            <div class="game-team away"><span class="game-team-name">${g.awayTeam}</span></div>
          </div>
          <div class="game-date">📍 ${g.location || 'Local a confirmar'}</div>
        </div>
      </div>`;
  }

  return `
    <div class="game-card ${resultClass} animate-on-scroll">
      <div class="result-bar"></div>
      <div class="game-card-inner">
        <div class="game-meta">
          ${catBadge}${typeBadge}
          <span style="font-size:0.78rem;color:var(--gray-light)">📅 ${Utils.formatDate(g.date)}</span>
        </div>
        <div class="game-score">
          <div class="game-team home"><span class="game-team-name">${g.homeTeam}</span></div>
          <div class="game-score-box"><span class="score">${g.homeScore} x ${g.awayScore}</span></div>
          <div class="game-team away"><span class="game-team-name">${g.awayTeam}</span></div>
        </div>
        <div class="game-date">📍 ${g.location || ''} · ${Utils.formatResult(g.result)}</div>
        ${detailed && g.highlights ? `<div style="margin-top:10px;font-size:0.84rem;color:var(--gray-light);border-top:1px solid rgba(201,162,39,0.1);padding-top:10px">${g.highlights}</div>` : ''}
        ${detailed && g.scorers?.length ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--gold)">⚽ Gols: ${g.scorers.join(', ')}</div>` : ''}
      </div>
    </div>`;
}

function createPlayerCard(p, isEx = false) {
  const posColor = Utils.positionColor(p.position);
  return `
    <div class="player-card animate-on-scroll">
      <div class="player-photo-wrap">
        ${p.photo
          ? `<img src="${p.photo}" alt="${p.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
          : ''}
        <div class="player-photo-placeholder" style="${p.photo ? 'display:none' : ''}">👤</div>
        <div class="player-number">${p.number || '?'}</div>
        <div class="player-position-badge" style="color:${posColor};border-color:${posColor}40">${p.position}</div>
      </div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        ${isEx
          ? `<div style="font-size:0.8rem;color:var(--gray-light)">${p.years || ''}</div><div style="font-size:0.82rem;color:var(--text);margin-top:8px;line-height:1.4">${p.description || ''}</div>`
          : `<div class="player-stats">
              <div class="player-stat-item"><span class="val">${p.goals || 0}</span><span class="lbl">Gols</span></div>
              <div class="player-stat-item"><span class="val">${p.assists || 0}</span><span class="lbl">Assists</span></div>
              <div class="player-stat-item"><span class="val" style="color:#f59e0b">${p.yellowCards || 0}</span><span class="lbl">Amarelo</span></div>
            </div>`}
      </div>
    </div>`;
}

function createNewsCard(n, clickable = false) {
  return `
    <div class="news-card animate-on-scroll" ${clickable ? `data-news-id="${n.id}" style="cursor:pointer"` : ''}>
      <div class="news-card-cover">
        ${n.coverImage
          ? `<img src="${n.coverImage}" alt="${n.title}" onerror="this.style.display='none'">`
          : ''}
        <div class="news-card-cover-placeholder" ${n.coverImage ? 'style="display:none"' : ''}>📰</div>
        <span class="news-category-badge">${n.category}</span>
      </div>
      <div class="news-card-body">
        <h3 class="news-card-title">${n.title}</h3>
        <p class="news-card-excerpt">${n.content.replace(/\n/g, ' ').substring(0, 200)}...</p>
        <div class="news-card-footer">
          <span class="news-date">📅 ${Utils.formatDate(n.date)}</span>
          <span class="news-read-more">Ler mais ›</span>
        </div>
      </div>
    </div>`;
}

function createPartnerCard(p) {
  const settings = DB.getOne(DB.KEYS.SETTINGS);
  return `
    <div class="partner-card animate-on-scroll">
      <div class="partner-cover">
        ${p.coverImage
          ? `<img src="${p.coverImage}" alt="${p.name}">`
          : `<div class="partner-cover-placeholder">🏢</div>`}
        <div class="partner-avatar">
          ${p.logo
            ? `<img src="${p.logo}" alt="${p.name}">`
            : `<div class="partner-avatar-placeholder">🤝</div>`}
        </div>
      </div>
      <div class="partner-body">
        <div class="partner-name">${p.name}</div>
        <div class="partner-category">🏷️ ${p.category}</div>
        <p class="partner-desc">${p.description}</p>
        ${p.hours ? `<div class="partner-hours">🕐 ${p.hours}</div>` : ''}
        <div class="partner-actions">
          ${p.phone ? `<a href="tel:${p.phone.replace(/\D/g,'')}" class="btn-call">📞 Ligar</a>` : ''}
          ${p.whatsapp ? `<a href="${Utils.getWhatsAppLink(p.whatsapp, 'Olá! Vi vocês no site do Ouzadia D\'Villa FC.')}" target="_blank" class="btn-whatsapp">💬 WhatsApp</a>` : ''}
        </div>
        ${(p.instagram || p.facebook || p.website) ? `
          <div class="partner-social">
            ${p.instagram ? `<a href="${p.instagram}" target="_blank" class="social-btn" title="Instagram">📸</a>` : ''}
            ${p.facebook ? `<a href="${p.facebook}" target="_blank" class="social-btn" title="Facebook">📘</a>` : ''}
            ${p.website ? `<a href="${p.website}" target="_blank" class="social-btn" title="Website">🌐</a>` : ''}
          </div>` : ''}
      </div>
    </div>`;
}

function createProductCard(p) {
  return `
    <div class="product-card animate-on-scroll">
      <div class="product-image-wrap">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">`
          : ''}
        <div class="product-image-placeholder" ${p.image ? 'style="display:none"' : ''}>👕</div>
        ${p.badge ? `<span class="product-badge-new">${p.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <p class="product-desc">${p.description}</p>
        <div class="product-price"><span class="prefix">R$</span>${p.price.toFixed(2).replace('.', ',')}</div>
        <div class="product-actions">
          <button class="btn-cart" data-add-cart="${p.id}">🛒 Carrinho</button>
          <button class="btn-buy" data-buy-whatsapp="${p.id}">💬 Comprar</button>
        </div>
      </div>
    </div>`;
}

function renderClassificationTable(container, classification, champName) {
  if (!classification.length) {
    container.innerHTML = `<div class="empty-state"><span class="icon">📊</span><h3>Nenhum dado disponível</h3><p>Aguardando jogos do campeonato</p></div>`;
    return;
  }
  container.innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px;">
      <span style="font-weight:800;color:var(--white)">${champName}</span>
    </div>
    <div style="overflow-x:auto">
      <table class="classification-table">
        <thead>
          <tr>
            <th>#</th><th style="text-align:left">Time</th>
            <th>PG</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th>
          </tr>
        </thead>
        <tbody>
          ${classification.map((t, i) => `
            <tr class="${t.team === "Ouzadia D'Villa FC" ? 'row-highlight' : ''}">
              <td class="pos">${i + 1}°</td>
              <td class="team-name">${t.team === "Ouzadia D'Villa FC" ? `⭐ ${t.team}` : t.team}</td>
              <td>${t.j}</td><td>${t.v}</td><td>${t.e}</td><td>${t.d}</td>
              <td>${t.gp}</td><td>${t.gc}</td><td>${t.sg > 0 ? '+' : ''}${t.sg}</td>
              <td class="pts">${t.pts}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-tab-group]')?.dataset.tabGroup || 'default';
      document.querySelectorAll(`.tab-btn[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`.tab-panel[data-group="${group}"]`).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.querySelector(`.tab-panel[data-tab="${btn.dataset.tab}"][data-group="${group}"]`);
      if (panel) panel.classList.add('active');
    });
  });

  // Set first tab active in each group
  const groups = new Set();
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const g = btn.dataset.group || 'default';
    if (!groups.has(g)) {
      groups.add(g);
      btn.click();
    }
  });
}

// Modal close handlers
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.classList.contains('modal-close')) e.target.closest('.modal-overlay')?.classList.remove('open');
});
