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
  const [selectedArmy, setSelectedArmy] = useState<string>('');
  const [owned_quantity, setOwnedQuantity] = useState('1');
  const [paint_status, setPaintStatus] = useState<PaintStatus>(PaintStatus.UNPAINTED);
  const [notes, setNotes] = useState('');
  const [showArmyPicker, setShowArmyPicker] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [existingCollection, setExistingCollection] = useState<CollectionItem[]>([]);

  useEffect(() => {
    loadExistingCollection();
  }, []);

  const loadExistingCollection = async () => {
    try {
      const collection = await collectionStorage.loadCollection();
      setExistingCollection(collection);
    } catch (error) {
      console.error('Failed to load collection:', error);
    }
  };

  const existingEntry = useMemo(() => {
    if (!selectedUnit) return null;
    return existingCollection.find(item => item.model_id === selectedUnit.model_id);
  }, [selectedUnit, existingCollection]);

  const armies = useMemo(() => mesbgDataService.getArmyNames(), []);

  const filteredArmies = useMemo(() => {
    if (!searchQuery && showArmyPicker) return armies;
    return armies.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [armies, searchQuery, showArmyPicker]);

  const filteredUnits = useMemo(() => {
    if (!selectedArmy && !searchQuery) return [];
    let units = selectedArmy ? mesbgDataService.getUnitsByArmy(selectedArmy) : mesbgDataService.getAllUnits();
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      units = units.filter(unit => unit.name.toLowerCase().includes(query));
    }
    return units.slice(0, 50);
  }, [selectedArmy, searchQuery]);

  const resetForm = () => {
    setSelectedUnit(null);
    setOwnedQuantity('1');
    setPaintStatus(PaintStatus.UNPAINTED);
    setNotes('');
    setSearchQuery('');
    setSelectedOptions([]);
  };

  const calculateTotalPoints = () => {
    if (!selectedUnit) return 0;
    let total = selectedUnit.base_points;
    selectedOptions.forEach(optId => {
      const option = selectedUnit.options.find(opt => opt.id === optId);
      if (option) total += option.points;
    });
    return total;
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
                const totalPoints = calculateTotalPoints();
                Alert.alert(
                  'Success',
                  `Added ${qty} more ${selectedUnit.name}!\nYou now have ${updatedItem.owned_quantity} total.\nTotal: ${totalPoints} pts/model`,
                  [
                    { text: 'Add Another', onPress: () => resetForm() },
                    { text: 'Done', style: 'cancel', onPress: () => router.back() }
                  ]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to update unit');
              }
            }
          },
          {
            text: 'Create Separate Entry',
            onPress: async () => { await saveNewEntry(qty); }
          }
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
      const totalPoints = calculateTotalPoints();
      Alert.alert(
        'Success',
        `${selectedUnit.name} added to collection!\nTotal: ${totalPoints} pts/model`,
        [
          { text: 'Add Another', onPress: () => resetForm() },
          { text: 'Done', style: 'cancel', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save unit');
    }
  };

  if (showArmyPicker) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.searchContainer, { backgroundColor: c.background }]}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
            placeholder="Search armies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={c.placeholder}
          />
        </View>
        <FlatList
          data={filteredArmies}
          keyExtractor={(item) => item}
          renderItem={({ item: army }) => (
            <TouchableOpacity
              style={[styles.armyItem, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => {
                setSelectedArmy(army);
                setSearchQuery('');
                setShowArmyPicker(false);
              }}
            >
              <Text style={[styles.armyItemText, { color: c.text }]}>{army}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.selectedArmyContainer}>
            <View>
              <Text style={[styles.label, { color: c.text }]}>Selected Army</Text>
              <Text style={styles.selectedArmyText}>{selectedArmy}</Text>
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => { setShowArmyPicker(true); setSelectedUnit(null); }}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: c.text }]}>Search Unit</Text>
          <TextInput
            style={[styles.searchInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
            placeholder="Search for a unit..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={c.placeholder}
          />

          {selectedUnit ? (
            <View style={styles.selectedUnitCard}>
              {existingEntry && (
                <View style={styles.alreadyOwnedBanner}>
                  <Text style={styles.alreadyOwnedText}>✓ Already Owned: {existingEntry.owned_quantity}x</Text>
                </View>
              )}
              <View style={styles.selectedUnitContainer}>
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
                  <Text style={styles.selectedUnitDetail}>{selectedUnit.base_points} points</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.unitListContainer}>
              {filteredUnits.map((unit) => {
                const ownedEntry = existingCollection.find(item => item.model_id === unit.model_id);
                return (
                  <TouchableOpacity
                    key={unit.model_id}
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
                      <Text style={[styles.unitType, { color: c.textMuted }]}>{unit.unit_type} • {unit.base_points} pts</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredUnits.length === 0 && searchQuery && (
                <Text style={[styles.noResults, { color: c.textMuted }]}>No units found</Text>
              )}
            </View>
          )}

          {selectedUnit && (
            <>
              <Text style={[styles.label, { color: c.text }]}>Quantity Owned</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
                value={owned_quantity}
                onChangeText={setOwnedQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={c.placeholder}
              />

              {selectedUnit.options && selectedUnit.options.length > 0 && (
                <>
                  <Text style={[styles.label, { color: c.text }]}>
                    Wargear & Options {selectedUnit.opt_mandatory && '(Required)'}
                  </Text>
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
                          <View style={styles.optionContent}>
                            <Text style={[
                              styles.optionName,
                              { color: c.text },
                              (isSelected || isIncluded) && styles.optionNameSelected
                            ]}>
                              {isIncluded ? '✓ ' : ''}{option.name}
                              {isIncluded && ' (Included)'}
                            </Text>
                            <Text style={[
                              styles.optionPoints,
                              { color: c.textMuted },
                              (isSelected || isIncluded) && styles.optionPointsSelected
                            ]}>
                              {option.points > 0 ? `+${option.points}` : option.points} pts
                            </Text>
                          </View>
                          {option.type && (
                            <Text style={[styles.optionType, { color: c.textMuted }]}>{option.type}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.totalPointsContainer}>
                    <Text style={styles.totalPointsLabel}>Total Points per Model:</Text>
                    <Text style={styles.totalPointsValue}>{calculateTotalPoints()} pts</Text>
                  </View>
                </>
              )}

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
            </>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  form: { padding: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  armyItem: { padding: 16, marginBottom: 8, borderRadius: 8, borderWidth: 1 },
  armyItemText: { fontSize: 16, fontWeight: '500' },
  selectedArmyContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#3498db', padding: 16, borderRadius: 8, marginTop: 8, marginBottom: 16
  },
  selectedArmyText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  changeButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  changeButtonText: { color: '#fff', fontWeight: '600' },
  unitListContainer: { marginBottom: 16 },
  unitItem: { padding: 8, marginBottom: 8, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  unitListImage: { width: 60, height: 72, borderRadius: 4, marginRight: 12 },
  unitItemInfo: { flex: 1 },
  unitNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  unitName: { fontSize: 16, fontWeight: '600', flex: 1 },
  ownedBadge: { backgroundColor: '#f39c12', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  ownedBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  unitType: { fontSize: 14 },
  selectedUnitCard: { backgroundColor: '#27ae60', borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  alreadyOwnedBanner: { backgroundColor: '#f39c12', padding: 8, alignItems: 'center' },
  alreadyOwnedText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  selectedUnitContainer: { flexDirection: 'row' },
  selectedUnitImage: { width: 120, height: 140, backgroundColor: '#2ecc71' },
  selectedUnitInfo: { flex: 1, padding: 16 },
  selectedUnitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  selectedUnitName: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  clearButton: { fontSize: 24, color: '#fff', fontWeight: 'bold' },
  selectedUnitDetail: { fontSize: 14, color: '#fff', marginTop: 4 },
  noResults: { textAlign: 'center', fontSize: 16, marginTop: 20 },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  buttonSelected: { backgroundColor: '#e74c3c', borderColor: '#e74c3c' },
  buttonText: { fontSize: 14 },
  buttonTextSelected: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#27ae60', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#95a5a6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12, marginBottom: 32 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optionsContainer: { marginTop: 8, marginBottom: 16 },
  optionItem: { padding: 12, borderRadius: 8, borderWidth: 2, marginBottom: 8 },
  optionItemSelected: { backgroundColor: '#e8f5e9', borderColor: '#27ae60' },
  optionItemIncluded: { backgroundColor: '#e3f2fd', borderColor: '#3498db' },
  optionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionName: { fontSize: 15, fontWeight: '500', flex: 1 },
  optionNameSelected: { color: '#27ae60', fontWeight: '600' },
  optionPoints: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  optionPointsSelected: { color: '#27ae60', fontWeight: 'bold' },
  optionType: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  totalPointsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3498db', padding: 16, borderRadius: 8, marginBottom: 16 },
  totalPointsLabel: { fontSize: 16, color: '#fff', fontWeight: '600' },
  totalPointsValue: { fontSize: 20, color: '#fff', fontWeight: 'bold' }
});
