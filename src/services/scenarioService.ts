import rawData from '../data/scenarios_req.json';
import { Scenario, ScenarioSource } from '../types/scenario.types';

// Normalise the raw JSON into clean Scenario objects
const scenarios: Scenario[] = (rawData as any).data.map((s: any) => {
  const sources: ScenarioSource[] = (s.scenario_resources?.source ?? []).map((src: any) => ({
    id: src.id,
    title: src.title ?? '',
    book: src.book ?? '',
    issue: src.issue ?? null,
    page: src.page ?? 0,
  }));

  const avg_rating: number = typeof s.rating === 'number' ? s.rating : 0;

  return {
    id: s.id,
    name: s.name ?? '',
    size: s.size ?? 0,
    location: s.location ?? '',
    blurb: s.blurb ?? '',
    date_age: s.date_age ?? 0,
    date_year: s.date_year ?? 0,
    map_width: s.map_width ?? 0,
    map_height: s.map_height ?? 0,
    avg_rating,
    num_votes: s.num_votes ?? 0,
    sources,
  } as Scenario;
});

export const scenarioService = {
  getAll(): Scenario[] {
    return scenarios;
  },

  getById(id: number): Scenario | undefined {
    return scenarios.find(s => s.id === id);
  },

  getLocations(): string[] {
    return Array.from(new Set(scenarios.map(s => s.location))).sort();
  },

  getSourcebooks(): string[] {
    const titles = new Set<string>();
    scenarios.forEach(s => s.sources.forEach(src => {
      if (src.title) titles.add(src.title);
    }));
    return Array.from(titles).sort();
  },

  search(query: string): Scenario[] {
    const q = query.toLowerCase();
    return scenarios.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.blurb.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q)
    );
  },

  filterByLocation(location: string): Scenario[] {
    return scenarios.filter(s => s.location === location);
  },
};
