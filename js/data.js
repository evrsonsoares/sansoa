/* ===== OUZADIA D'VILLA FC - DATA MANAGEMENT ===== */
/* Uses localStorage for persistence */

const DB = {
  KEYS: {
    PLAYERS: 'ouzadia_players',
    EX_PLAYERS: 'ouzadia_ex_players',
    GAMES: 'ouzadia_games',
    NEWS: 'ouzadia_news',
    PARTNERS: 'ouzadia_partners',
    PRODUCTS: 'ouzadia_products',
    CHAMPIONSHIPS: 'ouzadia_championships',
    ROUNDS: 'ouzadia_rounds',
    ALBUMS: 'ouzadia_albums',
    GALLERY: 'ouzadia_gallery',
    CART: 'ouzadia_cart',
    SETTINGS: 'ouzadia_settings'
  },

  /* ===== GENERIC CRUD ===== */
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },

  getOne(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  },

  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },

  add(key, item) {
    const list = this.get(key);
    item.id = item.id || Date.now().toString();
    item.createdAt = item.createdAt || new Date().toISOString();
    list.push(item);
    this.set(key, list);
    return item;
  },

  update(key, id, updates) {
    const list = this.get(key);
    const idx = list.findIndex(i => i.id == id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      this.set(key, list);
      return list[idx];
    }
    return null;
  },

  delete(key, id) {
    const list = this.get(key).filter(i => i.id != id);
    this.set(key, list);
    return true;
  },

  findById(key, id) {
    return this.get(key).find(i => i.id == id) || null;
  },

  /* ===== STATS ===== */
  getTeamStats() {
    const games = this.get(this.KEYS.GAMES).filter(g => g.played);
    const wins = games.filter(g => g.result === 'win').length;
    const losses = games.filter(g => g.result === 'loss').length;
    const draws = games.filter(g => g.result === 'draw').length;
    const goalsFor = games.reduce((s, g) => {
      const score = g.homeTeam === 'Ouzadia D\'Villa FC' ? g.homeScore : g.awayScore;
      return s + (parseInt(score) || 0);
    }, 0);
    const goalsAgainst = games.reduce((s, g) => {
      const score = g.homeTeam === 'Ouzadia D\'Villa FC' ? g.awayScore : g.homeScore;
      return s + (parseInt(score) || 0);
    }, 0);
    return { wins, losses, draws, total: games.length, goalsFor, goalsAgainst, points: wins * 3 + draws };
  },

  getClassification(championshipId) {
    const games = this.get(this.KEYS.GAMES).filter(g => g.championshipId == championshipId && g.played);
    const teams = {};
    games.forEach(g => {
      [g.homeTeam, g.awayTeam].forEach(team => {
        if (!teams[team]) teams[team] = { team, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 };
      });
      const isOuzadiaHome = g.homeTeam === 'Ouzadia D\'Villa FC';
      const homeScore = parseInt(g.homeScore) || 0;
      const awayScore = parseInt(g.awayScore) || 0;
      teams[g.homeTeam].j++;
      teams[g.awayTeam].j++;
      teams[g.homeTeam].gp += homeScore;
      teams[g.homeTeam].gc += awayScore;
      teams[g.awayTeam].gp += awayScore;
      teams[g.awayTeam].gc += homeScore;
      if (homeScore > awayScore) {
        teams[g.homeTeam].v++; teams[g.homeTeam].pts += 3;
        teams[g.awayTeam].d++;
      } else if (awayScore > homeScore) {
        teams[g.awayTeam].v++; teams[g.awayTeam].pts += 3;
        teams[g.homeTeam].d++;
      } else {
        teams[g.homeTeam].e++; teams[g.homeTeam].pts++;
        teams[g.awayTeam].e++; teams[g.awayTeam].pts++;
      }
    });
    return Object.values(teams)
      .map(t => ({ ...t, sg: t.gp - t.gc }))
      .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
  },

  /* ===== CART ===== */
  getCart() { return this.get(this.KEYS.CART); },

  addToCart(productId) {
    const cart = this.getCart();
    const existing = cart.find(i => i.productId == productId);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ productId, qty: 1 });
    }
    this.set(this.KEYS.CART, cart);
    return cart;
  },

  removeFromCart(productId) {
    const cart = this.getCart().filter(i => i.productId != productId);
    this.set(this.KEYS.CART, cart);
    return cart;
  },

  clearCart() { this.set(this.KEYS.CART, []); },

  cartTotal() {
    const cart = this.getCart();
    const products = this.get(this.KEYS.PRODUCTS);
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id == item.productId);
      return total + (product ? product.price * item.qty : 0);
    }, 0);
  },

  /* ===== SEED DEFAULT DATA ===== */
  init() {
    if (!localStorage.getItem('ouzadia_initialized')) {
      this.seedData();
      localStorage.setItem('ouzadia_initialized', 'true');
    }
  },

  seedData() {
    /* -- Championships -- */
    this.set(this.KEYS.CHAMPIONSHIPS, [
      { id: '1', name: 'Copa Municipal de Ibirubá', year: '2025', type: 'campo', status: 'active', image: '', description: 'Torneio disputado entre times da cidade e região.', teams: 8, format: 'Grupos + Mata-mata', createdAt: new Date().toISOString() },
      { id: '2', name: 'Copa da Amizade Regional', year: '2025', type: 'campo', status: 'active', image: '', description: 'Campeonato amistoso entre clubes parceiros da região.', teams: 6, format: 'Todos contra todos', createdAt: new Date().toISOString() },
      { id: '3', name: 'Torneio Salão Sete Estrelas', year: '2025', type: 'salao', status: 'active', image: '', description: 'Campeonato de futsal realizado no ginásio municipal.', teams: 10, format: 'Grupos + Semifinal + Final', createdAt: new Date().toISOString() },
      { id: '4', name: 'Copa dos Bairros 2025', year: '2025', type: 'campo', status: 'finished', image: '', description: 'Competição entre times dos bairros de Ibirubá.', teams: 12, format: 'Mata-mata', createdAt: new Date().toISOString() },
      { id: '5', name: 'Amistosos', year: '2025', type: 'campo', status: 'active', image: '', description: 'Jogos amistosos para preparação e confraternização.', teams: 0, format: 'Amistoso', createdAt: new Date().toISOString() }
    ]);

    /* -- Rounds -- */
    this.set(this.KEYS.ROUNDS, [
      { id: '1', championshipId: '1', number: 1, name: 'Rodada 1', startDate: '2025-02-08', endDate: '2025-02-15', createdAt: new Date().toISOString() },
      { id: '2', championshipId: '1', number: 2, name: 'Rodada 2', startDate: '2025-02-22', endDate: '2025-03-01', createdAt: new Date().toISOString() },
      { id: '3', championshipId: '1', number: 3, name: 'Rodada 3', startDate: '2025-03-08', endDate: '2025-03-15', createdAt: new Date().toISOString() },
      { id: '4', championshipId: '2', number: 1, name: 'Rodada 1', startDate: '2025-03-01', endDate: '2025-03-08', createdAt: new Date().toISOString() },
      { id: '5', championshipId: '3', number: 1, name: 'Rodada 1', startDate: '2025-02-20', endDate: '2025-02-27', createdAt: new Date().toISOString() }
    ]);

    /* -- Games -- */
    this.set(this.KEYS.GAMES, [
      { id: '1', date: '2025-02-15', time: '15:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'São Cristóvão FC', homeScore: 3, awayScore: 1, championshipId: '1', roundId: '1', type: 'campo', category: 'competition', location: 'Campo da Ouzadia', result: 'win', played: true, scorers: ['Gabriel Santos', 'Gabriel Santos', 'Rafael Lima'], highlights: 'Grande vitória na estreia do campeonato. Gabriel Santos marcou duas vezes.', createdAt: new Date().toISOString() },
      { id: '2', date: '2025-02-22', time: '16:00', homeTeam: 'Juventude de Ibirubá', awayTeam: "Ouzadia D'Villa FC", homeScore: 2, awayScore: 0, championshipId: '1', roundId: '2', type: 'campo', category: 'competition', location: 'Campo do Juventude', result: 'loss', played: true, scorers: [], highlights: 'Derrota no clássico local. Time precisou melhorar defensivamente.', createdAt: new Date().toISOString() },
      { id: '3', date: '2025-03-01', time: '10:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'Unidos FC', homeScore: 1, awayScore: 1, championshipId: '2', roundId: '4', type: 'campo', category: 'competition', location: 'Campo da Ouzadia', result: 'draw', played: true, scorers: ['Lucas Mendes'], highlights: 'Empate vibrante com boas atuações dos dois lados.', createdAt: new Date().toISOString() },
      { id: '4', date: '2025-02-27', time: '20:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'Sport Futsal', homeScore: 4, awayScore: 2, championshipId: '3', roundId: '5', type: 'salao', category: 'competition', location: 'Ginásio Municipal de Ibirubá', result: 'win', played: true, scorers: ['Pedro Henrique', 'Everton Silva', 'Pedro Henrique', 'João Victor'], highlights: 'Goleada no futsal! Pedro Henrique foi o craque da partida com dois gols.', createdAt: new Date().toISOString() },
      { id: '5', date: '2025-03-15', time: '15:30', homeTeam: 'Atlético Ibirubá', awayTeam: "Ouzadia D'Villa FC", homeScore: 1, awayScore: 3, championshipId: '1', roundId: '3', type: 'campo', category: 'competition', location: 'Estádio Municipal', result: 'win', played: true, scorers: ['Gabriel Santos', 'Everton Silva', 'Felipe Souza'], highlights: 'Excelente apresentação fora de casa! Time mostrou evolução tática.', createdAt: new Date().toISOString() },
      { id: '6', date: '2025-01-18', time: '14:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'Real Ibirubá', homeScore: 2, awayScore: 2, championshipId: '5', roundId: '', type: 'campo', category: 'friendly', location: 'Campo da Ouzadia', result: 'draw', played: true, scorers: ['Everton Silva', 'Lucas Mendes'], highlights: 'Amistoso de pré-temporada. Time mostrou bom entrosamento.', createdAt: new Date().toISOString() },
      { id: '7', date: '2025-03-22', time: '15:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'Esporte Clube Ibirubá', homeScore: null, awayScore: null, championshipId: '1', roundId: '3', type: 'campo', category: 'competition', location: 'Campo da Ouzadia', result: null, played: false, scorers: [], highlights: '', createdAt: new Date().toISOString() },
      { id: '8', date: '2025-03-29', time: '20:00', homeTeam: "Ouzadia D'Villa FC", awayTeam: 'Flash Futsal', homeScore: null, awayScore: null, championshipId: '3', roundId: '5', type: 'salao', category: 'competition', location: 'Ginásio Municipal de Ibirubá', result: null, played: false, scorers: [], highlights: '', createdAt: new Date().toISOString() }
    ]);

    /* -- Players -- */
    this.set(this.KEYS.PLAYERS, [
      { id: '1', name: 'Carlos Eduardo', number: 1, position: 'Goleiro', photo: '', birthDate: '1992-05-14', goals: 0, assists: 0, yellowCards: 1, redCards: 0, bio: 'Goleiro experiente e seguro.', createdAt: new Date().toISOString() },
      { id: '2', name: 'Marcos Vinícius', number: 2, position: 'Lateral Direito', photo: '', birthDate: '1995-09-20', goals: 1, assists: 3, yellowCards: 2, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '3', name: 'Diego Santos', number: 3, position: 'Zagueiro', photo: '', birthDate: '1993-03-11', goals: 1, assists: 0, yellowCards: 3, redCards: 1, bio: '', createdAt: new Date().toISOString() },
      { id: '4', name: 'Rafael Lima', number: 4, position: 'Zagueiro', photo: '', birthDate: '1994-07-28', goals: 2, assists: 1, yellowCards: 1, redCards: 0, bio: 'Capitão do time.', createdAt: new Date().toISOString() },
      { id: '5', name: 'Anderson Costa', number: 6, position: 'Lateral Esquerdo', photo: '', birthDate: '1996-12-03', goals: 0, assists: 2, yellowCards: 2, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '6', name: 'Felipe Souza', number: 5, position: 'Volante', photo: '', birthDate: '1997-01-15', goals: 1, assists: 4, yellowCards: 4, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '7', name: 'Lucas Mendes', number: 8, position: 'Meia', photo: '', birthDate: '1998-04-22', goals: 3, assists: 5, yellowCards: 1, redCards: 0, bio: 'Maestro do meio-campo.', createdAt: new Date().toISOString() },
      { id: '8', name: 'Pedro Henrique', number: 10, position: 'Meia Armador', photo: '', birthDate: '1999-08-30', goals: 5, assists: 7, yellowCards: 0, redCards: 0, bio: 'Jogador mais habilidoso do elenco. Craque do time.', createdAt: new Date().toISOString() },
      { id: '9', name: 'João Victor', number: 7, position: 'Ponta Direita', photo: '', birthDate: '2000-02-17', goals: 4, assists: 6, yellowCards: 2, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '10', name: 'Everton Silva', number: 9, position: 'Centro-Avante', photo: '', birthDate: '1997-11-05', goals: 8, assists: 2, yellowCards: 2, redCards: 0, bio: 'Artilheiro do time. Referência no ataque.', createdAt: new Date().toISOString() },
      { id: '11', name: 'Gabriel Santos', number: 11, position: 'Ponta Esquerda', photo: '', birthDate: '2001-06-25', goals: 6, assists: 4, yellowCards: 1, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '12', name: 'Roberto Alves', number: 12, position: 'Goleiro', photo: '', birthDate: '2000-10-08', goals: 0, assists: 0, yellowCards: 0, redCards: 0, bio: 'Goleiro reserva com muito futuro.', createdAt: new Date().toISOString() },
      { id: '13', name: 'Thiago Martins', number: 13, position: 'Zagueiro', photo: '', birthDate: '1995-03-19', goals: 0, assists: 1, yellowCards: 3, redCards: 0, bio: '', createdAt: new Date().toISOString() },
      { id: '14', name: 'Adriano Fonseca', number: 14, position: 'Meia', photo: '', birthDate: '1998-07-12', goals: 2, assists: 3, yellowCards: 1, redCards: 0, bio: '', createdAt: new Date().toISOString() }
    ]);

    /* -- Ex-Players -- */
    this.set(this.KEYS.EX_PLAYERS, [
      { id: '1', name: 'Rodrigo Faria', number: 9, position: 'Atacante', photo: '', years: '2020 - 2022', description: 'Ex-artilheiro do clube. Marcou 32 gols pelo Ouzadia D\'Villa FC.', createdAt: new Date().toISOString() },
      { id: '2', name: 'Eduardo Brum', number: 8, position: 'Meia', photo: '', years: '2019 - 2021', description: 'Um dos melhores meias da história do clube. Participou de 3 títulos.', createdAt: new Date().toISOString() },
      { id: '3', name: 'Leandro Paz', number: 4, position: 'Zagueiro', photo: '', years: '2018 - 2023', description: 'Zagueiro veterano que deu estabilidade à defesa por 5 anos.', createdAt: new Date().toISOString() },
      { id: '4', name: 'Henrique Duarte', number: 7, position: 'Ponta Direita', photo: '', years: '2021 - 2023', description: 'Veloz e habilidoso, foi peça fundamental nos últimos dois anos.', createdAt: new Date().toISOString() }
    ]);

    /* -- News -- */
    this.set(this.KEYS.NEWS, [
      { id: '1', title: 'Ouzadia D\'Villa FC vence mais uma pela Copa Municipal!', content: 'Em grande apresentação fora de casa, o Ouzadia D\'Villa FC derrotou o Atlético Ibirubá por 3 a 1 e manteve a boa fase na Copa Municipal de Ibirubá 2025. Os gols foram marcados por Gabriel Santos (2) e Felipe Souza. Com o resultado, o time soma 6 pontos em 3 jogos e figura entre os primeiros colocados do grupo.\n\nO técnico destacou a evolução do time: "Estamos crescendo a cada rodada. A entrega dos jogadores é total e isso faz toda a diferença." O próximo desafio será no dia 22/03 contra o Esporte Clube Ibirubá, em casa.\n\nA torcida está animada e compareceu em grande número ao campo, fazendo uma bela festa durante todo o jogo.', coverImage: '', date: '2025-03-16', category: 'Resultados', published: true, createdAt: new Date().toISOString() },
      { id: '2', title: 'Novos reforços chegam para fortalecer o elenco em 2025', content: 'O Ouzadia D\'Villa FC anunciou a contratação de dois novos reforços para a temporada 2025. Um meia experiente com passagem por clubes da região e um atacante jovem de muita qualidade chegam para aumentar a competitividade do elenco.\n\nAs contratações foram confirmadas pela diretoria do clube após uma série de negociações. "Estamos investindo na qualidade do elenco porque queremos brigar por títulos em todos os torneios que participamos", afirmou o presidente do clube.\n\nOs novos jogadores já se apresentaram e devem estar disponíveis nas próximas semanas.', coverImage: '', date: '2025-02-10', category: 'Elenco', published: true, createdAt: new Date().toISOString() },
      { id: '3', title: 'Confraternização de fim de ano reúne jogadores e parceiros', content: 'O Ouzadia D\'Villa FC realizou sua tradicional confraternização de encerramento da temporada 2024. O evento reuniu jogadores, familiares, parceiros e torcedores em uma noite de muita alegria e celebração.\n\nDurante o evento, foram entregues troféus individuais aos destaques da temporada. Everton Silva levou o prêmio de artilheiro, Pedro Henrique foi eleito o melhor jogador e Carlos Eduardo ganhou o troféu de melhor goleiro.\n\nA diretoria agradeceu a todos pelo empenho e comprometimento ao longo do ano e anunciou os planos ambiciosos para 2025.', coverImage: '', date: '2024-12-20', category: 'Clube', published: true, createdAt: new Date().toISOString() },
      { id: '4', title: 'Resultado: Empate emocionante na Copa da Amizade', content: 'Em um jogo de muita emoção, Ouzadia D\'Villa FC e Unidos FC empataram em 1 a 1 pela Copa da Amizade Regional. O gol ouzadiano foi marcado por Lucas Mendes aos 35 do segundo tempo, salvando o ponto importante para a classificação.\n\nFoi uma partida muito disputada com chances para os dois lados. Nossa defesa foi bem, o gol deles foi em uma cobrança de falta difícil.', coverImage: '', date: '2025-03-02', category: 'Resultados', published: true, createdAt: new Date().toISOString() }
    ]);

    /* -- Partners -- */
    this.set(this.KEYS.PARTNERS, [
      { id: '1', name: 'Padaria Recanto Doce', category: 'Padaria & Confeitaria', description: 'A melhor padaria de Ibirubá! Pães frescos, bolos personalizados, doces artesanais e café da manhã completo. Qualidade e sabor em cada produto.', logo: '', coverImage: '', phone: '(54) 3455-1234', whatsapp: '54934551234', instagram: 'https://instagram.com', facebook: 'https://facebook.com', website: '', hours: 'Seg-Sáb: 6h às 20h | Dom: 7h às 13h', location: 'Ibirubá, RS', active: true, createdAt: new Date().toISOString() },
      { id: '2', name: 'Auto Peças Central', category: 'Autopeças & Mecânica', description: 'Sua loja completa de autopeças em Ibirubá. Peças originais, acessórios e serviços de qualidade. Atendimento especializado para todas as marcas e modelos.', logo: '', coverImage: '', phone: '(54) 3455-5678', whatsapp: '54934555678', instagram: 'https://instagram.com', facebook: 'https://facebook.com', website: '', hours: 'Seg-Sex: 8h às 18h | Sáb: 8h às 12h', location: 'Ibirubá, RS', active: true, createdAt: new Date().toISOString() },
      { id: '3', name: 'Farmácia Bem Estar', category: 'Farmácia & Saúde', description: 'Farmácia completa com medicamentos, cosméticos, perfumaria e produtos de bem-estar. Equipe de farmacêuticos prontos para orientar você e sua família.', logo: '', coverImage: '', phone: '(54) 3455-9012', whatsapp: '54934559012', instagram: 'https://instagram.com', facebook: '', website: '', hours: 'Seg-Sáb: 8h às 21h | Dom: 9h às 18h', location: 'Ibirubá, RS', active: true, createdAt: new Date().toISOString() }
    ]);

    /* -- Products -- */
    this.set(this.KEYS.PRODUCTS, [
      { id: '1', name: 'Camisa Oficial - Bordô', description: 'Camisa oficial do Ouzadia D\'Villa FC. Tecido dry-fit de alta qualidade, confortável e durável. Disponível nos tamanhos P, M, G, GG.', price: 89.90, image: '', stock: 50, category: 'Vestuário', badge: 'Novo', createdAt: new Date().toISOString() },
      { id: '2', name: 'Camisa de Treino - Azul Bebê', description: 'Camisa de treino oficial do clube. Tecido leve e respirável ideal para os treinos e jogos. Estampa exclusiva com as cores do clube.', price: 69.90, image: '', stock: 30, category: 'Vestuário', badge: '', createdAt: new Date().toISOString() },
      { id: '3', name: 'Boné Oficial', description: 'Boné com o escudo bordado do Ouzadia D\'Villa FC. Tamanho único com ajuste. Material de alta qualidade e durabilidade.', price: 39.90, image: '', stock: 25, category: 'Acessórios', badge: '', createdAt: new Date().toISOString() },
      { id: '4', name: 'Meião Oficial', description: 'Meião bordô com detalhes dourados, padrão dos jogos oficiais. Conforto e durabilidade para a prática esportiva.', price: 29.90, image: '', stock: 40, category: 'Acessórios', badge: '', createdAt: new Date().toISOString() },
      { id: '5', name: 'Camisa Polo - Gold Edition', description: 'Camisa polo premium com bordado do escudo. Ideal para uso casual e eventos. Tecido de alta qualidade em cores bordô e dourado.', price: 79.90, image: '', stock: 20, category: 'Vestuário', badge: 'Premium', createdAt: new Date().toISOString() },
      { id: '6', name: 'Caneca Personalizada', description: 'Caneca de porcelana com arte exclusiva do Ouzadia D\'Villa FC. Perfeita para o dia a dia ou como presente para os fãs do clube.', price: 34.90, image: '', stock: 15, category: 'Memorabilia', badge: '', createdAt: new Date().toISOString() }
    ]);

    /* -- Albums -- */
    this.set(this.KEYS.ALBUMS, [
      { id: '1', name: 'Temporada 2025', description: 'Fotos e momentos marcantes da temporada 2025.', coverImage: '', date: '2025-01-01', category: 'Temporada', photos: [], createdAt: new Date().toISOString() },
      { id: '2', name: 'Copa Municipal 2025', description: 'Galeria de fotos da Copa Municipal de Ibirubá 2025.', coverImage: '', date: '2025-02-08', category: 'Campeonato', photos: [], createdAt: new Date().toISOString() },
      { id: '3', name: 'Confraternização 2024', description: 'Festa de encerramento da temporada 2024.', coverImage: '', date: '2024-12-20', category: 'Evento', photos: [], createdAt: new Date().toISOString() },
      { id: '4', name: 'Treinos', description: 'Momentos dos treinos e preparação da equipe.', coverImage: '', date: '2025-01-15', category: 'Treinos', photos: [], createdAt: new Date().toISOString() }
    ]);

    /* -- Settings -- */
    this.set(this.KEYS.SETTINGS, {
      teamName: "Ouzadia D'Villa FC",
      city: 'Ibirubá, RS',
      whatsapp: '54981156726',
      email: 'ouzadiafce@gmail.com',
      instagram: 'https://instagram.com/ouzadiadvilla',
      facebook: 'https://facebook.com/ouzadiadvilla',
      youtube: '',
      founded: '2018'
    });
  }
};

/* ===== AUTH ===== */
const Auth = {
  ADMIN_EMAIL: 'everdssoares@gmail.com',
  ADMIN_PASSWORD: '377638',
  SESSION_KEY: 'ouzadia_session',

  login(email, password) {
    if (email === this.ADMIN_EMAIL && password === this.ADMIN_PASSWORD) {
      const session = { email, role: 'admin', loginAt: new Date().toISOString() };
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      return { success: true, session };
    }
    return { success: false, message: 'Email ou senha incorretos.' };
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)); } catch { return null; }
  },

  isAdmin() {
    const s = this.getSession();
    return s && s.role === 'admin';
  },

  requireAdmin() {
    if (!this.isAdmin()) {
      window.location.href = '../admin/login.html';
      return false;
    }
    return true;
  }
};

/* ===== UTILS ===== */
const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  },

  formatPrice(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  },

  formatResult(result) {
    const map = { win: '🟢 Vitória', loss: '🔴 Derrota', draw: '🟡 Empate' };
    return map[result] || '-';
  },

  formatType(type) {
    const map = { campo: '⚽ Campo', salao: '🏟️ Salão (Futsal)' };
    return map[type] || type;
  },

  formatCategory(cat) {
    const map = { competition: '🏆 Campeonato', friendly: '🤝 Amistoso' };
    return map[cat] || cat;
  },

  positionColor(pos) {
    if (!pos) return '#89CFF0';
    const p = pos.toLowerCase();
    if (p.includes('goleiro')) return '#C9A227';
    if (p.includes('lateral') || p.includes('zagueiro')) return '#22c55e';
    if (p.includes('volante') || p.includes('meia')) return '#89CFF0';
    return '#ef4444';
  },

  getWhatsAppLink(number, message = '') {
    const clean = number.replace(/\D/g, '');
    return `https://wa.me/${clean}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  },

  toast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  animateCount(el, target, duration = 1500) {
    const start = Date.now();
    const update = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(target * ease);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target;
    };
    requestAnimationFrame(update);
  },

  setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  },

  createParticles(containerId, count = 30) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const colors = ['#C9A227', '#89CFF0', '#8B2A5A', '#E8BF3A'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 6 + 2;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-duration:${Math.random()*10+8}s;
        animation-delay:${Math.random()*8}s;
        opacity:0.4;
      `;
      container.appendChild(p);
    }
  },

  setupNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const update = () => {
      if (window.scrollY > 50) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', update, { passive: true });
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        const spans = toggle.querySelectorAll('span');
        if (links.classList.contains('open')) {
          spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
          spans[1].style.opacity = '0';
          spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
          spans.forEach(s => s.style = '');
        }
      });
    }
    // Set active nav link
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') && path.endsWith(a.getAttribute('href'))) {
        a.classList.add('active');
      }
    });
  },

  setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    const img = lightbox.querySelector('img');
    let currentImages = [];
    let currentIndex = 0;

    document.querySelectorAll('[data-lightbox]').forEach((el, idx) => {
      el.addEventListener('click', () => {
        currentImages = Array.from(document.querySelectorAll('[data-lightbox]')).map(e => e.dataset.src || e.querySelector('img')?.src || '');
        currentIndex = idx;
        img.src = currentImages[idx];
        lightbox.classList.add('open');
      });
    });

    lightbox.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.classList.remove('open'));
    lightbox.querySelector('.lightbox-prev')?.addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      img.src = currentImages[currentIndex];
    });
    lightbox.querySelector('.lightbox-next')?.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % currentImages.length;
      img.src = currentImages[currentIndex];
    });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
  }
};

// Init DB on load
document.addEventListener('DOMContentLoaded', () => DB.init());
