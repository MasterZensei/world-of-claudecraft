// Delve Phase 4 strings — merged into src/ui/i18n.ts (English source; other locales use English fallback until translated).

function normalizeDelveText(text: string): string {
  return text.replace(/\$N/g, '{playerName}').replace(/\$C/g, '{className}');
}

const delveUiEnRaw = {  board: {
    title: 'Delve Board',
    enter: 'Enter Delve',
    enterAria: 'Enter {delve} on {tier} difficulty',
    openDelve: 'Collapsed Reliquary',
    openDelveAria: 'Open Delve Board from {name}',
    marks: 'Delve Marks: {count}',
    minLevel: 'Requires Level {level}',
    tier: {
      normal: 'Normal',
      heroic: 'Heroic',
    },
    companion: {
      pick: 'Choose a companion',
      tessa: 'Acolyte Tessa',
      rank: 'Rank {rank}',
    },
  },
  tracker: {
    title: 'Delve',
    objective: 'Objective',
    module: 'Module {current} of {total}',
    affix: 'Affixes',
    complete: 'Complete',
    marks: 'Delve Marks: {count}',
  },
  objective: {
    kill_boss: 'Slay {boss}',
    recover_artifact: 'Recover the burial ledger',
  },
  summary: {
    title: 'Delve Complete',
    marks: '{count} Delve Marks earned',
    loreUnlock: 'Lore unlocked: {title}',
  },
  death: {
    warning: 'One more death will end this delve run.',
  },
  run: {
    failed: 'The delve run has failed. You are returned to Brother Halven.',
  },
  npc: {
    halven: {
      greeting:
        'The reliquary below has shifted again. We hear chanting through the floor after midnight, and Acolyte Tessa swears the burial ledgers are changing their own ink. If you have courage enough, $N, take a candle and go below. Do not trust every voice you hear down there. Some of them knew your name before you were born.',
    },
  },
  intro: {
    normal:
      'The stairwell is cold and dark. Broken saint-stones litter the descent, and a soft bell note hangs in the damp air. Acolyte Tessa whispers, "The reliquary should not be open this far. Stay close, $N."',
    heroic:
      'The doors groan shut behind you. Names scrape across the stone like fingernails. Tessa\'s candle burns blue. "They are not calling the dead now, $N. They are answering something."',
  },
  module: {
    reliquary_sunken_ossuary: 'Water seeps through burial shelves, carrying old ash in silver-black streams.',
    reliquary_bell_niche: 'Dozens of handbells hang in silence, each tied with funeral cloth.',
    reliquary_saintless_hall: 'Statues with faces chiseled away with careful hatred.',
    reliquary_finale: 'The buried bell tolls once beneath your boots.',
  },
  companion: {
    tessa: {
      combat_start: 'Keep your footing, $N. The dead are restless here.',
      low_hp: 'Breathe. I still have prayers left for you.',
      trap_spotted: 'Hold — something in the floor remembers footsteps.',
      boss_pull: 'That bell knows your weight, $N. Do not kneel.',
      completion: 'The ledger can rest another night. Well done.',
      rank: {
        1: 'Chapel Novice',
        2: 'Candle-Bearer',
        3: 'Reliquary Acolyte',
        4: 'Gravecall Witness',
        5: 'Chapel Warden',
      },
    },
  },
  boss: {
    varric: {
      bell: {
        emote: 'Deacon Varric grips the buried bell with both hands!',
        log: 'Deacon Varric begins to toll the burial bell.',
        warning: 'Move away from Deacon Varric!',
        impact: 'The bell\'s toll cracks the chamber floor!',
        lesson: 'Bell Toll — a ground slam every twelve seconds. Move out before it lands.',
      },
      raise: {
        emote: 'Deacon Varric calls names from the broken graves!',
        log: 'Deacon Varric begins Raise Dead.',
        warning: 'Stop the grave rite!',
        object: 'The cracked grave shudders with stolen breath.',
        interrupt_ok: 'The grave rite falters.',
        interrupt_fail: 'The dead answer Deacon Varric\'s call!',
        lesson: 'Interrupt the cracked grave within five seconds or bonewalkers rise.',
      },
      pull: 'You step on hallowed dust with unclean purpose. Kneel, and be counted.',
      intro: 'No soul is lost. Only misplaced.',
      mid60: 'Deacon Varric reads names from the ledger with shaking triumph.',
      mid30: 'The burial bell answers every name he speaks.',
      defeat: 'No... I had the names... I had them all...',
    },
  },
  lore: {
    eastbrook_ledger:
      'A water-stained page from Eastbrook\'s burial ledger. Names crossed out and rewritten in a hand that is not human.',
    first_collapse:
      'Chapel records note the first sinkage: saint-stones cracked, shelves tilted, and a bell-note heard from below ground.',
    gravecaller_mark:
      'A sigil scraped into coffin wood — not Morthen\'s seal, but an older gravecaller mark predating the Hollow Crypt.',
    bell_below:
      'Tessa\'s margin note: "There is a second bell under the reliquary. It tolls for the misplaced, not the dead."',
    tessa_note:
      'Folded scrap in Tessa\'s script: "If the ledgers change while we are below, trust the candle, not the voices."',
  },
  affix: {
    restless_graves: 'Restless Graves',
    bad_air: 'Bad Air',
    candleblind: 'Candleblind',
    old_mechanisms: 'Old Mechanisms',
    flooded_paths: 'Flooded Paths',
    grave_tax: 'Grave Tax',
    unstable_roof: 'Unstable Roof',
    cult_remnants: 'Cult Remnants',
  },
  blessing: {
    chapel_candle: 'Chapel Candle — safer run, one fewer Mark on completion.',
  },
  chest: {
    flavor: 'The dead have surrendered what they can spare.',
  },
} as const;

