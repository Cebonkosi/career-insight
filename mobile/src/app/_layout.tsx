import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Network from 'expo-network';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

// Pause queries while offline and refetch when the connection returns (UAT NFR-005).
// Skipped during Expo Router's web server render, where there is no `window`.
if (typeof window !== 'undefined') {
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => sub.remove();
  });
}

// Refresh stale data when the app comes back to the foreground (e.g. admin edits, ADM-005).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
}

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  // A font failure falls back to system fonts rather than blocking the app.
  const ready = !loading && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Keep the splash screen up until we know which group to show.
  if (!ready) return null;

  const signedIn = Boolean(session);
  const onboarded = Boolean(profile);
  // Where a user in each state belongs. Guards redirect here explicitly, because
  // the default (the group itself) has no index route for (auth).
  const home = !signedIn ? '/sign-in' : !onboarded ? '/onboarding' : '/';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn && onboarded} redirectTo={home}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="opportunity/[id]" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="post/edit/[id]" />
        <Stack.Screen name="live/[id]" />
        <Stack.Screen name="live/new" />
        <Stack.Screen name="profile/[userId]" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="notifications" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn && !onboarded} redirectTo={home}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn} redirectTo={home}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider
          value={{
            ...base,
            colors: {
              ...base.colors,
              primary: Colors[scheme].primary,
              background: Colors[scheme].background,
              card: Colors[scheme].backgroundElement,
              border: Colors[scheme].border,
              text: Colors[scheme].text,
            },
          }}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
