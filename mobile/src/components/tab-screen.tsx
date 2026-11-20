import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** A tab's frame: the branded app header, then the screen's own scrolling content. */
export function TabScreen({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.flex}>
      <AppHeader />
      <View style={styles.inner}>{children}</View>
    </ThemedView>
  );
}

/** Large headline + supporting line that opens each screen, e.g. "Open doors." */
export function ScreenIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.intro}>
      <ThemedText type="display">{title}</ThemedText>
      {subtitle && (
        <ThemedText type="default" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  intro: {
    gap: Spacing.one,
  },
});
