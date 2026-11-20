import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';

/**
 * Role-based tab bars from the UAT plan:
 * - Student / Parent: Home · Explore · Post · Live · Profile (NAV-001/002)
 * - Contributor, Tutor, Admin: Home · Post · Live · Analytics · Profile (NAV-003)
 * Hidden tabs can't be navigated to; the role is known before this mounts.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const { isLearner } = useRole();

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
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" hidden={!isLearner}>
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} md="explore" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="post">
        <NativeTabs.Trigger.Label>Post</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="live">
        <NativeTabs.Trigger.Label>Live</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'video', selected: 'video.fill' }} md="videocam" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="analytics" hidden={isLearner}>
        <NativeTabs.Trigger.Label>Analytics</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md="bar_chart"
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
