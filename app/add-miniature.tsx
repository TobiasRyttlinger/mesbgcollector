import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { PaintStatus, createCollectionItem, CollectionItem } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { mesbgDataService } from '../src/services/mesbgDataService';
import { imageService } from '../src/services/imageService';
import { MesbgUnit } from '../src/types/mesbg-data.types';
import { useTheme } from '../src/contexts/ThemeContext';

export default function AddMiniatureScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<MesbgUnit | null>(null);
  const [owned_quantity, setOwnedQuantity] = useState('1');
  const [paint_status, setPaintStatus] = useState<PaintStatus>(PaintStatus.UNPAINTED);
  const [notes, setNotes] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [existingCollection, setExistingCollection] = useState<CollectionItem[]>([]);

  useEffect(() => { loadExistingCollection(); }, []);

  const loadExistingCollection = async () => {
    try {
      setExistingCollection(await collectionStorage.loadCollection());
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
  };

  // Map normalized unit name → collection item so duplicates across army lists are detected by name
  const ownedByName = useMemo(() => {
    const map = new Map<string, CollectionItem>();
    existingCollection.forEach(item => {
      const unit = mesbgDataService.getUnit(item.model_id);
      if (unit) map.set(unit.name.toLowerCase(), item);
    });
    return map;
  }, [existingCollection]);

  const existingEntry = useMemo(() => {
    if (!selectedUnit) return null;
    return ownedByName.get(selectedUnit.name.toLowerCase()) ?? null;
  }, [selectedUnit, ownedByName]);

  // Search all units, deduplicated by name + options fingerprint.
  // Same unit across multiple army lists (same name, same options) → collapsed.
  // Same name but different wargear/included options (e.g. shield vs no shield) → kept separate.
  const filteredUnits = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase();
    const seen = new Map<string, MesbgUnit>();
    mesbgDataService.getAllUnits()
      .filter(unit => unit.name.toLowerCase().includes(query))
      .forEach(unit => {
        const optionsKey = (unit.options ?? [])
          .map(o => `${o.id}:${o.included ? '1' : '0'}`)
          .sort()
          .join(',');
        const key = `${unit.name.toLowerCase()}|${optionsKey}`;
        if (!seen.has(key)) seen.set(key, unit);
      });
    return Array.from(seen.values()).slice(0, 50);
  }, [searchQuery]);

  const resetForm = () => {
    setSelectedUnit(null);
    setOwnedQuantity('1');
    setPaintStatus(PaintStatus.UNPAINTED);
    setNotes('');
    setSearchQuery('');
    setSelectedOptions([]);
  };

  const handleSave = async () => {
    if (!selectedUnit) {
      Alert.alert('Error', 'Please select a unit');
      return;
    }
    const qty = parseInt(owned_quantity) || 1;

    if (existingEntry) {
      Alert.alert(
        'Unit Already Owned',
        `You already have ${existingEntry.owned_quantity}x ${selectedUnit.name} in your collection.\n\nWhat would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Existing',
            onPress: async () => {
              const updatedItem = { ...existingEntry, owned_quantity: existingEntry.owned_quantity + qty };
              try {
                await collectionStorage.updateItem(existingEntry.id, updatedItem);
                await loadExistingCollection();
                Alert.alert(
                  'Success',
                  `Added ${qty} more ${selectedUnit.name}!\nYou now have ${updatedItem.owned_quantity} total.`,
                  [
                    { text: 'Add Another', onPress: () => resetForm() },
                    { text: 'Done', style: 'cancel', onPress: () => router.back() }
                  ]
                );
              } catch {
                Alert.alert('Error', 'Failed to update unit');
              }
            }
          },
          { text: 'Create Separate Entry', onPress: async () => { await saveNewEntry(qty); } }
        ]
      );
    } else {
      await saveNewEntry(qty);
    }
  };

  const saveNewEntry = async (qty: number) => {
    if (!selectedUnit) return;
    const item = createCollectionItem(
      selectedUnit.model_id, qty, paint_status,
      notes.trim() || undefined,
      selectedOptions.length > 0 ? selectedOptions : undefined
    );
    try {
      await collectionStorage.addItem(item);
      await loadExistingCollection();
      Alert.alert(
        'Success',
        `${selectedUnit.name} added to collection!`,
        [
          { text: 'Add Another', onPress: () => resetForm() },
          { text: 'Done', style: 'cancel', onPress: () => router.back() }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to save unit');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Sticky search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          placeholder="Search all miniatures... (min. 2 characters)"
          value={searchQuery}
          onChangeText={text => { setSearchQuery(text); if (selectedUnit) setSelectedUnit(null); }}
          placeholderTextColor={c.placeholder}
          autoFocus
        />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Unit search results */}
        {!selectedUnit && (
          <View style={styles.unitListContainer}>
            {searchQuery.trim().length < 2 ? (
              <Text style={[styles.prompt, { color: c.textMuted }]}>
                Type a name to search across all miniatures
              </Text>
            ) : filteredUnits.length === 0 ? (
              <Text style={[styles.prompt, { color: c.textMuted }]}>No units found</Text>
            ) : (
              <FlatList
                data={filteredUnits}
                keyExtractor={u => u.model_id}
                scrollEnabled={false}
                renderItem={({ item: unit }) => {
                  const ownedEntry = ownedByName.get(unit.name.toLowerCase());
                  return (
                    <TouchableOpacity
                      style={[styles.unitItem, { backgroundColor: c.surface, borderColor: c.border }]}
                      onPress={() => { setSelectedUnit(unit); setSearchQuery(''); }}
                    >
                      <Image
                        source={{ uri: imageService.getUnitImageUrl(unit.profile_origin, unit.name) }}
                        style={[styles.unitListImage, { backgroundColor: c.progressBarBg }]}
                        resizeMode="cover"
                      />
                      <View style={styles.unitItemInfo}>
                        <View style={styles.unitNameRow}>
                          <Text style={[styles.unitName, { color: c.text }]}>{unit.name}</Text>
                          {ownedEntry && (
                            <View style={styles.ownedBadge}>
                              <Text style={styles.ownedBadgeText}>✓ {ownedEntry.owned_quantity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.unitMeta, { color: c.textMuted }]}>
                          {unit.unit_type}  •  {unit.profile_origin}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}

        {/* Selected unit + form */}
        {selectedUnit && (
          <View style={styles.form}>
            {/* Selected unit card */}
            <View style={styles.selectedUnitCard}>
              {existingEntry && (
                <View style={styles.alreadyOwnedBanner}>
                  <Text style={styles.alreadyOwnedText}>✓ Already Owned: {existingEntry.owned_quantity}x</Text>
                </View>
              )}
              <View style={styles.selectedUnitRow}>
                <Image
                  source={{ uri: imageService.getUnitImageUrl(selectedUnit.profile_origin, selectedUnit.name) }}
                  style={styles.selectedUnitImage}
                  resizeMode="cover"
                />
                <View style={styles.selectedUnitInfo}>
                  <View style={styles.selectedUnitHeader}>
                    <Text style={styles.selectedUnitName}>{selectedUnit.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedUnit(null)}>
                      <Text style={styles.clearButton}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.selectedUnitDetail}>{selectedUnit.unit_type}</Text>
                  <Text style={styles.selectedUnitDetail}>{selectedUnit.profile_origin}</Text>
                </View>
              </View>
            </View>

            {/* Quantity */}
            <Text style={[styles.label, { color: c.text }]}>Quantity Owned</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
              value={owned_quantity}
              onChangeText={setOwnedQuantity}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={c.placeholder}
            />

            {/* Wargear */}
            {selectedUnit.options && selectedUnit.options.length > 0 && (
              <>
                <Text style={[styles.label, { color: c.text }]}>Wargear & Equipment</Text>
                <View style={styles.optionsContainer}>
                  {selectedUnit.options.map(option => {
                    const isSelected = selectedOptions.includes(option.id);
                    const isIncluded = option.included;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionItem,
                          { backgroundColor: c.surface, borderColor: c.border },
                          isSelected && styles.optionItemSelected,
                          isIncluded && styles.optionItemIncluded
                        ]}
                        onPress={() => {
                          if (isIncluded) return;
                          setSelectedOptions(prev =>
                            prev.includes(option.id)
                              ? prev.filter(id => id !== option.id)
                              : [...prev, option.id]
                          );
                        }}
                        disabled={isIncluded}
                      >
                        <Text style={[
                          styles.optionName,
                          { color: c.text },
                          (isSelected || isIncluded) && styles.optionNameSelected
                        ]}>
                          {isIncluded ? '✓ ' : isSelected ? '✓ ' : '○ '}
                          {option.name}
                          {isIncluded && ' (Included)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Paint status */}
            <Text style={[styles.label, { color: c.text }]}>Paint Status</Text>
            <View style={styles.buttonGroup}>
              {Object.values(PaintStatus).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.button,
                    { backgroundColor: c.surface, borderColor: c.border },
                    paint_status === status && styles.buttonSelected
                  ]}
                  onPress={() => setPaintStatus(status)}
                >
                  <Text style={[
                    styles.buttonText,
                    { color: c.textMuted },
                    paint_status === status && styles.buttonTextSelected
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={[styles.label, { color: c.text }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor={c.placeholder}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add to Collection</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  searchBar: { padding: 12, borderBottomWidth: 1 },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  unitListContainer: { paddingHorizontal: 12, paddingTop: 8 },
  prompt: { textAlign: 'center', fontSize: 15, marginTop: 40, paddingHorizontal: 24 },
  unitItem: { padding: 8, marginBottom: 8, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  unitListImage: { width: 60, height: 72, borderRadius: 4, marginRight: 12 },
  unitItemInfo: { flex: 1 },
  unitNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  unitName: { fontSize: 16, fontWeight: '600', flex: 1 },
  ownedBadge: { backgroundColor: '#f39c12', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  ownedBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  unitMeta: { fontSize: 13 },
  form: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  selectedUnitCard: { backgroundColor: '#27ae60', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  alreadyOwnedBanner: { backgroundColor: '#f39c12', padding: 8, alignItems: 'center' },
  alreadyOwnedText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  selectedUnitRow: { flexDirection: 'row' },
  selectedUnitImage: { width: 120, height: 140, backgroundColor: '#2ecc71' },
  selectedUnitInfo: { flex: 1, padding: 16 },
  selectedUnitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  selectedUnitName: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  clearButton: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  selectedUnitDetail: { fontSize: 14, color: '#fff', marginTop: 4 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  buttonSelected: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  buttonText: { fontSize: 14 },
  buttonTextSelected: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#27ae60', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#95a5a6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionsContainer: { marginTop: 8, marginBottom: 8 },
  optionItem: { padding: 12, borderRadius: 8, borderWidth: 2, marginBottom: 8 },
  optionItemSelected: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  optionItemIncluded: { backgroundColor: '#e3f2fd', borderColor: '#3498db' },
  optionName: { fontSize: 15, fontWeight: '500', flex: 1 },
  optionNameSelected: { color: '#27ae60', fontWeight: '600' },
});
