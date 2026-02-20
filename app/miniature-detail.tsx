import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { PaintStatus } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { CollectionItemView, collectionViewService } from '../src/services/collectionViewService';

export default function MiniatureDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [item, setItem] = useState<CollectionItemView | null>(null);
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => {
    loadItem();
  }, [params.id]);

  const loadItem = async () => {
    const collection = await collectionStorage.loadCollection();
    const found = collection.find(col => col.id === params.id);
    if (found) {
      const enriched = collectionViewService.enrichCollectionItem(found);
      setItem(enriched);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Miniature',
      'Are you sure you want to delete this miniature?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (item) {
              await collectionStorage.deleteItem(item.id);
              router.back();
            }
          }
        }
      ]
    );
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
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.heroImage} resizeMode="cover" />
      )}

      <View style={[styles.header, { backgroundColor: getPaintStatusColor(item.paint_status) }]}>
        <Text style={styles.name}>{item.display_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.paint_status}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <InfoRow label="Army" value={item.army_name} c={c} />
        <InfoRow label="Unit Type" value={item.unit_type} c={c} />
        <InfoRow label="Owned" value={item.owned_quantity.toString()} c={c} />
        <InfoRow label="Painted" value={item.painted_quantity.toString()} c={c} />
      </View>

      {item.selected_options && item.selected_options.length > 0 && item.unit_data && (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Wargear & Equipment</Text>
          {item.selected_options.map(optId => {
            const option = item.unit_data!.options.find(opt => opt.id === optId);
            if (!option) return null;
            return (
              <View key={optId} style={[styles.wargearRow, { borderBottomColor: c.border }]}>
                <Text style={[styles.wargearName, { color: c.text }]}>✓ {option.name}</Text>
              </View>
            );
          })}
        </View>
      )}

      {item.notes && (
        <View style={[styles.section, { backgroundColor: c.surface }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Notes</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{item.notes}</Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: c.surface }]}>
        <Text style={[styles.dateText, { color: c.textMuted }]}>
          Added: {new Date(item.date_added).toLocaleDateString()}
        </Text>
        {item.purchase_date && (
          <Text style={[styles.dateText, { color: c.textMuted }]}>
            Purchased: {new Date(item.purchase_date).toLocaleDateString()}
          </Text>
        )}
        {item.storage_location && (
          <Text style={[styles.dateText, { color: c.textMuted }]}>
            Location: {item.storage_location}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({ pathname: '/edit-miniature', params: { id: item.id } })}
      >
        <Text style={styles.editButtonText}>Edit Progress & Details</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Miniature</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: c.border }]}>
      <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  heroImage: { width: '100%', height: 300, backgroundColor: '#bdc3c7' },
  header: { padding: 24, alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 12 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { marginTop: 16, padding: 16, marginHorizontal: 16, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 16, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '600' },
  statsRow: { paddingVertical: 8, borderBottomWidth: 1 },
  statsText: { fontSize: 14, fontFamily: 'monospace', fontWeight: '500' },
  notes: { fontSize: 16, lineHeight: 24 },
  dateText: { fontSize: 14, textAlign: 'center' },
  editButton: { backgroundColor: '#3498db', padding: 16, borderRadius: 8, margin: 16, marginBottom: 8, alignItems: 'center' },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#e74c3c', padding: 16, borderRadius: 8, marginHorizontal: 16, marginBottom: 32, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  wargearRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  wargearName: { fontSize: 15, flex: 1 },
  wargearPoints: { fontSize: 14, color: '#27ae60', fontWeight: '600', marginLeft: 8 }
});
