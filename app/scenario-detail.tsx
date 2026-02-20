import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { collectionStorage } from '../src/services/collectionStorage';
import { collectionViewService, CollectionItemView } from '../src/services/collectionViewService';
import { scenarioService } from '../src/services/scenarioService';
import { AGE_LABELS, LOCATION_LABELS } from '../src/types/scenario.types';
import scenariosRolesData from '../src/data/scenarios_roles.json';

interface Figure {
  figure_id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
  amount: number;
  sort_order: number;
  figures: Figure[];
}

interface DetailedFaction {
  id: number;
  sort_order: number;
  suggested_points: number;
  roles: Role[];
}

interface RoleCheck {
  role: Role;
  owned: number;
  satisfied: boolean;
  matchedUnits: string[];
}

interface FactionCheck {
  faction: DetailedFaction;
  roleChecks: RoleCheck[];
  allSatisfied: boolean;
}

// Bundled offline role data: scenario id (string) → faction array
const rolesLookup = scenariosRolesData as Record<string, DetailedFaction[]>;

/** Strip variant suffixes like "(plastic)", "(White Council)" from figure names */
function stripVariant(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
}

function checkFactions(
  factions: DetailedFaction[],
  collection: CollectionItemView[]
): FactionCheck[] {
  return factions.map(faction => {
    const roleChecks: RoleCheck[] = faction.roles.map(role => {
      // Gather all base names this role accepts (from figures array)
      const acceptedNames = new Set<string>();
      role.figures.forEach(fig => {
        acceptedNames.add(stripVariant(fig.name));
        // Also add the raw figure name in case stripping removes too much
        acceptedNames.add(fig.name.toLowerCase());
      });
      // Also accept the role name itself as a fallback
      acceptedNames.add(role.name.toLowerCase());
      acceptedNames.add(stripVariant(role.name));

      // Find matching collection items
      const matchedUnits: string[] = [];
      let owned = 0;

      collection.forEach(item => {
        const itemName = (item.unit_data?.name ?? item.display_name).toLowerCase();
        const itemNameStripped = stripVariant(item.unit_data?.name ?? item.display_name);

        const matches = acceptedNames.has(itemName) || acceptedNames.has(itemNameStripped);
        if (matches) {
          owned += item.owned_quantity;
          matchedUnits.push(item.display_name);
        }
      });

      return {
        role,
        owned,
        satisfied: owned >= role.amount,
        matchedUnits,
      };
    });

    return {
      faction,
      roleChecks,
      allSatisfied: roleChecks.every(rc => rc.satisfied),
    };
  });
}

