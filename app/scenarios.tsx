import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { collectionStorage } from '../src/services/collectionStorage';
import { collectionViewService, CollectionItemView } from '../src/services/collectionViewService';
import { scenarioService } from '../src/services/scenarioService';
import { Scenario, AGE_LABELS, LOCATION_LABELS } from '../src/types/scenario.types';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import scenariosRolesData from '../src/data/scenarios_roles.json';

const rolesLookup = scenariosRolesData as Record<string, any[]>;

function stripVariant(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
}

function getPlayStatus(scenarioId: number, collection: CollectionItemView[]): 'full' | 'partial' | 'none' {
  const factions = (rolesLookup[String(scenarioId)] ?? []).filter((f: any) => (f.roles ?? []).length > 0);
  if (factions.length === 0) return 'none';

  let satisfiedCount = 0;
  factions.forEach((faction: any) => {
    const allMet = (faction.roles as any[]).every((role: any) => {
      const acceptedNames = new Set<string>();
      (role.figures ?? []).forEach((fig: any) => {
        acceptedNames.add(stripVariant(fig.name));
        acceptedNames.add(fig.name.toLowerCase());
      });
      acceptedNames.add(role.name.toLowerCase());
      acceptedNames.add(stripVariant(role.name));
      let owned = 0;
      collection.forEach(item => {
        const itemName = (item.unit_data?.name ?? item.display_name).toLowerCase();
        const itemStripped = stripVariant(item.unit_data?.name ?? item.display_name);
        if (acceptedNames.has(itemName) || acceptedNames.has(itemStripped)) {
          owned += item.owned_quantity;
        }
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
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedBook, setSelectedBook] = useState('All');
  const [showPlayable, setShowPlayable] = useState(false);
  const [collection, setCollection] = useState<CollectionItemView[]>([]);

  useFocusEffect(useCallback(() => {
    collectionStorage.loadCollection().then(col => {
      setCollection(collectionViewService.enrichCollection(col));
    });
  }, []));

  const locations = useMemo(() => ['All', ...scenarioService.getLocations()], []);
  const books = useMemo(() => ['All', ...scenarioService.getSourcebooks()], []);

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

    if (selectedLocation !== 'All') {
      list = list.filter(s => s.location === selectedLocation);
    }

    if (selectedBook !== 'All') {
      list = list.filter(s => s.sources.some(src => src.title === selectedBook));
    }

    if (showPlayable) {
      list = list.filter(s => playableIds.has(s.id));
    }

    return list;
  }, [search, selectedLocation, selectedBook, showPlayable, playableIds]);

  const playableCount = playableIds.size;

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

      {/* Stats + playable toggle */}
      <View style={[styles.statsRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: c.text }]}>{filtered.length}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Showing</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: '#27ae60' }]}>{playableCount}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Can Play</Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleBtn, { borderColor: showPlayable ? '#27ae60' : c.border, backgroundColor: showPlayable ? '#27ae60' : c.surface }]}
          onPress={() => setShowPlayable(v => !v)}
        >
          <Text style={[styles.toggleText, { color: showPlayable ? '#fff' : c.text }]}>
            {showPlayable ? '✓ Playable only' : 'Show all'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location filter */}
      <View style={[styles.filterContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {locations.map(loc => (
            <TouchableOpacity
              key={loc}
              style={[
                styles.filterChip,
                { backgroundColor: c.filterChipBg, borderColor: c.border },
                selectedLocation === loc && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedLocation(loc)}
            >
              <Text style={[
                styles.filterChipText,
                { color: c.textMuted },
                selectedLocation === loc && styles.filterChipTextSelected,
              ]}>
                {loc === 'All' ? 'All Locations' : (LOCATION_LABELS[loc] ?? loc)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Book filter */}
      <View style={[styles.filterContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {books.map(book => (
            <TouchableOpacity
              key={book}
              style={[
                styles.filterChip,
                { backgroundColor: c.filterChipBg, borderColor: c.border },
                selectedBook === book && styles.filterChipBookSelected,
              ]}
              onPress={() => setSelectedBook(book)}
            >
              <Text style={[
                styles.filterChipText,
                { color: c.textMuted },
                selectedBook === book && styles.filterChipTextSelected,
              ]}>
                {book === 'All' ? 'All Books' : book}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderScenario}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textMuted }]}>No scenarios found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { padding: 12, borderBottomWidth: 1 },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 11 },
  toggleBtn: { marginLeft: 'auto', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
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
});
