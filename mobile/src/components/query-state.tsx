import { RefreshCw, WifiOff } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';

/** Shared loading / error-with-retry block so every screen fails the same, understandable way (NFR-005/007). */
export function QueryState({
  isPending,
  error,
  onRetry,
  label = 'this',
}: {
  isPending?: boolean;
  error?: unknown;
  onRetry?: () => void;
  label?: string;
}) {
  const theme = useTheme();

  if (isPending) {
    return (
      <View style={styles.box} accessibilityLabel={`Loading ${label}`}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }
  if (!error) return null;

  const offline = /network|fetch|internet|timeout/i.test(errorMessage(error, ''));
  return (
    <View style={styles.box}>
      <WifiOff color={theme.textMuted} size={28} />
      <ThemedText type="smallBold" style={styles.center}>
        {offline ? "You're offline or the connection dropped" : `Couldn't load ${label}`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {offline ? 'Check your connection, then try again.' : errorMessage(error, 'Please try again.')}
      </ThemedText>
      {onRetry && <Button title="Try again" variant="outline" icon={RefreshCw} onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
