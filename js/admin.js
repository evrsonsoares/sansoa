/* ===== OUZADIA D'VILLA FC - ADMIN PANEL JS ===== */

document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  if (!Auth.requireAdmin()) return;
  setupSidebar();
  setupToast();
  setupConfirm();
  showPanel('dashboard');
  updateDashboard();
});

/* ===== SIDEBAR ===== */
function setupSidebar() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
    });
  }
  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.style.display = 'none';
  });
}

function showPanel(name) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const panel = document.getElementById(`panel-${name}`);
  const link = document.querySelector(`.sidebar-link[data-panel="${name}"]`);
  if (panel) panel.classList.add('active');
  if (link) link.classList.add('active');
  document.getElementById('header-title').textContent = link?.dataset.title || 'Dashboard';

  const renderers = {
    dashboard: updateDashboard,
    jogadores: renderPlayers,
    exjogadores: renderExPlayers,
    jogos: renderGames,
    campeonatos: renderChampionships,
    rodadas: renderRounds,
    noticias: renderNews,
    parceiros: renderPartners,
    produtos: renderProducts,
    galeria: renderAlbums,
  };
  if (renderers[name]) renderers[name]();
}

/* ===== DASHBOARD ===== */
function updateDashboard() {
  const stats = DB.getTeamStats();
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('d-players', DB.get(DB.KEYS.PLAYERS).length);
  el('d-games', DB.get(DB.KEYS.GAMES).length);
  el('d-wins', stats.wins);
  el('d-news', DB.get(DB.KEYS.NEWS).length);
  el('d-partners', DB.get(DB.KEYS.PARTNERS).length);
  el('d-products', DB.get(DB.KEYS.PRODUCTS).length);
  el('d-championships', DB.get(DB.KEYS.CHAMPIONSHIPS).length);
  el('d-ex', DB.get(DB.KEYS.EX_PLAYERS).length);

  // Recent games
  const recentContainer = document.getElementById('d-recent-games');
  if (recentContainer) {
    const games = DB.get(DB.KEYS.GAMES).filter(g => g.played)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    recentContainer.innerHTML = games.map(g => {
      const resColor = g.result === 'win' ? '#22c55e' : g.result === 'loss' ? '#ef4444' : 'var(--gold)';
      return `
        <tr>
          <td>${Utils.formatDate(g.date)}</td>
          <td>${g.homeTeam} vs ${g.awayTeam}</td>
          <td style="font-weight:900">${g.homeScore} x ${g.awayScore}</td>
          <td><span class="badge" style="background:${resColor}20;color:${resColor};border:1px solid ${resColor}40">${Utils.formatResult(g.result).split(' ')[1]}</span></td>
          <td>${g.type === 'salao' ? '🏟️ Futsal' : '⚽ Campo'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-light);padding:20px">Nenhum jogo realizado</td></tr>';
  }

  // Top scorers
  const scorersContainer = document.getElementById('d-top-scorers');
  if (scorersContainer) {
    const players = DB.get(DB.KEYS.PLAYERS).sort((a, b) => (b.goals || 0) - (a.goals || 0)).slice(0, 5);
    scorersContainer.innerHTML = players.map((p, i) => `
      <tr>
        <td style="color:var(--gold);font-weight:900">${i + 1}°</td>
        <td style="font-weight:700;color:var(--white)">${p.name}</td>
        <td>${p.position}</td>
        <td style="color:#22c55e;font-weight:900">${p.goals || 0}</td>
        <td style="color:var(--blue)">${p.assists || 0}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--gray-light);padding:20px">Sem dados</td></tr>';
  }
}

/* ===== MODALS ===== */
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
  if (e.target.classList.contains('modal-close')) e.target.closest('.modal-overlay')?.classList.remove('open');
});

/* ===== TOAST ===== */
let toastContainer;
function setupToast() {
  toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `${icons[type] || ''} ${msg}`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

/* ===== CONFIRM ===== */
let confirmCallback = null;
function setupConfirm() {
  const dialog = document.getElementById('confirm-dialog');
  if (!dialog) return;
  document.getElementById('confirm-yes')?.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    dialog.classList.remove('open');
    confirmCallback = null;
  });
  document.getElementById('confirm-no')?.addEventListener('click', () => {
    dialog.classList.remove('open');
    confirmCallback = null;
  });
}

