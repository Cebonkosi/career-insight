import { supabase } from '@/lib/supabase';
import type { Comment, Post, PostType } from '@/types/models';

export const POSTS_PAGE_SIZE = 15;

export type FeedScope = { kind: 'all' } | { kind: 'following'; authorIds: string[] } | { kind: 'author'; authorId: string };

/** Published posts, newest first, a page at a time. The author's own view also shows their flagged posts. */
export async function listPosts(scope: FeedScope, page: number, viewerId?: string) {
  if (scope.kind === 'following' && scope.authorIds.length === 0) return [];

  let query = supabase.from('posts').select('*');
  if (scope.kind === 'following') query = query.in('author_id', scope.authorIds);
  if (scope.kind === 'author') query = query.eq('author_id', scope.authorId);
  query =
    scope.kind === 'author' && scope.authorId === viewerId
      ? query.in('status', ['published', 'flagged'])
      : query.eq('status', 'published');

  const from = page * POSTS_PAGE_SIZE;
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + POSTS_PAGE_SIZE - 1)
    .returns<Post[]>();
  if (error) throw error;
  return data;
}

export async function getPost(id: string) {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle<Post>();
  if (error) throw error;
  return data;
}

export type PostInput = {
  content: string;
  /** Ignored by the database unless the author is an admin or approved contributor. */
  post_type: PostType | null;
  media_urls: string[];
};

export async function createPost(authorId: string, input: PostInput) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: authorId, ...input })
    .select()
    .single<Post>();
  if (error) throw error;
  return data;
}

export async function updatePost(id: string, input: PostInput) {
  const { data, error } = await supabase.from('posts').update(input).eq('id', id).select().maybeSingle<Post>();
  if (error) throw error;
  if (!data) throw new Error('You can only edit your own posts.');
  return data;
}

export async function deletePost(id: string) {
  const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  if (!count) throw new Error('You can only delete your own posts.');
}

export async function listLikedPostIds(userId: string, postIds: string[]) {
  if (!postIds.length) return [];
  const { data, error } = await supabase
    .from('likes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'post')
    .in('target_id', postIds)
    .returns<{ target_id: string }[]>();
  if (error) throw error;
  return data.map((row) => row.target_id);
}

export async function setPostLiked(userId: string, postId: string, liked: boolean) {
  const { error } = liked
    ? await supabase.from('likes').insert({ user_id: userId, target_type: 'post', target_id: postId })
    : await supabase.from('likes').delete().eq('user_id', userId).eq('target_type', 'post').eq('target_id', postId);
  // A duplicate like (double tap) is already the desired state.
  if (error && error.code !== '23505') throw error;
}

export async function listComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .eq('status', 'published')
    .order('created_at', { ascending: true })
    .limit(200)
    .returns<Comment[]>();
  if (error) throw error;
  return data;
}

export async function addComment(authorId: string, postId: string, content: string) {
  const { error } = await supabase.from('comments').insert({ author_id: authorId, post_id: postId, content });
  if (error) throw error;
}

export async function removeComment(id: string) {
  const { error } = await supabase.from('comments').update({ status: 'removed' }).eq('id', id);
  if (error) throw error;
}

export async function reportPost(postId: string, reason: string) {
  const { error } = await supabase.rpc('report_post', { p_post_id: postId, p_reason: reason });
  if (error) throw error;
}
