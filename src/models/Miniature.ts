export enum Army {
  GONDOR = 'Gondor',
  ROHAN = 'Rohan',
  MORDOR = 'Mordor',
  ISENGARD = 'Isengard',
  MORIA = 'Moria',
  RIVENDELL = 'Rivendell',
  LOTHLORIEN = 'Lothlorien',
  MIRKWOOD = 'Mirkwood',
  THE_SHIRE = 'The Shire',
  THE_FELLOWSHIP = 'The Fellowship',
  HARAD = 'Harad',
  EASTERLINGS = 'Easterlings',
  ANGMAR = 'Angmar',
  ARNOR = 'Arnor',
  NUMENOR = 'Númenor',
  EREBOR = 'Erebor',
  IRON_HILLS = 'Iron Hills',
  AZOGS_HUNTERS = "Azog's Hunters",
  SERPENT_HORDE = 'Serpent Horde',
  CORSAIRS = 'Corsairs of Umbar',
  RANGERS = 'The Rangers',
  OTHER = 'Other'
}

export enum UnitType {
  HERO = 'Hero',
  WARRIOR = 'Warrior',
  MONSTER = 'Monster',
  CAVALRY = 'Cavalry',
  SIEGE = 'Siege Engine'
}

export enum PaintStatus {
  UNPAINTED = 'Unpainted',
  PRIMED = 'Primed',
  IN_PROGRESS = 'In Progress',
  PAINTED = 'Painted',
  BASED = 'Painted & Based'
}

export interface Miniature {
  id: string;
  name: string;
  army: Army;
  unitType: UnitType;
  quantity: number;
  paintStatus: PaintStatus;
  points?: number;
  notes?: string;
  dateAdded: string;
  imageUri?: string;
}

export const createMiniature = (
  name: string,
  army: Army,
  unitType: UnitType,
  quantity: number = 1,
  paintStatus: PaintStatus = PaintStatus.UNPAINTED,
  points?: number,
  notes?: string
): Miniature => {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name,
    army,
    unitType,
    quantity,
    paintStatus,
    points,
    notes,
    dateAdded: new Date().toISOString()
  };
};
