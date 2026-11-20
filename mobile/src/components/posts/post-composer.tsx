import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Lock, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { POST_TYPES } from '@/constants/options';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import type { PostInput } from '@/services/posts';
import { UploadRejected, uploadPostImage, validateAsset } from '@/services/storage';
import type { Post, PostType } from '@/types/models';

export const MAX_POST_LENGTH = 2000;

type PostComposerProps = {
  initial?: Pick<Post, 'content' | 'post_type' | 'media_urls'>;
  submitLabel: string;
  onSubmit: (input: PostInput) => Promise<void>;
};

/** Post form shared by the Post tab and editing. Categories are only offered to admins and approved contributors (POST-005). */
export function PostComposer({ initial, submitLabel, onSubmit }: PostComposerProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { canCategorisePosts, awaitingApproval } = useRole();
  const [content, setContent] = useState(initial?.content ?? '');
  const [postType, setPostType] = useState<PostType | null>(initial?.post_type ?? null);
  const [existingImage, setExistingImage] = useState<string | null>(initial?.media_urls?.[0] ?? null);
  const [picked, setPicked] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = content.trim();
  const tooLong = content.length > MAX_POST_LENGTH;

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access in your device settings to add an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      validateAsset(asset, 'image');
      setPicked(asset);
      setExistingImage(null);
    } catch (error) {
      Alert.alert("That image can't be used", errorMessage(error, 'Please choose another image.'));
    }
  }

  async function submit() {
    if (!trimmed || tooLong || !session) return;
    setSubmitting(true);
    try {
      const mediaUrl = picked ? await uploadPostImage(session.user.id, picked) : existingImage;
      await onSubmit({
        content: trimmed,
        post_type: canCategorisePosts ? postType : null,
        media_urls: mediaUrl ? [mediaUrl] : [],
      });
      setContent('');
      setPostType(null);
      setPicked(null);
      setExistingImage(null);
    } catch (error) {
      Alert.alert(
        error instanceof UploadRejected ? "That image can't be used" : 'Could not save your post',
        errorMessage(error, 'Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const preview = picked?.uri ?? existingImage;

  return (
    <View style={styles.form}>
      <Card style={styles.editor}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Share a question, a tip or something you learned…"
          placeholderTextColor={theme.textMuted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Post text"
          style={[styles.input, { color: theme.text }]}
        />
        <ThemedText type="caption" themeColor={tooLong ? 'danger' : 'textMuted'} style={styles.counter}>
          {content.length}/{MAX_POST_LENGTH}
        </ThemedText>
      </Card>

      {preview ? (
        <View>
          <Image source={preview} style={styles.preview} contentFit="cover" accessibilityLabel="Selected image" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove image"
            onPress={() => {
              setPicked(null);
              setExistingImage(null);
            }}
            style={[styles.removeImage, { backgroundColor: theme.backgroundElement }]}>
            <X color={theme.text} size={18} />
          </Pressable>
        </View>
      ) : (
        <Button title="Add an image" variant="outline" icon={ImagePlus} onPress={pickImage} />
      )}
      <ThemedText type="caption" themeColor="textMuted">
        JPG, PNG or WebP, up to 5 MB.
      </ThemedText>

      {canCategorisePosts ? (
        <View style={styles.categories}>
          <ThemedText type="smallBold">Category</ThemedText>
          <View style={styles.chips}>
            {POST_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                outlined
                selected={postType === t.value}
                onPress={() => setPostType(postType === t.value ? null : t.value)}
              />
            ))}
          </View>
        </View>
      ) : awaitingApproval ? (
        <View style={styles.lockRow}>
          <Lock color={theme.textMuted} size={14} />
          <ThemedText type="caption" themeColor="textMuted">
            Categories unlock once your account is approved.
          </ThemedText>
        </View>
      ) : null}

      <Button title={submitLabel} onPress={submit} loading={submitting} disabled={!trimmed || tooLong} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  editor: {
    padding: Spacing.three,
  },
  input: {
    minHeight: 140,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 23,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.card,
  },
  removeImage: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categories: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
});
