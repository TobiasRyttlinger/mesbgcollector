import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { PaintStatus, createCollectionItem } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { mesbgDataService } from '../src/services/mesbgDataService';
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
      notes.trim() || undefined
    );

    try {
      await collectionStorage.addItem(item);
      Alert.alert('Success', 'Unit added to collection', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
    <ScrollView style={styles.container}>
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
            <View style={styles.selectedUnitHeader}>
              <Text style={styles.selectedUnitName}>{selectedUnit.name}</Text>
              <TouchableOpacity onPress={() => setSelectedUnit(null)}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.selectedUnitDetail}>{selectedUnit.unit_type}</Text>
            <Text style={styles.selectedUnitDetail}>{selectedUnit.base_points} points</Text>
          </View>
        ) : (
          <View style={styles.unitListContainer}>
            <FlatList
              data={filteredUnits}
              keyExtractor={(item) => item.model_id}
              renderItem={({ item: unit }) => (
                <TouchableOpacity
                  style={styles.unitItem}
                  onPress={() => {
                    setSelectedUnit(unit);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.unitName}>{unit.name}</Text>
                  <Text style={styles.unitType}>{unit.unit_type} • {unit.base_points} pts</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchQuery ? <Text style={styles.noResults}>No units found</Text> : null
              }
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1'
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
    height: 400,
    marginBottom: 16
  },
  unitItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
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
  }
});
