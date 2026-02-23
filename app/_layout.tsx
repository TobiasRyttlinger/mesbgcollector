import { Stack, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

function AppStack() {
  const { theme, toggleTheme } = useTheme();
  const { headerBg } = theme.colors;
  const router = useRouter();

  const indexHeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
      <TouchableOpacity onPress={() => router.push('/settings')} style={{ padding: 6 }}>
        <Text style={{ fontSize: 20 }}>⚙️</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={toggleTheme} style={{ padding: 6 }}>
        <Text style={{ fontSize: 20 }}>{theme.dark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'MESBG Inventory',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: indexHeaderRight,
        }}
      />
      <Stack.Screen
        name="scenarios"
        options={{
          title: 'Scenarios',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="scenario-detail"
        options={{
          title: 'Scenario',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="add-miniature"
        options={{
          title: 'Add Miniature',
          presentation: 'modal',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name="miniature-detail"
        options={{
          title: 'Miniature Details',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name="edit-miniature"
        options={{
          title: 'Edit Miniature',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          presentation: 'modal',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}