export default function ScenarioDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionItemView[]>([]);

  const scenario = useMemo(() => scenarioService.getById(Number(id)), [id]);

  // Factions come from the bundled JSON — no network call needed
  const factions: DetailedFaction[] = useMemo(
    () => rolesLookup[String(id)] ?? [],
    [id]
  );

  const loadCollection = useCallback(async () => {
    setLoading(true);
    try {
      const col = await collectionStorage.loadCollection();
      setCollection(collectionViewService.enrichCollection(col));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCollection(); }, [loadCollection]);

  const factionChecks = useMemo(() => {
    if (factions.length === 0) return [];
    return checkFactions(factions, collection);
  }, [factions, collection]);

  const overallCanPlay = factionChecks.length > 0 && factionChecks.some(fc => fc.allSatisfied);

  if (!scenario) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.notFound, { color: c.textMuted }]}>Scenario not found</Text>
      </View>
    );
  }

  const age = AGE_LABELS[scenario.date_age] ?? '';
  const dateStr = scenario.date_year ? `${age} ${scenario.date_year}` : age;
  const locationLabel = LOCATION_LABELS[scenario.location] ?? scenario.location;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.headerBg }]}>
        <Text style={styles.title}>{scenario.name}</Text>
        <Text style={styles.subtitle}>{locationLabel}  •  {dateStr}</Text>
      </View>

      {/* Blurb */}
      {scenario.blurb ? (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.blurb, { color: c.textSecondary }]}>{scenario.blurb}</Text>
        </View>
      ) : null}

      {/* Key info */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Row label="Models Required" value={scenario.size.toString()} c={c} />
        <Row label="Map Size" value={`${scenario.map_width}" × ${scenario.map_height}"`} c={c} />
        {scenario.num_votes > 0 && (
          <Row
            label="Community Rating"
            value={`★ ${scenario.avg_rating.toFixed(1)} (${scenario.num_votes} votes)`}
            c={c}
          />
        )}
      </View>

      {/* Sources */}
      {scenario.sources.length > 0 && (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Sources</Text>
          {scenario.sources.map(src => (
            <View key={src.id} style={[styles.sourceRow, { borderBottomColor: c.border }]}>
              <Text style={[styles.sourceTitle, { color: c.text }]}>
                {src.title}{src.issue ? ` #${src.issue}` : ''}
              </Text>
              <Text style={[styles.sourcePage, { color: c.textMuted }]}>p. {src.page}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Collection Check */}
      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>Collection Check</Text>

        {loading ? (
          <ActivityIndicator color="#3498db" style={{ marginVertical: 16 }} />
        ) : factionChecks.length === 0 ? (
          <Text style={[styles.errorText, { color: c.textMuted }]}>
            No unit requirements found for this scenario.
          </Text>
        ) : (
          <>
            {/* Overall result */}
            <View style={[
              styles.overallBadge,
              { backgroundColor: overallCanPlay ? '#27ae60' : '#e74c3c' }
            ]}>
              <Text style={styles.overallBadgeText}>
                {overallCanPlay
                  ? '✓ You can play at least one side!'
                  : '✗ Missing models for all sides'}
              </Text>
            </View>

            {factionChecks.map((fc, idx) => (
              <View key={fc.faction.id} style={[styles.factionBlock, { borderColor: c.border }]}>
                <View style={[
                  styles.factionHeader,
                  { backgroundColor: fc.allSatisfied ? '#27ae60' : '#e74c3c' }
                ]}>
                  <Text style={styles.factionTitle}>
                    {idx === 0 ? 'Side 1' : 'Side 2'}
                  </Text>
                  <Text style={styles.factionStatus}>
                    {fc.allSatisfied ? '✓ Ready' : '✗ Missing models'}
                  </Text>
                  {fc.faction.suggested_points > 0 && (
                    <Text style={styles.factionPoints}>
                      ~{fc.faction.suggested_points} pts
                    </Text>
                  )}
                </View>

                {fc.roleChecks.map(rc => (
                  <View
                    key={rc.role.id}
                    style={[styles.roleRow, { borderBottomColor: c.border }]}
                  >
                    <View style={[
                      styles.roleIcon,
                      { backgroundColor: rc.satisfied ? '#27ae60' : '#e74c3c' }
                    ]}>
                      <Text style={styles.roleIconText}>
                        {rc.satisfied ? '✓' : '✗'}
                      </Text>
                    </View>
                    <View style={styles.roleInfo}>
                      <Text style={[styles.roleName, { color: c.text }]}>
                        {rc.role.name}
                      </Text>
                      <Text style={[styles.roleCount, {
                        color: rc.satisfied ? '#27ae60' : '#e74c3c'
                      }]}>
                        {rc.owned}/{rc.role.amount} owned
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <Text style={[styles.rowLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  header: { padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  section: { marginTop: 16, marginHorizontal: 16, borderRadius: 8, padding: 16 },
  blurb: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowValue: { fontSize: 15, fontWeight: '600' },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  sourceTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  sourcePage: { fontSize: 13 },
  errorText: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  overallBadge: { borderRadius: 8, padding: 14, marginBottom: 16, alignItems: 'center' },
  overallBadgeText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  factionBlock: { borderWidth: 1, borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  factionHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  factionTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1 },
  factionStatus: { color: '#fff', fontSize: 13, fontWeight: '600' },
  factionPoints: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  roleRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, gap: 10 },
  roleIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  roleIconText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 14, fontWeight: '500' },
  roleCount: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
