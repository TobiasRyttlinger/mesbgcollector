// User Collection Model - tracks owned miniatures

export enum PaintStatus {
  UNPAINTED = 'Unpainted',
  PRIMED = 'Primed',
  IN_PROGRESS = 'In Progress',
  PAINTED = 'Painted',
  BASED = 'Painted & Based'
}

export interface CollectionItem {
  id: string; // Unique ID for this collection entry
  model_id: string; // Reference to MesbgUnit.model_id
  owned_quantity: number;
  painted_quantity: number;
  paint_status: PaintStatus;
  notes?: string;
  date_added: string;
  purchase_date?: string;
  storage_location?: string;
  custom_name?: string; // Optional: custom name override
}

export const createCollectionItem = (
  model_id: string,
  owned_quantity: number = 1,
  paint_status: PaintStatus = PaintStatus.UNPAINTED,
  notes?: string
): CollectionItem => {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    model_id,
    owned_quantity,
    painted_quantity: 0,
    paint_status,
    notes,
    date_added: new Date().toISOString()
  };
};
