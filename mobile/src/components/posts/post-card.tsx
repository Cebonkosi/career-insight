import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, Heart, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/chip';
import { postTypeLabel } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';
import type { Post } from '@/types/models';

type PostCardProps = {
  post: Post;
  liked: boolean;
  onToggleLike: () => void;
  /** Skip the "open detail" press, e.g. on the detail screen itself. */
  standalone?: boolean;
};

export function roleLabel(role: Post['author_role']) {
  return { student: 'Student', parent: 'Parent', contributor: 'Contributor', admin: 'Career Insight team' }[role ?? 'student'];
}

/** Post from the Social feed mockup: author, text, optional image, like + comment counts. */
export function PostCard({ post, liked, onToggleLike, standalone }: PostCardProps) {
  const theme = useTheme();
  const verifiedAuthor = post.author_role === 'contributor' || post.author_role === 'admin';
  const image = post.media_urls?.[0];

  const body = (
    <>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: post.author_id } })}
        style={styles.authorRow}>
        <GradientAvatar name={post.author_name ?? 'Member'} imageUrl={post.author_avatar} size={40} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {post.author_name ?? 'Member'}
            </ThemedText>
            {verifiedAuthor && <BadgeCheck color={theme.primary} size={15} />}
          </View>
          <ThemedText type="caption" themeColor="textMuted">
            {roleLabel(post.author_role)} · {timeAgo(post.created_at)}
          </ThemedText>
        </View>
        {post.status === 'flagged' && <Tag label="Under review" tone="warning" />}
      </Pressable>

      {post.post_type && (
        <View style={styles.tagRow}>
          <Tag label={postTypeLabel(post.post_type)} tone="soft" />
        </View>
      )}

      <ThemedText type="default" numberOfLines={standalone ? undefined : 6}>
        {post.content}
      </ThemedText>

      {image && <Image source={image} style={styles.image} contentFit="cover" transition={150} accessibilityLabel="Post image" />}

      <View style={[styles.actions, { borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
          accessibilityState={{ selected: liked }}
          hitSlop={10}
          onPress={onToggleLike}
          style={styles.action}>
          <Heart color={liked ? theme.primary : theme.textSecondary} fill={liked ? theme.primary : 'transparent'} size={20} />
          <ThemedText type="small" themeColor="textSecondary">
            {post.likes_count}
          </ThemedText>
        </Pressable>
        <View style={styles.action} accessibilityLabel={`${post.comments_count} comments`}>
          <MessageCircle color={theme.textSecondary} size={20} />
          <ThemedText type="small" themeColor="textSecondary">
            {post.comments_count}
          </ThemedText>
        </View>
      </View>
    </>
  );

  const surface = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  if (standalone) return <View style={surface}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      style={({ pressed }) => [...surface, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    padding: Spacing.three + 2,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  flex: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tagRow: {
    flexDirection: 'row',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.control,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.four,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    minHeight: 32,
  },
});
