// Shared build-score logic: derives Power/Handling/Style/Rarity from a build's
// unlocked upgrades, instead of letting those numbers be set by hand.
// Used by build-submit.html (live calculator) and build-detail.html (display).

const MOD_WEIGHTS = {
  'Suspension':    { handling: 10, style: 2 },
  'Aero':          { handling: 6,  style: 7,  rarity: 4 },
  'Wheels & Tires':{ handling: 7,  style: 6 },
  'Exterior':      { style: 9,     rarity: 4 },
  'Interior':      { style: 7,     rarity: 2 },
  'Engine':        { power: 11,    rarity: 3 },
  'Braking':       { handling: 9,  power: 2 },
  'Mechanical':    { power: 5,     rarity: 2 }
};

const BASE_STAT = 8; // every car starts here — stock, before any logged upgrades
const RARITY_PER_CATEGORY = 2; // touching more distinct categories reads as a more complete build

function computeStatsFromMods(mods, nudge) {
  nudge = nudge || {};
  const stats = { power: BASE_STAT, handling: BASE_STAT, style: BASE_STAT, rarity: BASE_STAT };
  const installed = mods.filter(m => m.unlocked);

  installed.forEach(m => {
    const w = MOD_WEIGHTS[m.cat];
    if (!w) return;
    Object.keys(w).forEach(k => { stats[k] += w[k]; });
  });

  const distinctCats = new Set(installed.map(m => m.cat)).size;
  stats.rarity += distinctCats * RARITY_PER_CATEGORY;

  Object.keys(stats).forEach(k => {
    stats[k] = Math.max(0, Math.min(100, Math.round(stats[k] + (nudge[k] || 0))));
  });

  return stats;
}

function computeOverall(stats) {
  return Math.round((stats.power + stats.handling + stats.style + stats.rarity) / 4);
}

function computeRarityLabel(overall) {
  if (overall >= 70) return 'LEGENDARY';
  if (overall >= 40) return 'RARE';
  return 'COMMON';
}
