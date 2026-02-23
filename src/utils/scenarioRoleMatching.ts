import { CollectionItemView } from '../services/collectionViewService';
import { MesbgUnit } from '../types/mesbg-data.types';
import { canonicalizeNameToken } from './unitNameAliases';

export interface RoleLike {
  name: string;
  figures?: Array<{ name: string }>;
}

const NAME_STOP_WORDS = new Set(['and', 'or', 'with', 'a', 'an', 'the', 'of']);
const ALLOWED_EXTRA_NAME_TOKENS = new Set(['warrior']);

export function stripVariant(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
}

export function stripEquipment(name: string): string {
  return name.replace(/\s+with\s+[\w\s,&'/-]+$/i, '').trim().toLowerCase();
}

export function extractEquipment(name: string): string | null {
  const m = name.match(/\s+with\s+([\w\s,&'/-]+)$/i);
  return m ? m[1].trim() : null;
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
  return stripVariant(stripEquipment(name)).replace(/\s+/g, ' ').trim().toLowerCase();
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

function namesEqualForUnit(unit: MesbgUnit, requiredName: string, contextName?: string): boolean {
  if (isHeroUnitType(unit.unit_type)) {
    return normalizeHeroBaseName(unit.name) === normalizeHeroBaseName(requiredName);
  }
  return namesEqualByBase(unit.name, requiredName, contextName);
}

function namesEqualForUnitType(unitName: string, unitType: string | undefined, requiredName: string, contextName?: string): boolean {
  if (isHeroUnitType(unitType)) {
    return normalizeHeroBaseName(unitName) === normalizeHeroBaseName(requiredName);
  }
  return namesEqualByBase(unitName, requiredName, contextName);
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
  const ignoreEquipment = isHeroUnitType(item.unit_data?.unit_type ?? item.unit_type);

  // Prefer explicit role base name first, then figure names.
  const roleEquipment = extractEquipment(role.name);
  if (namesEqualForUnitType(unitName, item.unit_data?.unit_type ?? item.unit_type, role.name)) {
    if (ignoreEquipment || roleEquipment === null || itemHasEquipment(item, roleEquipment)) return true;
  }

  for (const fig of role.figures ?? []) {
    const equip = extractEquipment(fig.name);
    if (namesEqualForUnitType(unitName, item.unit_data?.unit_type ?? item.unit_type, fig.name, role.name)) {
      if (ignoreEquipment || equip === null || itemHasEquipment(item, equip)) return true;
    }
  }

  return false;
}

export function findOptionIdForEquipment(unit: MesbgUnit, equipment: string): string | undefined {
  const alternatives = splitEquipmentAlternatives(equipment).map(normalizeEquipWords).filter(words => words.length > 0);
  for (const requiredWords of alternatives) {
    const requiredSet = new Set(requiredWords);
    const match = unit.options.find(opt => {
      const optionWords = normalizeEquipWords(opt.name);
      return optionWords.length > 0 && Array.from(requiredSet).every(word => optionWords.includes(word));
    });
    if (match) return match.id;
  }
  return undefined;
}

function pickRoleCandidate(candidates: MesbgUnit[], equipment: string | null): MesbgUnit | undefined {
  if (candidates.length === 0) return undefined;
  if (!equipment) return candidates[0];

  const heroCandidate = candidates.find(c => isHeroUnitType(c.unit_type));
  if (heroCandidate) return heroCandidate;

  const withEquipment = candidates.find(c => findOptionIdForEquipment(c, equipment) !== undefined);
  if (withEquipment) return withEquipment;
  if (candidates.length === 1) return candidates[0];
  return undefined;
}

export function findUnitForRole(role: RoleLike, allUnits: MesbgUnit[]): MesbgUnit | undefined {
  const roleEquipment = extractEquipment(role.name);

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
