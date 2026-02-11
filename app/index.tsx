import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PaintStatus } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { collectionViewService, CollectionItemView } from '../src/services/collectionViewService';

export default function InventoryScreen() {
  const [collection, setCollection] = useState<CollectionItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadCollection = async () => {
    try {
      const items = await collectionStorage.loadCollection();
      const enriched = collectionViewService.enrichCollection(items);
      setCollection(enriched);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCollection();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this from your collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await collectionStorage.deleteItem(id);
            loadCollection();
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

  const renderMiniature = ({ item }: { item: CollectionItemView }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({
        pathname: '/miniature-detail',
        params: { id: item.id }
      })}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.display_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getPaintStatusColor(item.paint_status) }]}>
          <Text style={styles.statusText}>{item.paint_status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.army}>{item.army_name}</Text>
        <Text style={styles.detail}>{item.unit_type} • Qty: {item.owned_quantity}</Text>
        <Text style={styles.points}>{item.base_points} pts/model</Text>
      </View>
    </TouchableOpacity>
  );

  const stats = collectionViewService.getStatistics(
    collection.map(item => ({
      id: item.id,
      model_id: item.model_id,
      owned_quantity: item.owned_quantity,
      painted_quantity: item.painted_quantity,
      paint_status: item.paint_status,
      date_added: item.date_added,
      notes: item.notes
    }))
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalModels}</Text>
          <Text style={styles.statLabel}>Total Models</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.paintedModels}</Text>
          <Text style={styles.statLabel}>Painted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalArmies}</Text>
          <Text style={styles.statLabel}>Armies</Text>
        </View>
      </View>

      {collection.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No miniatures yet</Text>
          <Text style={styles.emptySubtext}>Tap the + button to add your first miniature</Text>
        </View>
      ) : (
        <FlatList
          data={collection}
          renderItem={renderMiniature}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-miniature')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4
  },
  list: {
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  cardBody: {
    gap: 4
  },
  army: {
    fontSize: 16,
    color: '#34495e',
    fontWeight: '600'
  },
  detail: {
    fontSize: 14,
    color: '#7f8c8d'
  },
  points: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#95a5a6',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center'
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32
  }
});
