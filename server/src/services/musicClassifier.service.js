'use strict';

// ── Arab countries ────────────────────────────────────────────────
const ARAB_CODES = new Set([
  'DZ','MA','EG','LB','SY','IQ','JO','PS','SA',
  'AE','QA','KW','BH','OM','YE','LY','SD','MR',
]);
const ARAB_NAMES = [
  'algeria','morocco','egypt','lebanon','syria','iraq','jordan',
  'palestine','saudi','emirates','qatar','kuwait','bahrain',
  'oman','yemen','libya','sudan','mauritania',
];

// ── Known Tunisian artists (Latin spelling) ───────────────────────
const TUNISIAN_ARTISTS = [
  'saber rebai','lotfi bouchnak','lofti bouchnak','hedi jouini',
  'nabiha','dhikra','dhafer youssef','hamada ben amor','el general',
  'emel mathlouthi','wissem','salma rachid','zied gharsa',
  'oussama rachdi','cheba sihem','sonia m','belgacem',
  'walid tounsi','fawzi ben gamra','nidhal ben ali','zied zitoun',
  'sabah fakhri',
  'sonia m\'barek','latifa arfaoui','ridha khadhraoui',
  'mohamed graya','graya','ali riahi','hassen doss',
  'doss','karray','najoua','ziara',
  'adnan chawachi','adnan shawachi','chawachi','shawachi',
];

// ── Tunisian name suffixes → guaranteed Tunisian ──────────────────
const TUNISIAN_SUFFIX_RE = /\b(tounsi|tounsia|tunisi|tunisie)\b/i;

// ── Distinctive Tunisian family names (Latin) ─────────────────────
// These surnames are characteristic of Tunisia and take priority
// over generic Arab first-name detection.
const TUNISIAN_SURNAMES_RE = /\b(jamoussi|jemoussi|bouchnak|karray|jelassi|jlassi|mhadhebi|mahdhebi|ksouri|nouira|makni|jlidi|hlaoui|ferjani|elloumi|chabbi|chaibi|akkari|agrebi|arfaoui|touati|jouini|jemai|ghedira|ghannouchi|ferchichi|fehri|fakhfakh|dougaz|besbes|ayadi|zagrouba|zouari|zghal|dridi|rekik|tlili|toumi|mejri|garbouj|harrabi|boussaid|chebbi|cheikhrouhou|chouikha|douagi|guetari|hamrouni|hamouda|jaziri|kallel|khalfallah|khemiri|khiari|laabidi|mami|mekki|mghirbi|mokni|mtimet|ouali|oueslati|rekaya|rjiba|sahli|sellami|taboubi|tarhouni|tebourbi|touil|triki|zeghidi|zoghlami|zouaoui|zouiten|zribi|ghribi|hsini|belhaj|gharbi|jendoubi|sfaxi|farhat|masmoudi|turki|boubaker)\b/i;

// ── Song / genre keywords ─────────────────────────────────────────
const TUNISIAN_KEYWORD_RE = /\b(malouf|mezoued|stambali|zajal|nuba|makam)\b/i;

// ── Known Tunisian artists in Arabic script ───────────────────────
const TUNISIAN_ARTISTS_AR = [
  'نبيهة','ذكرى','وسيم','لطيفة','نجوى',
  'صابر الرباعي','لطفي بوشناق','هادي الجويني','سلمى راشد',
  'حمادة بن عمر','وليد الطنسي','محمد الجرايع','زياد غرسة',
  'إيمال مثلوثي','كراولي','ضيفر يوسف','علي الرياحي',
  'حسن دوس','زياد زيتون','فوزي بن قمرة','ريدا خضراوي',
  'عدنان الشواشي','الشواشي',
  'محمد الجاموسي','الجاموسي',
];

// ── Tunisian city/region adjectives in Arabic ─────────────────────
const TUNISIAN_LOCATION_AR_RE =
  /[\u0600-\u06FF]*(التونسي|التونسية|القيرواني|القيروانية|الصفاقسي|الصفاقسية|المنستيري|المنستيرية|السوسي|السوسية|التوزري|البنزرتي|الجربي|القفصي|الكافي|الجندوبي|الزغواني|النابلي|نابلي|بنزرت|صفاقس|قابس|قفصة|سوسة|المهدية|قيروان|منستير)/;

// ── Tunisian dialect keywords in Arabic ───────────────────────────
const TUNISIAN_DIALECT_AR_RE = /\b(مالوف|مزود|الستمبالي|زجل|ملوف)\b/;

// ── Local genre detector (no external API, instant) ───────────────
function detectGenreLocally(title, artist) {
  const text  = `${title} ${artist}`.trim();
  const lower = text.toLowerCase();

  // Arabic script path
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
    if (TUNISIAN_KEYWORD_RE.test(lower))                 return 'TUNISIEN';
    if (TUNISIAN_DIALECT_AR_RE.test(text))               return 'TUNISIEN';
    if (TUNISIAN_LOCATION_AR_RE.test(text))              return 'TUNISIEN';
    if (TUNISIAN_ARTISTS_AR.some(a => text.includes(a))) return 'TUNISIEN';
    return 'ORIENTAL';
  }

  // Latin script path — only confirm TUNISIEN; everything else defers to Last.fm.
  // Last.fm community tags correctly distinguish Tunisian/Lebanese/Egyptian/etc.
  // so there's no need to guess from first names (which would mis-classify Tunisians
  // who have common Arab first names like Mohammed, Ali, etc.)
  if (TUNISIAN_SUFFIX_RE.test(lower))                return 'TUNISIEN';
  if (TUNISIAN_ARTISTS.some(a => lower.includes(a))) return 'TUNISIEN';
  if (TUNISIAN_KEYWORD_RE.test(lower))               return 'TUNISIEN';
  if (TUNISIAN_SURNAMES_RE.test(lower))              return 'TUNISIEN';

  return null; // defer to Last.fm — it knows all Arab artists by country
}

