export interface ScenarioSource {
  id: number;
  title: string;
  book: string;
  issue: string | null;
  page: number;
}

export interface Scenario {
  id: number;
  name: string;
  size: number;        // total models needed
  location: string;   // e.g. "eriador", "mordor"
  blurb: string;
  date_age: number;   // 1=FA, 2=SA, 3=TA
  date_year: number;
  map_width: number;
  map_height: number;
  avg_rating: number;
  num_votes: number;
  sources: ScenarioSource[];
}

export const LOCATION_LABELS: Record<string, string> = {
  amon_hen: 'Amon Hen',
  arnor: 'Arnor',
  dale: 'Dale',
  dol_guldur: 'Dol Guldur',
  erebor: 'Erebor',
  eriador: 'Eriador',
  fangorn: 'Fangorn',
  fornost: 'Fornost',
  goblintown: 'Goblin-town',
  gondor: 'Gondor',
  harad: 'Harad',
  harondor: 'Harondor',
  helms_deep: "Helm's Deep",
  isengard: 'Isengard',
  ithilien: 'Ithilien',
  laketown: 'Lake-town',
  lothlorien: 'Lothlórien',
  minas_morgul: 'Minas Morgul',
  minas_tirith: 'Minas Tirith',
  mirkwood: 'Mirkwood',
  morannon: 'Morannon',
  mordor: 'Mordor',
  moria: 'Moria',
  orthanc: 'Orthanc',
  osgiliath: 'Osgiliath',
  rhovanion: 'Rhovanion',
  rhun: 'Rhûn',
  rohan: 'Rohan',
  the_shire: 'The Shire',
  weathertop: 'Weathertop',
};

export const AGE_LABELS: Record<number, string> = {
  1: 'FA',
  2: 'SA',
  3: 'TA',
};
