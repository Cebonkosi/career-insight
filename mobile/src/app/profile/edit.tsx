import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ScreenIntro } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { GRADES, PROVINCES } from '@/constants/options';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/format';
import { updateMyProfile } from '@/services/profile';
import { uploadAvatar, validateAsset } from '@/services/storage';

const MAX_BIO = 300;

/** Edit your own profile. Role, type and approval are changed by admins only (AUTH-008). */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [province, setProvince] = useState(profile?.province ?? null);
  const [city, setCity] = useState(profile?.city ?? '');
  const [school, setSchool] = useState(profile?.school ?? '');
  const [grade, setGrade] = useState(profile?.grade ?? null);
  const [organization, setOrganization] = useState(profile?.organization_name ?? '');
  const [website, setWebsite] = useState(profile?.website ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const isStudent = profile?.role === 'student';
  const isContributor = profile?.role === 'contributor';
  const websiteValid = !website.trim() || /^https?:\/\/\S+\.\S+$/.test(website.trim());
  const valid = name.trim().length >= 2 && bio.length <= MAX_BIO && websiteValid;

  const save = useMutation({
    mutationFn: async () => {
      const avatarUrl = avatarAsset ? await uploadAvatar(session!.user.id, avatarAsset) : avatar;
      await updateMyProfile(session!.user.id, {
        display_name: name.trim(),
        bio: bio.trim() || null,
        province,
        city: city.trim() || null,
        avatar_url: avatarUrl,
        ...(isStudent ? { school: school.trim() || null, grade } : {}),
        ...(isContributor ? { organization_name: organization.trim() || null, website: website.trim() || null } : {}),
      });
      await refreshProfile();
    },
    onSuccess: () => router.back(),
    onError: (err) => Alert.alert('Could not save your profile', errorMessage(err, 'Please try again.')),
  });

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    try {
      validateAsset(result.assets[0], 'image');
      setAvatarAsset(result.assets[0]);
      setAvatar(result.assets[0].uri);
    } catch (err) {
      Alert.alert("That image can't be used", errorMessage(err, 'Please choose another image.'));
    }
  }

  if (!profile) return null;

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={<View />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled">
          <ScreenIntro title="Edit profile." subtitle="Your name, photo, bio and province are visible to others. Contact details are not." />

          <View style={styles.avatarRow}>
            <GradientAvatar name={name || profile.display_name} imageUrl={avatar} size={72} />
            <Button title="Change photo" variant="outline" icon={Camera} onPress={pickAvatar} />
          </View>

          <TextField label="Display name" value={name} onChangeText={setName} maxLength={60} />
          <TextField label="Bio" value={bio} onChangeText={setBio} multiline maxLength={MAX_BIO} style={styles.multiline} />
          <ThemedText type="caption" themeColor="textMuted" style={styles.right}>
            {bio.length}/{MAX_BIO}
          </ThemedText>
          <TextField label="City or town" value={city} onChangeText={setCity} maxLength={60} />

          {isStudent && (
            <>
              <TextField label="School" value={school} onChangeText={setSchool} maxLength={100} />
              <View style={styles.group}>
                <ThemedText type="smallBold">Grade</ThemedText>
                <View style={styles.chips}>
                  {GRADES.map((g) => (
                    <Chip key={g} label={`Grade ${g}`} outlined selected={grade === g} onPress={() => setGrade(g)} />
                  ))}
                </View>
              </View>
            </>
          )}

          {isContributor && (
            <>
              <TextField label="Organisation name" value={organization} onChangeText={setOrganization} maxLength={100} />
              <TextField label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://" />
              {!websiteValid && (
                <ThemedText type="caption" themeColor="danger">
                  Enter a full web address starting with https://
                </ThemedText>
              )}
            </>
          )}

          <View style={styles.group}>
            <ThemedText type="smallBold">Province</ThemedText>
            <View style={styles.chips}>
              {PROVINCES.map((p) => (
                <Chip key={p} label={p} outlined selected={province === p} onPress={() => setProvince(province === p ? null : p)} />
              ))}
            </View>
          </View>

          <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} disabled={!valid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  multiline: {
    minHeight: 90,
    paddingTop: Spacing.three - 4,
    textAlignVertical: 'top',
  },
  right: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.two,
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
