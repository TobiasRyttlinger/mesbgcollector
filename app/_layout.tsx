import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

function AppStack() {
  const { theme, toggleTheme } = useTheme();
  const { headerBg } = theme.colors;

  const toggleButton = (
    <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 12 }}>
      <Text style={{ fontSize: 20 }}>{theme.dark ? '☀️' : '🌙'}</Text>
    </TouchableOpacity>
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
          headerRight: () => toggleButton
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
