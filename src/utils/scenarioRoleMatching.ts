import { CollectionItemView } from '../services/collectionViewService';
import { MesbgUnit } from '../types/mesbg-data.types';
import { canonicalizeNameToken } from './unitNameAliases';
import FIGURE_ID_MAP from '../data/figure_id_to_model_ids.json';

const figureIdMap = FIGURE_ID_MAP as Record<string, string[]>;

export interface RoleLike {
  name: string;
  figures?: Array<{ name: string; figure_id?: number }>;
}

const NAME_STOP_WORDS = new Set(['and', 'or', 'with', 'a', 'an', 'the', 'of']);
const ALLOWED_EXTRA_NAME_TOKENS = new Set(['warrior']);

export function stripVariant(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
}

export function stripEquipment(name: string): string {
  // Strip both "with <equipment>" and "on <mount>" suffixes
  return name
    .replace(/\s+with\s+[\w\s,&'/-]+$/i, '')
    .replace(/\s+on\s+[\w\s-]+$/i, '')
    .trim()
    .toLowerCase();
}

export function extractEquipment(name: string): string | null {
  const m = name.match(/\s+with\s+([\w\s,&'/-]+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Scenario role / figure names that don't match any database unit name.
 * Maps the stripped base name → the canonical database unit name to use instead.
 */
const FIGURE_BASE_NAME_ALIASES: Record<string, string> = {
  'ranger of middle earth': 'ranger of the north',
  'ranger of middle-earth': 'ranger of the north',
};

function resolveNameAlias(name: string): string {
  const stripped = stripVariant(stripEquipment(name));
  return FIGURE_BASE_NAME_ALIASES[stripped] ?? name;
}

function singularize(word: string): string {
  const irregular: Record<string, string> = {
    men: 'man',
    women: 'woman',
    elves: 'elf',
    dwarves: 'dwarf',
    knives: 'knife',
    wolves: 'wolf',
  };
  if (irregular[word]) return irregular[word];
  if (word.endsWith('ies') && word.length > 3) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ves') && word.length > 3) return `${word.slice(0, -3)}f`;
  if (
    word.endsWith('s') &&
    !word.endsWith('ss') &&
    !word.endsWith('rs') &&
    !word.endsWith('as') &&
    !word.endsWith('is') &&
    !word.endsWith('us') &&
    word.length > 3
  ) {
    return word.slice(0, -1);
  }
  return word;
}

function normalizeNameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !NAME_STOP_WORDS.has(w))
    .map(singularize);
}

function normalizeCanonicalNameTokens(s: string): string[] {
  return normalizeNameTokens(s).map(canonicalizeNameToken);
}

function normalizeEquipWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !NAME_STOP_WORDS.has(w));
}

function splitEquipmentAlternatives(equipment: string): string[] {
  return equipment
    .split(/\s+or\s+/i)
    .map(s => s.trim())
    .filter(Boolean);
}

function wordsIncluded(required: string[], availableSet: Set<string>): boolean {
  return required.every(word => availableSet.has(word));
}

function isHeroUnitType(unitType?: string): boolean {
  return typeof unitType === 'string' && unitType.toLowerCase().includes('hero');
}

function normalizeHeroBaseName(name: string): string {
  let s = stripVariant(name);
  s = stripEquipment(s);
  s = s.replace(/^the\s+/i, '').trim();
  return s.replace(/\s+/g, ' ').toLowerCase();
}

function namesEqualByBase(unitName: string, requiredName: string, contextName?: string): boolean {
  const unitTokens = normalizeCanonicalNameTokens(stripVariant(unitName));
  const requiredTokens = normalizeCanonicalNameTokens(stripVariant(stripEquipment(requiredName)));
  if (unitTokens.length === 0 || requiredTokens.length === 0) return false;

  const neededTokens = new Set(requiredTokens);
  if (contextName && requiredTokens.length <= 1) {
    normalizeCanonicalNameTokens(stripVariant(stripEquipment(contextName))).forEach(t => neededTokens.add(t));
  }

  const unitTokenSet = new Set(unitTokens);
  if (!Array.from(neededTokens).every(t => unitTokenSet.has(t))) return false;

  const extras = unitTokens.filter(t => !neededTokens.has(t));
  return extras.every(t => ALLOWED_EXTRA_NAME_TOKENS.has(t));
}

function namesEqualByLooseWarriorBase(unitName: string, requiredName: string, contextName?: string): boolean {
  const unitTokens = normalizeCanonicalNameTokens(stripVariant(unitName));
  const requiredTokens = normalizeCanonicalNameTokens(stripVariant(stripEquipment(requiredName)));
  if (unitTokens.length === 0 || requiredTokens.length === 0) return false;

  const neededTokens = new Set(requiredTokens);
  if (contextName && requiredTokens.length <= 1) {
    normalizeCanonicalNameTokens(stripVariant(stripEquipment(contextName))).forEach(t => neededTokens.add(t));
  }

  const unitTokenSet = new Set(unitTokens);
  if (!Array.from(neededTokens).every(t => unitTokenSet.has(t))) return false;

  // Prevent generic roles like "Orc with spear" from matching specialists such as trackers/drummers.
  if (neededTokens.size <= 1 && !unitTokenSet.has('warrior')) return false;
  return true;
}

function namesEqualForUnit(unit: MesbgUnit, requiredName: string, contextName?: string): boolean {
  const resolved = resolveNameAlias(requiredName);
  if (isHeroUnitType(unit.unit_type)) {
    return normalizeHeroBaseName(unit.name) === normalizeHeroBaseName(resolved);
  }
  return (
    namesEqualByBase(unit.name, resolved, contextName) ||
    (unit.unit_type === 'Warrior' && namesEqualByLooseWarriorBase(unit.name, resolved, contextName))
  );
}

function namesEqualForUnitType(unitName: string, unitType: string | undefined, requiredName: string, contextName?: string): boolean {
  const resolved = resolveNameAlias(requiredName);
  if (isHeroUnitType(unitType)) {
    return normalizeHeroBaseName(unitName) === normalizeHeroBaseName(resolved);
  }
  return (
    namesEqualByBase(unitName, resolved, contextName) ||
    (unitType === 'Warrior' && namesEqualByLooseWarriorBase(unitName, resolved, contextName))
  );
}

function itemHasEquipment(item: CollectionItemView, equipment: string): boolean {
  const selectedIds = new Set(item.selected_options ?? []);
  const selectedWords = new Set<string>();

  (item.unit_data?.options ?? []).forEach(opt => {
    if (!selectedIds.has(opt.id)) return;
    normalizeEquipWords(opt.name).forEach(word => selectedWords.add(word));
  });

  return splitEquipmentAlternatives(equipment).some(alt => {
    const requiredWords = normalizeEquipWords(alt);
    return requiredWords.length > 0 && wordsIncluded(requiredWords, selectedWords);
  });
}

export function collectionItemMatchesRole(item: CollectionItemView, role: RoleLike): boolean {
  const unitName = item.unit_data?.name ?? item.display_name;
  const unitType = item.unit_data?.unit_type ?? item.unit_type;
  const ignoreEquipment = isHeroUnitType(unitType);
  // Items with no selected options are treated as generic — they can satisfy any equipment variant.
  // Equipment is only enforced when the user has explicitly recorded which options a model carries.
  const hasSelectedOptions = (item.selected_options?.length ?? 0) > 0;

  // Fast path: match by figure_id → model_id mapping (covers 579/604 scenario figures).
  if (item.model_id) {
    for (const fig of role.figures ?? []) {
      if (!fig.figure_id) continue;
      const mappedIds = figureIdMap[String(fig.figure_id)];
      if (mappedIds?.includes(item.model_id)) {
        const equip = extractEquipment(fig.name);
        if (ignoreEquipment || equip === null || !hasSelectedOptions || itemHasEquipment(item, equip)) return true;
      }
    }
  }

  // Fall back to name-based matching for unmapped figures.
  const roleEquipment = extractEquipment(role.name);
  if (namesEqualForUnitType(unitName, unitType, role.name)) {
    if (ignoreEquipment || roleEquipment === null || !hasSelectedOptions || itemHasEquipment(item, roleEquipment)) return true;
  }

  for (const fig of role.figures ?? []) {
    const equip = extractEquipment(fig.name);
    if (namesEqualForUnitType(unitName, unitType, fig.name, role.name)) {
      if (ignoreEquipment || equip === null || !hasSelectedOptions || itemHasEquipment(item, equip)) return true;
    }
  }

  return false;
}

export function findOptionIdForEquipment(unit: MesbgUnit, equipment: string): string | undefined {
  const optionIds = findOptionIdsForEquipment(unit, equipment);
  return optionIds?.[0];
}

function pickOptionIdsForWords(unit: MesbgUnit, requiredWords: string[]): string[] | undefined {
  const uncovered = new Set(requiredWords);
  const picked = new Set<string>();

  while (uncovered.size > 0) {
    let bestOptId: string | undefined;
    let bestCoverage = 0;

    for (const opt of unit.options) {
      if (picked.has(opt.id)) continue;
      const optionWords = normalizeEquipWords(opt.name);
      if (optionWords.length === 0) continue;

      let covered = 0;
      for (const word of uncovered) {
        if (optionWords.includes(word)) covered++;
      }
      if (covered > bestCoverage) {
        bestCoverage = covered;
        bestOptId = opt.id;
      }
    }

    if (!bestOptId || bestCoverage === 0) return undefined;
    picked.add(bestOptId);
    const chosenWords = new Set(normalizeEquipWords(unit.options.find(o => o.id === bestOptId)!.name));
    Array.from(uncovered).forEach(word => {
      if (chosenWords.has(word)) uncovered.delete(word);
    });
  }

  return Array.from(picked);
}

export function findOptionIdsForEquipment(unit: MesbgUnit, equipment: string): string[] | undefined {
  const alternatives = splitEquipmentAlternatives(equipment)
    .map(normalizeEquipWords)
    .filter(words => words.length > 0);

  for (const requiredWords of alternatives) {
    const ids = pickOptionIdsForWords(unit, requiredWords);
    if (ids && ids.length > 0) return ids;
  }
  return undefined;
}

function pickRoleCandidate(candidates: MesbgUnit[], equipment: string | null): MesbgUnit | undefined {
  if (candidates.length === 0) return undefined;
  if (!equipment) return candidates[0];

  const heroCandidate = candidates.find(c => isHeroUnitType(c.unit_type));
  if (heroCandidate) return heroCandidate;

  const withEquipment = candidates.find(c => findOptionIdsForEquipment(c, equipment) !== undefined);
  if (withEquipment) return withEquipment;
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

export function findUnitForRole(role: RoleLike, allUnits: MesbgUnit[]): MesbgUnit | undefined {
  const roleEquipment = extractEquipment(role.name);

  // Fast path: use figure_id mapping to locate the canonical unit directly.
  for (const fig of role.figures ?? []) {
    if (!fig.figure_id) continue;
    const mappedIds = figureIdMap[String(fig.figure_id)];
    if (!mappedIds) continue;
    const figureEquipment = extractEquipment(fig.name);
    const candidates = allUnits.filter(u => mappedIds.includes(u.model_id));
    if (candidates.length === 0) continue;
    const result = pickRoleCandidate(candidates, figureEquipment ?? roleEquipment);
    if (result) return result;
  }

  // Fall back to name matching.
  const byRoleName = allUnits.filter(u => namesEqualForUnit(u, role.name));
  if (byRoleName.length > 0) {
    return pickRoleCandidate(byRoleName, roleEquipment);
  }

  for (const fig of role.figures ?? []) {
    const figureEquipment = extractEquipment(fig.name);
    const candidates = allUnits.filter(u => namesEqualForUnit(u, fig.name, role.name));
    if (candidates.length === 0) continue;
    const byFigure = pickRoleCandidate(candidates, figureEquipment);
    if (byFigure) return byFigure;
    const byRole = pickRoleCandidate(candidates, roleEquipment);
    if (byRole) return byRole;
  }
  return undefined;
}

export interface RoleUnitSearchDebug {
  unit?: MesbgUnit;
  sourceName: string;
  baseQuery: string;
}

export function findUnitForRoleDebug(role: RoleLike, allUnits: MesbgUnit[]): RoleUnitSearchDebug {
  const roleEquipment = extractEquipment(role.name);
  const roleBaseQuery = stripVariant(stripEquipment(role.name));

  // Fast path: use figure_id mapping.
  for (const fig of role.figures ?? []) {
    if (!fig.figure_id) continue;
    const mappedIds = figureIdMap[String(fig.figure_id)];
    if (!mappedIds) continue;
    const figureEquipment = extractEquipment(fig.name);
    const figureBaseQuery = stripVariant(stripEquipment(fig.name));
    const candidates = allUnits.filter(u => mappedIds.includes(u.model_id));
    if (candidates.length === 0) continue;
    const result = pickRoleCandidate(candidates, figureEquipment ?? roleEquipment);
    if (result) return { unit: result, sourceName: fig.name, baseQuery: figureBaseQuery };
  }

  // Fall back to name matching.
  const byRoleName = allUnits.filter(u => namesEqualForUnit(u, role.name));
  if (byRoleName.length > 0) {
    const match = pickRoleCandidate(byRoleName, roleEquipment);
    if (match) return { unit: match, sourceName: role.name, baseQuery: roleBaseQuery };
    return { sourceName: role.name, baseQuery: roleBaseQuery };
  }

  for (const fig of role.figures ?? []) {
    const figureEquipment = extractEquipment(fig.name);
    const figureBaseQuery = stripVariant(stripEquipment(fig.name));
    const candidates = allUnits.filter(u => namesEqualForUnit(u, fig.name, role.name));
    if (candidates.length === 0) continue;
    const byFigure = pickRoleCandidate(candidates, figureEquipment);
    if (byFigure) return { unit: byFigure, sourceName: fig.name, baseQuery: figureBaseQuery };
    const byRole = pickRoleCandidate(candidates, roleEquipment);
    if (byRole) return { unit: byRole, sourceName: fig.name, baseQuery: figureBaseQuery };
  }
  return { sourceName: role.name, baseQuery: roleBaseQuery };
}
