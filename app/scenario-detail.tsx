import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import scenariosRolesData from '../src/data/scenarios_roles_without_legacy.json';
import { PaintStatus, createCollectionItem } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { CollectionItemView, collectionViewService } from '../src/services/collectionViewService';
import { mesbgDataService } from '../src/services/mesbgDataService';
import { scenarioService } from '../src/services/scenarioService';
import { MesbgUnit } from '../src/types/mesbg-data.types';
import { AGE_LABELS, LOCATION_LABELS } from '../src/types/scenario.types';
import { collectionItemMatchesRole, extractEquipment, findOptionIdForEquipment, findUnitForRoleDebug } from '../src/utils/scenarioRoleMatching';

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

function checkFactions(
  factions: DetailedFaction[],
  collection: CollectionItemView[]
): FactionCheck[] {
  return factions.map(faction => {
    const roleChecks: RoleCheck[] = faction.roles.map(role => {
      let owned = 0;
      const matchedUnits: string[] = [];
      collection.forEach(item => {
        if (collectionItemMatchesRole(item, role)) {
          owned += item.owned_quantity;
          matchedUnits.push(item.display_name);
        }
      });
      return { role, owned, satisfied: owned >= role.amount, matchedUnits };
    });
    return { faction, roleChecks, allSatisfied: roleChecks.every(rc => rc.satisfied) };
  });
}

export default function ScenarioDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionItemView[]>([]);

  // Quick-add state
  const [addingRole, setAddingRole] = useState<Role | null>(null);
  const [addingUnit, setAddingUnit] = useState<MesbgUnit | null>(null);
  const [addQty, setAddQty] = useState('1');
  const [addPaintStatus, setAddPaintStatus] = useState<PaintStatus>(PaintStatus.UNPAINTED);
  const [addSelectedOptions, setAddSelectedOptions] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addSearchDebug, setAddSearchDebug] = useState('');

  const scenario = useMemo(() => scenarioService.getById(Number(id)), [id]);
  const allUnits = useMemo(() => mesbgDataService.getAllUnits(), []);

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

  const openAddModal = (role: Role) => {
    const lookup = findUnitForRoleDebug(role, allUnits);
    const unit = lookup.unit;
    setAddingRole(role);
    setAddingUnit(unit ?? null);
    setAddSearchDebug(`Search source: "${lookup.sourceName}"  ->  base query: "${lookup.baseQuery}"`);
    setAddQty(String(role.amount));
    setAddPaintStatus(PaintStatus.UNPAINTED);
    // Pre-select the equipment option if the role specifies one
    if (unit) {
      let equipment: string | null = null;
      for (const fig of role.figures) {
        equipment = extractEquipment(fig.name);
        if (equipment) break;
      }
      if (!equipment) equipment = extractEquipment(role.name);
      const optId = equipment ? findOptionIdForEquipment(unit, equipment) : undefined;
      setAddSelectedOptions(optId ? [optId] : []);
    } else {
      setAddSelectedOptions([]);
    }
  };

  const closeAddModal = () => {
    setAddingRole(null);
    setAddingUnit(null);
    setAddSelectedOptions([]);
    setAddSearchDebug('');
  };

  const handleQuickAdd = async () => {
    if (!addingUnit && !addingRole) return;
    const qty = parseInt(addQty) || 1;
    setAddSaving(true);
    try {
      // If we matched a unit, use its model_id; otherwise nothing to save
      if (addingUnit) {
        const item = createCollectionItem(
          addingUnit.model_id, qty, addPaintStatus, undefined,
          addSelectedOptions.length > 0 ? addSelectedOptions : undefined
        );
        await collectionStorage.addItem(item);
        await loadCollection();
        Alert.alert('Added!', `${addingUnit.name} ×${qty} added to your collection.`);
      } else {
        Alert.alert('Not found', 'Could not find a matching unit in the database.');
      }
    } catch {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setAddSaving(false);
      closeAddModal();
    }
  };

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
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView style={{ flex: 1 }}>
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
        <View style={[styles.section, { backgroundColor: c.surface, marginBottom: 32 }]}>
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
                      {!rc.satisfied && (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => openAddModal(rc.role)}
                        >
                          <Text style={styles.addBtnText}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Quick-add modal */}
      <Modal
        visible={addingRole !== null}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAddModal} />
        <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Add to Collection
          </Text>
          <Text style={[styles.modalUnitName, { color: c.textSecondary }]}>
            {addingUnit ? addingUnit.name : addingRole?.name ?? ''}
            {!addingUnit && (
              <Text style={{ color: '#e74c3c', fontSize: 12 }}>{'\n'}(no exact match in database)</Text>
            )}
          </Text>
          <Text style={[styles.modalDebugText, { color: c.textMuted }]}>
            {addSearchDebug}
          </Text>

          <Text style={[styles.modalLabel, { color: c.textMuted }]}>Quantity</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
            value={addQty}
            onChangeText={setAddQty}
            keyboardType="number-pad"
            selectTextOnFocus
          />

          {addingUnit && addingUnit.options.length > 0 && (
            <>
              <Text style={[styles.modalLabel, { color: c.textMuted }]}>Equipment</Text>
              <View style={styles.paintRow}>
                {addingUnit.options.map(opt => {
                  const selected = addSelectedOptions.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.paintBtn, { borderColor: c.border }, selected && styles.paintBtnSelected]}
                      onPress={() => setAddSelectedOptions(prev =>
                        prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                      )}
                    >
                      <Text style={[styles.paintBtnText, { color: c.textMuted }, selected && styles.paintBtnTextSelected]}>
                        {opt.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={[styles.modalLabel, { color: c.textMuted }]}>Paint Status</Text>
          <View style={styles.paintRow}>
            {Object.values(PaintStatus).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.paintBtn,
                  { borderColor: c.border },
                  addPaintStatus === status && styles.paintBtnSelected,
                ]}
                onPress={() => setAddPaintStatus(status)}
              >
                <Text style={[
                  styles.paintBtnText,
                  { color: c.textMuted },
                  addPaintStatus === status && styles.paintBtnTextSelected,
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: c.border }]}
              onPress={closeAddModal}
            >
              <Text style={[styles.modalCancelText, { color: c.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSave, { opacity: addingUnit ? 1 : 0.4 }]}
              onPress={handleQuickAdd}
              disabled={!addingUnit || addSaving}
            >
              <Text style={styles.modalSaveText}>
                {addSaving ? 'Saving…' : 'Add to Collection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  addBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalUnitName: { fontSize: 15, marginBottom: 16 },
  modalDebugText: { fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
  modalLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 4 },
  paintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  paintBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  paintBtnSelected: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  paintBtnText: { fontSize: 13 },
  paintBtnTextSelected: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalSave: { flex: 2, padding: 14, borderRadius: 8, backgroundColor: '#27ae60', alignItems: 'center' },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

