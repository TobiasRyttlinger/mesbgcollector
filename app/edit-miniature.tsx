import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { PaintStatus, CollectionItem } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { collectionViewService, CollectionItemView } from '../src/services/collectionViewService';
import { useTheme } from '../src/contexts/ThemeContext';

export default function EditMiniatureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const c = theme.colors;

  const [item, setItem] = useState<CollectionItemView | null>(null);
  const [owned_quantity, setOwnedQuantity] = useState('');
  const [painted_quantity, setPaintedQuantity] = useState('');
  const [paint_status, setPaintStatus] = useState<PaintStatus>(PaintStatus.UNPAINTED);
  const [notes, setNotes] = useState('');
  const [storage_location, setStorageLocation] = useState('');
  const [custom_name, setCustomName] = useState('');

  useEffect(() => {
    loadItem();
  }, [params.id]);

  const loadItem = async () => {
    const collection = await collectionStorage.loadCollection();
    const found = collection.find(col => col.id === params.id as string);
    if (found) {
      const enriched = collectionViewService.enrichCollectionItem(found);
      setItem(enriched);
      setOwnedQuantity(found.owned_quantity.toString());
      setPaintedQuantity(found.painted_quantity.toString());
      setPaintStatus(found.paint_status);
      setNotes(found.notes || '');
      setStorageLocation(found.storage_location || '');
      setCustomName(found.custom_name || '');
    }
  };

  const handleSave = async () => {
    if (!item) return;

    const ownedQty = parseInt(owned_quantity) || 0;
    const paintedQty = parseInt(painted_quantity) || 0;

    if (paintedQty > ownedQty) {
      Alert.alert('Validation Error', 'Painted quantity cannot exceed owned quantity');
      return;
    }

    const updatedItem: CollectionItem = {
      id: item.id,
      model_id: item.model_id,
      owned_quantity: ownedQty,
      painted_quantity: paintedQty,
      paint_status,
      notes: notes.trim() || undefined,
      date_added: item.date_added,
      purchase_date: item.purchase_date,
      storage_location: storage_location.trim() || undefined,
      custom_name: custom_name.trim() || undefined,
      selected_options: item.selected_options
    };

    try {
      await collectionStorage.updateItem(item.id, updatedItem);
      Alert.alert('Success', 'Unit updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update unit');
    }
  };

  const getPaintStatusColor = (status: PaintStatus) => {
    switch (status) {
      case PaintStatus.UNPAINTED: return '#95a5a6';
      case PaintStatus.PRIMED: return '#f39c12';
      case PaintStatus.IN_PROGRESS: return '#3498db';
      case PaintStatus.PAINTED: return '#2ecc71';
      case PaintStatus.BASED: return '#27ae60';
      default: return '#95a5a6';
    }
  };

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.form}>
        {/* Unit Preview Card */}
        <View style={[styles.previewCard, { backgroundColor: c.surface }]}>
          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.previewImage} resizeMode="cover" />
          )}
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: c.text }]}>{item.unit_data?.name || 'Unknown Unit'}</Text>
            <Text style={[styles.previewDetail, { color: c.textMuted }]}>{item.army_name}</Text>
            <Text style={[styles.previewDetail, { color: c.textMuted }]}>{item.unit_type}</Text>
            <Text style={styles.previewPoints}>
              {item.total_points} pts/model
              {item.selected_options && item.selected_options.length > 0 && ' (w/ gear)'}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: c.text }]}>Custom Name (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          value={custom_name}
          onChangeText={setCustomName}
          placeholder={item.unit_data?.name || 'Unit name'}
          placeholderTextColor={c.placeholder}
        />

        <Text style={[styles.label, { color: c.text }]}>Quantity Owned</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          value={owned_quantity}
          onChangeText={setOwnedQuantity}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={c.placeholder}
        />

        <Text style={[styles.label, { color: c.text }]}>Quantity Painted</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          value={painted_quantity}
          onChangeText={setPaintedQuantity}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={c.placeholder}
        />

        <Text style={[styles.label, { color: c.text }]}>Paint Status</Text>
        <View style={styles.statusGrid}>
          {Object.values(PaintStatus).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                { backgroundColor: c.surface, borderColor: c.border },
                paint_status === status && { borderColor: getPaintStatusColor(status), backgroundColor: c.surfaceRaised }
              ]}
              onPress={() => setPaintStatus(status)}
            >
              <View style={[styles.statusDot, { backgroundColor: getPaintStatusColor(status) }]} />
              <Text style={[
                styles.statusButtonText,
                { color: c.textMuted },
                paint_status === status && { color: c.text, fontWeight: '700' }
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: c.text }]}>Storage Location (Optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
          value={storage_location}
          onChangeText={setStorageLocation}
          placeholder="e.g., Shelf A, Box 3"
          placeholderTextColor={c.placeholder}
        />

        <Text style={[styles.label, { color: c.text }]}>Notes (Optional)</Text>
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
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  form: { padding: 16 },
  previewCard: { borderRadius: 8, overflow: 'hidden', marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  previewImage: { width: '100%', height: 200 },
  previewInfo: { padding: 16 },
  previewName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  previewDetail: { fontSize: 14, marginBottom: 4 },
  previewPoints: { fontSize: 16, color: '#e74c3c', fontWeight: '600', marginTop: 8 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statusButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, minWidth: '48%', flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  statusButtonText: { fontSize: 13, fontWeight: '500' },
  saveButton: { backgroundColor: '#27ae60', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#95a5a6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12, marginBottom: 32 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