// ── Last.fm API (FREE — requires LASTFM_API_KEY in .env) ──────────
// Register free at: https://www.last.fm/api/account/create
// Tags are community-curated and very reliable for Arab artists.
const LASTFM_ARAB_TAGS = new Set([
  'arabic','arab','arabic pop','arabic music','middle east','middle eastern',
  'egyptian','lebanese','moroccan','algerian','khaleeji','gulf','iraqi',
  'syrian','jordanian','yemeni','libyan','palestinian','saudi',
  'rai','chaabi','oriental','arabic folk',
]);
const LASTFM_TUNISIAN_TAGS = new Set([
  'tunisian','tunisian pop','tunisian music','tunisian folk',
  'malouf','mezoued','stambali','musique tunisienne',
]);

async function classifyWithLastFm(artist) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return null;

  try {
    const encoded = encodeURIComponent(artist);
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encoded}&api_key=${apiKey}&format=json`,
      { headers: { 'User-Agent': 'RadioMonastir/1.0' } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.error) return null; // artist not found

    const tags = (data?.toptags?.tag ?? [])
      .map(t => (t.name ?? '').toLowerCase().trim())
      .filter(t => t.length > 0);

    if (tags.length === 0) return null;

    // Tunisian checked first (more specific than generic "arabic")
    if (tags.some(t => LASTFM_TUNISIAN_TAGS.has(t) || t.includes('tunis'))) return 'TUNISIEN';
    if (tags.some(t => LASTFM_ARAB_TAGS.has(t)))                             return 'ORIENTAL';

    // Tags present but none are Arab → Western artist
    return 'OCCIDENTAL';
  } catch { return null; }
}

// ── MusicBrainz (last resort, country display) ────────────────────
async function getCountryFromMusicBrainz(artistName) {
  const strategies = [
    `artist:${encodeURIComponent(artistName)}`,
    encodeURIComponent(artistName),
  ];
  for (const q of strategies) {
    try {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=10`,
        { headers: { 'User-Agent': 'RadioMonastir/1.0 (contact@radio-monastir.tn)' } }
      );
      if (!res.ok) continue;
      const match = (await res.json())?.artists?.find(
        a => (a.score ?? 0) >= 70 && (a.country || a.area?.name)
      );
      if (match) return { code: match.country ?? null, name: match.area?.name ?? null };
    } catch { /* try next */ }
  }
  return null;
}

function classifyByCountry(code, name) {
  const c = (code ?? '').toUpperCase();
  const n = (name ?? '').toLowerCase();
  if (c === 'TN' || n.includes('tunisia')) return 'TUNISIEN';
  if (ARAB_CODES.has(c))                   return 'ORIENTAL';
  if (ARAB_NAMES.some(k => n.includes(k))) return 'ORIENTAL';
  if (c || n)                              return 'OCCIDENTAL';
  return null;
}

// ── Spotify (for spotifyId only) ──────────────────────────────────
let _spotifyToken = null;
let _spotifyExpiry = 0;

async function getSpotifyToken() {
  const { SPOTIFY_CLIENT_ID: cid, SPOTIFY_CLIENT_SECRET: csec } = process.env;
  if (!cid || !csec) return null;
  if (_spotifyToken && Date.now() < _spotifyExpiry) return _spotifyToken;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cid}:${csec}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  _spotifyToken = data.access_token;
  _spotifyExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _spotifyToken;
}

async function getArtistFromSpotify(title, artist) {
  try {
    const token = await getSpotifyToken();
    if (!token) return null;
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(`track:${title} artist:${artist}`)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const track = (await res.json())?.tracks?.items?.[0];
    if (!track) return null;
    return { spotifyId: track.id, artistName: track.artists?.[0]?.name ?? null };
  } catch { return null; }
}

// ── Public API ────────────────────────────────────────────────────
/**
 * Classification cascade (all free):
 *  1. Local heuristic  — instant, no API, covers ~90% of Arab/Tunisian music
 *  2. Last.fm API      — free forever, community tags, handles edge cases
 *  3. MusicBrainz      — last resort, country-based fallback
 *  4. Spotify          — spotifyId enrichment only (optional)
 */
async function classifySong(title, artist) {
  let genre         = null;
  let artistCountry = null;
  let spotifyId     = null;

  // Step 1: local heuristic (free, instant)
  genre = detectGenreLocally(title, artist);

  // Step 2: Last.fm — handles unknown artists the local heuristic misses
  if (!genre) {
    genre = await classifyWithLastFm(artist);
  }

  // Step 3: Spotify — get spotifyId (enrichment, doesn't affect genre)
  const spotifyData = await getArtistFromSpotify(title, artist);
  if (spotifyData) spotifyId = spotifyData.spotifyId;

  // Step 4: MusicBrainz — only when both local and Last.fm failed
  if (!genre) {
    const mbName   = spotifyData?.artistName || artist;
    const mbResult = await getCountryFromMusicBrainz(mbName);
    if (mbResult) {
      const mbGenre = classifyByCountry(mbResult.code, mbResult.name);
      genre = mbGenre;
      // Only show MB country if genre is consistent (avoids "United Kingdom" for Lebanese)
      if (mbGenre === genre || mbGenre === null) {
        artistCountry = mbResult.name ?? mbResult.code ?? null;
      }
    }
  }

  return { genre, artistCountry, spotifyId };
}

module.exports = { classifySong };
