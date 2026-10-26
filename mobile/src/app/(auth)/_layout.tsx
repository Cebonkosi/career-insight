import { Stack } from 'expo-router';

export default function AuthLayout() {
  // sign-in is declared first so it's where signed-out users land.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
