import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import scenariosCombinedData from '../src/data/scenarios_roles_without_legacy.json';
import { collectionStorage } from '../src/services/collectionStorage';
import { CollectionItemView, collectionViewService } from '../src/services/collectionViewService';
import { mesbgDataService } from '../src/services/mesbgDataService';
import { scenarioService } from '../src/services/scenarioService';
import { MesbgUnit } from '../src/types/mesbg-data.types';
import { AGE_LABELS, LOCATION_LABELS, Scenario } from '../src/types/scenario.types';
import { collectionItemMatchesRole, findUnitForRole } from '../src/utils/scenarioRoleMatching';

const rolesLookup = Object.fromEntries(
  (((scenariosCombinedData as any).data ?? []) as any[]).map(s => [String(s.id), s.scenario_factions ?? []])
) as Record<string, any[]>;
let knownUnitScenarioIdsCache: Set<number> | null = null;
let knownUnitScenarioIdsBuildPromise: Promise<Set<number>> | null = null;
let knownUnitScenarioBuildProgress = 0;

function buildKnownUnitScenarioIds(allUnits: MesbgUnit[]): Promise<Set<number>> {
  if (knownUnitScenarioIdsCache) return Promise.resolve(knownUnitScenarioIdsCache);
  if (knownUnitScenarioIdsBuildPromise) return knownUnitScenarioIdsBuildPromise;

  knownUnitScenarioIdsBuildPromise = new Promise(resolve => {
    const scenarios = scenarioService.getAll();
    const known = new Set<number>();
    let idx = 0;
    const batchSize = 12;
    knownUnitScenarioBuildProgress = 0;

    const runBatch = () => {
      const end = Math.min(idx + batchSize, scenarios.length);
      for (; idx < end; idx++) {
        const s = scenarios[idx];
        const factions = (rolesLookup[String(s.id)] ?? []).filter((f: any) => (f.roles ?? []).length > 0);
        if (factions.length === 0) continue;
        const hasUnknown = factions.some((faction: any) =>
          (faction.roles as any[]).some((role: any) => !findUnitForRole(role, allUnits))
        );
        if (!hasUnknown) known.add(s.id);
      }
      knownUnitScenarioBuildProgress = Math.min(100, Math.round((idx / scenarios.length) * 100));

      if (idx < scenarios.length) {
        setTimeout(runBatch, 0);
      } else {
        knownUnitScenarioIdsCache = known;
        knownUnitScenarioIdsBuildPromise = null;
        knownUnitScenarioBuildProgress = 100;
        resolve(known);
      }
    };

    setTimeout(runBatch, 0);
  });

  return knownUnitScenarioIdsBuildPromise;
}

function itemMatchesRoleData(item: CollectionItemView, role: any): boolean {
  return collectionItemMatchesRole(item, role);
}

function getPlayStatus(scenarioId: number, collection: CollectionItemView[]): 'full' | 'partial' | 'none' {
  const factions = (rolesLookup[String(scenarioId)] ?? []).filter((f: any) => (f.roles ?? []).length > 0);
  if (factions.length === 0) return 'none';

  let satisfiedCount = 0;
  factions.forEach((faction: any) => {
    const allMet = (faction.roles as any[]).every((role: any) => {
      let owned = 0;
      collection.forEach(item => {
        if (itemMatchesRoleData(item, role)) owned += item.owned_quantity;
      });
      return owned >= role.amount;
    });
    if (allMet) satisfiedCount++;
  });

  if (satisfiedCount === 0) return 'none';
  if (satisfiedCount === factions.length) return 'full';
  return 'partial';
}

