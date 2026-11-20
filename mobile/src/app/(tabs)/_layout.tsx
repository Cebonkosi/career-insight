import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.backgroundElement}
      // Android draws the mockups' solid purple pill behind the selected icon, so
      // that icon is white there; iOS has no pill, so it stays purple.
      indicatorColor={theme.primary}
      tintColor={theme.primary}
      iconColor={{
        default: theme.textSecondary,
        selected: Platform.OS === 'android' ? theme.onPrimary : theme.primary,
      }}
      labelStyle={{
        default: { color: theme.textSecondary, fontFamily: Fonts.medium },
        selected: { color: theme.primary, fontFamily: Fonts.semibold },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} md="explore" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="downloads">
        <NativeTabs.Trigger.Label>My forms</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'arrow.down.doc', selected: 'arrow.down.doc.fill' }}
          md="download"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
