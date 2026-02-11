import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Miniature } from '../src/models/Miniature';
import { storageService } from '../src/services/storage';

export default function MiniatureDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [miniature, setMiniature] = useState<Miniature | null>(null);

  useEffect(() => {
    loadMiniature();
  }, [params.id]);

  const loadMiniature = async () => {
    const miniatures = await storageService.loadMiniatures();
    const found = miniatures.find(m => m.id === params.id);
    if (found) {
      setMiniature(found);
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
            if (miniature) {
              await storageService.deleteMiniature(miniature.id);
              router.back();
            }
          }
        }
      ]
    );
  };

  if (!miniature) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{miniature.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{miniature.paintStatus}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <InfoRow label="Army" value={miniature.army} />
        <InfoRow label="Unit Type" value={miniature.unitType} />
        <InfoRow label="Quantity" value={miniature.quantity.toString()} />
        {miniature.points && <InfoRow label="Points" value={`${miniature.points} pts`} />}
      </View>

      {miniature.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{miniature.notes}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.dateText}>
          Added: {new Date(miniature.dateAdded).toLocaleDateString()}
        </Text>
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
  }
});
