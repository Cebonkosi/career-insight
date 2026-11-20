import { useNetworkState } from 'expo-network';
import { WifiOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Thin bar under the header while the device has no connection (NFR-005). */
export function OfflineBanner() {
  const theme = useTheme();
  const network = useNetworkState();
  // Unknown (undefined) counts as online so the bar doesn't flash on start-up.
  const offline = network.isConnected === false || network.isInternetReachable === false;
  if (!offline) return null;

  return (
    <View style={[styles.bar, { backgroundColor: theme.warningSoft }]} accessibilityRole="alert">
      <WifiOff color={theme.warning} size={16} />
      <ThemedText type="caption" themeColor="warning">
        You&apos;re offline. Saved forms and downloaded recordings still work.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