function normalizeDelveUi<T>(value: T): T {
  if (typeof value === 'string') return normalizeDelveText(value) as T;
  if (Array.isArray(value)) return value.map((entry) => normalizeDelveUi(entry)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = normalizeDelveUi(entry);
    return out as T;
  }
  return value;
}

export const delveUiEn = normalizeDelveUi(delveUiEnRaw);

export const delvePhase4EntitiesEn = {
  npcs: {
    brother_halven: {
      name: 'Brother Halven',
      title: 'Chapel Custodian',
      greeting: delveUiEn.npc.halven.greeting,
    },
  },  mobs: {
    deacon_varric: { name: 'Deacon Varric' },
    acolyte_tessa: { name: 'Acolyte Tessa' },
    reliquary_bonewalker: { name: 'Raised Bonewalker' },
    reliquary_shambler: { name: 'Reliquary Shambler' },
    reliquary_acolyte: { name: 'Reliquary Acolyte' },
    reliquary_widow: { name: 'Bell Niche Widow' },
    placeholder_boss: { name: 'Trial Warden' },
  },
  delves: {
    collapsed_reliquary: {
      name: 'The Collapsed Reliquary',
      enterText:
        'You take a candle from Brother Halven and descend the shifted stairwell into the Collapsed Reliquary.',
      leaveText:
        'You climb back to the chapel ruin, the bell-note fading behind you.',
    },
    delve_placeholder: {
      name: 'Shallow Trial Crypt',
      enterText: 'You descend into the shallow trial crypt.',
      leaveText: 'You climb back to the surface.',
    },
  },
} as const;

export const delvePhase4ExtraEn = {
  delveUi: delveUiEn,
  ...delvePhase4EntitiesEn,
};

export type DelvePhase4Extra = typeof delvePhase4ExtraEn;

function englishDelvePhase4Fallback(): DelvePhase4Extra {
  return delvePhase4ExtraEn;
}

export const delvePhase4Extra = {
  en: delvePhase4ExtraEn,
  es: englishDelvePhase4Fallback(),
  es_ES: englishDelvePhase4Fallback(),
  fr_FR: englishDelvePhase4Fallback(),
  fr_CA: englishDelvePhase4Fallback(),
  en_CA: delvePhase4ExtraEn,
  it_IT: englishDelvePhase4Fallback(),
  de_DE: englishDelvePhase4Fallback(),
  zh_CN: englishDelvePhase4Fallback(),
  zh_TW: englishDelvePhase4Fallback(),
  ko_KR: englishDelvePhase4Fallback(),
  ja_JP: englishDelvePhase4Fallback(),
  pt_BR: englishDelvePhase4Fallback(),
  ru_RU: englishDelvePhase4Fallback(),
};
