import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { PaintStatus } from '../src/models/Collection';
import { collectionStorage } from '../src/services/collectionStorage';
import { CollectionItemView, collectionViewService } from '../src/services/collectionViewService';

export default function InventoryScreen() {
  const [collection, setCollection] = useState<CollectionItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

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

  const handleQuickActions = (item: CollectionItemView) => {
    const actions: any[] = [];

    const statuses = Object.values(PaintStatus);
    statuses.forEach(status => {
      if (status !== item.paint_status) {
        actions.push({
          text: `Mark as ${status}`,
          onPress: async () => {
            const col = await collectionStorage.loadCollection();
            const found = col.find(c => c.id === item.id);
            if (found) {
              await collectionStorage.updateItem(item.id, { ...found, paint_status: status });
              loadCollection();
            }
          }
        });
      }
    });

    if (item.painted_quantity < item.owned_quantity) {
      actions.push({
        text: `+1 Painted (${item.painted_quantity + 1}/${item.owned_quantity})`,
        onPress: async () => {
          const col = await collectionStorage.loadCollection();
          const found = col.find(c => c.id === item.id);
          if (found) {
            await collectionStorage.updateItem(item.id, { ...found, painted_quantity: found.painted_quantity + 1 });
            loadCollection();
          }
        }
      });
    }

    actions.push({ text: 'Cancel', style: 'cancel' as const });
    Alert.alert('Quick Update', `Update ${item.display_name}`, actions);
  };

  const getPaintStatusColor = (status: PaintStatus) => {
    switch (status) {
      case PaintStatus.UNPAINTED: return '#3d4b4d';
      case PaintStatus.PRIMED: return '#f39c12';
      case PaintStatus.IN_PROGRESS: return '#3498db';
      case PaintStatus.PAINTED: return '#2ecc71';
      case PaintStatus.BASED: return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const renderMiniature = ({ item }: { item: CollectionItemView }) => (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={() => router.push({ pathname: '/miniature-detail', params: { id: item.id } })}
        onLongPress={() => handleDelete(item.id)}
      >
        <View style={styles.cardContainer}>
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={[styles.unitImage, { backgroundColor: c.progressBarBg }]}
              resizeMode="cover"
            />
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>{item.display_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getPaintStatusColor(item.paint_status) }]}>
                <Text style={styles.statusText}>{item.paint_status}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.army, { color: c.textSecondary }]}>{item.army_name}</Text>
              <Text style={[styles.detail, { color: c.textMuted }]}>{item.unit_type} • Qty: {item.owned_quantity}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressBarBackground, { backgroundColor: c.progressBarBg }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${(item.painted_quantity / item.owned_quantity) * 100}%`,
                        backgroundColor: getPaintStatusColor(item.paint_status)
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: c.textMuted }]}>
                  {item.painted_quantity}/{item.owned_quantity} painted
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickActions(item)}>
        <Text style={styles.quickActionText}>⚡</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMiniatureCompact = ({ item }: { item: CollectionItemView }) => (
    <TouchableOpacity
      style={[styles.compactRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}
      onPress={() => router.push({ pathname: '/miniature-detail', params: { id: item.id } })}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={[styles.compactBar, { backgroundColor: getPaintStatusColor(item.paint_status) }]} />
      <Text style={[styles.compactName, { color: c.text }]} numberOfLines={1}>{item.display_name}</Text>
      <Text style={[styles.compactQty, { color: c.textMuted }]}>×{item.owned_quantity}</Text>
      <View style={[styles.compactDot, { backgroundColor: getPaintStatusColor(item.paint_status) }]} />
      <TouchableOpacity style={styles.compactAction} onPress={() => handleQuickActions(item)}>
        <Text style={styles.compactActionText}>⚡</Text>
      </TouchableOpacity>
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
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Text style={[styles.loadingText, { color: c.textMuted }]}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: c.text }]}>{stats.totalModels}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Total Models</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: c.text }]}>{stats.paintedModels}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Painted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: c.text }]}>{stats.totalArmies}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Armies</Text>
        </View>
        <TouchableOpacity
          style={[styles.viewToggle, { borderColor: c.border, backgroundColor: c.surface }]}
          onPress={() => setCompact(v => !v)}
        >
          <Text style={[styles.viewToggleText, { color: c.text }]}>{compact ? '⊞' : '☰'}</Text>
        </TouchableOpacity>
      </View>

      {/* Army Progress Bar */}
      {stats.totalModels > 0 && (
        <View style={[styles.armyProgressContainer, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <View style={styles.armyProgressHeader}>
            <Text style={[styles.armyProgressLabel, { color: c.text }]}>
              Overall Painting Progress
            </Text>
            <Text style={styles.armyProgressPercentage}>
              {Math.round((stats.paintedModels / stats.totalModels) * 100)}%
            </Text>
          </View>
          <View style={[styles.armyProgressBarBackground, { backgroundColor: c.progressBarBg }]}>
            <View
              style={[
                styles.armyProgressBarFill,
                { width: `${(stats.paintedModels / stats.totalModels) * 100}%` }
              ]}
            />
          </View>
          <Text style={[styles.armyProgressText, { color: c.textMuted }]}>
            {stats.paintedModels} of {stats.totalModels} models painted
          </Text>
        </View>
      )}

      {collection.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No miniatures yet</Text>
          <Text style={[styles.emptySubtext, { color: c.placeholder }]}>
            Tap the + button to add your first miniature
          </Text>
        </View>
      ) : (
        <FlatList
          data={collection}
          renderItem={compact ? renderMiniatureCompact : renderMiniature}
          keyExtractor={item => item.id}
          contentContainerStyle={compact ? styles.listCompact : styles.list}
        />
      )}

      <TouchableOpacity style={styles.scenariosFab} onPress={() => router.push('/scenarios')}>
        <Text style={styles.scenariosFabText}>⚔️</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-miniature')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  statsContainer: { flexDirection: 'row', padding: 16, borderBottomWidth: 1 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  armyProgressContainer: { padding: 16, borderBottomWidth: 1 },
  armyProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  armyProgressLabel: { fontSize: 14, fontWeight: '600' },
  armyProgressPercentage: { fontSize: 18, fontWeight: 'bold', color: '#27ae60' },
  armyProgressBarBackground: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  armyProgressBarFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 6 },
  armyProgressText: { fontSize: 12, textAlign: 'center' },
  list: { padding: 16 },
  card: {
    borderRadius: 8, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, overflow: 'hidden', position: 'relative',
    borderWidth: 1
  },
  cardTouchable: { flex: 1 },
  cardContainer: { flexDirection: 'row' },
  unitImage: { width: 100, height: 120 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  cardBody: { gap: 4 },
  army: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 14 },
  points: { fontSize: 14, color: '#e74c3c', fontWeight: '600' },
  progressBar: { marginTop: 8 },
  progressBarBackground: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '500' },
  quickActionButton: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#3498db', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2
  },
  quickActionText: { fontSize: 16, color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  scenariosFab: {
    position: 'absolute', right: 84, bottom: 40,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#8e44ad',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4
  },
  scenariosFabText: { fontSize: 26 },
  fab: {
    position: 'absolute', right: 16, bottom: 40,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#e74c3c',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4
  },
  fabText: { fontSize: 32, color: '#fff', lineHeight: 32 },
  // View toggle button
  viewToggle: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 'auto' },
  viewToggleText: { fontSize: 18 },
  // Compact list
  listCompact: { paddingTop: 4 },
  compactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingRight: 12, borderBottomWidth: 1 },
  compactBar: { width: 4, alignSelf: 'stretch', marginRight: 12 },
  compactName: { flex: 1, fontSize: 14, fontWeight: '500', marginRight: 8 },
  compactQty: { fontSize: 13, fontWeight: '600', marginRight: 8 },
  compactDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  compactAction: { padding: 4 },
  compactActionText: { fontSize: 15 },
});
