import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { PaintStatus, createCollectionItem } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { mesbgDataService } from '../src/services/mesbgDataService';
import { imageService } from '../src/services/imageService';
import { MesbgUnit } from '../src/types/mesbg-data.types';

export default function AddMiniatureScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<MesbgUnit | null>(null);
  const [selectedArmy, setSelectedArmy] = useState<string>('');
  const [owned_quantity, setOwnedQuantity] = useState('1');
  const [paint_status, setPaintStatus] = useState<PaintStatus>(PaintStatus.UNPAINTED);
  const [notes, setNotes] = useState('');
  const [showArmyPicker, setShowArmyPicker] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const armies = useMemo(() => mesbgDataService.getArmyNames(), []);

  const filteredArmies = useMemo(() => {
    if (!searchQuery && showArmyPicker) return armies;
    return armies.filter(a => a.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [armies, searchQuery, showArmyPicker]);

  const filteredUnits = useMemo(() => {
    if (!selectedArmy && !searchQuery) return [];

    let units = selectedArmy
      ? mesbgDataService.getUnitsByArmy(selectedArmy)
      : mesbgDataService.getAllUnits();

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

    const item = createCollectionItem(
      selectedUnit.model_id,
      qty,
      paint_status,
      notes.trim() || undefined,
      selectedOptions.length > 0 ? selectedOptions : undefined
    );

    try {
      await collectionStorage.addItem(item);
      const totalPoints = calculateTotalPoints();
      Alert.alert(
        'Success',
        `${selectedUnit.name} added to collection!\nTotal: ${totalPoints} pts/model`,
        [
          {
            text: 'Add Another',
            onPress: () => resetForm()
          },
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save unit');
    }
  };

  if (showArmyPicker) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Army</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search armies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#bdc3c7"
          />
        </View>
        <FlatList
          data={filteredArmies}
          keyExtractor={(item) => item}
          renderItem={({ item: army }) => (
            <TouchableOpacity
              style={styles.armyItem}
              onPress={() => {
                setSelectedArmy(army);
                setSearchQuery('');
                setShowArmyPicker(false);
              }}
            >
              <Text style={styles.armyItemText}>{army}</Text>
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
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <View style={styles.selectedArmyContainer}>
            <View>
              <Text style={styles.label}>Selected Army</Text>
              <Text style={styles.selectedArmyText}>{selectedArmy}</Text>
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => {
                setShowArmyPicker(true);
                setSelectedUnit(null);
              }}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Search Unit</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a unit..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#bdc3c7"
          />

          {selectedUnit ? (
            <View style={styles.selectedUnitCard}>
              <View style={styles.selectedUnitContainer}>
                {/* Unit Image */}
                <Image
                  source={{ uri: imageService.getUnitImageUrl(selectedUnit.profile_origin, selectedUnit.name) }}
                  style={styles.selectedUnitImage}
                  resizeMode="cover"
                />
                {/* Unit Info */}
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
              {filteredUnits.map((unit) => (
                <TouchableOpacity
                  key={unit.model_id}
                  style={styles.unitItem}
                  onPress={() => {
                    setSelectedUnit(unit);
                    setSearchQuery('');
                  }}
                >
                  <Image
                    source={{ uri: imageService.getUnitImageUrl(unit.profile_origin, unit.name) }}
                    style={styles.unitListImage}
                    resizeMode="cover"
                  />
                  <View style={styles.unitItemInfo}>
                    <Text style={styles.unitName}>{unit.name}</Text>
                    <Text style={styles.unitType}>{unit.unit_type} • {unit.base_points} pts</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {filteredUnits.length === 0 && searchQuery && (
                <Text style={styles.noResults}>No units found</Text>
              )}
            </View>
          )}

          {selectedUnit && (
            <>
              <Text style={styles.label}>Quantity Owned</Text>
              <TextInput
                style={styles.input}
                value={owned_quantity}
                onChangeText={setOwnedQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#bdc3c7"
              />

              {/* Wargear Options */}
              {selectedUnit.options && selectedUnit.options.length > 0 && (
                <>
                  <Text style={styles.label}>
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
                            isSelected && styles.optionItemSelected,
                            isIncluded && styles.optionItemIncluded
                          ]}
                          onPress={() => {
                            if (isIncluded) return; // Can't toggle included items
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
                              (isSelected || isIncluded) && styles.optionNameSelected
                            ]}>
                              {isIncluded ? '✓ ' : ''}{option.name}
                              {isIncluded && ' (Included)'}
                            </Text>
                            <Text style={[
                              styles.optionPoints,
                              (isSelected || isIncluded) && styles.optionPointsSelected
                            ]}>
                              {option.points > 0 ? `+${option.points}` : option.points} pts
                            </Text>
                          </View>
                          {option.type && (
                            <Text style={styles.optionType}>{option.type}</Text>
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

              <Text style={styles.label}>Paint Status</Text>
              <View style={styles.buttonGroup}>
                {Object.values(PaintStatus).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.button, paint_status === status && styles.buttonSelected]}
                    onPress={() => setPaintStatus(status)}
                  >
                    <Text style={[styles.buttonText, paint_status === status && styles.buttonTextSelected]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor="#bdc3c7"
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
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1'
  },
  scrollView: {
    flex: 1
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 16,
    paddingTop: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8
  },
  form: {
    padding: 16
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  armyItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  armyItemText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500'
  },
  selectedArmyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16
  },
  selectedArmyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  changeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  changeButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  unitListContainer: {
    marginBottom: 16
  },
  unitItem: {
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center'
  },
  unitListImage: {
    width: 60,
    height: 72,
    borderRadius: 4,
    backgroundColor: '#ecf0f1',
    marginRight: 12
  },
  unitItemInfo: {
    flex: 1
  },
  unitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4
  },
  unitType: {
    fontSize: 14,
    color: '#7f8c8d'
  },
  selectedUnitCard: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden'
  },
  selectedUnitContainer: {
    flexDirection: 'row'
  },
  selectedUnitImage: {
    width: 120,
    height: 140,
    backgroundColor: '#2ecc71'
  },
  selectedUnitInfo: {
    flex: 1,
    padding: 16
  },
  selectedUnitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  selectedUnitName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1
  },
  clearButton: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold'
  },
  selectedUnitDetail: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4
  },
  noResults: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 16,
    marginTop: 20
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  buttonSelected: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c'
  },
  buttonText: {
    fontSize: 14,
    color: '#7f8c8d'
  },
  buttonTextSelected: {
    color: '#fff',
    fontWeight: '600'
  },
  saveButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 16
  },
  optionItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 8
  },
  optionItemSelected: {
    backgroundColor: '#e8f5e9',
    borderColor: '#27ae60'
  },
  optionItemIncluded: {
    backgroundColor: '#e3f2fd',
    borderColor: '#3498db'
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  optionName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1
  },
  optionNameSelected: {
    color: '#27ae60',
    fontWeight: '600'
  },
  optionPoints: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
    marginLeft: 8
  },
  optionPointsSelected: {
    color: '#27ae60',
    fontWeight: 'bold'
  },
  optionType: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    fontStyle: 'italic'
  },
  totalPointsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  totalPointsLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600'
  },
  totalPointsValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold'
  }
});