function confirmDelete(msg, callback) {
  const dialog = document.getElementById('confirm-dialog');
  const msgEl = document.getElementById('confirm-msg');
  if (msgEl) msgEl.textContent = msg;
  confirmCallback = callback;
  dialog?.classList.add('open');
}

/* ===== FORM HELPERS ===== */
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const data = {};
  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name) {
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'number') data[el.name] = parseFloat(el.value) || 0;
      else data[el.name] = el.value;
    }
  });
  return data;
}

function fillForm(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;
  Object.entries(data).forEach(([key, val]) => {
    const el = form.querySelector(`[name="${key}"]`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!val;
    else el.value = val != null ? val : '';
  });
}

function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.reset();
}

/* ============================================================
   JOGADORES
============================================================ */
let editingPlayerId = null;

function renderPlayers() {
  const players = DB.get(DB.KEYS.PLAYERS);
  const tbody = document.getElementById('players-tbody');
  if (!tbody) return;
  tbody.innerHTML = players.map(p => `
    <tr>
      <td><strong>#${p.number}</strong></td>
      <td><strong style="color:var(--white)">${p.name}</strong></td>
      <td><span class="badge badge-info">${p.position}</span></td>
      <td>${p.goals || 0}</td>
      <td>${p.assists || 0}</td>
      <td><span class="badge" style="background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)">${p.yellowCards || 0}</span></td>
      <td><span class="badge" style="background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3)">${p.redCards || 0}</span></td>
      <td class="actions">
        <button class="btn-edit" onclick="editPlayer('${p.id}')">✏️ Editar</button>
        <button class="btn-del" onclick="deletePlayer('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="8" class="empty-state"><span class="icon">👤</span><h3>Nenhum jogador</h3></td></tr>';
}

function openPlayerModal(mode = 'add', id = null) {
  editingPlayerId = id;
  const title = document.getElementById('player-modal-title');
  if (title) title.textContent = mode === 'add' ? '➕ Adicionar Jogador' : '✏️ Editar Jogador';
  clearForm('player-form');
  if (mode === 'edit' && id) {
    const p = DB.findById(DB.KEYS.PLAYERS, id);
    if (p) fillForm('player-form', p);
  }
  openModal('player-modal');
}

function editPlayer(id) { openPlayerModal('edit', id); }

function deletePlayer(id) {
  confirmDelete('Remover este jogador? Essa ação não pode ser desfeita.', () => {
    DB.delete(DB.KEYS.PLAYERS, id);
    renderPlayers();
    updateDashboard();
    showToast('Jogador removido!', 'success');
  });
}

function savePlayer() {
  const data = getFormData('player-form');
  if (!data.name || !data.number || !data.position) { showToast('Preencha: nome, número e posição.', 'error'); return; }
  if (editingPlayerId) {
    DB.update(DB.KEYS.PLAYERS, editingPlayerId, data);
    showToast('Jogador atualizado!', 'success');
  } else {
    DB.add(DB.KEYS.PLAYERS, data);
    showToast('Jogador adicionado!', 'success');
  }
  closeModal('player-modal');
  renderPlayers();
  updateDashboard();
}

/* ============================================================
   EX-JOGADORES
============================================================ */
let editingExPlayerId = null;

function renderExPlayers() {
  const players = DB.get(DB.KEYS.EX_PLAYERS);
  const tbody = document.getElementById('ex-players-tbody');
  if (!tbody) return;
  tbody.innerHTML = players.map(p => `
    <tr>
      <td><strong>#${p.number}</strong></td>
      <td><strong style="color:var(--white)">${p.name}</strong></td>
      <td><span class="badge badge-info">${p.position}</span></td>
      <td style="color:var(--gray-light)">${p.years || '-'}</td>
      <td class="actions">
        <button class="btn-edit" onclick="editExPlayer('${p.id}')">✏️ Editar</button>
        <button class="btn-del" onclick="deleteExPlayer('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty-state"><span class="icon">⭐</span><h3>Nenhum ex-jogador</h3></div></td></tr>';
}

function openExPlayerModal(mode = 'add', id = null) {
  editingExPlayerId = id;
  document.getElementById('ex-player-modal-title').textContent = mode === 'add' ? '➕ Adicionar Ex-Jogador' : '✏️ Editar Ex-Jogador';
  clearForm('ex-player-form');
  if (mode === 'edit' && id) { const p = DB.findById(DB.KEYS.EX_PLAYERS, id); if (p) fillForm('ex-player-form', p); }
  openModal('ex-player-modal');
}

function editExPlayer(id) { openExPlayerModal('edit', id); }
function deleteExPlayer(id) {
  confirmDelete('Remover este ex-jogador?', () => {
    DB.delete(DB.KEYS.EX_PLAYERS, id);
    renderExPlayers();
    showToast('Ex-jogador removido!', 'success');
  });
}

function saveExPlayer() {
  const data = getFormData('ex-player-form');
  if (!data.name) { showToast('Nome é obrigatório.', 'error'); return; }
  if (editingExPlayerId) { DB.update(DB.KEYS.EX_PLAYERS, editingExPlayerId, data); showToast('Atualizado!', 'success'); }
  else { DB.add(DB.KEYS.EX_PLAYERS, data); showToast('Ex-jogador adicionado!', 'success'); }
  closeModal('ex-player-modal');
  renderExPlayers();
}

/* ============================================================
   JOGOS
============================================================ */
let editingGameId = null;

function renderGames() {
  const games = DB.get(DB.KEYS.GAMES).sort((a, b) => b.date.localeCompare(a.date));
  const championships = DB.get(DB.KEYS.CHAMPIONSHIPS);
  const tbody = document.getElementById('games-tbody');
  if (!tbody) return;
  tbody.innerHTML = games.map(g => {
    const champ = championships.find(c => c.id === g.championshipId);
    const resColor = g.result === 'win' ? '#22c55e' : g.result === 'loss' ? '#ef4444' : 'var(--gold)';
    return `
      <tr>
        <td>${Utils.formatDate(g.date)}</td>
        <td style="font-size:0.82rem"><strong>${g.homeTeam}</strong><br><span style="color:var(--gray-light)">vs ${g.awayTeam}</span></td>
        <td style="font-weight:900;font-size:1rem">${g.played ? `${g.homeScore} x ${g.awayScore}` : '<span style="color:var(--gray-light)">Agendado</span>'}</td>
        <td>${champ ? `<span class="badge badge-info" style="font-size:0.68rem">${champ.name}</span>` : '-'}</td>
        <td>${g.type === 'salao' ? '<span class="badge badge-warning">Futsal</span>' : '<span class="badge badge-success">Campo</span>'}</td>
        <td>${g.category === 'friendly' ? '<span class="badge badge-gray">Amistoso</span>' : '<span class="badge badge-info">Campeonato</span>'}</td>
        <td>${g.played && g.result ? `<span class="badge" style="background:${resColor}20;color:${resColor};border:1px solid ${resColor}40">${g.result === 'win' ? 'Vitória' : g.result === 'loss' ? 'Derrota' : 'Empate'}</span>` : '-'}</td>
        <td class="actions">
          <button class="btn-edit" onclick="editGame('${g.id}')">✏️</button>
          <button class="btn-del" onclick="deleteGame('${g.id}')">🗑️</button>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="8"><div class="empty-state"><span class="icon">⚽</span><h3>Nenhum jogo</h3></div></td></tr>';
}

function openGameModal(mode = 'add', id = null) {
  editingGameId = id;
  document.getElementById('game-modal-title').textContent = mode === 'add' ? '➕ Adicionar Jogo' : '✏️ Editar Jogo';
  clearForm('game-form');

  // Populate championship select
  const champSelect = document.getElementById('game-championship');
  if (champSelect) {
    const champs = DB.get(DB.KEYS.CHAMPIONSHIPS);
    champSelect.innerHTML = '<option value="">Selecione o campeonato</option>' +
      champs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  if (mode === 'edit' && id) {
    const g = DB.findById(DB.KEYS.GAMES, id);
    if (g) fillForm('game-form', g);
  } else {
    // Default values
    const f = document.getElementById('game-form');
    if (f) {
      f.querySelector('[name="homeTeam"]').value = "Ouzadia D'Villa FC";
      f.querySelector('[name="played"]').checked = false;
    }
  }
  openModal('game-modal');
}

function editGame(id) { openGameModal('edit', id); }
function deleteGame(id) {
  confirmDelete('Remover este jogo?', () => {
    DB.delete(DB.KEYS.GAMES, id);
    renderGames();
    updateDashboard();
    showToast('Jogo removido!', 'success');
  });
}

function saveGame() {
  const data = getFormData('game-form');
  if (!data.homeTeam || !data.awayTeam || !data.date) { showToast('Preencha: times e data.', 'error'); return; }
  // Auto-determine result
  if (data.played && data.homeScore !== '' && data.awayScore !== '') {
    const hs = parseInt(data.homeScore), as = parseInt(data.awayScore);
    const isOuzadiaHome = data.homeTeam === "Ouzadia D'Villa FC";
    if (hs > as) data.result = isOuzadiaHome ? 'win' : 'loss';
    else if (as > hs) data.result = isOuzadiaHome ? 'loss' : 'win';
    else data.result = 'draw';
  }
  if (editingGameId) { DB.update(DB.KEYS.GAMES, editingGameId, data); showToast('Jogo atualizado!', 'success'); }
  else { DB.add(DB.KEYS.GAMES, data); showToast('Jogo adicionado!', 'success'); }
  closeModal('game-modal');
  renderGames();
  updateDashboard();
}

/* ============================================================
   CAMPEONATOS
============================================================ */
let editingChampId = null;

function renderChampionships() {
  const champs = DB.get(DB.KEYS.CHAMPIONSHIPS);
  const tbody = document.getElementById('champ-tbody');
  if (!tbody) return;
  tbody.innerHTML = champs.map(c => `
    <tr>
      <td><strong style="color:var(--white)">${c.name}</strong></td>
      <td>${c.year}</td>
      <td>${c.type === 'salao' ? '🏟️ Futsal' : '⚽ Campo'}</td>
      <td>${c.format}</td>
      <td>${c.teams || '-'}</td>
      <td><span class="badge ${c.status === 'active' ? 'badge-success' : 'badge-gray'}">${c.status === 'active' ? 'Ativo' : 'Encerrado'}</span></td>
      <td class="actions">
        <button class="btn-edit" onclick="editChamp('${c.id}')">✏️</button>
        <button class="btn-del" onclick="deleteChamp('${c.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7"><div class="empty-state"><span class="icon">🏆</span><h3>Nenhum campeonato</h3></div></td></tr>';
}

function openChampModal(mode = 'add', id = null) {
  editingChampId = id;
  document.getElementById('champ-modal-title').textContent = mode === 'add' ? '➕ Novo Campeonato' : '✏️ Editar Campeonato';
  clearForm('champ-form');
  if (mode === 'edit' && id) { const c = DB.findById(DB.KEYS.CHAMPIONSHIPS, id); if (c) fillForm('champ-form', c); }
  openModal('champ-modal');
}

function editChamp(id) { openChampModal('edit', id); }
function deleteChamp(id) {
  confirmDelete('Remover este campeonato?', () => {
    DB.delete(DB.KEYS.CHAMPIONSHIPS, id);
    renderChampionships();
    showToast('Campeonato removido!', 'success');
  });
}

function saveChamp() {
  const data = getFormData('champ-form');
  if (!data.name) { showToast('Nome é obrigatório.', 'error'); return; }
  if (editingChampId) { DB.update(DB.KEYS.CHAMPIONSHIPS, editingChampId, data); showToast('Atualizado!', 'success'); }
  else { DB.add(DB.KEYS.CHAMPIONSHIPS, data); showToast('Campeonato adicionado!', 'success'); }
  closeModal('champ-modal');
  renderChampionships();
}

/* ============================================================
   RODADAS
============================================================ */
let editingRoundId = null;

function renderRounds() {
  const rounds = DB.get(DB.KEYS.ROUNDS);
  const champs = DB.get(DB.KEYS.CHAMPIONSHIPS);
  const tbody = document.getElementById('rounds-tbody');
  if (!tbody) return;
  tbody.innerHTML = rounds.map(r => {
    const champ = champs.find(c => c.id === r.championshipId);
    return `
      <tr>
        <td>${champ ? champ.name : '-'}</td>
        <td><strong>${r.name || `Rodada ${r.number}`}</strong></td>
        <td>${Utils.formatDate(r.startDate)}</td>
        <td>${Utils.formatDate(r.endDate)}</td>
        <td class="actions">
          <button class="btn-edit" onclick="editRound('${r.id}')">✏️</button>
          <button class="btn-del" onclick="deleteRound('${r.id}')">🗑️</button>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="5"><div class="empty-state"><span class="icon">📅</span><h3>Nenhuma rodada</h3></div></td></tr>';
}

function openRoundModal(mode = 'add', id = null) {
  editingRoundId = id;
  document.getElementById('round-modal-title').textContent = mode === 'add' ? '➕ Nova Rodada' : '✏️ Editar Rodada';
  clearForm('round-form');
  const champSelect = document.getElementById('round-championship');
  if (champSelect) {
    const champs = DB.get(DB.KEYS.CHAMPIONSHIPS);
    champSelect.innerHTML = '<option value="">Selecione o campeonato</option>' +
      champs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  if (mode === 'edit' && id) { const r = DB.findById(DB.KEYS.ROUNDS, id); if (r) fillForm('round-form', r); }
  openModal('round-modal');
}

function editRound(id) { openRoundModal('edit', id); }
function deleteRound(id) {
  confirmDelete('Remover esta rodada?', () => {
    DB.delete(DB.KEYS.ROUNDS, id);
    renderRounds();
    showToast('Rodada removida!', 'success');
  });
}

function saveRound() {
  const data = getFormData('round-form');
  if (!data.championshipId) { showToast('Selecione o campeonato.', 'error'); return; }
  if (editingRoundId) { DB.update(DB.KEYS.ROUNDS, editingRoundId, data); showToast('Rodada atualizada!', 'success'); }
  else { DB.add(DB.KEYS.ROUNDS, data); showToast('Rodada adicionada!', 'success'); }
  closeModal('round-modal');
  renderRounds();
}

/* ============================================================
   NOTÍCIAS
============================================================ */
let editingNewsId = null;

function renderNews() {
  const news = DB.get(DB.KEYS.NEWS).sort((a, b) => b.date.localeCompare(a.date));
  const tbody = document.getElementById('news-tbody');
  if (!tbody) return;
  tbody.innerHTML = news.map(n => `
    <tr>
      <td style="max-width:280px"><strong style="color:var(--white);display:block;margin-bottom:2px">${n.title}</strong></td>
      <td><span class="badge badge-info">${n.category}</span></td>
      <td>${Utils.formatDate(n.date)}</td>
      <td><span class="badge ${n.published ? 'badge-success' : 'badge-gray'}">${n.published ? 'Publicado' : 'Rascunho'}</span></td>
      <td class="actions">
        <button class="btn-edit" onclick="editNews('${n.id}')">✏️</button>
        <button class="btn-del" onclick="deleteNews('${n.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty-state"><span class="icon">📰</span><h3>Nenhuma notícia</h3></div></td></tr>';
}

function openNewsModal(mode = 'add', id = null) {
  editingNewsId = id;
  document.getElementById('news-modal-title').textContent = mode === 'add' ? '➕ Nova Notícia' : '✏️ Editar Notícia';
  clearForm('news-form');
  if (mode === 'edit' && id) { const n = DB.findById(DB.KEYS.NEWS, id); if (n) fillForm('news-form', n); }
  openModal('news-modal');
}

function editNews(id) { openNewsModal('edit', id); }
function deleteNews(id) {
  confirmDelete('Remover esta notícia?', () => {
    DB.delete(DB.KEYS.NEWS, id);
    renderNews();
    updateDashboard();
    showToast('Notícia removida!', 'success');
  });
}

function saveNews() {
  const data = getFormData('news-form');
  if (!data.title || !data.content) { showToast('Título e conteúdo são obrigatórios.', 'error'); return; }
  if (!data.date) data.date = new Date().toISOString().split('T')[0];
  if (editingNewsId) { DB.update(DB.KEYS.NEWS, editingNewsId, data); showToast('Notícia atualizada!', 'success'); }
  else { DB.add(DB.KEYS.NEWS, data); showToast('Notícia publicada!', 'success'); }
  closeModal('news-modal');
  renderNews();
  updateDashboard();
}

/* ============================================================
   PARCEIROS
============================================================ */
let editingPartnerId = null;

function renderPartners() {
  const partners = DB.get(DB.KEYS.PARTNERS);
  const tbody = document.getElementById('partners-tbody');
  if (!tbody) return;
  tbody.innerHTML = partners.map(p => `
    <tr>
      <td><strong style="color:var(--white)">${p.name}</strong></td>
      <td>${p.category}</td>
      <td>${p.phone || '-'}</td>
      <td>${p.hours ? `<span style="font-size:0.8rem;color:var(--gray-light)">${p.hours.substring(0,30)}...</span>` : '-'}</td>
      <td><span class="badge ${p.active ? 'badge-success' : 'badge-gray'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
      <td class="actions">
        <button class="btn-edit" onclick="editPartner('${p.id}')">✏️</button>
        <button class="btn-del" onclick="deletePartner('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6"><div class="empty-state"><span class="icon">🤝</span><h3>Nenhum parceiro</h3></div></td></tr>';
}

function openPartnerModal(mode = 'add', id = null) {
  editingPartnerId = id;
  document.getElementById('partner-modal-title').textContent = mode === 'add' ? '➕ Novo Parceiro' : '✏️ Editar Parceiro';
  clearForm('partner-form');
  if (mode === 'edit' && id) { const p = DB.findById(DB.KEYS.PARTNERS, id); if (p) { fillForm('partner-form', p); document.getElementById('partner-active').checked = p.active; } }
  openModal('partner-modal');
}

function editPartner(id) { openPartnerModal('edit', id); }
function deletePartner(id) {
  confirmDelete('Remover este parceiro?', () => {
    DB.delete(DB.KEYS.PARTNERS, id);
    renderPartners();
    updateDashboard();
    showToast('Parceiro removido!', 'success');
  });
}

function savePartner() {
  const data = getFormData('partner-form');
  if (!data.name) { showToast('Nome é obrigatório.', 'error'); return; }
  if (editingPartnerId) { DB.update(DB.KEYS.PARTNERS, editingPartnerId, data); showToast('Parceiro atualizado!', 'success'); }
  else { DB.add(DB.KEYS.PARTNERS, data); showToast('Parceiro adicionado!', 'success'); }
  closeModal('partner-modal');
  renderPartners();
  updateDashboard();
}

/* ============================================================
   PRODUTOS
============================================================ */
let editingProductId = null;

function renderProducts() {
  const products = DB.get(DB.KEYS.PRODUCTS);
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><strong style="color:var(--white)">${p.name}</strong></td>
      <td><span class="badge badge-info">${p.category}</span></td>
      <td style="color:var(--gold);font-weight:900">${Utils.formatPrice(p.price)}</td>
      <td>${p.stock || 0}</td>
      <td>${p.badge ? `<span class="badge badge-warning">${p.badge}</span>` : '-'}</td>
      <td class="actions">
        <button class="btn-edit" onclick="editProduct('${p.id}')">✏️</button>
        <button class="btn-del" onclick="deleteProduct('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6"><div class="empty-state"><span class="icon">👕</span><h3>Nenhum produto</h3></div></td></tr>';
}

function openProductModal(mode = 'add', id = null) {
  editingProductId = id;
  document.getElementById('product-modal-title').textContent = mode === 'add' ? '➕ Novo Produto' : '✏️ Editar Produto';
  clearForm('product-form');
  if (mode === 'edit' && id) { const p = DB.findById(DB.KEYS.PRODUCTS, id); if (p) fillForm('product-form', p); }
  openModal('product-modal');
}

function editProduct(id) { openProductModal('edit', id); }
function deleteProduct(id) {
  confirmDelete('Remover este produto?', () => {
    DB.delete(DB.KEYS.PRODUCTS, id);
    renderProducts();
    updateDashboard();
    showToast('Produto removido!', 'success');
  });
}

function saveProduct() {
  const data = getFormData('product-form');
  if (!data.name || !data.price) { showToast('Nome e preço são obrigatórios.', 'error'); return; }
  if (editingProductId) { DB.update(DB.KEYS.PRODUCTS, editingProductId, data); showToast('Produto atualizado!', 'success'); }
  else { DB.add(DB.KEYS.PRODUCTS, data); showToast('Produto adicionado!', 'success'); }
  closeModal('product-modal');
  renderProducts();
  updateDashboard();
}

/* ============================================================
   GALERIA / ÁLBUNS
============================================================ */
let editingAlbumId = null;

function renderAlbums() {
  const albums = DB.get(DB.KEYS.ALBUMS);
  const tbody = document.getElementById('albums-tbody');
  if (!tbody) return;
  tbody.innerHTML = albums.map(a => `
    <tr>
      <td><strong style="color:var(--white)">${a.name}</strong></td>
      <td><span class="badge badge-info">${a.category}</span></td>
      <td>${Utils.formatDate(a.date)}</td>
      <td>${a.photos?.length || 0} fotos</td>
      <td class="actions">
        <button class="btn-view" onclick="manageAlbumPhotos('${a.id}')">📷 Fotos</button>
        <button class="btn-edit" onclick="editAlbum('${a.id}')">✏️</button>
        <button class="btn-del" onclick="deleteAlbum('${a.id}')">🗑️</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="5"><div class="empty-state"><span class="icon">📷</span><h3>Nenhum álbum</h3></div></td></tr>';
}

function openAlbumModal(mode = 'add', id = null) {
  editingAlbumId = id;
  document.getElementById('album-modal-title').textContent = mode === 'add' ? '➕ Novo Álbum' : '✏️ Editar Álbum';
  clearForm('album-form');
  if (mode === 'edit' && id) { const a = DB.findById(DB.KEYS.ALBUMS, id); if (a) fillForm('album-form', a); }
  openModal('album-modal');
}

function editAlbum(id) { openAlbumModal('edit', id); }
function deleteAlbum(id) {
  confirmDelete('Remover este álbum e todas as fotos?', () => {
    DB.delete(DB.KEYS.ALBUMS, id);
    renderAlbums();
    showToast('Álbum removido!', 'success');
  });
}

function saveAlbum() {
  const data = getFormData('album-form');
  if (!data.name) { showToast('Nome é obrigatório.', 'error'); return; }
  if (editingAlbumId) { DB.update(DB.KEYS.ALBUMS, editingAlbumId, data); showToast('Álbum atualizado!', 'success'); }
  else { data.photos = []; DB.add(DB.KEYS.ALBUMS, data); showToast('Álbum criado!', 'success'); }
  closeModal('album-modal');
  renderAlbums();
}

function manageAlbumPhotos(albumId) {
  const album = DB.findById(DB.KEYS.ALBUMS, albumId);
  if (!album) return;
  document.getElementById('photos-album-name').textContent = album.name;
  document.getElementById('current-album-id').value = albumId;
  renderAlbumPhotosList(album);
  openModal('photos-modal');
}

function renderAlbumPhotosList(album) {
  const container = document.getElementById('album-photos-list');
  if (!container) return;
  if (!album.photos?.length) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📷</span><h3>Nenhuma foto ainda</h3><p>Adicione fotos pelo formulário abaixo.</p></div>';
    return;
  }
  container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">` +
    album.photos.map((photo, i) => `
      <div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;background:var(--dark3)">
        <img src="${photo.url}" alt="${photo.caption || ''}" style="width:100%;height:100%;object-fit:cover">
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);padding:4px 6px;font-size:0.65rem;color:var(--text)">
          ${photo.caption || ''}
        </div>
        <button onclick="removePhotoFromAlbum('${album.id}',${i})" style="position:absolute;top:4px;right:4px;background:rgba(239,68,68,0.8);border:none;color:white;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:0.7rem">✕</button>
      </div>`).join('') + '</div>';
}

function addPhotoToAlbum() {
  const albumId = document.getElementById('current-album-id').value;
  const url = document.getElementById('photo-url').value.trim();
  const caption = document.getElementById('photo-caption').value.trim();
  if (!url) { showToast('URL da foto é obrigatória.', 'error'); return; }
  const album = DB.findById(DB.KEYS.ALBUMS, albumId);
  if (!album) return;
  if (!album.photos) album.photos = [];
  album.photos.push({ url, caption });
  DB.update(DB.KEYS.ALBUMS, albumId, { photos: album.photos });
  document.getElementById('photo-url').value = '';
  document.getElementById('photo-caption').value = '';
  renderAlbumPhotosList(DB.findById(DB.KEYS.ALBUMS, albumId));
  showToast('Foto adicionada!', 'success');
}

function removePhotoFromAlbum(albumId, index) {
  const album = DB.findById(DB.KEYS.ALBUMS, albumId);
  if (!album) return;
  album.photos.splice(index, 1);
  DB.update(DB.KEYS.ALBUMS, albumId, { photos: album.photos });
  renderAlbumPhotosList(DB.findById(DB.KEYS.ALBUMS, albumId));
  showToast('Foto removida!', 'success');
}

/* ============================================================
   RESET DATA
============================================================ */
function resetData() {
  confirmDelete('ATENÇÃO: Isso irá APAGAR TODOS OS DADOS e restaurar os dados de exemplo. Tem certeza?', () => {
    localStorage.removeItem('ouzadia_initialized');
    DB.init();
    updateDashboard();
    showToast('Dados restaurados!', 'success');
  });
}

function exportData() {
  const data = {};
  Object.values(DB.KEYS).forEach(key => { try { data[key] = DB.get(key); } catch {} });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ouzadia-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Dados exportados!', 'success');
}
