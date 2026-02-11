import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'MESBG Inventory',
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Stack.Screen
        name="add-miniature"
        options={{
          title: 'Add Miniature',
          presentation: 'modal',
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#fff'
        }}
      />
      <Stack.Screen
        name="miniature-detail"
        options={{
          title: 'Miniature Details',
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#fff'
        }}
      />
    </Stack>
  );
}
