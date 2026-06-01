(() => {
  "use strict";

  const canvas = document.getElementById("gc");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const introOverlay = document.getElementById("intro-overlay");
  const controlModeButton = document.getElementById("control-mode");
  const pauseButton = document.getElementById("pause-button");
  const muteButton = document.getElementById("mute-button");
  const dpadButtons = [...document.querySelectorAll("[data-dir]")];
  const hud = {
    round: document.querySelector("#round-ui .hud-value"),
    hair: document.querySelector("#hair-ui .hud-value"),
    objective: document.querySelector("#objective-ui .hud-value"),
    power: document.querySelector("#power-ui .hud-value"),
    score: document.querySelector("#score-ui .hud-value"),
    msg: document.getElementById("msg-text"),
    msgWrap: document.getElementById("msg"),
    hairPill: document.getElementById("hair-ui"),
    powerPill: document.getElementById("power-ui"),
    notorietyWrap: document.getElementById("notoriety-ui"),
    notorietyLabel: document.getElementById("notoriety-label"),
    notorietyFill: document.getElementById("notoriety-fill"),
    notorietyValue: document.getElementById("notoriety-value")
  };

  const VIEW_W = 540;
  const VIEW_H = 380;
  const WORLD_W = 1600;
  const WORLD_H = 1100;
  const W = VIEW_W;
  const H = VIEW_H;
  const TILE = 20;
  const COLS = Math.floor(WORLD_W / TILE);
  const ROWS = Math.floor(WORLD_H / TILE);
  const SCORE_KEY = "razzia_scores";
  const SURVIVAL_SCORE_KEY = "razzia_survival_scores";
  const CONVOCATORIA_SCORE_KEY = "razzia_convocatoria_scores";
  const ARCHIVE_KEY = "razzia_archive";
  const INTRO_SESSION_KEY = "razzia_intro_seen";
  ctx.imageSmoothingEnabled = false;

  const ART_PATHS = {
    tiles: "assets/fisherg-city/sTiles.png",
    blueCar: "assets/fisherg-city/Vehicles/sBlueCar.png",
    redCar: "assets/fisherg-city/Vehicles/sRedCar.png"
  };

  const art = {
    loaded: false,
    failed: false,
    images: {}
  };

  const CITY_REGIONS = {
    path: [0, 0, 12, 12],
    road: [60, 0, 48, 48],
    grassTuft: [60, 48, 48, 60],
    tree: [108, 120, 72, 96],
    bench: [0, 168, 48, 48],
    streetProps: [0, 120, 60, 96],
    kiosk: [216, 0, 72, 96],
    station: [0, 228, 144, 120],
    houseWarm: [288, 0, 72, 96]
  };

  const COLORS = {
    grass: "#5a8a3c",
    grassDark: "#477933",
    grassLight: "#6a9b45",
    path: "#c8b878",
    pathLight: "#d4b483",
    pathDark: "#a88e54",
    water: "#4a7ab8",
    waterLight: "#7cc6de",
    stone: "#837c72",
    bench: "#8B6914",
    wood: "#7a5230",
    tree: "#2d6e1a",
    treeDark: "#1a5010",
    safe: "#4b8f75",
    safeDark: "#2e6555",
    station: "#6c665f",
    stationDark: "#4e4744",
    player0: "#6b3fa0",
    player1: "#9b6fd0",
    player2: "#d4a0f0",
    cop: "#1a3a6e",
    copLight: "#4a7ab8",
    ally: "#c8501a",
    allyLight: "#e88040",
    executive: "#4f5966",
    executiveLight: "#8a95a3",
    journalist: "#2e6555",
    journalistLight: "#f5edd8",
    bohemian: "#6a2845",
    bohemianLight: "#e8a030",
    skin: "#f5c880",
    hair: ["#8B4513", "#8B4513", "#888888", "#bbbbbb"],
    particle: "#ffe066",
    danger: "#c64532",
    black: "#17111d",
    white: "#f5edd8",
    gold: "#ffd700",
    flower: "#e83070",
    poncho: "#3d8f65",
    record: "#2b2638",
    paper: "#f5edd8",
    leafDark: "#063f18",
    leaf: "#0f8d2e",
    leafLight: "#7ee33a",
    leafGlow: "#e6f33a",
    posterBlue: "#3f5fb8",
    posterPink: "#d94f8a",
    posterPurple: "#6b3fa0",
    neon: "#f2c56b",
    lamp: "#2b2638",
    lampGlow: "#ffe89a",
    chalk: "#efe0b5"
  };

  const SFX = (() => {
    let ctx = null;
    let muted = false;
    let alertCooldown = 0;
    function ac() {
      if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
      return ctx;
    }
    function tone(freq, type, dur, gainVal = 0.18) {
      const a = ac(); if (!a || muted) return;
      if (a.state === "suspended") a.resume();
      const g = a.createGain(); g.gain.setValueAtTime(gainVal, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      const o = a.createOscillator(); o.type = type; o.frequency.value = freq;
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    }
    function sweep(f0, f1, type, dur) {
      const a = ac(); if (!a || muted) return;
      if (a.state === "suspended") a.resume();
      const g = a.createGain(); g.gain.setValueAtTime(0.2, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      const o = a.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, a.currentTime);
      o.frequency.linearRampToValueAtTime(f1, a.currentTime + dur);
      o.connect(g); g.connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    }
    return {
      footstep()    { tone(90, "square", 0.04, 0.06); },
      collect()     { [261, 330, 392].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.12, 0.22), i * 60)); },
      powerUp()     { sweep(440, 880, "sine", 0.4); },
      caught()      { sweep(320, 80, "sawtooth", 0.55); },
      ambientTick() { tone(110, "sine", 0.08, 0.08); },
      alert(force = false) {
        if (alertCooldown > 0 && !force) return;
        alertCooldown = 2.2;
        tone(880, "sawtooth", 0.28, 0.14);
        setTimeout(() => tone(1100, "sawtooth", 0.28, 0.14), 300);
      },
      tickDown(dt)  { if (alertCooldown > 0) alertCooldown -= dt; },
      toggle()      { muted = !muted; return muted; },
      get muted()   { return muted; }
    };
  })();

  const PUJOL_QUOTES = [
    {
      text: "La represión no se limitaba a delitos concretos. Apuntaba contra estilos de vida.",
      section: "La juventud como delito"
    },
    {
      text: "Un joven podía circular con pelo largo en una provincia, pero debía cuidarse en la capital.",
      section: "La juventud como delito"
    },
    {
      text: "La persecución, paradójicamente, ayudó a crear identidad colectiva.",
      section: "La juventud como delito"
    },
    {
      text: "Para las autoridades, el principal delito era ser joven.",
      section: "La juventud como delito"
    },
    {
      text: "Si veían a alguien con pelo largo o con una campera de los Rolling Stones, lo invitaban a reunirse.",
      section: "La juventud como delito"
    },
    {
      text: "La moda fue una forma de rebelión cotidiana: el cambio cultural se veía en la calle y en los cuerpos.",
      section: "La bella gente"
    },
    {
      text: "En los 60, ser joven empezó a significar tener una forma propia de vestir, consumir, amar y circular por la ciudad.",
      section: "Tesis del capítulo"
    }
  ];

  const QUOTE_POOL = [
    { section: "Juventud", text: "La juventud empieza a verse como una identidad propia, no solo como edad." },
    { section: "Juventud", text: "La musica, la ropa y la calle separan a los jovenes del mundo adulto." },
    { section: "Juventud", text: "La cultura joven no aparece de golpe: se arma entre medios, moda y encuentros." },
    { section: "Juventud", text: "Primero fue una categoria debil; despues se volvio presencia visible." },
    { section: "Incomunicacion", text: "Antes del hippismo, la marca generacional era la distancia y la mufa." },
    { section: "Incomunicacion", text: "La frustracion tambien empuja: de ahi sale una vida cultural mas intensa." },
    { section: "Incomunicacion", text: "El futuro empieza a ganarle lugar al pasado en medio del desencanto." },
    { section: "Di Tella", text: "El Di Tella funciona como laboratorio de arte, moda y nuevas sensibilidades." },
    { section: "Florida", text: "Mientras Florida florece con pop y happening, la policia llena comisarias." },
    { section: "Beat", text: "Los Beatles vuelven posible imaginar otra manera de ser joven." },
    { section: "Beat", text: "Ser beat era musica, pelo, humor, frescura y desparpajo." },
    { section: "Beat", text: "Buenos Aires mira a Londres para sentirse conectada con el mundo." },
    { section: "Beat", text: "La cultura pop llega como deseo de mirar sin tapujos." },
    { section: "Censura", text: "El Estado intenta frenar la sensibilidad pop con censura y razzias." },
    { section: "Censura", text: "El orden moral aparece como excusa para vigilar cuerpos y costumbres." },
    { section: "Conexion", text: "La droga fue mas simbolo policial que practica masiva al comienzo." },
    { section: "Conexion", text: "La conexion significaba salirse del sistema y encontrarse con otros." },
    { section: "Conexion", text: "La sospecha importaba mas que el delito: bastaba parecer distinto." },
    { section: "Conexion", text: "Hacia 1969 el tema se vuelve mas visible, pero Pujol lo desmitifica." },
    { section: "Delito", text: "Para las autoridades, el delito principal era ser joven." },
    { section: "Delito", text: "Cabello largo, ropa rara y musica ruidosa bastaban para ser sospechoso." },
    { section: "Delito", text: "La policia perseguia estilos de vida antes que delitos concretos." },
    { section: "Delito", text: "La capital podia ser mas intolerante que muchas ciudades del interior." },
    { section: "Delito", text: "La razzia convertia una apariencia en expediente." },
    { section: "Plaza", text: "Las plazas se vuelven puntos de reunion despues del cierre de La Cueva." },
    { section: "Plaza", text: "Reconocerse en la calle fue el primer paso para armar grupo." },
    { section: "Plaza", text: "Si aparecia otro pelo largo, habia que llamarlo a la plaza." },
    { section: "Plaza", text: "La reunion entre pares era una forma minima y potente de resistencia." },
    { section: "Moda", text: "La moda deja de ser menor: se vuelve una forma visible de identidad." },
    { section: "Moda", text: "El cambio cultural se ve en cuerpos, colores, minifaldas y pelo." },
    { section: "Moda", text: "Vestirse distinto era discutir con la normalidad adulta." },
    { section: "Moda", text: "El estilo hippie trae ponchos, sandalias, vinchas y ropa artesanal." },
    { section: "Hippies", text: "El hippie argentino responde a un clima social y policial asfixiante." },
    { section: "Hippies", text: "Su rebeldia no siempre es programa politico: esta en la forma de vivir." },
    { section: "Hippies", text: "Plazas, bares, rutas y festivales arman otra cartografia joven." },
    { section: "Hippies", text: "La policia ayuda, sin quererlo, a volver visible al colectivo." },
    { section: "Hippies", text: "Cuanta mas represion, mas clara se vuelve la identidad compartida." },
    { section: "Consumo", text: "La juventud tambien se consolida como publico de discos, ropa y revistas." },
    { section: "Consumo", text: "Kioscos, disquerias y boutiques reorganizan la ciudad joven." },
    { section: "Consumo", text: "Ser joven tambien era apropiarse de bienes culturales y hacerlos identidad." }
  ];

  const POWERUPS = {
    press: {
      label: "Primera Plana",
      short: "Prensa",
      duration: 3,
      color: COLORS.paper,
      message: "Primera Plana distrae a la cana por 3 segundos."
    },
    beatles: {
      label: "Disco Beatles",
      short: "Beatles",
      duration: 5,
      color: COLORS.record,
      message: "El disco te acelera: corre el rumor por la plaza."
    },
    poncho: {
      label: "Poncho",
      short: "Poncho",
      duration: 6,
      color: COLORS.poncho,
      message: "El poncho reduce la mirada policial."
    },
    flyer: {
      label: "Hoja verde",
      short: "Conexión",
      duration: 4,
      survivalShort: "Llamado",
      survivalDuration: 5,
      color: COLORS.leafLight,
      message: "Conexión: la cana pierde el rastro por unos segundos."
    },
    mate: {
      label: "Mate",
      short: "Ritual",
      duration: 7,
      color: COLORS.safe,
      message: "El mate circula: los compañeros se acercan."
    },
    fanzine: {
      label: "Fanzine",
      short: "Fanzine",
      duration: 8,
      color: COLORS.paper,
      message: "El fanzine corre de mano: la cana aparece en el mapa."
    },
    sombrero: {
      label: "Sombrero",
      short: "Disfraz",
      duration: 5,
      color: COLORS.gold,
      message: "El sombrero te disfraza: la policía no te reconoce."
    }
  };

  const CITY_EVENTS = [
    {
      type: "convocatoria",
      label: "Marcha a la plaza",
      modes: ["story", "survival", "convocatoria"],
      minRound: 0,
      weight: 3
    },
    {
      type: "cronista",
      label: "Cronista de Primera Plana",
      modes: ["story", "survival", "convocatoria"],
      minRound: 0,
      weight: 2
    },
    {
      type: "musico",
      label: "Músico callejero",
      modes: ["story", "survival", "convocatoria"],
      minRound: 0,
      weight: 2
    },
    {
      type: "ejecutivos",
      label: "Hora pico en Florida",
      modes: ["story", "survival", "convocatoria"],
      minRound: 1,
      weight: 2
    },
    {
      type: "razzia",
      label: "Razzia sorpresa",
      modes: ["story", "survival", "convocatoria"],
      minRound: 1,
      weight: 2
    }
  ];

  const NPC_TYPES = {
    bohemian: {
      label: "Bohemio",
      speed: 34,
      life: 24,
      radius: 18,
      score: 15,
      color: COLORS.bohemianLight
    },
    journalist: {
      label: "Cronista",
      speed: 42,
      life: 22,
      radius: 18,
      score: 10,
      color: COLORS.journalistLight
    },
    musician: {
      label: "Músico",
      speed: 28,
      life: 34,
      radius: 24,
      score: 5,
      color: COLORS.gold
    },
    executive: {
      label: "Ejecutivo",
      speed: 58,
      life: 28,
      radius: 17,
      color: COLORS.executiveLight
    }
  };

  const NPC_ROUTES = {
    bohemian: [
      [{ x: 6, y: 14 }, { x: 13, y: 12 }, { x: 19, y: 15 }, { x: 11, y: 18 }],
      [{ x: 26, y: 18 }, { x: 34, y: 18 }, { x: 38, y: 23 }, { x: 28, y: 24 }],
      [{ x: 58, y: 15 }, { x: 64, y: 15 }, { x: 70, y: 23 }, { x: 62, y: 29 }]
    ],
    journalist: [
      [{ x: 7, y: 8 }, { x: 13, y: 9 }, { x: 22, y: 8 }, { x: 30, y: 10 }],
      [{ x: 31, y: 9 }, { x: 31, y: 18 }, { x: 24, y: 23 }, { x: 14, y: 24 }],
      [{ x: 63, y: 14 }, { x: 70, y: 18 }, { x: 72, y: 28 }, { x: 63, y: 30 }]
    ],
    musician: [
      [{ x: 16, y: 25 }, { x: 20, y: 30 }, { x: 27, y: 31 }, { x: 22, y: 24 }],
      [{ x: 47, y: 22 }, { x: 51, y: 25 }, { x: 49, y: 30 }, { x: 43, y: 27 }],
      [{ x: 26, y: 35 }, { x: 33, y: 36 }, { x: 37, y: 38 }, { x: 29, y: 39 }],
      [{ x: 12, y: 46 }, { x: 18, y: 48 }, { x: 25, y: 46 }, { x: 20, y: 44 }],
      [{ x: 60, y: 44 }, { x: 66, y: 48 }, { x: 72, y: 45 }, { x: 64, y: 40 }]
    ],
    executive: [
      [{ x: 31, y: 9 }, { x: 39, y: 9 }, { x: 39, y: 23 }, { x: 31, y: 23 }],
      [{ x: 4, y: 24 }, { x: 16, y: 24 }, { x: 27, y: 24 }, { x: 37, y: 24 }],
      [{ x: 58, y: 15 }, { x: 64, y: 15 }, { x: 71, y: 23 }, { x: 63, y: 29 }]
    ],
    razzia: [
      [{ x: 23, y: 2 }, { x: 22, y: 8 }, { x: 31, y: 9 }, { x: 37, y: 18 }],
      [{ x: 23, y: 2 }, { x: 18, y: 8 }, { x: 13, y: 14 }, { x: 8, y: 24 }],
      [{ x: 74, y: 20 }, { x: 70, y: 28 }, { x: 64, y: 34 }, { x: 58, y: 44 }],
      [{ x: 62, y: 51 }, { x: 48, y: 44 }, { x: 38, y: 36 }, { x: 30, y: 46 }]
    ]
  };

  const STYLE_KEY = "razzia_style";

  const PALETTE_UNLOCKS = [
    { id: "default",   label: "Original",   threshold: 0,   P: "#6b3fa0", L: "#9b6fd0" },
    { id: "poeta",     label: "Poeta",      threshold: 25,  P: "#6b3fa0", L: "#d4a0f0" },
    { id: "musico",    label: "Músico",     threshold: 50,  P: "#c8930a", L: "#ffd700" },
    { id: "militante", label: "Militante",  threshold: 75,  P: "#8b1a1a", L: "#c64532" },
    { id: "noche",     label: "Noche",      threshold: 100, P: "#17111d", L: "#4a3060" }
  ];

  const ARCHETYPES = {
    musico:     { label: "Músico",     desc: "Corre más rápido.",             speed: 145, collectRadius: 19, lives: 3 },
    poeta:      { label: "Poeta",      desc: "Detecta compañeros de lejos.",   speed: 116, collectRadius: 30, lives: 3 },
    estudiante: { label: "Estudiante", desc: "Empieza con vida extra.",         speed: 116, collectRadius: 19, lives: 4 }
  };

  const DISTRICTS = {
    plaza:     { label: "Plaza San Martín", spawnTile: { x: 12, y: 10 }, overlayColor: "rgba(75,143,117,0.09)" },
    florida:   { label: "Calle Florida",    spawnTile: { x: 32, y: 8  }, overlayColor: "rgba(63,95,184,0.08)"  },
    costanera: { label: "Costanera",        spawnTile: { x: 62, y: 22 }, overlayColor: "rgba(74,122,184,0.09)" }
  };

  const ROUND_CONFIGS = [
    {
      title: "1966",
      subtitle: "Plaza tranquila",
      quote: 3,
      objective: { type: "collect", target: 3, timeLimit: 55 },
      cops: 2,
      copSpeed: 42,
      chaseBonus: 26,
      detection: 72,
      allies: 3,
      maxAllies: 3,
      powerups: ["press", "beatles", "poncho", "flyer", "mate"],
      district: "plaza",
      safeSeconds: 7,
      patrols: [
        [{ x: 4, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 15 }, { x: 4, y: 15 }],
        [{ x: 22, y: 14 }, { x: 18, y: 11 }, { x: 18, y: 4 }, { x: 22, y: 4 }]
      ]
    },
    {
      title: "Bastones Largos",
      subtitle: "Julio de 1966",
      quote: 0,
      objective: { type: "collect", target: 5, timeLimit: 65 },
      cops: 3,
      copSpeed: 62,
      chaseBonus: 38,
      detection: 98,
      allies: 3,
      maxAllies: 4,
      powerups: ["press", "beatles", "poncho", "flyer", "mate", "fanzine", "sombrero"],
      district: "florida",
      safeSeconds: 6,
      patrols: [
        [{ x: 30, y: 5 }, { x: 40, y: 5 }, { x: 40, y: 14 }, { x: 30, y: 14 }],
        [{ x: 28, y: 12 }, { x: 36, y: 8 }, { x: 44, y: 12 }, { x: 36, y: 16 }],
        [{ x: 32, y: 4 }, { x: 42, y: 4 }, { x: 42, y: 16 }, { x: 32, y: 16 }]
      ]
    },
    {
      title: "1969",
      subtitle: "Máxima represión",
      quote: 2,
      objective: { type: "survive", duration: 45 },
      cops: 4,
      copSpeed: 70,
      chaseBonus: 45,
      detection: 112,
      allies: 2,
      maxAllies: 2,
      powerups: ["press", "beatles", "poncho", "flyer", "fanzine", "sombrero"],
      district: "costanera",
      safeSeconds: 5,
      patrols: [
        [{ x: 58, y: 18 }, { x: 68, y: 18 }, { x: 68, y: 28 }, { x: 58, y: 28 }],
        [{ x: 60, y: 16 }, { x: 70, y: 20 }, { x: 66, y: 30 }, { x: 56, y: 26 }],
        [{ x: 55, y: 20 }, { x: 65, y: 16 }, { x: 72, y: 24 }, { x: 62, y: 32 }],
        [{ x: 57, y: 26 }, { x: 67, y: 22 }, { x: 73, y: 28 }, { x: 63, y: 34 }]
      ]
    }
  ];

  const SURVIVAL_CONFIG = {
    title: "Razzia Nocturna",
    subtitle: "Oleada interminable",
    quote: 2,
    objective: { type: "endless" },
    cops: 3,
    copSpeed: 54,
    chaseBonus: 34,
    detection: 88,
    allies: 4,
    maxAllies: 5,
    powerups: ["press", "beatles", "poncho", "flyer", "mate", "fanzine", "sombrero"],
    safeSeconds: 8,
    patrols: [
      [{ x: 4, y: 4 }, { x: 22, y: 4 }, { x: 32, y: 11 }, { x: 8, y: 23 }],
      [{ x: 38, y: 5 }, { x: 31, y: 17 }, { x: 18, y: 24 }, { x: 37, y: 27 }],
      [{ x: 6, y: 27 }, { x: 14, y: 16 }, { x: 26, y: 8 }, { x: 40, y: 19 }],
      [{ x: 17, y: 4 }, { x: 36, y: 8 }, { x: 35, y: 24 }, { x: 17, y: 27 }],
      [{ x: 5, y: 14 }, { x: 21, y: 14 }, { x: 31, y: 22 }, { x: 10, y: 28 }],
      [{ x: 58, y: 15 }, { x: 70, y: 18 }, { x: 74, y: 30 }, { x: 60, y: 34 }],
      [{ x: 62, y: 51 }, { x: 48, y: 45 }, { x: 38, y: 38 }, { x: 70, y: 45 }]
    ]
  };

  const CONVOCATORIA_CONFIG = {
    title: "Convocatoria",
    subtitle: "Primavera del 67",
    quote: 4,
    objective: { type: "convocatoria", target: 12, timeLimit: 95 },
    cops: 3,
    copSpeed: 55,
    chaseBonus: 34,
    detection: 82,
    allies: 5,
    maxAllies: 7,
    powerups: ["press", "beatles", "poncho", "flyer", "mate", "fanzine"],
    safeSeconds: 6,
    patrols: [
      [{ x: 4, y: 4 }, { x: 21, y: 4 }, { x: 21, y: 15 }, { x: 4, y: 15 }],
      [{ x: 37, y: 8 }, { x: 31, y: 16 }, { x: 23, y: 23 }, { x: 37, y: 24 }],
      [{ x: 6, y: 27 }, { x: 13, y: 23 }, { x: 21, y: 23 }, { x: 31, y: 27 }],
      [{ x: 58, y: 15 }, { x: 64, y: 23 }, { x: 72, y: 30 }, { x: 63, y: 38 }]
    ]
  };

  const PATH_RECTS = [
    { x0: 0, x1: 79, y0: 8, y1: 10 },
    { x0: 0, x1: 79, y0: 23, y1: 25 },
    { x0: 0, x1: 79, y0: 34, y1: 36 },
    { x0: 18, x1: 79, y0: 38, y1: 40 },
    { x0: 12, x1: 14, y0: 0, y1: 54 },
    { x0: 31, x1: 33, y0: 0, y1: 54 },
    { x0: 38, x1: 40, y0: 8, y1: 54 },
    { x0: 47, x1: 49, y0: 7, y1: 54 },
    { x0: 63, x1: 65, y0: 8, y1: 50 },
    { x0: 70, x1: 72, y0: 18, y1: 54 },
    { x0: 1, x1: 5, y0: 8, y1: 10 },
    { x0: 21, x1: 31, y0: 0, y1: 5 },
    { x0: 42, x1: 50, y0: 10, y1: 12 },
    { x0: 45, x1: 55, y0: 23, y1: 25 },
    { x0: 20, x1: 32, y0: 36, y1: 38 },
    { x0: 58, x1: 72, y0: 14, y1: 16 },
    { x0: 58, x1: 76, y0: 28, y1: 30 },
    { x0: 54, x1: 76, y0: 43, y1: 45 },
    { x0: 8, x1: 28, y0: 45, y1: 48 },
    { x0: 56, x1: 66, y0: 51, y1: 53 }
  ];

  const PATH_DIAGS = [
    { m: 0.46, b: 3, x0: 0, x1: 56, y0: 0, y1: 32 },
    { m: -0.36, b: 26, x0: 0, x1: 60, y0: 0, y1: 30 },
    { m: 0.28, b: 15, x0: 0, x1: 78, y0: 14, y1: 40 },
    { m: -0.34, b: 48, x0: 34, x1: 78, y0: 18, y1: 40 },
    { m: 0.22, b: 20, x0: 36, x1: 78, y0: 24, y1: 42 },
    { m: -0.26, b: 64, x0: 40, x1: 78, y0: 36, y1: 54 },
    { m: 0.18, b: 35, x0: 22, x1: 78, y0: 38, y1: 52 }
  ];

  const ROUND_INTERLUDES = [
    // After round 0 (1966 → Bastones Largos)
    [
      { label: "JULIO 1966",  caption: "El decreto cae: la noche del bastón largo.", scene: "patrol" },
      { label: "LA PLAZA",    caption: "Los pelos largos se dispersan — pero vuelven.", scene: "crowd" }
    ],
    // After round 1 (Bastones Largos → 1969)
    [
      { label: "1969",             caption: "El Cordobazo tiembla en el aire porteño.", scene: "walk" },
      { label: "PRESIÓN MÁXIMA",   caption: "Cuatro patrulleros, una plaza, el tiempo se acaba.", scene: "stamp" }
    ]
  ];

  const INTRO_STORY = [
    {
      label: "EXPEDIENTE 1966",
      caption: "Una ficha se abre: pelo largo, plaza, sospecha.",
      scene: "file"
    },
    {
      label: "FLORIDA / DI TELLA",
      caption: "La ciudad pop prende vidrieras, discos y revistas.",
      scene: "florida"
    },
    {
      label: "PLAZA SAN MARTIN",
      caption: "Un hippie cruza la plaza buscando otros pelos largos.",
      scene: "walk"
    },
    {
      label: "RAZZIA",
      caption: "El patrullero aparece: la mirada policial cierra el cuadro.",
      scene: "patrol"
    },
    {
      label: "CONVOCATORIA",
      caption: "La persecucion, sin quererlo, junta a los dispersos.",
      scene: "crowd"
    },
    {
      label: "LA RAZZIA",
      caption: "Corre, reuni, aguanta.",
      scene: "stamp"
    }
  ];

  const MAP = {
    playerSpawn: { x: 7, y: 15 },
    safeZone: { x: 24, y: 158, w: 92, h: 58 },
    dangerZone: { x: 438, y: 0, w: 102, h: 104 },
    trees: [
      { x: 2, y: 2 }, { x: 8, y: 2 }, { x: 17, y: 2 },
      { x: 2, y: 16 }, { x: 9, y: 17 }, { x: 18, y: 16 },
      { x: 1, y: 9 }, { x: 24, y: 9 }, { x: 5, y: 5 },
      { x: 20, y: 6 }, { x: 5, y: 13 }, { x: 21, y: 13 },
      { x: 31, y: 4 }, { x: 38, y: 7 }, { x: 33, y: 15 },
      { x: 41, y: 17 }, { x: 28, y: 24 }, { x: 35, y: 27 },
      { x: 13, y: 25 }, { x: 4, y: 27 }, { x: 23, y: 29 },
      { x: 47, y: 8 }, { x: 54, y: 6 }, { x: 57, y: 14 },
      { x: 45, y: 20 }, { x: 52, y: 24 }, { x: 58, y: 30 },
      { x: 42, y: 34 }, { x: 34, y: 37 }, { x: 19, y: 36 },
      { x: 9, y: 34 }, { x: 26, y: 39 }, { x: 49, y: 39 },
      { x: 63, y: 6 }, { x: 70, y: 7 }, { x: 76, y: 12 },
      { x: 61, y: 20 }, { x: 68, y: 24 }, { x: 77, y: 27 },
      { x: 56, y: 33 }, { x: 66, y: 37 }, { x: 74, y: 40 },
      { x: 55, y: 46 }, { x: 63, y: 49 }, { x: 73, y: 51 },
      { x: 4, y: 45 }, { x: 15, y: 47 }, { x: 27, y: 49 },
      { x: 36, y: 50 }, { x: 45, y: 52 }, { x: 58, y: 53 }
    ],
    benches: [
      { x: 5, y: 8, w: 2, h: 1 },
      { x: 18, y: 8, w: 2, h: 1 },
      { x: 5, y: 11, w: 2, h: 1 },
      { x: 18, y: 11, w: 2, h: 1 },
      { x: 29, y: 10, w: 2, h: 1 },
      { x: 35, y: 18, w: 2, h: 1 },
      { x: 16, y: 24, w: 2, h: 1 },
      { x: 7, y: 27, w: 2, h: 1 },
      { x: 42, y: 11, w: 2, h: 1 },
      { x: 51, y: 15, w: 2, h: 1 },
      { x: 44, y: 27, w: 2, h: 1 },
      { x: 22, y: 35, w: 2, h: 1 },
      { x: 35, y: 38, w: 2, h: 1 },
      { x: 61, y: 15, w: 2, h: 1 },
      { x: 68, y: 29, w: 2, h: 1 },
      { x: 58, y: 44, w: 2, h: 1 },
      { x: 13, y: 46, w: 2, h: 1 },
      { x: 70, y: 47, w: 2, h: 1 }
    ],
    fountain: [
      { x: 12, y: 8 }, { x: 13, y: 8 }, { x: 14, y: 8 },
      { x: 12, y: 9 }, { x: 13, y: 9 }, { x: 14, y: 9 },
      { x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }
    ],
    kioskBlocks: [
      { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
      { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }
    ],
    stationBlocks: [
      { x: 22, y: 0 }, { x: 22, y: 1 }, { x: 22, y: 2 }, { x: 22, y: 3 },
      { x: 23, y: 0 }, { x: 24, y: 0 }, { x: 25, y: 0 }, { x: 26, y: 0 },
      { x: 23, y: 1 }, { x: 24, y: 1 }, { x: 25, y: 1 }, { x: 26, y: 1 },
      { x: 24, y: 2 }, { x: 25, y: 2 }, { x: 26, y: 2 },
      { x: 25, y: 3 }, { x: 26, y: 3 }
    ],
    signs: [
      { x: 132, y: 36, text: "Di Tella" },
      { x: 322, y: 330, text: "Boite Florida" },
      { x: 620, y: 178, text: "Florida" },
      { x: 245, y: 540, text: "Plaza" },
      { x: 902, y: 126, text: "Di Tella" },
      { x: 970, y: 430, text: "La Cueva" },
      { x: 470, y: 704, text: "Mandioca" },
      { x: 1028, y: 684, text: "Costanera" },
      { x: 682, y: 136, text: "Galeria" },
      { x: 718, y: 510, text: "La Paz" },
      { x: 1110, y: 606, text: "Gesell" },
      { x: 1260, y: 292, text: "Galeria Este" },
      { x: 1374, y: 172, text: "J. Alvarez" },
      { x: 1210, y: 850, text: "La Perla" },
      { x: 300, y: 930, text: "Plaza Francia" },
      { x: 1460, y: 520, text: "Tucuman Arde" },
      { x: 1322, y: 922, text: "Fogon Gesell" }
    ],
    lamps: [
      { x: 196, y: 145 }, { x: 330, y: 150 }, { x: 432, y: 312 },
      { x: 226, y: 458 }, { x: 596, y: 310 }, { x: 742, y: 258 },
      { x: 116, y: 424 }, { x: 884, y: 210 }, { x: 1018, y: 324 },
      { x: 1066, y: 578 }, { x: 706, y: 650 }, { x: 430, y: 710 },
      { x: 1260, y: 210 }, { x: 1430, y: 280 }, { x: 1198, y: 474 },
      { x: 1488, y: 540 }, { x: 1180, y: 850 }, { x: 1328, y: 930 },
      { x: 326, y: 914 }, { x: 760, y: 958 }
    ],
    posters: [
      { x: 456, y: 38, text: "NO", color: "danger" },
      { x: 666, y: 118, text: "POP", color: "posterPink" },
      { x: 708, y: 466, text: "BEAT", color: "posterBlue" },
      { x: 614, y: 196, text: "PP", color: "gold" },
      { x: 252, y: 518, text: "PAZ", color: "leafLight" },
      { x: 910, y: 178, text: "ITDT", color: "posterBlue" },
      { x: 990, y: 464, text: "CUEVA", color: "posterPurple" },
      { x: 492, y: 736, text: "M", color: "posterPink" },
      { x: 1042, y: 718, text: "SOL", color: "gold" },
      { x: 738, y: 448, text: "BLOW", color: "posterBlue" },
      { x: 556, y: 82, text: "MOD", color: "gold" },
      { x: 204, y: 654, text: "LIB", color: "posterPurple" },
      { x: 1286, y: 332, text: "G.E.", color: "posterPink" },
      { x: 1380, y: 206, text: "JA", color: "gold" },
      { x: 1214, y: 880, text: "ONCE", color: "posterPurple" },
      { x: 1468, y: 554, text: "ARDE", color: "danger" },
      { x: 314, y: 962, text: "FOLK", color: "leafLight" },
      { x: 1338, y: 954, text: "MANAL", color: "posterBlue" }
    ],
    flyerPapers: [
      { x: 156, y: 246, tint: "paper" }, { x: 356, y: 214, tint: "gold" },
      { x: 508, y: 294, tint: "paper" }, { x: 652, y: 268, tint: "paper" },
      { x: 720, y: 390, tint: "paper" }, { x: 286, y: 432, tint: "paper" },
      { x: 120, y: 500, tint: "gold" }, { x: 418, y: 524, tint: "paper" },
      { x: 890, y: 228, tint: "paper" }, { x: 1042, y: 382, tint: "gold" },
      { x: 956, y: 516, tint: "paper" }, { x: 520, y: 706, tint: "paper" },
      { x: 740, y: 682, tint: "gold" }, { x: 1100, y: 656, tint: "paper" },
      { x: 1240, y: 302, tint: "paper" }, { x: 1388, y: 188, tint: "gold" },
      { x: 1186, y: 874, tint: "paper" }, { x: 1472, y: 532, tint: "paper" },
      { x: 318, y: 940, tint: "gold" }, { x: 1328, y: 902, tint: "paper" },
      { x: 728, y: 956, tint: "paper" }, { x: 1510, y: 720, tint: "gold" }
    ],
    flowerBeds: [
      { x: 72, y: 70, w: 40, h: 14 },
      { x: 362, y: 92, w: 52, h: 12 },
      { x: 510, y: 392, w: 66, h: 14 },
      { x: 156, y: 560, w: 58, h: 12 },
      { x: 762, y: 120, w: 54, h: 14 },
      { x: 870, y: 288, w: 70, h: 14 },
      { x: 1010, y: 602, w: 78, h: 14 },
      { x: 566, y: 716, w: 66, h: 12 },
      { x: 1240, y: 250, w: 82, h: 14 },
      { x: 1398, y: 380, w: 70, h: 14 },
      { x: 1170, y: 820, w: 78, h: 14 },
      { x: 280, y: 900, w: 86, h: 14 },
      { x: 1320, y: 992, w: 88, h: 14 },
      { x: 1480, y: 650, w: 68, h: 12 }
    ],
    props: [
      { x: 690, y: 122, kind: "boutique" },
      { x: 936, y: 142, kind: "shoe" },
      { x: 756, y: 454, kind: "camera" },
      { x: 722, y: 502, kind: "coffee" },
      { x: 152, y: 704, kind: "guitar" },
      { x: 560, y: 92, kind: "scissors" },
      { x: 1130, y: 606, kind: "beach" },
      { x: 236, y: 646, kind: "books" },
      { x: 1286, y: 324, kind: "boutique" },
      { x: 1382, y: 196, kind: "books" },
      { x: 1210, y: 872, kind: "coffee" },
      { x: 310, y: 940, kind: "guitar" },
      { x: 1340, y: 938, kind: "beach" },
      { x: 1468, y: 540, kind: "camera" }
    ],
    easterEggs: [
      {
        id: "boite-florida",
        x: 322,
        y: 330,
        label: "Boite Florida",
        section: "Florida",
        text: "La noche porteña mezcla moda, musica y vigilancia en la misma vereda.",
        bonus: 25,
        kind: "door"
      },
      {
        id: "la-balsa",
        x: 342,
        y: 720,
        label: "La Balsa",
        section: "Rock",
        text: "Un rumor musical cruza la ciudad: la cancion joven ya encontro puerto.",
        bonus: 25,
        kind: "record"
      },
      {
        id: "di-tella",
        x: 918,
        y: 164,
        label: "Di Tella",
        section: "Di Tella",
        text: "Laboratorio pop: arte, moda y happening vuelven visible otra sensibilidad.",
        bonus: 25,
        kind: "poster"
      },
      {
        id: "la-cueva",
        x: 992,
        y: 474,
        label: "La Cueva",
        section: "La Cueva",
        text: "Un sotano imaginario guarda canciones, humo, fuga y complicidad.",
        bonus: 25,
        kind: "door",
        summon: 1
      },
      {
        id: "mandioca",
        x: 506,
        y: 746,
        label: "Mandioca",
        section: "Consumo",
        text: "Editar discos tambien fue armar una red joven por fuera del molde.",
        bonus: 25,
        kind: "poster"
      },
      {
        id: "almendra",
        x: 1090,
        y: 708,
        label: "Almendra",
        section: "Beat",
        text: "El pop local empieza a hablar con acento propio.",
        bonus: 25,
        kind: "flower"
      },
      {
        id: "graffiti-joven",
        x: 806,
        y: 310,
        label: "Graffiti",
        section: "Delito",
        text: "Ser joven era una pista: pelo, ropa y musica bastaban para sospechar.",
        bonus: 25,
        kind: "wall"
      },
      {
        id: "primera-plana",
        x: 632,
        y: 198,
        label: "Primera Plana",
        section: "Consumo",
        text: "Revistas y kioscos hicieron circular imagenes de una juventud nueva.",
        bonus: 25,
        kind: "paper"
      },
      {
        id: "costanera",
        x: 1048,
        y: 668,
        label: "Costanera",
        section: "Plaza",
        text: "Plazas, rutas y bordes de ciudad arman otra cartografia joven.",
        bonus: 25,
        kind: "bench",
        summon: 1
      },
      {
        id: "galerias-florida",
        x: 690,
        y: 122,
        label: "Galerías Florida",
        section: "Florida",
        text: "Boutiques, galerias y artesanias hicieron de Florida una vidriera pop.",
        bonus: 25,
        kind: "boutique"
      },
      {
        id: "zapato-puzzovio",
        x: 936,
        y: 142,
        label: "Zapato Pop",
        section: "Moda",
        text: "El Di Tella llevo la vanguardia hasta los pies: moda como arte usable.",
        bonus: 25,
        kind: "shoe"
      },
      {
        id: "blow-up",
        x: 756,
        y: 454,
        label: "Blow Up",
        section: "Cine",
        text: "La mirada beat tambien llegaba por cine, fotos y censura.",
        bonus: 25,
        kind: "camera"
      },
      {
        id: "cafe-la-paz",
        x: 722,
        y: 502,
        label: "Café La Paz",
        section: "Corrientes",
        text: "Un cafe podia ser refugio, redaccion, tertulia y punto de fuga.",
        bonus: 25,
        kind: "coffee",
        summon: 1
      },
      {
        id: "plaza-francia",
        x: 152,
        y: 704,
        label: "Plaza Francia",
        section: "Plazas",
        text: "Tras La Cueva, las plazas fueron mapa abierto para guitarras y llamados.",
        bonus: 25,
        kind: "guitar",
        summon: 2
      },
      {
        id: "peluqueria-moderna",
        x: 560,
        y: 92,
        label: "Peluquería",
        section: "Moda",
        text: "La ciudad vendia modernidad, pero la cana seguia midiendo el pelo.",
        bonus: 25,
        kind: "scissors"
      },
      {
        id: "villa-gesell",
        x: 1130,
        y: 606,
        label: "Villa Gesell",
        section: "Balnearios",
        text: "La fuga playera prometia fogones, campings y otra vida posible.",
        bonus: 25,
        kind: "beach",
        summon: 1
      },
      {
        id: "parque-centenario",
        x: 236,
        y: 646,
        label: "Parque Centenario",
        section: "Plazas",
        text: "Los parques armaban una red de encuentros antes de volverse multitud.",
        bonus: 25,
        kind: "books"
      },
      {
        id: "la-perla-once",
        x: 1210,
        y: 872,
        label: "La Perla del Once",
        section: "Rock",
        text: "En la mesa de un bar tambien podia empezar una cancion generacional.",
        bonus: 25,
        kind: "coffee",
        summon: 1
      },
      {
        id: "tanguito",
        x: 1188,
        y: 910,
        label: "Tanguito",
        section: "Rock",
        text: "El mito joven mezcla noches, caminatas, bares y canciones abiertas.",
        bonus: 25,
        kind: "record",
        summon: 1
      },
      {
        id: "los-beatniks",
        x: 332,
        y: 940,
        label: "Los Beatniks",
        section: "Beat",
        text: "La playa, el escandalo y el single arman una postal beat argentina.",
        bonus: 25,
        kind: "guitar",
        summon: 2
      },
      {
        id: "tucuman-arde",
        x: 1468,
        y: 540,
        label: "Tucumán Arde",
        section: "Vanguardia",
        text: "La vanguardia sale del museo y busca intervenir la calle politica.",
        bonus: 25,
        kind: "poster"
      },
      {
        id: "editorial-jorge-alvarez",
        x: 1382,
        y: 196,
        label: "Jorge Álvarez",
        section: "Consumo",
        text: "Libros y discos cruzan redes: editar tambien era abrir camino.",
        bonus: 25,
        kind: "books"
      },
      {
        id: "galeria-del-este",
        x: 1286,
        y: 324,
        label: "Galería del Este",
        section: "Florida",
        text: "La vidriera pop vuelve visible una ciudad joven, brillante e inquieta.",
        bonus: 25,
        kind: "boutique"
      },
      {
        id: "manal",
        x: 1340,
        y: 938,
        label: "Manal",
        section: "Rock",
        text: "El blues urbano encuentra su idioma entre avenidas, humo y madrugada.",
        bonus: 25,
        kind: "record"
      },
      {
        id: "fogon-gesell",
        x: 1328,
        y: 902,
        label: "Fogón de Gesell",
        section: "Balnearios",
        text: "El borde de la ciudad promete fogones, campings y una fuga posible.",
        bonus: 25,
        kind: "beach",
        summon: 1
      }
    ],
    spawnZones: {
      storyEarly: [
        { x0: 3, x1: 24, y0: 4, y1: 19 },
        { x0: 24, x1: 42, y0: 9, y1: 27 },
        { x0: 5, x1: 28, y0: 22, y1: 40 }
      ],
      storyMid: [
        { x0: 3, x1: 28, y0: 4, y1: 26 },
        { x0: 24, x1: 52, y0: 8, y1: 34 },
        { x0: 18, x1: 48, y0: 28, y1: 42 },
        { x0: 50, x1: 66, y0: 8, y1: 30 }
      ],
      storyLate: [
        { x0: 3, x1: 32, y0: 4, y1: 40 },
        { x0: 24, x1: 60, y0: 8, y1: 45 },
        { x0: 46, x1: 72, y0: 12, y1: 48 }
      ],
      wide: [
        { x0: 3, x1: 32, y0: 4, y1: 42 },
        { x0: 24, x1: 60, y0: 8, y1: 48 },
        { x0: 50, x1: 77, y0: 8, y1: 52 },
        { x0: 6, x1: 30, y0: 42, y1: 52 }
      ],
      plaza: [
        { x0: 4, x1: 20, y0: 6, y1: 18 },
        { x0: 24, x1: 40, y0: 12, y1: 26 },
        { x0: 6, x1: 19, y0: 22, y1: 29 },
        { x0: 8, x1: 28, y0: 44, y1: 52 },
        { x0: 58, x1: 74, y0: 36, y1: 52 }
      ]
    }
  };

  const SPRITES = {
    player: [
      [
        "....SSSS....",
        "...SSSSSS...",
        "...SSSSSS...",
        "....SSSS....",
        "...PPPPPP...",
        "..PPLLLLPP..",
        ".PPPLLLLPPP.",
        ".P.PPPPPP.P.",
        "...PP..PP...",
        "...P....P...",
        "..BB....BB..",
        ".BB......BB."
      ],
      [
        "....SSSS....",
        "...SSSSSS...",
        "...SSSSSS...",
        "....SSSS....",
        "...PPPPPP...",
        "..PPLLLLPP..",
        ".PPPLLLLPPP.",
        ".P.PPPPPP.P.",
        "...PP..PP...",
        "..PP....P...",
        "...B....BB..",
        "..BB....B..."
      ]
    ],
    cop: [
      [
        "...DDDDDD...",
        "..DCCCCCCD..",
        "..DSSSSSSD..",
        "...SSSSSS...",
        "...CCCCCC...",
        "..CCCCCCCC..",
        "..CCCGGCCC..",
        "...CCCCCC...",
        "...CC..CC...",
        "...C....C...",
        "..BB....BB.."
      ],
      [
        "...DDDDDD...",
        "..DCCCCCCD..",
        "..DSSSSSSD..",
        "...SSSSSS...",
        "...CCCCCC...",
        "..CCCCCCCC..",
        "..CCCGGCCC..",
        "...CCCCCC...",
        "..CCC..CC...",
        "...C....CC..",
        "...B....BB.."
      ]
    ],
    ally: [
      [
        ".....F......",
        "...HHHHHH...",
        "..HHSSSSHH..",
        "..HSSSSSSH..",
        "..HHSSSSHH..",
        "...AAAAAA...",
        "..AALLLLAA..",
        ".AAALLLLAAA.",
        ".A.AAAAAA.A.",
        "...AA..AA...",
        "..BB....BB.."
      ],
      [
        ".....F......",
        "...HHHHHH...",
        "..HHSSSSHH..",
        "..HSSSSSSH..",
        "..HHSSSSHH..",
        "...AAAAAA...",
        "..AALLLLAA..",
        ".AAALLLLAAA.",
        ".A.AAAAAA.A.",
        "..AAA..AA...",
        "...B....BB.."
      ]
    ],
    npc: {
      bohemian: [
        [
          "..BBBBBB....",
          ".BHHHHHHB...",
          "..HSSSSH....",
          "...SSSS.....",
          "..MMMMMM....",
          ".MMMLLLMM...",
          ".MMLLLLMM...",
          "..MMMMMM....",
          "...MM..MM...",
          "..BB....BB.."
        ],
        [
          "..BBBBBB....",
          ".BHHHHHHB...",
          "..HSSSSH....",
          "...SSSS.....",
          "..MMMMMM....",
          ".MMMLLLMM...",
          ".MMLLLLMM...",
          "..MMMMMM....",
          "..MMM..MM...",
          "...B....BB.."
        ]
      ],
      journalist: [
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..JJJJJJ....",
          ".JJJPPJJJ...",
          ".JJJPPJJJ...",
          "..JJJJJJ....",
          "...JJ..JJ...",
          "..BB....BB.."
        ],
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..JJJJJJ....",
          ".JJJPPJJJ...",
          ".JJJPPJJJ...",
          "..JJJJJJ....",
          "..JJJ..JJ...",
          "...B....BB.."
        ]
      ],
      musician: [
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..UUUUUU....",
          ".UULGGUU....",
          ".UUUGGUU....",
          "..UUUUUU....",
          "...UU..UU...",
          "..BB....BB.."
        ],
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..UUUUUU....",
          ".UULGGUU....",
          ".UUUGGUU....",
          "..UUUUUU....",
          "..UUU..UU...",
          "...B....BB.."
        ]
      ],
      executive: [
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..EEEEEE....",
          ".EEELLLEE...",
          ".EEEGGEEE...",
          "..EEEEEE....",
          "...EE..EE...",
          "..BB....BB.."
        ],
        [
          "...HHHHH....",
          "..HSSSSSH...",
          "...SSSS.....",
          "..EEEEEE....",
          ".EEELLLEE...",
          ".EEEGGEEE...",
          "..EEEEEE....",
          "..EEE..EE...",
          "...B....BB.."
        ]
      ]
    },
    power: {
      press: [
        "NNNNNNNN",
        "N......N",
        "N.NN.N.N",
        "N......N",
        "N.NNNN.N",
        "N......N",
        "NNNNNNNN"
      ],
      beatles: [
        "..RRRR..",
        ".RBBBBR.",
        "RBBYYBBR",
        "RBY..YBR",
        "RBY..YBR",
        "RBBYYBBR",
        ".RBBBBR.",
        "..RRRR.."
      ],
      poncho: [
        "...O....",
        "..OOO...",
        ".OOOOO..",
        "OOOOOOO.",
        "OOPOOPO.",
        ".OPOPO..",
        "..O.O...",
        "...O...."
      ],
      flyer: [
        "......N......",
        ".....NLN.....",
        "..NN.NYYN.NN.",
        ".NLLNNYYNNLLN",
        ".NLLLYYYLLLN.",
        "..NLLYYYLLN..",
        "NNNLGYYYGLNNN",
        ".NLLGYYYGLLN.",
        "..NLGYYYGLN..",
        "...NGGGGGN...",
        "....NGGGN....",
        ".....NGN.....",
        ".....NGN.....",
        ".....NGN....."
      ],
      mate: [
        "...GGG...",
        "..GGGGG..",
        "..GBBGG..",
        "..GBBGG..",
        "...GGGB..",
        "....BB...",
        "...BBBB.."
      ],
      fanzine: [
        "NNNNNNNN",
        "NPPPPPPN",
        "NPPNPPPN",
        "NPPPPPPN",
        "NPPNPPPN",
        "NPPPPPPN",
        "NNNNNNNN"
      ],
      sombrero: [
        "....OO..",
        "...OOOO.",
        "..OOOOOO",
        "OOOOOOOO",
        ".OOOOOO.",
        "..OOOO..",
        "...BB..."
      ]
    },
    ui: {
      round: [
        ".NNNNNN.",
        "NYYYYYYN",
        "NYNNNNYN",
        "NYYYYYYN",
        "NYNYNYNN",
        "NYYYYYYN",
        ".NNNNNN."
      ],
      hair: [
        "..NNNN..",
        ".NHHHHN.",
        "NHHHHHHN",
        "NHSSSSHN",
        ".NSSSSN.",
        "..NSSN..",
        "...NN..."
      ],
      objective: [
        "...FF...",
        "..FYYF..",
        ".FYYYYF.",
        "..FYYF..",
        "...FF...",
        "..GGGG..",
        ".G....G."
      ],
      power: [
        "......N......",
        "....NNLNN....",
        "..NNLYYLNN...",
        ".NLLYYYLLN...",
        "NNLGYYYGLNN..",
        ".NLLYYYLLN...",
        "..NNGGGNN....",
        "....NGN......"
      ],
      score: [
        "...YY...",
        "..YYYY..",
        "YYYYYYYY",
        ".YYYYYY.",
        "..YYYY..",
        ".YY..YY.",
        "YY....YY"
      ],
      quote: [
        ".NNNNNN.",
        "NPPPPPPN",
        "NPNNPPPN",
        "NPPPPPPN",
        "NPPNNPPN",
        "NPPPPPPN",
        ".NNNNNN."
      ],
      rumor: [
        "...YY...",
        "..YNNY..",
        ".YNNNNY.",
        "YNNYYNNY",
        ".YNNNNY.",
        "..YNNY..",
        "...YY..."
      ],
      menu: [
        "NNNNNNNN",
        "NYYYYYYN",
        "NYGYYGYN",
        "NYYYYYYN",
        "NYNNNNYN",
        "NYYYYYYN",
        "NNNNNNNN"
      ]
    }
  };

  const game = {
    mode: "menu",
    runMode: "story",
    archetype: "estudiante",
    playerStyle: (() => { try { return localStorage.getItem(STYLE_KEY) || "default"; } catch(e) { return "default"; } })(),
    round: 0,
    survivalLevel: 0,
    nextReinforcement: 30,
    lives: 3,
    score: 0,
    combo: 0,
    totalTime: 0,
    lastScoreSecond: 0,
    roundTimer: 0,
    collectedRound: 0,
    hippiesTotal: 0,
    crowdCount: 0,
    safeZoneTimer: 0,
    activePowerUp: null,
    player: null,
    cops: [],
    allies: [],
    crowd: [],
    npcs: [],
    powerUps: [],
    particles: [],
    floaters: [],
    discoveredEggs: new Set(),
    camera: { x: 0, y: 0 },
    controlMode: "tap",
    target: null,
    stepTimer: 0,
    flashTimer: 0,
    caughtCooldown: 0,
    msgText: "",
    msgTimer: 0,
    msgKind: "",
    quoteDeck: [],
    lastQuoteText: "",
    allyRespawnTimer: 0,
    powerRespawnTimer: 8,
    cityEventTimer: 11,
    cityEventPulse: 0,
    cityEventLabel: "",
    lastCityEvent: "",
    archive: loadArchive(),
    musicTimer: 0,
    musicPulse: 0,
    musicSummonTimer: 0,
    highScores: loadScores(),
    saved: false
  };

  const input = {
    keys: new Set(),
    dpad: { x: 0, y: 0, dir: "" }
  };

  let blockedTiles = new Set();
  let rafId = null;
  let lastTime = 0;
  let introActive = false;

  function rebuildBlockedTiles() {
    blockedTiles = new Set();
    const addTile = (tile) => blockedTiles.add(tileKey(tile.x, tile.y));
    MAP.trees.forEach(addTile);
    MAP.fountain.forEach(addTile);
    MAP.kioskBlocks.forEach(addTile);
    MAP.stationBlocks.forEach(addTile);
    MAP.benches.forEach((bench) => {
      for (let x = bench.x; x < bench.x + bench.w; x++) {
        for (let y = bench.y; y < bench.y + bench.h; y++) {
          blockedTiles.add(tileKey(x, y));
        }
      }
    });
  }

  function resetGame(runMode = "story") {
    game.mode = "playing";
    game.runMode = runMode;
    syncRunModeTheme();
    game.round = 0;
    game.survivalLevel = 0;
    game.nextReinforcement = 30;
    game.lives = (ARCHETYPES[game.archetype] || ARCHETYPES.estudiante).lives;
    game.score = 0;
    game.combo = 0;
    game.totalTime = 0;
    game.lastScoreSecond = 0;
    game.hippiesTotal = 0;
    game.crowdCount = 0;
    game.crowd = [];
    game.quoteDeck = [];
    game.lastQuoteText = "";
    game.lastCityEvent = "";
    game.discoveredEggs = new Set();
    game.archive = loadArchive();
    game.musicTimer = 0;
    game.musicPulse = 0;
    game.musicSummonTimer = 0;
    game.highScores = loadScores(runMode);
    game.saved = false;
    if (runMode === "survival") {
      setupSurvival();
    } else if (runMode === "convocatoria") {
      setupConvocatoria();
    } else {
      setupRound(0);
    }
  }

  function setupRound(index) {
    const cfg = ROUND_CONFIGS[index];
    startScenario(cfg, index);
  }

  function setupSurvival() {
    startScenario(SURVIVAL_CONFIG, 0);
  }

  function setupConvocatoria() {
    startScenario(CONVOCATORIA_CONFIG, 0);
  }

  function startScenario(cfg, index) {
    const spawn = tileCenter(MAP.playerSpawn.x, MAP.playerSpawn.y);
    game.mode = "playing";
    game.round = index;
    game.roundTimer = 0;
    game.collectedRound = 0;
    game.safeZoneTimer = cfg.safeSeconds;
    game.activePowerUp = null;
    game.caughtCooldown = 1;
    game.flashTimer = 0;
    game.msgText = "";
    game.msgTimer = 0;
    game.msgKind = "";
    game.target = null;
    game.stepTimer = 0;
    game.allyRespawnTimer = 0;
    game.powerRespawnTimer = 8;
    game.cityEventTimer = cfg.objective.type === "collect" ? 12 : 14;
    game.cityEventPulse = 0;
    game.cityEventLabel = "";
    game.musicTimer = 0;
    game.musicPulse = 0;
    game.musicSummonTimer = 0;
    const district = game.runMode === "story" && cfg.district ? DISTRICTS[cfg.district] : null;
    game.player = {
      x: spawn.x,
      y: spawn.y,
      path: [],
      dir: 1,
      walk: 0,
      hairLevel: Math.min(3, 3 - game.lives)
    };
    game.cops = createCops(cfg);
    game.allies = [];
    game.crowd = [];
    game.npcs = [];
    game.powerUps = [];
    game.particles = [];
    game.floaters = [];
    game.discoveredEggs = new Set();
    game.archive = loadArchive();
    // Camera focuses on the district's area, but player always starts at the safe default spawn
    if (district) {
      const dCenter = tileCenter(district.spawnTile.x, district.spawnTile.y);
      game.camera = { x: clamp(dCenter.x - W / 2, 0, WORLD_W - W), y: clamp(dCenter.y - H / 2, 0, WORLD_H - H) };
    } else {
      game.camera = { x: 0, y: 0 };
    }

    for (let i = 0; i < cfg.allies; i++) spawnAlly();
    spawnPowerUp();
    spawnPowerUp();
    hideOverlay();
    updatePauseButton();
    showMsg(objectiveText(cfg));
    updateHud();
    draw();
    startLoop();
  }

  function createCops(cfg) {
    return cfg.patrols.slice(0, cfg.cops).map((route, index) => {
      return createCop(route, index);
    });
  }

  function createCop(route, index) {
    const first = tileCenter(route[0].x, route[0].y);
    return {
      x: first.x,
      y: first.y,
      route,
      patrolIndex: 1 % route.length,
      path: [],
      goalKey: "",
      wait: index * 0.18,
      alert: false,
      alertTimer: 0,
      repathTimer: 0,
      walk: 0,
      facing: directionFromRoute(route),
      flanker: index === 0,
      id: index
    };
  }

  function directionFromRoute(route) {
    if (!route || route.length < 2) return { x: 1, y: 0 };
    const a = tileCenter(route[0].x, route[0].y);
    const b = tileCenter(route[1].x, route[1].y);
    return normalizeVector(b.x - a.x, b.y - a.y);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function loop(ts) {
    if (game.mode !== "playing") {
      rafId = null;
      return;
    }
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    if (game.mode === "playing") {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  }

  function togglePause() {
    if (game.mode === "playing") {
      pauseGame();
    } else if (game.mode === "paused") {
      resumeGame();
    }
  }

  function pauseGame() {
    if (game.mode !== "playing") return;
    game.mode = "paused";
    clearInput();
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    updatePauseButton();
    showPauseOverlay();
  }

  function resumeGame() {
    if (game.mode !== "paused") return;
    hideOverlay();
    game.mode = "playing";
    clearInput();
    updatePauseButton();
    startLoop();
  }

  function clearInput() {
    input.keys.clear();
    input.dpad.dir = "";
    input.dpad.x = 0;
    input.dpad.y = 0;
    for (const button of dpadButtons) button.classList.remove("is-held");
  }

  function updatePauseButton() {
    const visible = game.mode === "playing" || game.mode === "paused";
    pauseButton.hidden = !visible;
    pauseButton.classList.toggle("is-resume", game.mode === "paused");
    pauseButton.textContent = game.mode === "paused" ? ">" : "II";
    pauseButton.setAttribute("aria-label", game.mode === "paused" ? "Reanudar juego" : "Pausar juego");
  }

  function update(dt) {
    SFX.tickDown(dt);
    const cfg = currentConfig();
    game.totalTime += dt;
    game.roundTimer += dt;
    scoreSurvivalSeconds();
    updateSurvivalPressure();
    updateCityEvents(dt, cfg);

    if (game.flashTimer > 0) game.flashTimer -= dt;
    if (game.cityEventPulse > 0) game.cityEventPulse -= dt;
    if (game.caughtCooldown > 0) game.caughtCooldown -= dt;
    if (game.msgTimer > 0) game.msgTimer -= dt;
    updatePowerUp(dt);
    updatePlayer(dt);
    updateCrowd(dt);
    updateCops(dt, cfg);
    updateAllies(dt, cfg);
    updateNpcs(dt);
    updateMusic(dt);
    updatePowerUps(dt, cfg);
    updateEasterEggs();
    updateParticles(dt);
    updateFloaters(dt);
    checkTimedObjective(cfg);
    updateCamera();
    updateHud();
  }

  function currentConfig() {
    if (game.runMode === "survival") {
      const pressure = game.survivalLevel;
      return {
        ...SURVIVAL_CONFIG,
        copSpeed: SURVIVAL_CONFIG.copSpeed + pressure * 4,
        chaseBonus: SURVIVAL_CONFIG.chaseBonus + pressure * 2,
        detection: SURVIVAL_CONFIG.detection + pressure * 5,
        maxAllies: Math.min(8, SURVIVAL_CONFIG.maxAllies + Math.floor(pressure / 2))
      };
    }
    if (game.runMode === "convocatoria") {
      const attention = convocatoriaAttention();
      return {
        ...CONVOCATORIA_CONFIG,
        copSpeed: CONVOCATORIA_CONFIG.copSpeed + attention * 0.35,
        chaseBonus: CONVOCATORIA_CONFIG.chaseBonus + attention * 0.25,
        detection: CONVOCATORIA_CONFIG.detection + attention,
        maxAllies: Math.min(10, CONVOCATORIA_CONFIG.maxAllies + Math.floor(game.crowdCount / 5))
      };
    }
    return ROUND_CONFIGS[game.round];
  }

  function convocatoriaAttention() {
    const crowd = Math.min(14, game.crowdCount);
    const timePressure = Math.floor(game.roundTimer / 20) * 2;
    return Math.min(38, crowd * 2.35 + timePressure);
  }

  function notorietyValue() {
    const scorePressure = Math.min(22, Math.floor(game.score / 45) * 3);
    const timePressure = Math.min(18, Math.floor(game.roundTimer / 18) * 3);
    const alertPressure = game.cops.some((cop) => cop.alert) ? 15 : 0;
    const archivePressure = game.discoveredEggs.size * 4;
    const crowdPressure = game.runMode === "convocatoria"
      ? Math.min(26, game.crowdCount * 4)
      : Math.min(12, game.crowdCount * 2);
    const survivalPressure = game.runMode === "survival" ? Math.min(22, game.survivalLevel * 7) : 0;
    const eventPressure = game.cityEventPulse > 0 ? 5 : 0;
    return Math.round(clamp(
      scorePressure + timePressure + alertPressure + archivePressure + crowdPressure + survivalPressure + eventPressure,
      0,
      100
    ));
  }

  function notorietyStage(value) {
    if (value >= 78) return "Razzia";
    if (value >= 52) return "Vigilancia";
    if (value >= 26) return "Murmullo";
    return "Rumor";
  }

  function updateSurvivalPressure() {
    if (game.runMode !== "survival" || game.roundTimer < game.nextReinforcement) return;
    game.survivalLevel += 1;
    game.nextReinforcement += 30;
    const route = SURVIVAL_CONFIG.patrols[game.survivalLevel % SURVIVAL_CONFIG.patrols.length];
    game.cops.push(createCop(route, game.cops.length));
    showMsg(`Refuerzos policiales. Presión ${game.survivalLevel + 1}.`);
  }

  function updateCityEvents(dt, cfg) {
    if (game.mode !== "playing") return;
    if (game.roundTimer < 6) return;
    game.cityEventTimer -= dt;
    if (game.cityEventTimer > 0) return;
    const event = chooseCityEvent();
    if (event) triggerCityEvent(event, cfg);
    game.cityEventTimer = cityEventDelay(cfg);
  }

  function cityEventDelay(cfg) {
    const base = cfg.objective.type === "endless" ? 18 : cfg.objective.type === "convocatoria" ? 17 : 22;
    const pressure = game.runMode === "survival"
      ? Math.min(5, game.survivalLevel)
      : game.runMode === "convocatoria"
        ? Math.min(6, Math.floor(game.crowdCount / 3))
        : game.round;
    const rumorPressure = Math.floor(notorietyValue() / 28);
    return Math.max(12, base - pressure * 1.4 - rumorPressure * 0.8 + Math.random() * 7);
  }

  function chooseCityEvent() {
    const roundIndex = game.runMode === "survival"
      ? game.survivalLevel
      : game.runMode === "convocatoria"
        ? Math.floor(game.crowdCount / 5)
        : game.round;
    const available = CITY_EVENTS.filter((event) => {
      return event.modes.includes(game.runMode)
        && roundIndex >= event.minRound
        && event.type !== game.lastCityEvent;
    });
    const pool = available.length ? available : CITY_EVENTS.filter((event) => event.modes.includes(game.runMode));
    const total = pool.reduce((sum, event) => sum + event.weight, 0);
    let pick = Math.random() * total;
    for (const event of pool) {
      pick -= event.weight;
      if (pick <= 0) return event;
    }
    return pool[0] || null;
  }

  function triggerCityEvent(event, cfg) {
    game.lastCityEvent = event.type;
    game.cityEventLabel = event.label;
    game.cityEventPulse = 1.15;

    if (event.type === "convocatoria") {
      const allyCount = game.runMode === "survival"
        ? 3 + Math.min(2, game.survivalLevel)
        : game.runMode === "convocatoria"
          ? 3
          : 2;
      const count = summonAllies(allyCount);
      spawnNpc("bohemian", 1);
      showMsg(`${event.label}: ${count} compañeros escuchan el llamado.`, 5, "event");
      return;
    }

    if (event.type === "cronista") {
      spawnNpc("journalist", 1);
      showMsg("Un cronista busca testimonio: tocarlo distrae a la cana.", 5, "event");
      return;
    }

    if (event.type === "musico") {
      spawnNpc("musician", 1);
      showMsg("Un músico callejero toca cerca: si lo seguís, la plaza responde.", 5, "event");
      return;
    }

    if (event.type === "ejecutivos") {
      spawnNpc("executive", game.runMode === "survival" ? 3 : 2);
      showMsg("Hora pico en Florida: los ejecutivos cortan el paso.", 4.8, "event");
      return;
    }

    if (event.type === "razzia") {
      const extras = game.runMode === "survival" || game.runMode === "convocatoria" ? 2 : 1;
      for (let i = 0; i < extras; i++) spawnTemporaryCop();
      showMsg("Razzia sorpresa: salen refuerzos desde la comisaría.", 4.8, "event");
    }
  }

  function scoreSurvivalSeconds() {
    const whole = Math.floor(game.totalTime);
    if (whole > game.lastScoreSecond) {
      game.score += whole - game.lastScoreSecond;
      game.lastScoreSecond = whole;
    }
  }

  function updatePowerUp(dt) {
    if (!game.activePowerUp) return;
    game.activePowerUp.timer -= dt;
    if (game.activePowerUp.timer <= 0) {
      showMsg(`${POWERUPS[game.activePowerUp.type].label} se agota.`);
      game.activePowerUp = null;
    }
  }

  function updatePlayer(dt) {
    const player = game.player;
    if (!player) return;
    if (isPlayerInSafeZone() && game.safeZoneTimer > 0) {
      game.safeZoneTimer = Math.max(0, game.safeZoneTimer - dt);
    }

    const arch = ARCHETYPES[game.archetype] || ARCHETYPES.estudiante;
    const baseSpeed = arch.speed;
    const move = movementVector();
    if (move.x || move.y) {
      player.path = [];
      game.target = null;
      const speed = activePower("beatles") ? baseSpeed * 1.45 : baseSpeed;
      const length = Math.hypot(move.x, move.y) || 1;
      const mx = move.x / length;
      const my = move.y / length;
      movePlayerBy(mx * speed * dt, my * speed * dt);
      player.walk += dt * 10;
      maybeSpawnStepDust(dt);
      if (Math.abs(mx) > 0.05) player.dir = mx > 0 ? 1 : -1;
      return;
    }

    if (!player.path.length) return;
    const next = player.path[0];
    const goal = tileCenter(next.x, next.y);
    const dx = goal.x - player.x;
    const dy = goal.y - player.y;
    const d = Math.hypot(dx, dy);
    const speed = activePower("beatles") ? baseSpeed * 1.45 : baseSpeed;
    player.walk += dt * 10;
    if (Math.abs(dx) > 0.2) player.dir = dx > 0 ? 1 : -1;

    if (d <= speed * dt) {
      player.x = goal.x;
      player.y = goal.y;
      player.path.shift();
      if (!player.path.length) game.target = null;
    } else if (d > 0) {
      player.x += (dx / d) * speed * dt;
      player.y += (dy / d) * speed * dt;
      maybeSpawnStepDust(dt);
    }
  }

  function maybeSpawnStepDust(dt) {
    if (!game.player) return;
    game.stepTimer -= dt;
    if (game.stepTimer > 0) return;
    game.stepTimer = activePower("beatles") ? 0.08 : 0.14;
    SFX.footstep();
    game.particles.push({
      x: game.player.x - game.player.dir * 5,
      y: game.player.y + 12,
      vx: -game.player.dir * (8 + Math.random() * 10),
      vy: -8 - Math.random() * 8,
      life: 0.22,
      maxLife: 0.35,
      color: activePower("beatles") ? COLORS.gold : "rgba(245,237,216,0.62)"
    });
  }

  function updateCrowd(dt) {
    if (!game.crowd.length || !game.player) return;
    for (let i = 0; i < game.crowd.length; i++) {
      const member = game.crowd[i];
      const leader = i === 0 ? game.player : game.crowd[i - 1];
      const desired = 17 + (i % 3) * 2;
      const dx = leader.x - member.x;
      const dy = leader.y - member.y;
      const d = Math.hypot(dx, dy);
      member.walk += dt * 5;
      member.bob += dt * 5;
      if (d > 220) {
        member.x = game.player.x - 10 - i * 3;
        member.y = game.player.y + 12 + (i % 4) * 4;
        continue;
      }
      if (d > desired) {
        const speed = 82 + Math.min(34, d * 0.35);
        const step = Math.min(d - desired, speed * dt);
        member.x += (dx / d) * step;
        member.y += (dy / d) * step;
        if (Math.abs(dx) > 0.2) member.dir = dx > 0 ? 1 : -1;
      }
    }
  }

  function movePlayerBy(dx, dy) {
    const player = game.player;
    const nextX = player.x + dx;
    if (canPlayerOccupy(nextX, player.y)) player.x = nextX;
    const nextY = player.y + dy;
    if (canPlayerOccupy(player.x, nextY)) player.y = nextY;
  }

  function canPlayerOccupy(x, y) {
    const radiusX = 6;
    const radiusY = 6;
    if (x < radiusX || y < radiusY || x > WORLD_W - radiusX || y > WORLD_H - radiusY) return false;
    const points = [
      pixelToTile(x - radiusX, y - radiusY),
      pixelToTile(x + radiusX, y - radiusY),
      pixelToTile(x - radiusX, y + radiusY),
      pixelToTile(x + radiusX, y + radiusY)
    ];
    return points.every((p) => !isBlocked(p.x, p.y));
  }

  function movementVector() {
    let x = input.dpad.x;
    let y = input.dpad.y;
    if (input.keys.has("arrowleft") || input.keys.has("a")) x -= 1;
    if (input.keys.has("arrowright") || input.keys.has("d")) x += 1;
    if (input.keys.has("arrowup") || input.keys.has("w")) y -= 1;
    if (input.keys.has("arrowdown") || input.keys.has("s")) y += 1;
    return { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  function updateCops(dt, cfg) {
    const frozen = activePower("press");
    const confused = leafConfusesPolice();
    const protectedByKiosk = isPlayerProtected();
    const inDanger = rectContains(MAP.dangerZone, game.player);
    game.cops = game.cops.filter((cop) => cop.tempTimer == null || cop.tempTimer > 0);

    for (const cop of game.cops) {
      if (cop.tempTimer != null) cop.tempTimer -= dt;
      if (frozen) {
        cop.alert = false;
        cop.walk += dt * 2;
        continue;
      }

      if (confused && !inDanger) {
        cop.alert = false;
        cop.alertTimer = 0;
      }

      const detect = detectionRadius(cfg, inDanger);
      const seesPlayer = !protectedByKiosk && game.caughtCooldown <= 0 && !activePower("sombrero") && copSeesPlayer(cop, detect);
      if (seesPlayer || inDanger) {
        if (!cop.alert && seesPlayer) SFX.alert();
        cop.alert = true;
        cop.alertTimer = inDanger ? 1.35 : (confused ? 0.45 : 1.8);
      } else if (cop.alertTimer > 0) {
        cop.alertTimer -= dt;
      } else {
        cop.alert = false;
      }

      const baseSpeed = cfg.copSpeed * (confused ? 0.55 : 1);
      const chaseBonus = cfg.chaseBonus * (confused ? 0.2 : 1);
      const speed = cop.alert && !protectedByKiosk ? baseSpeed + chaseBonus : baseSpeed;
      if (cop.alert && !protectedByKiosk) {
        moveCopToTile(cop, copChaseTarget(cop), speed, dt, true);
      } else {
        updateCopPatrol(cop, speed, dt);
      }

      cop.walk += dt * 8;
      if (!protectedByKiosk && game.caughtCooldown <= 0 && dist(cop, game.player) < 15) {
        catchPlayer();
        return;
      }
    }

    if (!frozen && !confused) propagateCopAlerts();

    if (inDanger && !protectedByKiosk && game.msgTimer <= 0) {
      showMsg("La entrada de la comisaría está cerca: todos miran.");
    }
  }

  function copChaseTarget(cop) {
    if (cop.flanker && game.player.path.length > 1) {
      return game.player.path[game.player.path.length - 1];
    }
    return currentTile(game.player);
  }

  function propagateCopAlerts() {
    const RADIO = 180;
    const alerters = game.cops.filter(c => c.alert);
    if (!alerters.length) return;
    for (const cop of game.cops) {
      if (cop.alert) continue;
      if (alerters.some(a => dist(cop, a) < RADIO)) {
        cop.alert = true;
        cop.alertTimer = 1.15;
      }
    }
  }

  function detectionRadius(cfg, includeDanger = false) {
    let radius = cfg.detection;
    if (activePower("poncho")) radius *= 0.55;
    if (activePower("sombrero")) radius *= 0.12;
    if (leafConfusesPolice()) radius *= 0.42;
    if (game.runMode === "convocatoria") radius += Math.min(34, game.crowdCount * 2.2);
    radius += notorietyValue() * 0.18;
    if (includeDanger) radius += 34;
    return radius;
  }

  function updateCopPatrol(cop, speed, dt) {
    if (cop.wait > 0) {
      cop.wait -= dt;
      return;
    }
    const targetTile = cop.route[cop.patrolIndex];
    const targetPoint = tileCenter(targetTile.x, targetTile.y);
    if (dist(cop, targetPoint) < 4) {
      cop.patrolIndex = (cop.patrolIndex + 1) % cop.route.length;
      cop.path = [];
      cop.goalKey = "";
      cop.wait = 0.35;
      return;
    }
    moveCopToTile(cop, targetTile, speed, dt, false);
  }

  function moveCopToTile(cop, goalTile, speed, dt, repathOften) {
    const goal = tileKey(goalTile.x, goalTile.y);
    cop.repathTimer -= dt;
    if (!cop.path.length || cop.goalKey !== goal || (repathOften && cop.repathTimer <= 0)) {
      const start = currentTile(cop);
      const path = bfs(start.x, start.y, goalTile.x, goalTile.y);
      cop.path = path && path.length > 1 ? path.slice(1) : [];
      cop.goalKey = goal;
      cop.repathTimer = 0.28;
    }

    const nextTile = cop.path[0] || goalTile;
    const next = tileCenter(nextTile.x, nextTile.y);
    const dx = next.x - cop.x;
    const dy = next.y - cop.y;
    const d = Math.hypot(dx, dy);
    if (d <= speed * dt) {
      updateFacing(cop, dx, dy);
      cop.x = next.x;
      cop.y = next.y;
      if (cop.path.length) cop.path.shift();
    } else if (d > 0) {
      updateFacing(cop, dx, dy);
      cop.x += (dx / d) * speed * dt;
      cop.y += (dy / d) * speed * dt;
    }
  }

  function updateFacing(entity, dx, dy) {
    if (Math.hypot(dx, dy) < 0.2) return;
    entity.facing = normalizeVector(dx, dy);
  }

  function copSeesPlayer(cop, radius) {
    const dx = game.player.x - cop.x;
    const dy = game.player.y - cop.y;
    return Math.hypot(dx, dy) <= radius;
  }

  function updateAllies(dt, cfg) {
    for (const ally of game.allies) {
      ally.bob += dt * 7;
      ally.walk += dt * 5;
      if (ally.glow > 0) ally.glow = Math.max(0, ally.glow - dt);
      if (!ally.collected && dist(ally, game.player) < allyCollectRadius()) {
        collectAlly(ally);
      }
    }
    game.allies = game.allies.filter((ally) => !ally.collected);

    if (game.allies.length < cfg.maxAllies && game.mode === "playing") {
      game.allyRespawnTimer -= dt;
      if (game.allyRespawnTimer <= 0) {
        spawnAlly();
        game.allyRespawnTimer = cfg.objective.type === "survive" || cfg.objective.type === "endless" ? 5 : 2.4;
      }
    }
  }

  function updateNpcs(dt) {
    for (const npc of game.npcs) {
      const type = NPC_TYPES[npc.type];
      npc.life -= dt;
      npc.walk += dt * 6;
      if (npc.bumpCooldown > 0) npc.bumpCooldown -= dt;
      updateCopPatrol(npc, type.speed, dt);

      if (dist(npc, game.player) <= type.radius) {
        interactWithNpc(npc, type);
      }
    }
    game.npcs = game.npcs.filter((npc) => !npc.collected && npc.life > 0);
  }

  function updateMusic(dt) {
    if (game.musicTimer <= 0) return;
    game.musicTimer = Math.max(0, game.musicTimer - dt);
    game.musicPulse += dt;
    game.musicSummonTimer -= dt;
    if (game.musicSummonTimer <= 0 && game.mode === "playing") {
      const count = summonAllies(1);
      if (count) { game.allyRespawnTimer = 0; SFX.ambientTick(); }
      game.musicSummonTimer = 1.55;
    }
    if (game.musicTimer <= 0) {
      game.musicPulse = 0;
      showMsg("La canción se pierde entre bocinazos.", 2.7);
    }
  }

  function interactWithNpc(npc, type) {
    if (npc.type === "executive") {
      if (npc.bumpCooldown > 0 || game.caughtCooldown > 0) return;
      npc.bumpCooldown = 2.4;
      game.combo = 0;
      game.player.path = [];
      game.target = null;
      pushPlayerFrom(npc, 18);
      burst(game.player.x, game.player.y, COLORS.executiveLight, 8);
      showMsg("Un ejecutivo te corta el paso. Se pierde la racha.", 3.2, "event");
      return;
    }

    if (npc.type === "musician") {
      if (npc.bumpCooldown > 0) return;
      npc.bumpCooldown = 6.2;
      npc.life = Math.max(npc.life, 9);
      game.musicTimer = 7;
      game.musicPulse = 0;
      game.musicSummonTimer = 0;
      game.score += type.score;
      burst(npc.x, npc.y, COLORS.gold, 22);
      floatText("Canción +5", npc.x, npc.y - 22, COLORS.gold);
      showMsg("El músico arma una ronda: más compañeros se acercan por unos segundos.", 5.2, "event");
      return;
    }

    npc.collected = true;
    game.score += type.score;
    burst(npc.x, npc.y, type.color, 18);
    floatText(`+${type.score}`, npc.x, npc.y - 18, type.color);

    if (npc.type === "journalist") {
      game.activePowerUp = { type: "press", timer: 3 };
      confuseCopsWithLeaf();
      floatText("Prensa", npc.x, npc.y - 28, COLORS.paper);
      showMsg("El cronista toma nota: la cana duda por 3 segundos.", 4.4, "power");
      return;
    }

    showQuoteMessage("Bohemio +15");
  }

  function pushPlayerFrom(source, amount) {
    const dx = game.player.x - source.x;
    const dy = game.player.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = dx / length;
    const ny = dy / length;
    const nextX = game.player.x + nx * amount;
    const nextY = game.player.y + ny * amount;
    if (canPlayerOccupy(nextX, game.player.y)) game.player.x = nextX;
    if (canPlayerOccupy(game.player.x, nextY)) game.player.y = nextY;
  }

  function updatePowerUps(dt, cfg) {
    for (const item of game.powerUps) {
      item.bob += dt * 5;
      if (dist(item, game.player) < 18) {
        activatePowerUp(item.type, item);
        burst(item.x, item.y, POWERUPS[item.type].color, 16);
        item.collected = true;
      }
    }
    game.powerUps = game.powerUps.filter((item) => !item.collected);

    if (game.powerUps.length < 2) {
      game.powerRespawnTimer -= dt;
      if (game.powerRespawnTimer <= 0) {
        spawnPowerUp(randomFrom(cfg.powerups));
        game.powerRespawnTimer = 11;
      }
    }
  }

  function updateEasterEggs() {
    if (!game.player) return;
    for (const egg of MAP.easterEggs) {
      if (game.discoveredEggs.has(egg.id)) continue;
      if (dist(egg, game.player) > 24) continue;
      discoverEasterEgg(egg);
    }
  }

  function discoverEasterEgg(egg) {
    const prevCount = game.discoveredEggs.size;
    game.discoveredEggs.add(egg.id);
    game.archive = saveArchiveId(egg.id);
    game.score += egg.bonus;
    burst(egg.x, egg.y, COLORS.neon, 24);
    floatText(`+${egg.bonus} Archivo`, egg.x, egg.y - 18, COLORS.neon);
    if (egg.summon) {
      summonAllies(egg.summon);
      game.allyRespawnTimer = 0;
    }
    const total = MAP.easterEggs.length;
    const prevPct = total ? Math.round((prevCount / total) * 100) : 0;
    const newPct  = total ? Math.round((game.discoveredEggs.size / total) * 100) : 0;
    const newUnlock = PALETTE_UNLOCKS.find(p => p.threshold > prevPct && p.threshold <= newPct);
    if (newUnlock) {
      showMsg(`Color desbloqueado: ${newUnlock.label}`, 5, "power");
    } else {
      showMsg(`Archivo ${egg.label} · ${egg.section}: ${egg.text}`, 6.8, "quote");
    }
  }

  function updateParticles(dt) {
    game.particles = game.particles.filter((p) => p.life > 0);
    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
  }

  function updateFloaters(dt) {
    game.floaters = game.floaters.filter((f) => f.life > 0);
    for (const f of game.floaters) {
      f.y += f.vy * dt;
      f.life -= dt;
    }
  }

  function collectAlly(ally) {
    ally.collected = true;
    game.score += 10;
    game.combo += 1;
    game.collectedRound += 1;
    game.hippiesTotal += 1;
    if (game.runMode === "convocatoria") addCrowdMember(ally);
    SFX.collect();
    burst(ally.x, ally.y, COLORS.particle, 18);
    floatText(game.combo >= 5 ? `+10 x${game.combo}` : "+10", ally.x, ally.y - 20, COLORS.gold);
    showQuoteMessage();
    checkCollectObjective();
  }

  function addCrowdMember(source) {
    game.crowdCount += 1;
    if (game.crowd.length < 18) {
      game.crowd.push({
        x: source.x,
        y: source.y,
        bob: Math.random() * Math.PI * 2,
        walk: Math.random() * 5,
        dir: Math.random() > 0.5 ? 1 : -1,
        tint: game.crowdCount % 3
      });
    }
    if (game.crowdCount === 6) {
      showMsg("La reunión ya se ve desde lejos. La ciudad empieza a mirar.", 4.5, "event");
    }
  }

  function showQuoteMessage(prefixOverride = "") {
    const quote = nextPujolQuote();
    const prefix = prefixOverride || (game.combo >= 5 ? `Racha ${game.combo}` : "+10");
    showMsg(`${prefix} · ${quote.section}: ${quote.text}`, 6.4, "quote");
  }

  function nextPujolQuote() {
    if (!game.quoteDeck.length) {
      game.quoteDeck = shuffledQuotePool();
    }
    const quote = game.quoteDeck.pop();
    if (quote.text === game.lastQuoteText && game.quoteDeck.length) {
      game.quoteDeck.unshift(quote);
      return nextPujolQuote();
    }
    game.lastQuoteText = quote.text;
    return quote;
  }

  function shuffledQuotePool() {
    const deck = QUOTE_POOL.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function activatePowerUp(type, source = game.player) {
    SFX.powerUp();
    const power = POWERUPS[type];
    const duration = type === "flyer" && leafModeSummons() ? power.survivalDuration : power.duration;
    game.activePowerUp = { type, timer: duration };
    if (source) floatText(power.short, source.x, source.y - 22, power.color);
    if (type === "flyer") {
      if (leafModeSummons()) {
        const bonus = game.runMode === "survival" ? Math.min(2, game.survivalLevel) : Math.min(2, Math.floor(game.crowdCount / 5));
        const count = summonAllies(4 + bonus);
        game.allyRespawnTimer = 0;
        burst(game.player.x, game.player.y, COLORS.leafLight, 28);
        showMsg(`Llamamiento: ${count} compañeros se acercan a la plaza.`, 5.2, "power");
        return;
      }
      confuseCopsWithLeaf();
    }
    if (type === "mate") {
      const count = summonAllies(3);
      game.allyRespawnTimer = 0;
      burst(game.player.x, game.player.y, COLORS.safe, 20);
      showMsg(`El mate convoca: ${count} compañeros se acercan.`, 4.5, "power");
      return;
    }
    showMsg(power.message, 3.4, type === "flyer" ? "power" : "");
  }

  function allyCollectRadius() {
    const arch = ARCHETYPES[game.archetype] || ARCHETYPES.estudiante;
    const musicBonus = game.musicTimer > 0 ? 7 : 0;
    return (leafSummonsAllies() ? 28 : arch.collectRadius) + musicBonus;
  }

  function confuseCopsWithLeaf() {
    for (const cop of game.cops) {
      cop.alert = false;
      cop.alertTimer = 0;
      cop.path = [];
      cop.goalKey = "";
    }
    burst(game.player.x, game.player.y, COLORS.leafLight, 24);
  }

  function summonAllies(count) {
    let summoned = 0;
    for (let i = 0; i < count; i++) {
      if (spawnAlly({ preferPlaza: true, minPlayerDistance: 50, summoned: true })) {
        summoned += 1;
      }
    }
    return summoned;
  }

  function catchPlayer() {
    SFX.caught();
    game.lives -= 1;
    game.combo = 0;
    game.caughtCooldown = 2.2;
    game.flashTimer = 0.55;
    let scattered = 0;
    if (game.runMode === "convocatoria" && game.crowdCount > 0) {
      scattered = scatterCrowd();
    }
    game.player.hairLevel = Math.min(3, 3 - game.lives);
    burst(game.player.x, game.player.y, "#bfc0c0", 18);
    floatText("-pelo", game.player.x, game.player.y - 22, COLORS.danger);

    if (game.lives <= 0) {
      endGame("Te rasuran entero...");
      return;
    }

    const spawn = safeRespawnPoint();
    game.player.x = spawn.x;
    game.player.y = spawn.y;
    game.player.path = [];
    game.target = null;
    const scatterText = scattered ? ` Se dispersan ${scattered}.` : "";
    showMsg((game.lives === 2
      ? "Te cortaron el pelo. Te sueltan cerca del kiosco."
      : "Otra razzia. Una captura más y te rasuran entero.") + scatterText);
  }

  function scatterCrowd() {
    const lost = Math.min(game.crowdCount, Math.max(2, Math.ceil(game.crowdCount * 0.35)));
    game.crowdCount = Math.max(0, game.crowdCount - lost);
    game.crowd.splice(Math.max(0, game.crowd.length - lost), lost);
    burst(game.player.x, game.player.y, COLORS.flower, 18);
    showMsg(`La razzia dispersa a ${lost} compañeros.`, 4.2, "event");
    return lost;
  }

  function safeRespawnPoint() {
    if (game.runMode !== "survival") return tileCenter(MAP.playerSpawn.x, MAP.playerSpawn.y);
    const tile = randomOpenTile({ avoidDanger: true, minPlayerDistance: 0 });
    return tile ? tileCenter(tile.x, tile.y) : tileCenter(MAP.playerSpawn.x, MAP.playerSpawn.y);
  }

  function checkCollectObjective() {
    const cfg = currentConfig();
    if (cfg.objective.type === "collect" && game.collectedRound >= cfg.objective.target) {
      completeRound();
    }
    if (cfg.objective.type === "convocatoria" && game.crowdCount >= cfg.objective.target) {
      completeRound();
    }
  }

  function checkTimedObjective(cfg) {
    if (game.mode !== "playing") return;
    if (cfg.objective.type === "endless") return;
    if (cfg.objective.type === "collect" && game.roundTimer >= cfg.objective.timeLimit) {
      endGame("La razzia dispersó la reunión...");
    }
    if (cfg.objective.type === "convocatoria" && game.roundTimer >= cfg.objective.timeLimit) {
      endGame("La convocatoria quedó dispersa...");
    }
    if (cfg.objective.type === "survive" && game.roundTimer >= cfg.objective.duration) {
      completeRound();
    }
  }

  function completeRound() {
    if (game.mode !== "playing") return;
    if (game.runMode === "survival") return;
    game.score += 50;
    burst(game.player.x, game.player.y, COLORS.gold, 28);
    floatText("+50", game.player.x, game.player.y - 26, COLORS.gold);
    if (game.runMode === "convocatoria") {
      endGame("La plaza quedó tomada.", true);
      return;
    }
    if (game.round >= ROUND_CONFIGS.length - 1) {
      endGame("Sobreviviste la noche.", true);
      return;
    }
    const nextRound = game.round + 1;
    stopLoop();
    if (ROUND_INTERLUDES[game.round] && !prefersReducedMotion()) {
      showRoundInterlude(game.round, () => { game.mode = "story"; showStory(nextRound); });
    } else {
      game.mode = "story";
      showStory(nextRound);
    }
  }

  function endGame(title, victory = false) {
    game.mode = victory ? "victory" : "gameover";
    saveCurrentScore(victory);
    showEndOverlay(title, victory);
  }

  function spawnTemporaryCop() {
    const route = randomFrom(NPC_ROUTES.razzia);
    const cop = createCop(route, game.cops.length);
    cop.tempTimer = 20;
    cop.alert = true;
    cop.alertTimer = 1.2;
    game.cops.push(cop);
    burst(cop.x, cop.y, COLORS.danger, 14);
  }

  function spawnNpc(type, count = 1) {
    const routes = NPC_ROUTES[type];
    if (!routes) return 0;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const route = randomFrom(routes);
      const first = route[0];
      const pt = tileCenter(first.x, first.y);
      if (!isSpawnable(first.x, first.y, { avoidDanger: type !== "executive", minPlayerDistance: 45 })) continue;
      game.npcs.push({
        type,
        x: pt.x,
        y: pt.y,
        route,
        patrolIndex: 1 % route.length,
        path: [],
        goalKey: "",
        wait: i * 0.24,
        alert: false,
        alertTimer: 0,
        repathTimer: 0,
        walk: Math.random() * 5,
        facing: directionFromRoute(route),
        life: NPC_TYPES[type].life,
        bumpCooldown: 0,
        collected: false
      });
      spawned += 1;
    }
    return spawned;
  }

  function spawnAlly(options = {}) {
    const spawnOptions = {
      avoidDanger: true,
      minPlayerDistance: options.minPlayerDistance ?? 110
    };
    const tile = options.preferPlaza ? randomPlazaTile(spawnOptions) : randomOpenTile(spawnOptions);
    if (!tile) return false;
    const pt = tileCenter(tile.x, tile.y);
    game.allies.push({
      x: pt.x,
      y: pt.y,
      bob: Math.random() * Math.PI * 2,
      walk: Math.random() * 8,
      glow: options.summoned ? 2.8 : 0,
      summoned: Boolean(options.summoned),
      collected: false
    });
    return true;
  }

  function spawnPowerUp(forcedType) {
    const cfg = currentConfig();
    const type = forcedType || randomFrom(cfg.powerups);
    if (game.powerUps.some((p) => p.type === type)) return;
    const tile = randomOpenTile({ avoidDanger: false, minPlayerDistance: 80 });
    if (!tile) return;
    const pt = tileCenter(tile.x, tile.y);
    game.powerUps.push({
      x: pt.x,
      y: pt.y,
      type,
      bob: Math.random() * Math.PI * 2,
      collected: false
    });
  }

  function randomOpenTile(options = {}) {
    const zones = options.zones || spawnZonesForMode(options);
    for (let attempt = 0; attempt < 160; attempt++) {
      const zone = randomFrom(zones);
      const tx = zone.x0 + Math.floor(Math.random() * (zone.x1 - zone.x0 + 1));
      const ty = zone.y0 + Math.floor(Math.random() * (zone.y1 - zone.y0 + 1));
      if (!isSpawnable(tx, ty, options)) continue;
      return { x: tx, y: ty };
    }
    return null;
  }

  function randomPlazaTile(options = {}) {
    const zones = MAP.spawnZones.plaza;
    for (let attempt = 0; attempt < 100; attempt++) {
      const zone = randomFrom(zones);
      const tx = zone.x0 + Math.floor(Math.random() * (zone.x1 - zone.x0 + 1));
      const ty = zone.y0 + Math.floor(Math.random() * (zone.y1 - zone.y0 + 1));
      if (!isSpawnable(tx, ty, options)) continue;
      return { x: tx, y: ty };
    }
    return randomOpenTile(options);
  }

  function spawnZonesForMode(options = {}) {
    if (options.fullWorld) return [{ x0: 1, x1: COLS - 2, y0: 1, y1: ROWS - 2 }];
    if (game.runMode === "survival" || game.runMode === "convocatoria" || options.preferWide) {
      return MAP.spawnZones.wide;
    }
    if (game.runMode === "story") {
      const cfg = ROUND_CONFIGS[game.round];
      const d = cfg && cfg.district ? DISTRICTS[cfg.district] : null;
      if (d) {
        const cx = d.spawnTile.x, cy = d.spawnTile.y;
        return [{ x0: Math.max(1, cx - 14), y0: Math.max(1, cy - 9), x1: Math.min(COLS - 2, cx + 14), y1: Math.min(ROWS - 2, cy + 9) }];
      }
    }
    if (game.round >= 2) return MAP.spawnZones.storyLate;
    if (game.round >= 1) return MAP.spawnZones.storyMid;
    return MAP.spawnZones.storyEarly;
  }

  function isSpawnable(tx, ty, options) {
    if (isBlocked(tx, ty)) return false;
    const pt = tileCenter(tx, ty);
    if (rectContains(MAP.safeZone, pt)) return false;
    if (options.avoidDanger && rectContains(MAP.dangerZone, pt)) return false;
    if (game.player && dist(pt, game.player) < (options.minPlayerDistance || 0)) return false;
    if (game.cops.some((cop) => dist(pt, cop) < 60)) return false;
    return true;
  }

  function handlePointer(e) {
    if (game.mode !== "playing") return;
    if (e.target !== canvas) return;
    if (game.controlMode === "dpad" && e.pointerType === "touch") return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * sx + game.camera.x;
    const py = (e.clientY - rect.top) * sy + game.camera.y;
    const tile = nearestOpenTile(pixelToTile(px, py));
    if (!tile) {
      showMsg("Ese lugar esta bloqueado.");
      return;
    }
    const start = currentTile(game.player);
    const path = bfs(start.x, start.y, tile.x, tile.y);
    if (path && path.length > 1) {
      game.player.path = path.slice(1);
      game.target = tileCenter(tile.x, tile.y);
    } else if (path && path.length === 1) {
      game.player.path = [];
      game.target = null;
    } else {
      showMsg("No hay camino por ahi.");
    }
  }

  function bfs(sx, sy, gx, gy) {
    if (isBlocked(gx, gy)) return null;
    if (sx === gx && sy === gy) return [{ x: sx, y: sy }];

    const queue = [{ x: sx, y: sy }];
    const visited = new Set([tileKey(sx, sy)]);
    const parents = new Map();
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    while (queue.length) {
      const cur = queue.shift();
      for (const dir of dirs) {
        const nx = cur.x + dir.x;
        const ny = cur.y + dir.y;
        const key = tileKey(nx, ny);
        if (visited.has(key) || isBlocked(nx, ny)) continue;
        parents.set(key, tileKey(cur.x, cur.y));
        if (nx === gx && ny === gy) return buildPath(parents, sx, sy, gx, gy);
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function buildPath(parents, sx, sy, gx, gy) {
    const path = [{ x: gx, y: gy }];
    let key = tileKey(gx, gy);
    while (key !== tileKey(sx, sy)) {
      key = parents.get(key);
      if (!key) return null;
      const [x, y] = key.split(",").map(Number);
      path.push({ x, y });
    }
    return path.reverse();
  }

  function nearestOpenTile(tile) {
    if (!isBlocked(tile.x, tile.y)) return tile;
    let best = null;
    let bestDist = Infinity;
    for (let radius = 1; radius <= 4; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const tx = tile.x + dx;
          const ty = tile.y + dy;
          if (isBlocked(tx, ty)) continue;
          const score = Math.abs(dx) + Math.abs(dy);
          if (score < bestDist) {
            best = { x: tx, y: ty };
            bestDist = score;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  function draw() {
    updateCamera();
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-game.camera.x, -game.camera.y);
    drawMap();
    drawDetectionRings();
    drawEntities();
    drawEffects();
    ctx.restore();
    drawViewportEffects();
    drawWorldFloaters();
    drawOffscreenIndicators();
    drawMiniMap();
  }

  function drawMap() {
    const bounds = visibleTileBounds(2);
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(game.camera.x - TILE, game.camera.y - TILE, W + TILE * 2, H + TILE * 2);

    for (let ty = bounds.y0; ty <= bounds.y1; ty++) {
      for (let tx = bounds.x0; tx <= bounds.x1; tx++) {
        drawGrassTile(tx, ty);
        if (isPathTile(tx, ty)) drawPathTile(tx, ty);
      }
    }

    drawPathEdges();
    drawGroundDetails();
    drawSafeZone();
    drawDangerZone();
    drawFountain();
    drawBenches();
    drawTrees();
    drawStation();
    drawDistrictExtras();
    drawMapProps();
    drawSigns();
    drawPosters();
    drawEasterEggs();
    drawStreetLamps();
  }

  function visibleTileBounds(pad = 1) {
    return {
      x0: clamp(Math.floor(game.camera.x / TILE) - pad, 0, COLS - 1),
      y0: clamp(Math.floor(game.camera.y / TILE) - pad, 0, ROWS - 1),
      x1: clamp(Math.ceil((game.camera.x + W) / TILE) + pad, 0, COLS - 1),
      y1: clamp(Math.ceil((game.camera.y + H) / TILE) + pad, 0, ROWS - 1)
    };
  }

  function isPointVisible(x, y, pad = 64) {
    return x >= game.camera.x - pad && x <= game.camera.x + W + pad
      && y >= game.camera.y - pad && y <= game.camera.y + H + pad;
  }

  function isRectVisible(x, y, w, h, pad = 64) {
    return x + w >= game.camera.x - pad && x <= game.camera.x + W + pad
      && y + h >= game.camera.y - pad && y <= game.camera.y + H + pad;
  }

  function drawGrassTile(tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    if ((tx * 7 + ty * 11) % 9 === 0) {
      ctx.fillStyle = COLORS.grassLight;
      ctx.fillRect(x + 3, y + 4, 4, 2);
      ctx.fillRect(x + 11, y + 14, 3, 2);
    }
    if ((tx * 5 + ty * 3) % 11 === 0) {
      ctx.fillStyle = COLORS.grassDark;
      ctx.fillRect(x + 13, y + 5, 4, 2);
    }
    if ((tx * 13 + ty * 17) % 29 === 0) {
      ctx.fillStyle = (tx + ty) % 2 ? COLORS.flower : COLORS.gold;
      ctx.fillRect(x + 8, y + 8, 2, 2);
      ctx.fillStyle = COLORS.leafDark;
      ctx.fillRect(x + 8, y + 10, 2, 2);
    }
  }

  function drawPathTile(tx, ty) {
    const x = tx * TILE;
    const y = ty * TILE;
    if (drawArtRegion("tiles", CITY_REGIONS.path, x, y, TILE, TILE)) {
      return;
    }
    ctx.fillStyle = (tx + ty) % 2 ? COLORS.path : COLORS.pathLight;
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = COLORS.pathDark;
    ctx.fillRect(x, y + 19, TILE, 1);
    ctx.fillRect(x + 19, y, 1, TILE);
    if ((tx + ty) % 3 === 0) ctx.fillRect(x + 4, y + 8, 7, 1);
  }

  function isPathTile(tx, ty) {
    if (PATH_RECTS.some((rect) => tx >= rect.x0 && tx <= rect.x1 && ty >= rect.y0 && ty <= rect.y1)) {
      return true;
    }
    return PATH_DIAGS.some((diag) => {
      if (tx < diag.x0 || tx > diag.x1 || ty < diag.y0 || ty > diag.y1) return false;
      return Math.abs(ty - (diag.m * tx + diag.b)) < 0.75;
    });
  }

  function drawPathEdges() {
    const bounds = visibleTileBounds(2);
    ctx.fillStyle = "rgba(70, 57, 44, 0.28)";
    for (let ty = bounds.y0; ty <= bounds.y1; ty++) {
      for (let tx = bounds.x0; tx <= bounds.x1; tx++) {
        if (!isPathTile(tx, ty)) continue;
        const x = tx * TILE;
        const y = ty * TILE;
        if (!isPathTile(tx, ty - 1)) ctx.fillRect(x, y, TILE, 2);
        if (!isPathTile(tx, ty + 1)) ctx.fillRect(x, y + TILE - 2, TILE, 2);
        if (!isPathTile(tx - 1, ty)) ctx.fillRect(x, y, 2, TILE);
        if (!isPathTile(tx + 1, ty)) ctx.fillRect(x + TILE - 2, y, 2, TILE);
      }
    }
  }

  function drawGroundDetails() {
    drawFlowerBeds();
    drawStreetPaint();
    drawLooseFlyers();
  }

  function drawFlowerBeds() {
    for (const bed of MAP.flowerBeds) {
      if (!isRectVisible(bed.x, bed.y, bed.w, bed.h, 32)) continue;
      ctx.fillStyle = "rgba(26,80,16,0.45)";
      ctx.fillRect(bed.x, bed.y, bed.w, bed.h);
      for (let x = bed.x + 4; x < bed.x + bed.w - 2; x += 8) {
        const y = bed.y + 4 + ((x + bed.y) % 6);
        ctx.fillStyle = (x / 8) % 2 ? COLORS.flower : COLORS.gold;
        ctx.fillRect(x, y, 3, 3);
        ctx.fillStyle = COLORS.leafLight;
        ctx.fillRect(x + 2, y + 3, 2, 2);
      }
    }
  }

  function drawStreetPaint() {
    ctx.fillStyle = "rgba(245,237,216,0.48)";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(578 + i * 12, 250, 7, 2);
      ctx.fillRect(384, 454 + i * 12, 2, 7);
    }
    ctx.fillStyle = "rgba(36,28,25,0.26)";
    ctx.fillRect(500, 258, 34, 2);
    ctx.fillRect(504, 282, 26, 2);
    ctx.fillRect(178, 302, 30, 2);
  }

  function drawLooseFlyers() {
    for (const paper of MAP.flyerPapers) {
      if (!isPointVisible(paper.x, paper.y, 30)) continue;
      ctx.fillStyle = COLORS[paper.tint] || COLORS.paper;
      ctx.fillRect(paper.x, paper.y, 8, 5);
      ctx.fillStyle = "rgba(36,28,25,0.32)";
      ctx.fillRect(paper.x + 2, paper.y + 2, 4, 1);
    }
  }

  function drawSafeZone() {
    const z = MAP.safeZone;
    ctx.fillStyle = "rgba(75,143,117,0.40)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = "rgba(245,237,216,0.16)";
    for (let x = z.x + 10; x < z.x + z.w - 8; x += 18) {
      ctx.fillRect(x, z.y + z.h - 10, 9, 2);
    }
    drawPixelKiosk(24, 116);
    ctx.fillStyle = COLORS.white;
    ctx.font = "8px monospace";
    ctx.fillText("KIOSCO", 42, 166);
    if (isPlayerProtected()) {
      ctx.strokeStyle = COLORS.particle;
      ctx.lineWidth = 2;
      ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);
    }
  }

  function drawDangerZone() {
    const z = MAP.dangerZone;
    ctx.fillStyle = "rgba(198,69,50,0.20)";
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = "rgba(198,69,50,0.30)";
    ctx.fillRect(z.x + 4, z.y + z.h - 8, z.w - 8, 3);
    ctx.fillStyle = COLORS.chalk;
    ctx.font = "7px monospace";
    ctx.fillText("ZONA", z.x + 8, z.y + z.h - 14);
  }

  function drawStation() {
    drawPixelBuilding(438, 2, 102, 82, {
      roof: "#463f3d",
      wall: COLORS.station,
      trim: COLORS.stationDark,
      door: COLORS.black,
      awning: COLORS.gold
    });
    drawVehicle("blueCar", 0, 48, 48, 48, 444, 68, 38, 38);
    drawPoliceBarrier(494, 74);
    ctx.fillStyle = COLORS.black;
    ctx.font = "7px monospace";
    ctx.fillText("COMISARIA", 478, 26);
  }

  function drawDistrictExtras() {
    const buildings = [
      [650, 70, 90, 86, { roof: "#8f4535", wall: "#d4b483", trim: "#7a5230", door: "#4d3023", awning: "#e8a030" }],
      [680, 420, 118, 84, { roof: "#4e4744", wall: "#9a9084", trim: "#6c665f", door: "#241c19", awning: "#4a7ab8" }],
      [870, 88, 128, 92, { roof: "#394b7a", wall: "#c8b878", trim: "#6c665f", door: "#2b2638", awning: COLORS.posterBlue }],
      [950, 392, 138, 82, { roof: "#2b2638", wall: "#6a2845", trim: "#3a2638", door: "#17111d", awning: COLORS.posterPurple }],
      [438, 690, 124, 78, { roof: "#8f4535", wall: "#d4b483", trim: "#7a5230", door: "#3a2638", awning: COLORS.posterPink }],
      [1010, 634, 132, 72, { roof: "#4e4744", wall: "#b8aa77", trim: "#6c665f", door: "#241c19", awning: COLORS.gold }],
      [1240, 250, 132, 86, { roof: "#6a2845", wall: "#d4b483", trim: "#7a5230", door: "#241c19", awning: COLORS.posterPink }],
      [1360, 150, 128, 86, { roof: "#394b7a", wall: "#c8b878", trim: "#6c665f", door: "#2b2638", awning: COLORS.gold }],
      [1168, 820, 128, 82, { roof: "#4e4744", wall: "#9a9084", trim: "#6c665f", door: "#241c19", awning: COLORS.posterPurple }],
      [1418, 494, 126, 78, { roof: "#8f4535", wall: "#b8aa77", trim: "#6c665f", door: "#17111d", awning: COLORS.danger }],
      [270, 890, 130, 78, { roof: "#2e6555", wall: "#c8b878", trim: "#7a5230", door: "#3a2638", awning: COLORS.leafLight }],
      [1312, 914, 134, 76, { roof: "#4e4744", wall: "#d4b483", trim: "#7a5230", door: "#241c19", awning: COLORS.posterBlue }]
    ];
    for (const [x, y, w, h, palette] of buildings) {
      if (isRectVisible(x, y, w, h, 96)) drawPixelBuilding(x, y, w, h, palette);
    }

    const newsstands = [[602, 176], [238, 500], [830, 266], [1370, 214], [1188, 864]];
    for (const [x, y] of newsstands) {
      if (isRectVisible(x, y, 54, 46, 80)) drawPixelNewsstand(x, y);
    }

    const awnings = [
      [650, 102, 90, COLORS.posterPink], [680, 452, 118, COLORS.posterBlue],
      [870, 120, 128, COLORS.posterBlue], [950, 424, 138, COLORS.posterPurple],
      [438, 722, 124, COLORS.posterPink], [1240, 282, 132, COLORS.posterPink],
      [1360, 182, 128, COLORS.gold], [1168, 852, 128, COLORS.posterPurple],
      [1418, 526, 126, COLORS.danger], [270, 922, 130, COLORS.leafLight],
      [1312, 946, 134, COLORS.posterBlue]
    ];
    for (const [x, y, w, color] of awnings) {
      if (isRectVisible(x, y, w, 18, 96)) drawAwning(x, y, w, color);
    }

    const vehicles = [
      ["redCar", 0, 48, 48, 48, 598, 214, 38, 38],
      ["blueCar", 0, 48, 48, 48, 768, 360, 38, 38],
      ["redCar", 0, 96, 48, 48, 710, 206, 34, 34],
      ["blueCar", 0, 144, 48, 48, 78, 520, 34, 34],
      ["redCar", 0, 48, 48, 48, 928, 252, 36, 36],
      ["blueCar", 0, 96, 48, 48, 1070, 530, 36, 36],
      ["redCar", 0, 144, 48, 48, 622, 690, 34, 34],
      ["blueCar", 0, 48, 48, 48, 1240, 396, 38, 38],
      ["redCar", 0, 96, 48, 48, 1450, 612, 36, 36],
      ["blueCar", 0, 144, 48, 48, 1160, 842, 34, 34],
      ["redCar", 0, 48, 48, 48, 310, 1010, 36, 36],
      ["blueCar", 0, 96, 48, 48, 1320, 1010, 36, 36]
    ];
    for (const vehicle of vehicles) {
      if (isRectVisible(vehicle[5], vehicle[6], vehicle[7], vehicle[8], 80)) drawVehicle(...vehicle);
    }
  }

  function drawMapProps() {
    for (const prop of MAP.props) {
      if (!isPointVisible(prop.x, prop.y, 48)) continue;
      ctx.save();
      ctx.translate(Math.round(prop.x), Math.round(prop.y));
      drawSpriteShadow(0, 12, 9, 3);
      if (prop.kind === "boutique") {
        ctx.fillStyle = COLORS.posterPink;
        ctx.fillRect(-12, -12, 24, 18);
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(-9, -9, 6, 7);
        ctx.fillRect(3, -9, 6, 7);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(-14, -15, 28, 4);
      } else if (prop.kind === "shoe") {
        ctx.fillStyle = COLORS.flower;
        ctx.fillRect(-10, -4, 16, 6);
        ctx.fillRect(2, -8, 8, 4);
        ctx.fillStyle = COLORS.black;
        ctx.fillRect(-8, 2, 20, 3);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(8, -1, 4, 7);
      } else if (prop.kind === "camera") {
        ctx.fillStyle = COLORS.black;
        ctx.fillRect(-11, -8, 22, 14);
        ctx.fillStyle = COLORS.posterBlue;
        ctx.fillRect(-7, -5, 14, 8);
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(5, -11, 5, 3);
        ctx.fillRect(-2, -3, 4, 4);
      } else if (prop.kind === "coffee") {
        ctx.fillStyle = COLORS.wood;
        ctx.fillRect(-12, 2, 24, 5);
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(-5, -8, 10, 9);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(5, -5, 5, 4);
        ctx.fillStyle = "rgba(245,237,216,0.72)";
        ctx.fillRect(-2, -13, 2, 4);
      } else if (prop.kind === "guitar") {
        ctx.fillStyle = COLORS.wood;
        ctx.fillRect(2, -16, 3, 22);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(-11, -4, 15, 12);
        ctx.fillRect(-7, -10, 10, 10);
        ctx.fillStyle = COLORS.black;
        ctx.fillRect(-3, -5, 4, 4);
      } else if (prop.kind === "scissors") {
        ctx.strokeStyle = COLORS.paper;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9, -9);
        ctx.lineTo(9, 7);
        ctx.moveTo(9, -9);
        ctx.lineTo(-9, 7);
        ctx.stroke();
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(-11, -11, 5, 5);
        ctx.fillRect(6, -11, 5, 5);
      } else if (prop.kind === "beach") {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(-13, 1, 26, 6);
        ctx.fillStyle = COLORS.waterLight;
        ctx.fillRect(-13, 7, 26, 4);
        ctx.fillStyle = COLORS.flower;
        ctx.fillRect(-3, -13, 6, 14);
        ctx.fillStyle = COLORS.paper;
        ctx.fillRect(3, -11, 9, 6);
      } else if (prop.kind === "books") {
        ctx.fillStyle = COLORS.wood;
        ctx.fillRect(-13, 4, 26, 5);
        ctx.fillStyle = COLORS.posterBlue;
        ctx.fillRect(-10, -8, 6, 12);
        ctx.fillStyle = COLORS.posterPink;
        ctx.fillRect(-3, -10, 6, 14);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(4, -7, 6, 11);
      }
      ctx.restore();
    }
  }

  function drawFountain() {
    const t = performance.now() / 350;
    ctx.fillStyle = "rgba(23,17,29,0.22)";
    ctx.fillRect(236, 218, 68, 6);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(240, 160, 60, 60);
    ctx.fillStyle = "#6f6961";
    ctx.fillRect(246, 166, 48, 48);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(250, 170, 40, 40);
    ctx.fillStyle = COLORS.waterLight;
    ctx.fillRect(258 + Math.sin(t) * 3, 178, 10, 4);
    ctx.fillRect(272, 194 + Math.cos(t) * 3, 12, 4);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(268, 184, 4, 12);
    ctx.fillRect(264, 188, 12, 4);
    ctx.fillStyle = "rgba(245,237,216,0.75)";
    ctx.fillRect(260 + Math.sin(t) * 12, 170 + Math.cos(t) * 4, 3, 3);
    ctx.fillRect(282 + Math.cos(t) * 6, 204 + Math.sin(t) * 3, 2, 2);
  }

  function drawBenches() {
    for (const b of MAP.benches) {
      const x = b.x * TILE;
      const y = b.y * TILE;
      if (!isRectVisible(x, y, b.w * TILE, b.h * TILE, 36)) continue;
      ctx.fillStyle = "rgba(23,17,29,0.22)";
      ctx.fillRect(x + 2, y + 17, b.w * TILE - 4, 4);
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(x, y + 5, b.w * TILE, 5);
      ctx.fillRect(x, y + 12, b.w * TILE, 4);
      ctx.fillStyle = COLORS.bench;
      ctx.fillRect(x + 3, y + 2, 5, 16);
      ctx.fillRect(x + b.w * TILE - 8, y + 2, 5, 16);
    }
  }

  function drawTrees() {
    for (const t of MAP.trees) {
      const x = t.x * TILE;
      const y = t.y * TILE;
      if (!isRectVisible(x, y, TILE, TILE, 48)) continue;
      ctx.fillStyle = "rgba(23,17,29,0.20)";
      ctx.fillRect(x + 2, y + 17, 18, 5);
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(x + 7, y + 10, 6, 10);
      ctx.fillStyle = COLORS.tree;
      ctx.fillRect(x + 2, y + 1, 16, 16);
      ctx.fillStyle = COLORS.treeDark;
      ctx.fillRect(x, y + 5, 20, 8);
      ctx.fillRect(x + 5, y, 10, 20);
      ctx.fillStyle = COLORS.grassLight;
      ctx.fillRect(x + 5, y + 4, 4, 3);
      if ((t.x + t.y) % 3 === 0) {
        ctx.fillStyle = "#355f22";
        ctx.fillRect(x + 13, y + 7, 3, 3);
      }
    }
  }

  function drawSigns() {
    for (const sign of MAP.signs) {
      if (!isPointVisible(sign.x, sign.y, 72)) continue;
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(sign.x, sign.y + 14, 4, 18);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sign.x - 20, sign.y, 74, 14);
      ctx.fillStyle = COLORS.black;
      ctx.font = "8px monospace";
      ctx.fillText(sign.text, sign.x - 16, sign.y + 10);
    }
  }

  function drawPosters() {
    for (const poster of MAP.posters) {
      if (!isPointVisible(poster.x, poster.y, 48)) continue;
      const color = COLORS[poster.color] || poster.color || COLORS.posterBlue;
      ctx.fillStyle = "rgba(23,17,29,0.28)";
      ctx.fillRect(poster.x + 2, poster.y + 2, 26, 14);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(poster.x - 1, poster.y - 1, 26, 14);
      ctx.fillStyle = color;
      ctx.fillRect(poster.x, poster.y, 24, 12);
      ctx.fillStyle = COLORS.paper;
      ctx.font = "7px monospace";
      ctx.fillText(poster.text, poster.x + 3, poster.y + 9);
    }
  }

  function drawEasterEggs() {
    for (const egg of MAP.easterEggs) {
      if (!isPointVisible(egg.x, egg.y, 56)) continue;
      const discovered = game.discoveredEggs && game.discoveredEggs.has(egg.id);
      drawEasterEggMarker(egg, discovered);
    }
  }

  function drawEasterEggMarker(egg, discovered) {
    const pulse = 1 + Math.sin(performance.now() / 240 + egg.x * 0.03) * 0.25;
    const color = discovered ? COLORS.neon : COLORS.paper;
    ctx.save();
    ctx.globalAlpha = discovered ? 0.85 : 0.55 + pulse * 0.2;
    ctx.fillStyle = "rgba(23,17,29,0.62)";
    ctx.fillRect(egg.x - 9, egg.y - 13, 18, 18);
    ctx.fillStyle = color;
    if (egg.kind === "record") {
      ctx.beginPath();
      ctx.arc(egg.x, egg.y - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.record;
      ctx.beginPath();
      ctx.arc(egg.x, egg.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (egg.kind === "door") {
      ctx.fillRect(egg.x - 7, egg.y - 12, 14, 18);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(egg.x + 3, egg.y - 4, 2, 2);
    } else if (egg.kind === "flower") {
      ctx.fillStyle = COLORS.flower;
      ctx.fillRect(egg.x - 5, egg.y - 8, 10, 10);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(egg.x - 2, egg.y - 5, 4, 4);
    } else if (egg.kind === "shoe") {
      ctx.fillStyle = COLORS.flower;
      ctx.fillRect(egg.x - 7, egg.y - 5, 12, 5);
      ctx.fillRect(egg.x + 1, egg.y - 9, 6, 4);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(egg.x - 7, egg.y, 16, 2);
    } else if (egg.kind === "camera") {
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(egg.x - 8, egg.y - 10, 16, 11);
      ctx.fillStyle = COLORS.posterBlue;
      ctx.fillRect(egg.x - 5, egg.y - 7, 10, 6);
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(egg.x - 2, egg.y - 5, 4, 4);
    } else if (egg.kind === "coffee") {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(egg.x - 5, egg.y - 9, 10, 9);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(egg.x + 4, egg.y - 7, 4, 4);
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(egg.x - 8, egg.y + 1, 16, 2);
    } else if (egg.kind === "guitar") {
      ctx.fillStyle = COLORS.wood;
      ctx.fillRect(egg.x + 2, egg.y - 13, 3, 16);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(egg.x - 8, egg.y - 6, 10, 10);
      ctx.fillRect(egg.x - 5, egg.y - 10, 7, 7);
    } else if (egg.kind === "scissors") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(egg.x - 7, egg.y - 10);
      ctx.lineTo(egg.x + 7, egg.y + 2);
      ctx.moveTo(egg.x + 7, egg.y - 10);
      ctx.lineTo(egg.x - 7, egg.y + 2);
      ctx.stroke();
    } else if (egg.kind === "beach") {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(egg.x - 8, egg.y - 3, 16, 5);
      ctx.fillStyle = COLORS.waterLight;
      ctx.fillRect(egg.x - 8, egg.y + 2, 16, 3);
      ctx.fillStyle = COLORS.flower;
      ctx.fillRect(egg.x - 2, egg.y - 12, 4, 9);
    } else if (egg.kind === "books") {
      ctx.fillStyle = COLORS.posterBlue;
      ctx.fillRect(egg.x - 7, egg.y - 10, 5, 12);
      ctx.fillStyle = COLORS.posterPink;
      ctx.fillRect(egg.x - 1, egg.y - 12, 5, 14);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(egg.x + 5, egg.y - 9, 5, 11);
    } else if (egg.kind === "boutique") {
      ctx.fillStyle = COLORS.posterPink;
      ctx.fillRect(egg.x - 8, egg.y - 11, 16, 13);
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(egg.x - 6, egg.y - 8, 4, 5);
      ctx.fillRect(egg.x + 2, egg.y - 8, 4, 5);
    } else {
      ctx.fillRect(egg.x - 8, egg.y - 10, 16, 12);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(egg.x - 5, egg.y - 6, 10, 1);
      ctx.fillRect(egg.x - 5, egg.y - 2, 7, 1);
    }
    if (!discovered) {
      ctx.fillStyle = COLORS.black;
      ctx.font = "bold 8px monospace";
      ctx.fillText("?", egg.x - 3, egg.y - 1);
    }
    ctx.restore();
  }

  function drawStreetLamps() {
    for (const lamp of MAP.lamps) {
      if (!isPointVisible(lamp.x, lamp.y, 72)) continue;
      const lit = game.runMode === "survival" || game.round >= 1;
      if (lit) {
        ctx.save();
        ctx.globalAlpha = game.runMode === "survival" ? 0.18 : 0.10;
        ctx.fillStyle = COLORS.lampGlow;
        ctx.beginPath();
        ctx.arc(lamp.x, lamp.y + 4, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(23,17,29,0.24)";
      ctx.fillRect(lamp.x - 5, lamp.y + 24, 14, 4);
      ctx.fillStyle = COLORS.lamp;
      ctx.fillRect(lamp.x, lamp.y + 2, 4, 26);
      ctx.fillRect(lamp.x - 5, lamp.y, 14, 4);
      ctx.fillStyle = lit ? COLORS.lampGlow : COLORS.paper;
      ctx.fillRect(lamp.x - 3, lamp.y + 4, 10, 7);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(lamp.x - 5, lamp.y + 10, 14, 2);
    }
  }

  function drawPoliceBarrier(x, y) {
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(x, y, 42, 4);
    ctx.fillStyle = COLORS.paper;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 2 + i * 10, y, 5, 4);
    }
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(x + 4, y - 8, 5, 8);
    ctx.fillRect(x + 32, y - 8, 5, 8);
  }

  function drawAwning(x, y, w, color) {
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(x + 12, y, w - 24, 3);
    for (let i = 0; i < w - 30; i += 10) {
      ctx.fillStyle = (i / 10) % 2 ? COLORS.paper : color;
      ctx.fillRect(x + 15 + i, y + 3, 10, 8);
    }
  }

  function drawPixelKiosk(x, y) {
    ctx.fillStyle = COLORS.safeDark;
    ctx.fillRect(x, y + 8, 92, 10);
    ctx.fillStyle = "#315c54";
    ctx.fillRect(x + 6, y + 18, 80, 38);
    ctx.fillStyle = COLORS.safe;
    ctx.fillRect(x + 10, y + 22, 72, 28);
    ctx.fillStyle = COLORS.paper;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 14 + i * 16, y + 26, 10, 16);
      ctx.fillStyle = i % 2 ? COLORS.gold : COLORS.danger;
      ctx.fillRect(x + 14 + i * 16, y + 26, 10, 3);
      ctx.fillStyle = COLORS.paper;
    }
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(x + 72, y + 34, 8, 16);
  }

  function drawPixelNewsstand(x, y) {
    ctx.fillStyle = "#2e6555";
    ctx.fillRect(x, y + 8, 54, 8);
    ctx.fillStyle = COLORS.safe;
    ctx.fillRect(x + 4, y + 16, 46, 30);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(x + 9, y + 21, 8, 14);
    ctx.fillRect(x + 22, y + 21, 8, 14);
    ctx.fillRect(x + 35, y + 21, 8, 14);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 9, y + 21, 8, 3);
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(x + 22, y + 21, 8, 3);
  }

  function drawPixelBuilding(x, y, w, h, palette) {
    ctx.fillStyle = palette.roof;
    ctx.fillRect(x + 4, y, w - 8, 14);
    ctx.fillRect(x, y + 10, w, 8);
    ctx.fillStyle = palette.wall;
    ctx.fillRect(x + 6, y + 18, w - 12, h - 18);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(x + 6, y + h - 8, w - 12, 8);
    ctx.fillStyle = palette.awning;
    ctx.fillRect(x + 16, y + 26, w - 32, 9);
    ctx.fillStyle = "#cfe2ea";
    for (let wx = x + 18; wx < x + w - 22; wx += 24) {
      ctx.fillRect(wx, y + 42, 12, 14);
      ctx.fillStyle = "#7cc6de";
      ctx.fillRect(wx + 2, y + 44, 8, 4);
      ctx.fillStyle = "#cfe2ea";
    }
    ctx.fillStyle = palette.door;
    ctx.fillRect(x + Math.floor(w / 2) - 7, y + h - 34, 14, 26);
  }

  function drawEntities() {
    const sorted = [
      ...game.powerUps.map((entity) => ({ type: "power", entity })),
      ...game.allies.map((entity) => ({ type: "ally", entity })),
      ...game.crowd.map((entity) => ({ type: "crowd", entity })),
      ...game.npcs.map((entity) => ({ type: "npc", entity })),
      ...game.cops.map((entity) => ({ type: "cop", entity })),
      game.player ? { type: "player", entity: game.player } : null
    ].filter(Boolean).sort((a, b) => a.entity.y - b.entity.y);

    for (const item of sorted) {
      if (item.type === "power") drawPowerUp(item.entity);
      if (item.type === "ally") drawAlly(item.entity);
      if (item.type === "crowd") drawCrowdMember(item.entity);
      if (item.type === "npc") drawNpc(item.entity);
      if (item.type === "cop") drawCop(item.entity);
      if (item.type === "player") drawPlayer(item.entity);
    }

    if (game.target) {
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(game.target.x - 7, game.target.y - 7, 14, 14);
    }
  }

  function drawDetectionRings() {
    if (!game.player || !game.cops.length || activePower("press")) return;
    const cfg = currentConfig();
    const inDanger = rectContains(MAP.dangerZone, game.player);
    const confused = leafConfusesPolice();
    for (const cop of game.cops) {
      const radius = detectionRadius(cfg, inDanger);
      const nearPlayer = dist(cop, game.player) < radius * 1.12;
      if (!cop.alert && !nearPlayer && !confused) continue;
      ctx.save();
      ctx.globalAlpha = cop.alert ? 0.2 : 0.12;
      ctx.fillStyle = confused ? COLORS.leaf : (cop.alert ? COLORS.danger : COLORS.gold);
      ctx.beginPath();
      ctx.arc(cop.x, cop.y - 6, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = cop.alert ? 0.42 : 0.26;
      ctx.strokeStyle = confused ? COLORS.leafLight : (cop.alert ? COLORS.danger : COLORS.gold);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPlayer(player) {
    drawSpriteShadow(player.x, player.y + 10, 13, 4);
    const frame = spriteFrame(player.walk, SPRITES.player.length);
    const box = drawPixelSprite(SPRITES.player[frame], playerPalette(), player.x, player.y + 13, 2, player.dir < 0);
    drawHair(box, player.hairLevel);
    ctx.fillStyle = COLORS.player2;
    ctx.fillRect(Math.round(player.x - 8), Math.round(player.y - 1), 16, 3);
  }

  function drawHair(box, hairLevel) {
    if (hairLevel >= 3) return;
    ctx.fillStyle = COLORS.hair[hairLevel];
    if (hairLevel === 0) {
      ctx.fillRect(box.x + 3 * box.scale, box.y - box.scale, 6 * box.scale, 2 * box.scale);
      ctx.fillRect(box.x + 2 * box.scale, box.y + box.scale, box.scale, 5 * box.scale);
      ctx.fillRect(box.x + 9 * box.scale, box.y + box.scale, box.scale, 5 * box.scale);
    } else if (hairLevel === 1) {
      ctx.fillRect(box.x + 3 * box.scale, box.y - box.scale, 6 * box.scale, 2 * box.scale);
    } else {
      ctx.fillRect(box.x + 4 * box.scale, box.y, 4 * box.scale, box.scale);
    }
  }

  function drawCop(cop) {
    drawSpriteShadow(cop.x, cop.y + 10, 13, 4);
    const frame = spriteFrame(cop.walk, SPRITES.cop.length);
    drawPixelSprite(SPRITES.cop[frame], copPalette(), cop.x, cop.y + 12, 2, false);
    if (cop.alert) {
      ctx.fillStyle = COLORS.danger;
      ctx.font = "bold 13px monospace";
      ctx.fillText("!", cop.x - 4, cop.y - 20);
    }
    if (activePower("press")) {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(cop.x - 11, cop.y - 24, 22, 8);
    }
  }

  function drawAlly(ally) {
    const frame = spriteFrame(ally.walk, SPRITES.ally.length);
    const y = ally.y + 12 + Math.sin(ally.bob) * 2;
    drawSpriteShadow(ally.x, ally.y + 10, 12, 4);
    if (ally.glow > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, ally.glow / 2.8);
      ctx.strokeStyle = COLORS.leafLight;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(ally.x - 12), Math.round(ally.y - 18), 24, 24);
      ctx.restore();
    }
    drawPixelSprite(SPRITES.ally[frame], allyPalette(), ally.x, y, 2, false);
  }

  function drawCrowdMember(member) {
    const frame = spriteFrame(member.walk, SPRITES.ally.length);
    const y = member.y + 12 + Math.sin(member.bob) * 1.5;
    drawSpriteShadow(member.x, member.y + 10, 11, 4);
    drawPixelSprite(SPRITES.ally[frame], crowdPalette(member.tint), member.x, y, 2, member.dir < 0);
  }

  function drawNpc(npc) {
    const frames = SPRITES.npc[npc.type];
    const frame = spriteFrame(npc.walk, frames.length);
    const y = npc.y + 12;
    drawSpriteShadow(npc.x, npc.y + 10, 12, 4);
    if (npc.type === "musician") drawMusicAura(npc);
    drawPixelSprite(frames[frame], npcPalette(npc.type), npc.x, y, 2, false);
    if (npc.type === "journalist") {
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(Math.round(npc.x + 7), Math.round(npc.y - 12), 9, 7);
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(Math.round(npc.x + 9), Math.round(npc.y - 10), 5, 1);
    }
    if (npc.type === "executive" && npc.bumpCooldown > 0) {
      ctx.fillStyle = COLORS.executiveLight;
      ctx.font = "bold 10px monospace";
      ctx.fillText("!", npc.x - 3, npc.y - 19);
    }
  }

  function drawMusicAura(npc) {
    const active = game.musicTimer > 0;
    ctx.save();
    if (active) {
      const pulse = 24 + Math.sin(game.musicPulse * 7) * 5;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y - 6, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = active ? 0.92 : 0.68;
    ctx.fillStyle = active ? COLORS.gold : COLORS.paper;
    ctx.font = "bold 10px monospace";
    const bob = Math.sin(npc.walk * 1.4) * 2;
    ctx.fillText("♪", Math.round(npc.x - 15), Math.round(npc.y - 24 + bob));
    ctx.fillText("♪", Math.round(npc.x + 9), Math.round(npc.y - 30 - bob));
    ctx.restore();
  }

  function drawPowerUp(item) {
    const y = item.y + 7 + Math.sin(item.bob) * 2;
    drawSpriteShadow(item.x, item.y + 11, item.type === "flyer" ? 11 : 8, 3);
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(item.bob * 1.6) * 0.05;
    ctx.fillStyle = POWERUPS[item.type].color;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 2, item.type === "flyer" ? 18 : 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawPixelSprite(SPRITES.power[item.type], powerPalette(item.type), item.x, y, 2, false);
    ctx.fillStyle = POWERUPS[item.type].color;
    ctx.fillRect(item.x - 5, item.y + 12, 10, 2);
  }

  function drawSpriteShadow(x, y, w, h) {
    ctx.fillStyle = "rgba(20, 17, 28, 0.35)";
    ctx.fillRect(Math.round(x - w), Math.round(y), w * 2, h);
  }

  function drawPixelSprite(rows, palette, cx, baseY, scale, flip) {
    const width = rows[0].length;
    const height = rows.length;
    const originX = Math.round(cx - (width * scale) / 2);
    const originY = Math.round(baseY - height * scale);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const char = rows[y][x];
        if (char === "." || !palette[char]) continue;
        const px = flip ? width - 1 - x : x;
        ctx.fillStyle = palette[char];
        ctx.fillRect(originX + px * scale, originY + y * scale, scale, scale);
      }
    }
    return { x: originX, y: originY, w: width * scale, h: height * scale, scale };
  }

  function drawArtRegion(name, region, dx, dy, dw, dh) {
    const img = art.images[name];
    if (!art.loaded || !img) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, region[0], region[1], region[2], region[3], Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    return true;
  }

  function drawVehicle(name, sx, sy, sw, sh, dx, dy, dw, dh) {
    const img = art.images[name];
    if (!art.loaded || !img) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    return true;
  }

  function spriteFrame(value, length) {
    return Math.abs(Math.floor(value || 0)) % length;
  }

  function drawEffects() {
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawDistrictOverlay() {
    if (game.runMode !== "story" || game.mode !== "playing") return;
    const cfg = ROUND_CONFIGS[game.round];
    const d = cfg && cfg.district ? DISTRICTS[cfg.district] : null;
    if (!d) return;
    ctx.fillStyle = d.overlayColor;
    ctx.fillRect(0, 0, W, H);
  }

  function drawViewportEffects() {
    drawModeTint();
    drawDistrictOverlay();
    if (game.cityEventPulse > 0) {
      ctx.fillStyle = `rgba(232,160,48,${Math.min(0.18, game.cityEventPulse * 0.12)})`;
      ctx.fillRect(0, 0, W, H);
    }
    drawAlertFrame();
    drawScanlines();
    if (game.flashTimer > 0) {
      ctx.fillStyle = "rgba(255,60,60,0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawModeTint() {
    if (game.mode !== "playing") return;
    let tint = "";
    if (game.runMode === "survival") {
      tint = "rgba(18, 22, 52, 0.20)";
    } else if (game.runMode === "convocatoria") {
      tint = "rgba(255, 206, 92, 0.06)";
    } else if (game.round >= 2) {
      tint = "rgba(198, 69, 50, 0.07)";
    } else if (game.round === 1) {
      tint = "rgba(74, 122, 184, 0.05)";
    }
    if (!tint) return;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAlertFrame() {
    if (game.mode !== "playing" || !game.cops.some((cop) => cop.alert)) return;
    ctx.save();
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(0, 0, W, 7);
    ctx.fillRect(0, H - 7, W, 7);
    ctx.restore();
  }

  function drawScanlines() {
    ctx.fillStyle = "rgba(23,17,29,0.045)";
    for (let y = 1; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  function drawWorldFloaters() {
    if (game.mode !== "playing" || !game.floaters.length) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 9px monospace";
    for (const floater of game.floaters) {
      const sx = Math.round(floater.x - game.camera.x);
      const sy = Math.round(floater.y - game.camera.y);
      if (sx < -30 || sx > W + 30 || sy < -20 || sy > H + 20) continue;
      const alpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(23,17,29,0.86)";
      ctx.fillText(floater.text, sx + 1, sy + 1);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, sx, sy);
    }
    ctx.restore();
  }

  function drawOffscreenIndicators() {
    if (game.mode !== "playing" || !game.player) return;
    const targets = guideTargets()
      .filter((target) => !isOnScreen(target, 14))
      .sort((a, b) => a.priority - b.priority || dist(a, game.player) - dist(b, game.player))
      .slice(0, 6);
    for (const target of targets) drawEdgeIndicator(target);
  }

  function guideTargets() {
    const targets = [];
    for (const cop of game.cops) {
      if (!cop.alert) continue;
      targets.push({ x: cop.x, y: cop.y, label: "!", color: COLORS.danger, priority: 0 });
    }
    for (const ally of game.allies) {
      if (ally.collected) continue;
      targets.push({ x: ally.x, y: ally.y, label: "H", color: COLORS.gold, priority: 1 });
    }
    for (const item of game.powerUps) {
      if (item.collected) continue;
      targets.push({ x: item.x, y: item.y, label: item.type === "flyer" ? "V" : "P", color: POWERUPS[item.type].color, priority: 2 });
    }
    for (const npc of game.npcs) {
      if (npc.collected) continue;
      const type = NPC_TYPES[npc.type];
      const label = npc.type === "journalist" ? "C" : npc.type === "bohemian" ? "B" : npc.type === "musician" ? "M" : "E";
      targets.push({ x: npc.x, y: npc.y, label, color: type.color, priority: npc.type === "executive" ? 4 : npc.type === "musician" ? 2 : 3 });
    }
    for (const egg of MAP.easterEggs) {
      if (game.discoveredEggs.has(egg.id)) continue;
      if (dist(egg, game.player) > 220) continue;
      targets.push({ x: egg.x, y: egg.y, label: "?", color: COLORS.neon, priority: 5 });
    }
    return targets;
  }

  function drawEdgeIndicator(target) {
    const centerX = W / 2;
    const centerY = H / 2;
    const sx = target.x - game.camera.x;
    const sy = target.y - game.camera.y;
    const dx = sx - centerX;
    const dy = sy - centerY;
    const scale = Math.min((W / 2 - 16) / Math.abs(dx || 0.001), (H / 2 - 16) / Math.abs(dy || 0.001));
    const x = clamp(centerX + dx * scale, 16, W - 16);
    const y = clamp(centerY + dy * scale, 16, H - 16);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(23,17,29,0.82)";
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(7, 6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = COLORS.black;
    ctx.fillText(target.label, Math.round(x) + 1, Math.round(y) + 4);
    ctx.fillStyle = COLORS.paper;
    ctx.fillText(target.label, Math.round(x), Math.round(y) + 3);
    ctx.restore();
  }

  function drawMiniMap() {
    if (game.mode !== "playing" || !game.player) return;
    const boxW = 102;
    const boxH = 68;
    const x = W - boxW - 8;
    const y = H - boxH - 8;
    const mx = x + 7;
    const my = y + 8;
    const mw = boxW - 14;
    const mh = boxH - 16;
    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;

    ctx.save();
    ctx.fillStyle = "rgba(23,17,29,0.70)";
    ctx.fillRect(x, y, boxW, boxH);
    ctx.fillStyle = "rgba(245,237,216,0.82)";
    ctx.fillRect(x + 2, y + 2, boxW - 4, boxH - 4);
    ctx.fillStyle = "rgba(90,138,60,0.86)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = "rgba(200,184,120,0.68)";
    drawMiniMapPaths(mx, my, sx, sy);
    drawMiniRect(MAP.safeZone, mx, my, sx, sy, "rgba(75,143,117,0.95)");
    drawMiniRect(MAP.dangerZone, mx, my, sx, sy, "rgba(198,69,50,0.80)");

    ctx.strokeStyle = "rgba(23,17,29,0.75)";
    ctx.strokeRect(mx, my, mw, mh);
    ctx.strokeStyle = COLORS.paper;
    ctx.strokeRect(mx + game.camera.x * sx, my + game.camera.y * sy, W * sx, H * sy);

    for (const item of game.powerUps) drawMiniDot(item, mx, my, sx, sy, POWERUPS[item.type].color, 2);
    for (const ally of game.allies) drawMiniDot(ally, mx, my, sx, sy, COLORS.gold, 2);
    for (const npc of game.npcs) {
      const type = NPC_TYPES[npc.type];
      drawMiniDot(npc, mx, my, sx, sy, type.color, npc.type === "musician" ? 3 : 2);
    }
    for (const egg of MAP.easterEggs) {
      if (game.discoveredEggs.has(egg.id) || dist(egg, game.player) < 220) {
        drawMiniDot(egg, mx, my, sx, sy, game.discoveredEggs.has(egg.id) ? COLORS.neon : COLORS.paper, 2);
      }
    }
    for (const cop of game.cops) {
      const reveal = activePower("fanzine") || cop.alert || dist(cop, game.player) < 140;
      if (reveal) drawMiniDot(cop, mx, my, sx, sy, cop.alert ? COLORS.danger : COLORS.copLight, cop.alert ? 3 : 2);
    }
    drawMiniDot(game.player, mx, my, sx, sy, COLORS.player2, 3);

    ctx.fillStyle = COLORS.black;
    ctx.font = "7px monospace";
    ctx.fillText("MAPA", x + 7, y + boxH - 4);
    ctx.restore();
  }

  function drawMiniMapPaths(mx, my, sx, sy) {
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        if (!isPathTile(tx, ty)) continue;
        ctx.fillRect(mx + tx * TILE * sx, my + ty * TILE * sy, Math.max(1, TILE * sx), Math.max(1, TILE * sy));
      }
    }
  }

  function drawMiniRect(rect, mx, my, sx, sy, color) {
    ctx.fillStyle = color;
    ctx.fillRect(mx + rect.x * sx, my + rect.y * sy, Math.max(1, rect.w * sx), Math.max(1, rect.h * sy));
  }

  function drawMiniDot(entity, mx, my, sx, sy, color, size) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(mx + entity.x * sx - size / 2), Math.round(my + entity.y * sy - size / 2), size, size);
  }

  function isOnScreen(point, margin = 0) {
    const sx = point.x - game.camera.x;
    const sy = point.y - game.camera.y;
    return sx >= margin && sy >= margin && sx <= W - margin && sy <= H - margin;
  }

  function playerPalette() {
    const unlock = PALETTE_UNLOCKS.find(p => p.id === game.playerStyle) || PALETTE_UNLOCKS[0];
    return {
      S: COLORS.skin,
      P: unlock.P,
      L: unlock.L,
      B: COLORS.black
    };
  }

  function copPalette() {
    return {
      C: COLORS.cop,
      D: COLORS.copLight,
      S: COLORS.skin,
      G: COLORS.gold,
      B: COLORS.black
    };
  }

  function allyPalette() {
    return {
      H: "#7a3a1a",
      S: COLORS.skin,
      A: COLORS.ally,
      L: COLORS.allyLight,
      B: COLORS.black,
      F: COLORS.flower
    };
  }

  function crowdPalette(tint = 0) {
    const palettes = [
      { H: "#7a3a1a", S: COLORS.skin, A: COLORS.ally, L: COLORS.allyLight, B: COLORS.black, F: COLORS.flower },
      { H: "#38202c", S: COLORS.skin, A: COLORS.safe, L: COLORS.leafLight, B: COLORS.black, F: COLORS.gold },
      { H: "#8b4513", S: COLORS.skin, A: COLORS.player0, L: COLORS.player1, B: COLORS.black, F: "#f2c56b" }
    ];
    return palettes[Math.abs(tint) % palettes.length];
  }

  function npcPalette(type) {
    if (type === "journalist") {
      return {
        H: "#7a3a1a",
        S: COLORS.skin,
        J: COLORS.journalist,
        P: COLORS.paper,
        B: COLORS.black
      };
    }
    if (type === "executive") {
      return {
        H: "#3b2a1f",
        S: COLORS.skin,
        E: COLORS.executive,
        L: COLORS.executiveLight,
        G: COLORS.gold,
        B: COLORS.black
      };
    }
    if (type === "musician") {
      return {
        H: "#7a3a1a",
        S: COLORS.skin,
        U: COLORS.safe,
        L: COLORS.leafLight,
        G: COLORS.wood,
        B: COLORS.black
      };
    }
    return {
      H: "#38202c",
      S: COLORS.skin,
      M: COLORS.bohemian,
      L: COLORS.bohemianLight,
      B: COLORS.black
    };
  }

  function powerPalette(type) {
    if (type === "press") {
      return { N: COLORS.paper };
    }
    if (type === "beatles") {
      return { R: COLORS.record, B: COLORS.black, Y: COLORS.gold };
    }
    if (type === "flyer") {
      return {
        N: COLORS.black,
        G: COLORS.leafDark,
        L: COLORS.leaf,
        Y: COLORS.leafLight
      };
    }
    if (type === "mate")    return { G: COLORS.safe, B: COLORS.black };
    if (type === "fanzine") return { N: COLORS.black, P: COLORS.paper };
    if (type === "sombrero") return { O: COLORS.gold, B: COLORS.black };
    return { O: COLORS.poncho, P: COLORS.gold };
  }

  function uiPalette() {
    return {
      N: COLORS.black,
      Y: COLORS.gold,
      H: "#7a3a1a",
      S: COLORS.skin,
      F: COLORS.flower,
      G: COLORS.leaf,
      L: COLORS.leafLight,
      P: COLORS.paper
    };
  }

  function pixelIconUrl(rows, palette, scale = 3) {
    const iconCanvas = document.createElement("canvas");
    const iconCtx = iconCanvas.getContext("2d");
    const width = rows[0].length;
    const height = rows.length;
    iconCanvas.width = width * scale;
    iconCanvas.height = height * scale;
    iconCtx.imageSmoothingEnabled = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const char = rows[y][x];
        if (char === "." || !palette[char]) continue;
        iconCtx.fillStyle = palette[char];
        iconCtx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return iconCanvas.toDataURL("image/png");
  }

  const iconCache = new Map();

  function applyPixelIcons(root = document) {
    for (const el of root.querySelectorAll("[data-sprite]")) {
      const name = el.dataset.sprite;
      const rows = SPRITES.ui[name];
      if (!rows) continue;
      if (!iconCache.has(name)) iconCache.set(name, pixelIconUrl(rows, uiPalette()));
      el.style.backgroundImage = `url("${iconCache.get(name)}")`;
    }
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 80;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color
      });
    }
  }

  function floatText(text, x, y, color = COLORS.paper) {
    game.floaters.push({
      text,
      x,
      y,
      color,
      vy: -18,
      life: 1.05,
      maxLife: 1.05
    });
    if (game.floaters.length > 18) game.floaters.shift();
  }

  function updateHud() {
    syncRunModeTheme();
    const cfg = currentConfig();
    const archLabel = (ARCHETYPES[game.archetype] || ARCHETYPES.estudiante).label;
    hud.round.textContent = game.runMode === "survival"
      ? `${archLabel} · Sup ${game.survivalLevel + 1}`
      : game.runMode === "convocatoria"
        ? `${archLabel} · Conv: ${game.crowdCount}`
        : `${archLabel} · R${game.round + 1}: ${cfg.title}`;
    const maxLives = (ARCHETYPES[game.archetype] || ARCHETYPES.estudiante).lives;
    const hairLost = Math.max(0, maxLives - game.lives);
    const stars = "✦".repeat(Math.max(0, 3 - hairLost)) + "◇".repeat(Math.min(3, hairLost));
    hud.hair.textContent = `Pelo ${stars}`;
    hud.objective.textContent = objectiveProgressText(cfg);
    hud.power.textContent = powerText();
    hud.score.textContent = `${game.score} pts`;
    const rumor = notorietyValue();
    hud.notorietyLabel.textContent = notorietyStage(rumor);
    hud.notorietyFill.style.width = `${rumor}%`;
    hud.notorietyValue.textContent = `${rumor}%`;
    hud.msg.textContent = game.msgTimer > 0 ? game.msgText : ambientMessage(cfg);
    hud.hairPill.classList.toggle("is-danger", game.lives <= 1);
    hud.powerPill.classList.toggle("is-danger", game.cops.some((cop) => cop.alert));
    hud.powerPill.classList.toggle("is-power-active", Boolean(game.activePowerUp));
    hud.notorietyWrap.classList.toggle("is-hot", rumor >= 68);
    hud.msgWrap.classList.toggle("is-quote", game.msgTimer > 0 && game.msgKind === "quote");
    hud.msgWrap.classList.toggle("is-power", game.msgTimer > 0 && game.msgKind === "power");
    hud.msgWrap.classList.toggle("is-event", game.msgTimer > 0 && game.msgKind === "event");
  }

  function objectiveText(cfg) {
    if (cfg.objective.type === "collect") {
      return `Objetivo: reunir ${cfg.objective.target} hippies antes de ${cfg.objective.timeLimit}s.`;
    }
    if (cfg.objective.type === "convocatoria") {
      return `Objetivo: convocar ${cfg.objective.target} compañeros antes de ${cfg.objective.timeLimit}s.`;
    }
    if (cfg.objective.type === "endless") {
      return "Objetivo: sobrevivir y reunir la mayor cantidad de hippies.";
    }
    return `Objetivo: sobrevivir ${cfg.objective.duration}s a la oleada.`;
  }

  function objectiveProgressText(cfg) {
    if (cfg.objective.type === "collect") {
      const left = Math.max(0, Math.ceil(cfg.objective.timeLimit - game.roundTimer));
      return `${game.collectedRound}/${cfg.objective.target} · ${left}s`;
    }
    if (cfg.objective.type === "endless") {
      return `O${game.survivalLevel + 1} · ${Math.floor(game.roundTimer)}s`;
    }
    if (cfg.objective.type === "convocatoria") {
      const left = Math.max(0, Math.ceil(cfg.objective.timeLimit - game.roundTimer));
      return `${game.crowdCount}/${cfg.objective.target} · ${left}s`;
    }
    const left = Math.max(0, Math.ceil(cfg.objective.duration - game.roundTimer));
    return `Sobreviví ${left}s`;
  }

  function powerText() {
    if (!game.activePowerUp) {
      if (isPlayerInSafeZone() && game.safeZoneTimer > 0) {
        return `Kiosco ${Math.ceil(game.safeZoneTimer)}s`;
      }
      return "Libre";
    }
    const power = POWERUPS[game.activePowerUp.type];
    const short = game.activePowerUp.type === "flyer" && leafModeSummons()
      ? power.survivalShort
      : power.short;
    return `${short}: ${Math.ceil(game.activePowerUp.timer)}s`;
  }

  function ambientMessage(cfg) {
    if (activePower("press")) return "La prensa distrae a los patrulleros.";
    if (activePower("beatles")) return "El disco empuja tus pasos.";
    if (activePower("poncho")) return "El poncho achica el radio de detección.";
    if (leafConfusesPolice()) return "La conexión desorienta el patrullaje.";
    if (leafSummonsAllies()) return "La hoja convoca compañeros por la plaza.";
    if (game.musicTimer > 0) return "El músico sostiene la ronda: se acercan más compañeros.";
    if (isPlayerProtected()) return "El kiosco te cubre por unos segundos.";
    if (game.cops.some((cop) => cop.alert)) return "La cana te vio. Mové el cuerpo.";
    if (cfg.objective.type === "convocatoria") {
      return "Convocatoria: cada compañero suma fuerza y también llama la atención.";
    }
    if (cfg.objective.type === "survive") return "Resistí la oleada y no te encierres en la comisaría.";
    if (cfg.objective.type === "endless") return "Supervivencia: reuní, corré, aguantá.";
    return "Esquivá a la policía - reunite con los hippies.";
  }

  function showMsg(text, duration = 3.4, kind = "") {
    game.msgText = text;
    game.msgTimer = duration;
    game.msgKind = kind;
  }

  function startIntroOrMenu() {
    if (introWasSeen() || prefersReducedMotion()) {
      markIntroSeen();
      showMenu();
      return;
    }
    showIntro();
  }

  function showIntro() {
    game.mode = "intro";
    clearInput();
    hideOverlay();
    updatePauseButton();
    document.body.dataset.runMode = "intro";
    introActive = true;
    introOverlay.hidden = false;
    const beats = INTRO_STORY.map(introBeatMarkup).join("");
    introOverlay.innerHTML = `
      <div class="intro-card" role="dialog" aria-modal="true" aria-label="Intro La Razzia">
        <div class="intro-file"><span>EXPEDIENTE 1966</span><span>RESERVADO</span></div>
        <div class="intro-strip" aria-hidden="true">${beats}</div>
        <div class="intro-title">La Razzia</div>
        <div class="intro-caption">Una historia rápida de archivo, plaza y persecución.</div>
        <button class="intro-skip" type="button" data-intro-action="continue">Continuar</button>
      </div>
    `;
  }

  function introBeatMarkup(beat, index) {
    const beatDelay = (index * 0.72).toFixed(2);
    const scanDelay = (index * 0.35).toFixed(2);
    const panDelay = (index * 0.24).toFixed(2);
    return `
      <section class="intro-beat intro-scene-${escapeHtml(beat.scene)}" data-label="${escapeHtml(beat.label)}" style="--beat-delay:${beatDelay}s;--scan-delay:${scanDelay}s;--pan-delay:${panDelay}s">
        <div class="intro-scene-stage">${introSceneMarkup(beat.scene)}</div>
        <div class="intro-caption-card">${escapeHtml(beat.caption)}</div>
      </section>
    `;
  }

  function introSceneMarkup(scene) {
    if (scene === "file") {
      return `
        <span class="intro-paper"></span>
        <span class="intro-record"></span>
        <span class="intro-leaf"></span>
        <span class="intro-person hippie" style="left:72%;bottom:30%"></span>
      `;
    }
    if (scene === "florida") {
      return `
        <span class="intro-kiosk" style="left:8%;top:22%"></span>
        <span class="intro-building" style="right:8%;top:15%"></span>
        <span class="intro-record" style="left:45%;top:34%"></span>
        <span class="intro-paper" style="left:30%;top:26%;transform:rotate(-8deg)"></span>
      `;
    }
    if (scene === "walk") {
      return `
        <span class="intro-fountain"></span>
        <span class="intro-lamp"></span>
        <span class="intro-person hippie"></span>
      `;
    }
    if (scene === "patrol") {
      return `
        <span class="intro-building" style="right:7%;top:12%"></span>
        <span class="intro-car"></span>
        <span class="intro-person cop"></span>
        <span class="intro-person hippie" style="left:18%;bottom:28%"></span>
      `;
    }
    if (scene === "crowd") {
      return `
        <span class="intro-fountain" style="left:28%;top:42%"></span>
        <span class="intro-crowd"><span></span><span></span><span></span><span></span></span>
        <span class="intro-leaf" style="right:18%;top:22%"></span>
      `;
    }
    return `
      <span class="intro-title-card">La Razzia</span>
      <span class="intro-paper" style="left:14%;top:26%;transform:rotate(8deg)"></span>
      <span class="intro-crowd" style="left:58%;bottom:24%;opacity:1"><span></span><span></span><span></span><span></span></span>
      <span class="intro-stamp">RAZZIA</span>
    `;
  }

  function finishIntro() {
    if (!introActive && introOverlay.hidden) return;
    introActive = false;
    markIntroSeen();
    introOverlay.hidden = true;
    introOverlay.innerHTML = "";
    showMenu();
  }

  function showRoundInterlude(roundIndex, callback) {
    const beats = ROUND_INTERLUDES[roundIndex];
    if (!beats) { callback(); return; }
    introOverlay.hidden = false;
    introOverlay.innerHTML = `
      <div class="intro-card" role="dialog" aria-modal="true" aria-label="Entre rondas">
        <div class="intro-file" aria-hidden="true">
          <span>${escapeHtml(beats[0] ? beats[0].label : "")}</span>
          <span>Buenos Aires</span>
        </div>
        <div class="intro-strip" aria-hidden="true">${beats.map(introBeatMarkup).join("")}</div>
        <button class="intro-skip" type="button" data-intro-action="interlude-done">Continuar →</button>
      </div>`;
    introOverlay._interludeCb = callback;
  }

  function introWasSeen() {
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    } catch (error) {
      // Session storage can be unavailable in private or embedded contexts.
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showMenu() {
    game.mode = "menu";
    clearInput();
    updatePauseButton();
    document.body.dataset.runMode = "menu";
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="modal menu-modal">
        <div class="menu-scene" aria-hidden="true">
          <span class="scene-building one"></span>
          <span class="scene-building two"></span>
          <span class="scene-fountain"></span>
          <span class="scene-character hippie"></span>
          <span class="scene-character cop"></span>
          <span class="scene-note"></span>
        </div>
        <div class="menu-topline">
          <div>
            <div class="menu-heading">
              <span class="menu-pixel-icon" data-sprite="menu" aria-hidden="true"></span>
              <h1>La Razzia</h1>
            </div>
            <div class="menu-badge"><span class="menu-pixel-icon" data-sprite="round" aria-hidden="true"></span>Buenos Aires, 1966</div>
          </div>
        </div>
        <div class="mode-select" aria-label="Elegir modo de juego">
          <button class="mode-card" type="button" data-action="start" data-mode="story">
            <span class="menu-pixel-icon" data-sprite="round" aria-hidden="true"></span>
            <strong>Historia</strong>
            <small>Tres escenas, objetivos claros, citas y archivo.</small>
          </button>
          <button class="mode-card" type="button" data-action="start" data-mode="survival">
            <span class="menu-pixel-icon" data-sprite="power" aria-hidden="true"></span>
            <strong>Supervivencia</strong>
            <small>Oleadas, hoja que convoca y plaza cada vez más caliente.</small>
          </button>
          <button class="mode-card" type="button" data-action="start" data-mode="convocatoria">
            <span class="menu-pixel-icon" data-sprite="objective" aria-hidden="true"></span>
            <strong>Convocatoria</strong>
            <small>Juntá multitud antes de que la ciudad mire demasiado.</small>
          </button>
        </div>
        <div class="menu-config-row">
          <div class="config-group">
            <span class="config-label">Personaje</span>
            <div class="archetype-chips" aria-label="Elegir personaje">
              ${Object.entries(ARCHETYPES).map(([key, a]) => `
              <button class="arch-chip ${game.archetype === key ? "arch-chip-active" : ""}"
                      type="button" data-action="archetype" data-type="${key}"
                      title="${escapeHtml(a.desc)}">
                <strong>${escapeHtml(a.label)}</strong>
                <span>${escapeHtml(a.desc)}</span>
              </button>`).join("")}
            </div>
          </div>
          ${stylePickerMarkup()}
        </div>
        <p class="quote menu-quote">"La persecución, paradójicamente, ayudó a crear identidad colectiva." - Sergio Pujol</p>
        ${archiveShelfMarkup()}
      </div>
    `;
    applyPixelIcons(overlay);
    draw();
  }

  function showStory(nextRound) {
    const cfg = ROUND_CONFIGS[nextRound];
    const quote = PUJOL_QUOTES[cfg.quote];
    updatePauseButton();
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="modal">
        <h2>${escapeHtml(cfg.title)}</h2>
        <p>${escapeHtml(cfg.subtitle)}</p>
        <p class="quote">"${escapeHtml(quote.text)}" - Sergio Pujol, ${escapeHtml(quote.section)}</p>
        <p>${escapeHtml(objectiveText(cfg))}</p>
        <div class="actions">
          <button class="primary" type="button" data-action="continue" data-round="${nextRound}">Continuar</button>
        </div>
      </div>
    `;
    applyPixelIcons(overlay);
  }

  function showEndOverlay(title, victory) {
    const quote = PUJOL_QUOTES[victory ? 6 : 2];
    const retryLabel = game.runMode === "survival"
      ? "Otra oleada"
      : game.runMode === "convocatoria"
        ? "Otra convocatoria"
        : "Jugar de nuevo";
    const modeName = modeLabel(game.runMode);
    updatePauseButton();
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="modal">
        <h2>${escapeHtml(title)}</h2>
        <p>${modeName} | Puntos: ${game.score} | Tiempo: ${Math.floor(game.totalTime)}s | Hippies: ${game.hippiesTotal}${game.runMode === "convocatoria" ? ` | Convocados: ${game.crowdCount}` : ""}</p>
        <p class="quote">"${escapeHtml(quote.text)}" - Sergio Pujol, ${escapeHtml(quote.section)}</p>
        <div class="actions">
          <button class="primary" type="button" data-action="start" data-mode="${game.runMode}">${retryLabel}</button>
          <button class="secondary" type="button" data-action="menu">Menú</button>
        </div>
        ${archiveMarkup()}
        ${scoresMarkup(game.runMode)}
      </div>
    `;
    applyPixelIcons(overlay);
  }

  function showPauseOverlay() {
    const cfg = currentConfig();
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="modal pause-modal" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title">Pausa</h2>
        <p class="pause-hint">El juego queda congelado. P o Escape para volver.</p>
        <div class="pause-stats">
          <div class="pause-stat">Modo<br><strong>${escapeHtml(modeLabel(game.runMode))}</strong></div>
          <div class="pause-stat">Puntos<br><strong>${game.score}</strong></div>
          <div class="pause-stat">Tiempo<br><strong>${Math.floor(game.totalTime)}s</strong></div>
          <div class="pause-stat">Hippies<br><strong>${game.hippiesTotal}</strong></div>
          <div class="pause-stat pause-objective">Objetivo<br><strong>${escapeHtml(objectiveProgressText(cfg))}</strong></div>
        </div>
        <div class="actions">
          <button class="primary" type="button" data-action="resume">Reanudar</button>
          <button class="secondary" type="button" data-action="restart">Reiniciar</button>
          <button class="tertiary" type="button" data-action="menu">Menú</button>
        </div>
      </div>
    `;
    const resume = overlay.querySelector("[data-action='resume']");
    if (resume) resume.focus({ preventScroll: true });
  }

  function hideOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = "";
  }

  function syncRunModeTheme() {
    document.body.dataset.runMode = game.runMode || "story";
  }

  function scoresMarkup(mode = game.runMode) {
    const scores = loadScores(mode);
    const label = modeLabel(mode);
    if (!scores.length) return `<p class="tiny">Sin records de ${label.toLowerCase()} todavía.</p>`;
    const items = scores.map((score, index) => {
      const crowdText = score.crowd ? ` - ${score.crowd} conv.` : "";
      const itemLabel = `${index + 1}. ${score.score} pts - ${score.time}s - ${score.hippies} hippies${crowdText} - ${escapeHtml(score.date)}`;
      return `<li>${itemLabel}</li>`;
    }).join("");
    return `<p class="tiny">Records ${label}</p><ol class="scores" aria-label="Mejores puntajes ${label}">${items}</ol>`;
  }

  function archiveProgress() {
    const archive = loadArchive();
    const count = MAP.easterEggs.filter((egg) => archive.has(egg.id)).length;
    const total = MAP.easterEggs.length;
    return { archive, count, total, percent: total ? Math.round((count / total) * 100) : 0 };
  }

  function stylePickerMarkup() {
    const styles = unlockedStyles();
    if (styles.length <= 1) return "";
    const btns = styles.map(s => `
      <button class="style-swatch ${game.playerStyle === s.id ? "swatch-active" : ""}"
              type="button" data-action="style" data-id="${escapeHtml(s.id)}"
              aria-label="${escapeHtml(s.label)}">
        <span class="swatch-dot" style="background:${s.P}"></span>${escapeHtml(s.label)}
      </button>`).join("");
    return `<div class="config-group">
      <span class="config-label">Color</span>
      <div class="style-select">${btns}</div>
    </div>`;
  }

  function archiveMeterMarkup() {
    const progress = archiveProgress();
    return `
      <div class="archive-meter" aria-label="Progreso de archivo">
        <div class="archive-meter-line"><span>Archivo</span><span>${progress.count}/${progress.total}</span></div>
        <div class="archive-meter-track" aria-hidden="true"><span class="archive-meter-fill" style="width:${progress.percent}%"></span></div>
      </div>
    `;
  }

  function archiveShelfMarkup() {
    const { archive, count, total } = archiveProgress();
    const found = MAP.easterEggs.filter((egg) => archive.has(egg.id)).slice(-3);
    const label = found.length
      ? found.map((egg) => escapeHtml(egg.label)).join(" · ")
      : `Todavía sin hallazgos. El mapa guarda ${total} pistas.`;
    return `
      <div class="archive-shelf">
        <strong>Archivos ${count}/${total}</strong>
        <span>${label}</span>
      </div>
    `;
  }

  function archiveMarkup() {
    const { archive, count, total } = archiveProgress();
    const items = MAP.easterEggs.map((egg) => {
      if (!archive.has(egg.id)) return `<li class="locked">Archivo cerrado</li>`;
      return `<li><strong>${escapeHtml(egg.label)}</strong> <span>${escapeHtml(egg.section)} · ${escapeHtml(egg.text)}</span></li>`;
    }).join("");
    return `
      <details class="menu-archive">
        <summary>Archivo ${count}/${total}</summary>
        <ol class="archive-list" aria-label="Album de archivos encontrados">${items}</ol>
      </details>
    `;
  }

  function saveCurrentScore(victory) {
    if (game.saved) return;
    game.saved = true;
    const entry = {
      score: game.score,
      time: Math.floor(game.totalTime),
      hippies: game.hippiesTotal,
      crowd: game.runMode === "convocatoria" ? game.crowdCount : 0,
      round: game.runMode === "survival"
        ? game.survivalLevel + 1
        : game.runMode === "convocatoria"
          ? game.crowdCount
          : (victory ? ROUND_CONFIGS.length : game.round + 1),
      mode: game.runMode,
      date: new Date().toLocaleDateString("es-AR")
    };
    game.highScores = [...loadScores(game.runMode), entry]
      .sort((a, b) => b.score - a.score || b.time - a.time)
      .slice(0, 10);
    try {
      localStorage.setItem(scoreKey(game.runMode), JSON.stringify(game.highScores));
    } catch (error) {
      console.warn("No se pudo guardar el record", error);
    }
  }

  function loadScores(mode = "story") {
    try {
      const scores = JSON.parse(localStorage.getItem(scoreKey(mode)) || "[]");
      return Array.isArray(scores) ? scores.slice(0, 10) : [];
    } catch (error) {
      return [];
    }
  }

  function loadArchive() {
    try {
      const ids = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]");
      return new Set(Array.isArray(ids) ? ids : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveArchiveId(id) {
    const archive = loadArchive();
    archive.add(id);
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...archive]));
    } catch (error) {
      console.warn("No se pudo guardar el archivo", error);
    }
    return archive;
  }

  function unlockedStyles() {
    const { percent } = archiveProgress();
    return PALETTE_UNLOCKS.filter(p => p.threshold <= percent);
  }

  function savePlayerStyle(id) {
    try { localStorage.setItem(STYLE_KEY, id); } catch(e) {}
  }

  function scoreKey(mode) {
    if (mode === "survival") return SURVIVAL_SCORE_KEY;
    if (mode === "convocatoria") return CONVOCATORIA_SCORE_KEY;
    return SCORE_KEY;
  }

  function modeLabel(mode) {
    if (mode === "survival") return "Supervivencia";
    if (mode === "convocatoria") return "Convocatoria";
    return "Historia";
  }

  function isPlayerInSafeZone() {
    return game.player ? rectContains(MAP.safeZone, game.player) : false;
  }

  function isPlayerProtected() {
    return isPlayerInSafeZone() && game.safeZoneTimer > 0;
  }

  function activePower(type) {
    return game.activePowerUp && game.activePowerUp.type === type;
  }

  function leafConfusesPolice() {
    return activePower("flyer") && !leafModeSummons();
  }

  function leafSummonsAllies() {
    return activePower("flyer") && leafModeSummons();
  }

  function leafModeSummons() {
    return game.runMode === "survival" || game.runMode === "convocatoria";
  }

  function isBlocked(tx, ty) {
    return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || blockedTiles.has(tileKey(tx, ty));
  }

  function updateCamera() {
    if (!game.player) {
      game.camera.x = 0;
      game.camera.y = 0;
      return;
    }
    game.camera.x = clamp(game.player.x - W / 2, 0, Math.max(0, WORLD_W - W));
    game.camera.y = clamp(game.player.y - H / 2, 0, Math.max(0, WORLD_H - H));
  }

  function currentTile(entity) {
    return pixelToTile(entity.x, entity.y);
  }

  function pixelToTile(x, y) {
    return {
      x: Math.max(0, Math.min(COLS - 1, Math.floor(x / TILE))),
      y: Math.max(0, Math.min(ROWS - 1, Math.floor(y / TILE)))
    };
  }

  function tileCenter(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }

  function tileKey(x, y) {
    return `${x},${y}`;
  }

  function rectContains(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function randomFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeVector(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadArtAssets() {
    const entries = Object.entries(ART_PATHS);
    return Promise.all(entries.map(([key, src]) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        art.images[key] = img;
        resolve();
      };
      img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      img.src = src;
    }))).then(() => {
      art.loaded = true;
      art.failed = false;
      draw();
      if (game.mode === "menu") showMenu();
    }).catch((error) => {
      art.failed = true;
      console.warn(error.message);
    });
  }

  overlay.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "resume") resumeGame();
    if (action === "restart") resetGame(game.runMode || "story");
    if (action === "start") resetGame(button.dataset.mode || game.runMode || "story");
    if (action === "continue") setupRound(Number(button.dataset.round));
    if (action === "menu") showMenu();
    if (action === "archetype") { game.archetype = button.dataset.type || "estudiante"; showMenu(); }
    if (action === "style") { game.playerStyle = button.dataset.id || "default"; savePlayerStyle(game.playerStyle); showMenu(); }
  });

  introOverlay.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-intro-action]");
    if (!btn) return;
    if (btn.dataset.introAction === "interlude-done") {
      introOverlay.hidden = true;
      introOverlay.innerHTML = "";
      const cb = introOverlay._interludeCb;
      introOverlay._interludeCb = null;
      if (cb) cb();
      return;
    }
    finishIntro();
  });

  canvas.addEventListener("pointerdown", handlePointer);

  pauseButton.addEventListener("click", () => {
    togglePause();
  });

  muteButton.addEventListener("click", () => {
    const muted = SFX.toggle();
    muteButton.textContent = muted ? "♪̶" : "♪";
    muteButton.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar sonido");
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (introActive && ["enter", " ", "escape"].includes(key)) {
      e.preventDefault();
      finishIntro();
      return;
    }
    if (key === "p" && (game.mode === "playing" || game.mode === "paused")) {
      e.preventDefault();
      togglePause();
      return;
    }
    if (key === "escape") {
      if (game.mode === "playing") {
        e.preventDefault();
        pauseGame();
        return;
      }
      if (game.mode === "paused") {
        e.preventDefault();
        resumeGame();
        return;
      }
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      if (game.mode === "playing") e.preventDefault();
      if (game.mode === "playing") input.keys.add(key);
    }
  });

  window.addEventListener("keyup", (e) => {
    input.keys.delete(e.key.toLowerCase());
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && game.mode === "playing") pauseGame();
  });

  for (const button of dpadButtons) {
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      holdDpad(button.dataset.dir);
      button.classList.add("is-held");
      button.setPointerCapture(e.pointerId);
    });
    button.addEventListener("pointerup", () => releaseDpad(button));
    button.addEventListener("pointercancel", () => releaseDpad(button));
    button.addEventListener("lostpointercapture", () => releaseDpad(button));
  }

  controlModeButton.addEventListener("click", () => {
    game.controlMode = game.controlMode === "tap" ? "dpad" : "tap";
    controlModeButton.textContent = game.controlMode === "tap" ? "Tap" : "D-pad";
    controlModeButton.classList.toggle("is-active", game.controlMode === "dpad");
  });

  function holdDpad(dir) {
    input.dpad.dir = dir;
    input.dpad.x = dir === "left" ? -1 : dir === "right" ? 1 : 0;
    input.dpad.y = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  }

  function releaseDpad(button) {
    button.classList.remove("is-held");
    if (input.dpad.dir === button.dataset.dir) {
      input.dpad.dir = "";
      input.dpad.x = 0;
      input.dpad.y = 0;
    }
  }

  rebuildBlockedTiles();
  applyPixelIcons();
  startIntroOrMenu();
  loadArtAssets();
})();
