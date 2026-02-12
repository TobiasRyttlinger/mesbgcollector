import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collectionStorage } from '../src/services/collectionStorage';
import { collectionViewService, CollectionItemView } from '../src/services/collectionViewService';
import { PaintStatus } from '../src/models/Collection';

export default function MiniatureDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [item, setItem] = useState<CollectionItemView | null>(null);

  useEffect(() => {
    loadItem();
  }, [params.id]);

  const loadItem = async () => {
    const collection = await collectionStorage.loadCollection();
    const found = collection.find(c => c.id === params.id);
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      )}

      {/* Header with Paint Status */}
      <View style={[styles.header, { backgroundColor: getPaintStatusColor(item.paint_status) }]}>
        <Text style={styles.name}>{item.display_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.paint_status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <InfoRow label="Army" value={item.army_name} />
        <InfoRow label="Unit Type" value={item.unit_type} />
        <InfoRow label="Owned" value={item.owned_quantity.toString()} />
        <InfoRow label="Painted" value={item.painted_quantity.toString()} />
        <InfoRow label="Base Points" value={`${item.base_points} pts/model`} />
        {item.selected_options && item.selected_options.length > 0 && (
          <InfoRow label="Total Points" value={`${item.total_points} pts/model`} />
        )}
        {item.warband_size > 0 && <InfoRow label="Warband Size" value={item.warband_size.toString()} />}
      </View>

      {/* Selected Wargear */}
      {item.selected_options && item.selected_options.length > 0 && item.unit_data && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Wargear</Text>
          {item.selected_options.map(optId => {
            const option = item.unit_data!.options.find(opt => opt.id === optId);
            if (!option) return null;
            return (
              <View key={optId} style={styles.wargearRow}>
                <Text style={styles.wargearName}>• {option.name}</Text>
                <Text style={styles.wargearPoints}>
                  {option.points > 0 ? `+${option.points}` : option.points} pts
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {item.unit_data && item.unit_data.MWFW && item.unit_data.MWFW.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats (MWFW)</Text>
          {item.unit_data.MWFW.map((profile, idx) => (
            <View key={idx} style={styles.statsRow}>
              <Text style={styles.statsText}>
                M:{profile[0] || '-'} F:{profile[1] || '-'} S:{profile[2] || '-'}
                D:{profile[3] || '-'} A:{profile[4] || '-'} W:{profile[5] || '-'}
                C:{profile[6] || '-'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {item.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{item.notes}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.dateText}>
          Added: {new Date(item.date_added).toLocaleDateString()}
        </Text>
        {item.purchase_date && (
          <Text style={styles.dateText}>
            Purchased: {new Date(item.purchase_date).toLocaleDateString()}
          </Text>
        )}
        {item.storage_location && (
          <Text style={styles.dateText}>
            Location: {item.storage_location}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete Miniature</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1'
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#7f8c8d'
  },
  heroImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#bdc3c7'
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 24,
    alignItems: 'center'
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  infoLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600'
  },
  statsRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  statsText: {
    fontSize: 14,
    color: '#2c3e50',
    fontFamily: 'monospace',
    fontWeight: '500'
  },
  notes: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24
  },
  dateText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center'
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    marginBottom: 32
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  wargearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  wargearName: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1
  },
  wargearPoints: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    marginLeft: 8
  }
});
