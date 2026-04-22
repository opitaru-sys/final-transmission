// NASA astronaut portraits — public domain, via Wikimedia Commons
// Direct thumbnail URLs (600px width) avoid the Special:FilePath redirect chain
// which was producing 404s due to stale or incorrect filenames.
const t = (hash: string, file: string) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash}/${file}/600px-${file}`

export const CREW_IMAGES: Record<string, string> = {
  // ── Challenger STS-51-L ───────────────────────────────────────────────────
  "Francis 'Dick' Scobee": t('4/42', 'Scobee-fr.jpg'),
  'Michael J. Smith':      t('a/a8', 'Michael_Smith_%28NASA%29.jpg'),
  'Judith Resnik':         t('1/1f', 'Judith_A._Resnik%2C_official_portrait_%28cropped%29.jpg'),
  'Ellison Onizuka':       t('c/ce', 'Ellison_Shoji_Onizuka_%28NASA%29.jpg'),
  'Ronald McNair':         t('0/08', 'Ronald_Erwin_McNair.jpg'),
  'Gregory Jarvis':        t('1/13', 'Gregory_Jarvis_%28NASA%29_cropped.jpg'),
  'S. Christa McAuliffe':  t('4/4a', 'Christa_McAuliffe.jpg'),

  // ── Columbia STS-107 ─────────────────────────────────────────────────────
  'Rick Husband':     t('2/20', 'Richard_Husband%2C_NASA_photo_portrait_in_orange_suit.jpg'),
  'William McCool':   t('c/c5', 'William_Cameron_McCool.jpg'),
  'Michael Anderson': t('5/59', 'Michael_P._Anderson%2C_official_portrait.jpg'),
  'Kalpana Chawla':   t('9/9c', 'Kalpana_Chawla%2C_NASA_photo_portrait_in_orange_suit.jpg'),
  'David Brown':      t('0/04', 'David_M._Brown%2C_NASA_photo_portrait_in_orange_suit.jpg'),
  'Laurel Clark':     t('2/24', 'Laurel_Clark%2C_NASA_photo_portrait_in_blue_suit.jpg'),
  'Ilan Ramon':       t('4/48', 'Ilan_Ramon%2C_NASA_photo_portrait_in_orange_suit.jpg'),
}
