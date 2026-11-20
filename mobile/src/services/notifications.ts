import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/models';

// Notifications are created by the database (new opportunities, live sessions,
// comments, likes, follows, approvals); the app only reads and marks them.

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, read, actor_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AppNotification[]>();
  if (error) throw error;
  return data;
}

export async function countUnread(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
  if (error) throw error;
}