export default function ScenariosScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [search, setSearch] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showPlayable, setShowPlayable] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [hideUnknownUnits, setHideUnknownUnits] = useState(false);
  const [groupByAge, setGroupByAge] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [collection, setCollection] = useState<CollectionItemView[]>([]);
  const [knownUnitScenarioIds, setKnownUnitScenarioIds] = useState<Set<number> | null>(knownUnitScenarioIdsCache);
  const [knownUnitsProgress, setKnownUnitsProgress] = useState(knownUnitScenarioBuildProgress);

  const bookFiltered = selectedBooks.length > 0;

  useFocusEffect(useCallback(() => {
    collectionStorage.loadCollection().then(col => {
      setCollection(collectionViewService.enrichCollection(col));
    });
  }, []));

  const books = useMemo(() => scenarioService.getSourcebooks(), []);
  const allUnits = useMemo(() => mesbgDataService.getAllUnits(), []);

  useEffect(() => {
    if (knownUnitScenarioIds) return;
    let cancelled = false;
    const progressTimer = setInterval(() => {
      if (!cancelled) setKnownUnitsProgress(knownUnitScenarioBuildProgress);
    }, 100);
    buildKnownUnitScenarioIds(allUnits).then(known => {
      if (!cancelled) {
        setKnownUnitScenarioIds(known);
        setKnownUnitsProgress(100);
      }
    });
    return () => {
      cancelled = true;
      clearInterval(progressTimer);
    };
  }, [allUnits, knownUnitScenarioIds]);

  const isLegacyScenario = (scenario: Scenario) =>
    scenario.sources.some(src => src.title.toLowerCase().includes('bgime'));

  const playabilityMap = useMemo(() => {
    const map = new Map<number, 'full' | 'partial' | 'none'>();
    if (collection.length > 0) {
      scenarioService.getAll().forEach(s => {
        map.set(s.id, getPlayStatus(s.id, collection));
      });
    }
    return map;
  }, [collection]);

  const playableIds = useMemo(() => {
    const ids = new Set<number>();
    playabilityMap.forEach((status, id) => { if (status !== 'none') ids.add(id); });
    return ids;
  }, [playabilityMap]);

  const filtered = useMemo(() => {
    let list = search.trim()
      ? scenarioService.search(search)
      : scenarioService.getAll();

    if (selectedBooks.length > 0) {
      list = list.filter(s => s.sources.some(src => selectedBooks.includes(src.title)));
    }

    if (showPlayable) {
      list = list.filter(s => playableIds.has(s.id));
    }

    if (!showLegacy) {
      list = list.filter(s => !isLegacyScenario(s));
    }

    if (hideUnknownUnits && knownUnitScenarioIds) {
      list = list.filter(s => knownUnitScenarioIds.has(s.id));
    }

    return list;
  }, [search, selectedBooks, showPlayable, showLegacy, hideUnknownUnits, playableIds, knownUnitScenarioIds]);

  const playableCount = playableIds.size;
  const activeFilterCount = selectedBooks.length + (showPlayable ? 1 : 0) + (showLegacy ? 1 : 0) + (hideUnknownUnits ? 1 : 0);

  const AGE_ORDER = [3, 2, 1, 0] as const;
  const AGE_SECTION_LABELS: Record<number, string> = { 3: 'Third Age', 2: 'Second Age', 1: 'First Age', 0: 'Unknown' };

  const sections = useMemo(() => {
    if (!groupByAge) return [];
    const groups = new Map<number, Scenario[]>();
    filtered.forEach(s => {
      const age = s.date_age ?? 0;
      if (!groups.has(age)) groups.set(age, []);
      groups.get(age)!.push(s);
    });
    return AGE_ORDER
      .filter(age => groups.has(age))
      .map(age => ({ title: AGE_SECTION_LABELS[age], data: groups.get(age)! }));
  }, [filtered, groupByAge]);

  const formatDate = (s: Scenario) => {
    const age = AGE_LABELS[s.date_age] ?? '';
    if (!s.date_year) return age;
    return `${age} ${s.date_year}`;
  };

  const getPlayabilityColor = (scenarioId: number) => {
    if (collection.length === 0) return c.border;
    const status = playabilityMap.get(scenarioId) ?? 'none';
    if (status === 'full') return '#27ae60';
    if (status === 'partial') return '#f39c12';
    return '#e74c3c';
  };

  const renderScenario = ({ item }: { item: Scenario }) => {
    const status = playabilityMap.get(item.id) ?? 'none';
    const playColor = getPlayabilityColor(item.id);
    const locationLabel = LOCATION_LABELS[item.location] ?? item.location;
    const primarySource = item.sources[0];

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => router.push({ pathname: '/scenario-detail', params: { id: item.id } })}
      >
        {/* Left colour bar indicating playability */}
        <View style={[styles.playBar, { backgroundColor: playColor }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={[styles.scenarioName, { color: c.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.sizeBadge, { backgroundColor: playColor }]}>
              <Text style={styles.sizeBadgeText}>{item.size}</Text>
            </View>
          </View>

          <Text style={[styles.location, { color: c.textSecondary }]}>
            {locationLabel}  •  {formatDate(item)}
          </Text>

          {primarySource && (
            <Text style={[styles.source, { color: c.textMuted }]} numberOfLines={1}>
              {primarySource.title}{primarySource.issue ? ` #${primarySource.issue}` : ''}
            </Text>
          )}

          <Text style={[styles.blurb, { color: c.textMuted }]} numberOfLines={2}>
            {item.blurb}
          </Text>

          <View style={styles.mapRow}>
            <Text style={[styles.mapSize, { color: c.textMuted }]}>
              {item.map_width}" × {item.map_height}"
            </Text>
            {item.num_votes > 0 && (
              <Text style={[styles.rating, { color: c.textMuted }]}>
                ★ {item.avg_rating.toFixed(1)} ({item.num_votes})
              </Text>
            )}
            {collection.length > 0 && (
              <Text style={[styles.playLabel, { color: playColor }]}>
                {status === 'full' ? '✓ Can play' : status === 'partial' ? '⚡ One side ready' : '✗ Missing models'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!knownUnitScenarioIds) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={[styles.loadingText, { color: c.textMuted }]}>
          Preparing scenario filters... {knownUnitsProgress}%
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          placeholder="Search scenarios..."
          placeholderTextColor={c.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Stats + filters */}
      <View style={[styles.statsRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: c.text }]}>{filtered.length}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Showing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#27ae60' }]}>{playableCount}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Can Play</Text>
        </View>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, { borderColor: activeFilterCount > 0 ? '#8e44ad' : c.border, backgroundColor: activeFilterCount > 0 ? '#8e44ad' : c.surface }]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={[styles.toggleText, { color: activeFilterCount > 0 ? '#fff' : c.text }]} numberOfLines={1}>
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)} />
        <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Filters</Text>
            <View style={styles.modalHeaderActions}>
              {(bookFiltered || showPlayable || showLegacy || hideUnknownUnits) && (
                <TouchableOpacity onPress={() => { setSelectedBooks([]); setShowPlayable(false); setShowLegacy(false); setHideUnknownUnits(false); }}>
                  <Text style={styles.clearAll}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={[styles.doneBtn, { backgroundColor: '#3498db' }]}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterToggles}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: c.filterChipBg, borderColor: c.border },
                showPlayable && styles.filterChipSelected
              ]}
              onPress={() => setShowPlayable(v => !v)}
            >
              <Text style={[
                styles.filterChipText,
                { color: c.textMuted },
                showPlayable && styles.filterChipTextSelected
              ]}>
                {showPlayable ? '✓ Playable' : 'Playable'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: c.filterChipBg, borderColor: c.border },
                showLegacy && styles.filterChipBookSelected
              ]}
              onPress={() => setShowLegacy(v => !v)}
            >
              <Text style={[
                styles.filterChipText,
                { color: c.textMuted },
                showLegacy && styles.filterChipTextSelected
              ]}>
                {showLegacy ? '✓ Legacy' : 'Legacy'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: c.filterChipBg, borderColor: c.border },
                hideUnknownUnits && styles.filterChipSelected
              ]}
              onPress={() => setHideUnknownUnits(v => !v)}
            >
              <Text style={[
                styles.filterChipText,
                { color: c.textMuted },
                hideUnknownUnits && styles.filterChipTextSelected
              ]}>
                {hideUnknownUnits ? '✓ Known Units Only' : 'Known Units Only'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSectionLabel, { color: c.textMuted }]}>Sourcebooks</Text>
          <ScrollView contentContainerStyle={styles.bookGrid}>
            {books.map(book => (
              <TouchableOpacity
                key={book}
                style={[
                  styles.filterChip,
                  { backgroundColor: c.filterChipBg, borderColor: c.border },
                  selectedBooks.includes(book) && styles.filterChipBookSelected,
                ]}
                onPress={() => {
                  setSelectedBooks(prev =>
                    prev.includes(book) ? prev.filter(b => b !== book) : [...prev, book]
                  );
                }}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: c.textMuted },
                  selectedBooks.includes(book) && styles.filterChipTextSelected,
                ]}>
                  {selectedBooks.includes(book) ? `✓ ${book}` : book}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {groupByAge ? (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id.toString()}
          renderItem={renderScenario}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
              <Text style={[styles.sectionHeaderText, { color: c.textSecondary }]}>{section.title}</Text>
              <Text style={[styles.sectionHeaderCount, { color: c.textMuted }]}>{section.data.length}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textMuted }]}>No scenarios found</Text>
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={renderScenario}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textMuted }]}>No scenarios found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, fontWeight: '500' },
  container: { flex: 1 },
  searchBar: { padding: 12, borderBottomWidth: 1 },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11 },
  toggleGroup: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  toggleBtn: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  toggleText: { fontSize: 13, fontWeight: '600' },
  filterContainer: { borderBottomWidth: 1, paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 12, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  filterChipSelected: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterChipBookSelected: { backgroundColor: '#8e44ad', borderColor: '#8e44ad' },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  filterChipTextSelected: { color: '#fff', fontWeight: '600' },
  list: { padding: 12 },
  card: {
    borderRadius: 8, marginBottom: 10, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2,
  },
  playBar: { width: 4 },
  cardContent: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  scenarioName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  sizeBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 32, alignItems: 'center' },
  sizeBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  location: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  source: { fontSize: 12, marginBottom: 4 },
  blurb: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  mapSize: { fontSize: 12 },
  rating: { fontSize: 12 },
  playLabel: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 10 },
  sectionHeaderText: { fontSize: 15, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderCount: { fontSize: 13 },
  // Filter modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearAll: { fontSize: 14, color: '#e74c3c', fontWeight: '600' },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterToggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8 },
});

