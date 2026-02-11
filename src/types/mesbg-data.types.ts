// MESBG Game Data Types

export type ArmyType = 'Good' | 'Evil' | 'Good (Legacy)' | 'Evil (Legacy)';

export type UnitType =
  | 'Hero of Legend'
  | 'Hero of Valour'
  | 'Hero of Fortitude'
  | 'Minor Hero'
  | 'Independent Hero'
  | 'Warrior'
  | 'Siege Engine';

export interface StatModifier {
  stat: string;
  mod: number;
  label: string;
}

export interface UnitOption {
  id: string;
  name: string;
  points: number;
  type?: string;
  included?: boolean;
  quantity?: number;
  min?: number;
  max?: number;
  mount_name?: string;
  modifiers?: StatModifier[];
  dependencies?: any; // Complex dependency structure, using any for flexibility
}

export interface MesbgUnit {
  model_id: string;
  army_type: ArmyType;
  army_list: string;
  profile_origin: string;
  name: string;
  unit_type: UnitType;
  base_points: number;
  unique?: boolean;
  legacy?: boolean;
  siege_crew: number;
  MWFW: string[][];
  warband_size: number;
  bow_limit?: boolean;
  opt_mandatory?: boolean;
  no_followers?: boolean;
  default_bow?: boolean;
  default_throw?: boolean;
  options: UnitOption[];
}

export interface MesbgData {
  [model_id: string]: MesbgUnit;
}

// Army List Data Types

export interface ArmyRule {
  description: string;
  troll_purchase?: boolean;
}

export interface SpecialRule {
  title: string;
  description: string;
  troll_purchase?: boolean;
}

export interface ArmyListData {
  additional_rules: ArmyRule[];
  special_rules: SpecialRule[];
  bow_limit: number;
  throw_limit: number;
  rule_highlights: string[];
  break_point?: number;
  legacy?: boolean;
}

export interface ArmyListDataCollection {
  [army_name: string]: ArmyListData;
}
