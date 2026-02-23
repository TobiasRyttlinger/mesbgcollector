import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import { collectionStorage } from '../src/services/collectionStorage';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const c = theme.colors;
  const router = useRouter();

  const handleClearCollection = () => {
    Alert.alert(
      'Clear Collection',
      'This will permanently delete all miniatures from your collection. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const items = await collectionStorage.loadCollection();
              for (const item of items) {
                await collectionStorage.deleteItem(item.id);
              }
              Alert.alert('Done', 'Collection cleared.');
            } catch {
              Alert.alert('Error', 'Failed to clear collection.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      {/* Appearance */}
      <Text style={[styles.section, { color: c.textMuted }]}>APPEARANCE</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.text }]}>Dark Mode</Text>
          <Switch
            value={theme.dark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: '#3498db' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Data */}
      <Text style={[styles.section, { color: c.textMuted }]}>DATA</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <TouchableOpacity style={[styles.row, styles.destructiveRow]} onPress={handleClearCollection}>
          <Text style={styles.destructiveText}>Clear Collection</Text>
          <Text style={[styles.rowChevron, { color: '#e74c3c' }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <Text style={[styles.section, { color: c.textMuted }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: c.border }]}>
          <Text style={[styles.rowLabel, { color: c.text }]}>App</Text>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>MESBG Army Collector</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: c.text }]}>Data Source</Text>
          <Text style={[styles.rowValue, { color: c.textMuted }]}>mesbg-list-builder-v2024</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginHorizontal: 16 },
  card: { marginHorizontal: 16, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15 },
  rowValue: { fontSize: 14 },
  rowChevron: { fontSize: 20, fontWeight: '300' },
  destructiveRow: {},
  destructiveText: { fontSize: 15, color: '#e74c3c', fontWeight: '500' },
});
