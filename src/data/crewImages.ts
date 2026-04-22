// NASA astronaut portraits — public domain, served via Wikimedia Commons FilePath API
// commons.wikimedia.org/wiki/Special:FilePath/[filename] is a stable redirect to the actual image
const fp = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`

export const CREW_IMAGES: Record<string, string> = {
  // Challenger STS-51-L
  "Francis 'Dick' Scobee": fp('Francis_R._Scobee.jpg'),
  'Michael J. Smith':      fp('Michael_J._Smith.jpg'),
  'Judith Resnik':         fp('Judith_A._Resnik.jpg'),
  'Ellison Onizuka':       fp('Ellison_Onizuka.jpg'),
  'Ronald McNair':         fp('Ronald_McNair.jpg'),
  'Gregory Jarvis':        fp('Gregory_Jarvis.jpg'),
  'S. Christa McAuliffe':  fp('Christa_McAuliffe.jpg'),

  // Columbia STS-107
  'Rick Husband':     fp('Rick_D._Husband.jpg'),
  'William McCool':   fp('William_C._McCool.jpg'),
  'Michael Anderson': fp('Michael_P._Anderson.jpg'),
  'Kalpana Chawla':   fp('Kalpana_Chawla,_NASA_photo_portrait.jpg'),
  'David Brown':      fp('David_McDowell_Brown.jpg'),
  'Laurel Clark':     fp('Laurel_Blair_Salton_Clark.jpg'),
  'Ilan Ramon':       fp('Ilan_Ramon.jpg'),
}
