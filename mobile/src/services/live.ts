import { supabase } from '@/lib/supabase';
import type { LiveStream } from '@/types/models';

export async function listStreams() {
  const { data, error } = await supabase
    .from('live_streams')
    .select('*')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(100)
    .returns<LiveStream[]>();
  if (error) throw error;
  return data;
}

export async function getStream(id: string) {
  const { data, error } = await supabase.from('live_streams').select('*').eq('id', id).maybeSingle<LiveStream>();
  if (error) throw error;
  return data;
}

export type StreamInput = {
  title: string;
  description: string | null;
  stream_url: string;
  scheduled_date: string | null;
  category: string | null;
};

/** Fails in the database unless the user is an admin or an approved host (UAT LIVE-003/004). */
export async function createStream(hostId: string, input: StreamInput) {
  const { data, error } = await supabase
    .from('live_streams')
    .insert({ host_id: hostId, ...input })
    .select()
    .single<LiveStream>();
  if (error) throw error;
  return data;
}

export async function updateStream(id: string, changes: Partial<Pick<LiveStream, 'status' | 'recording_url' | 'stream_url'>>) {
  const { data, error } = await supabase.from('live_streams').update(changes).eq('id', id).select().maybeSingle<LiveStream>();
  if (error) throw error;
  if (!data) throw new Error('Only the host or an admin can change this session.');
  return data;
}

export async function joinStream(id: string) {
  const { error } = await supabase.rpc('join_live_stream', { p_stream_id: id });
  if (error) throw error;
}
