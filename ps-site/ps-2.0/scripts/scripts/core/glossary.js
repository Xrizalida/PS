// Словарь нот: «ладан» → «дымный, церковный, медитативный» (Просто) или профессиональное описание (Нотами).
// Совпадение ищется по началу слова; «=» в словаре — только целое слово. Берётся самое длинное совпадение.

const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е');
const isLetter = (ch) => ch != null && /[a-zа-я0-9]/i.test(ch);

export function createGlossary(json) {
  const keys = [];
  for (const entry of json.notes) {
    for (const m of entry.match) {
      const exact = m.startsWith('=');
      keys.push({ key: norm(exact ? m.slice(1) : m), exact, entry });
    }
  }
  keys.sort((a, b) => b.key.length - a.key.length);

  function lookup(note) {
    const n = norm(note);
    for (const { key, exact, entry } of keys) {
      let from = 0;
      while (true) {
        const i = n.indexOf(key, from);
        if (i < 0) break;
        const startOk = i === 0 || !isLetter(n[i - 1]);
        const endOk = !exact || !isLetter(n[i + key.length]);
        if (startOk && endOk) return entry;
        from = i + 1;
      }
    }
    return null;
  }

  // Первая расшифровываемая нота слоя — для блока «Как он пахнет» в режиме «Просто».
  function layer(notes) {
    const seen = new Set();
    const out = [];
    for (const note of notes ?? []) {
      const e = lookup(note);
      if (!e || seen.has(e.id)) continue;
      seen.add(e.id);
      out.push({ note, entry: e });
    }
    return out;
  }

  return { lookup, layer };
}
