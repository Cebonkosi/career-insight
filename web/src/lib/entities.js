import { supabase } from './supabaseClient'

/**
 * Generic entity wrapper over a Supabase table, mirroring the
 * list/filter/get/create/update/delete/subscribe shape the app is built around.
 */
function createEntity(table) {
  return {
    table,

    async list(orderBy = '-created_at', limit = 50, offset = 0) {
      const [column, ascending] = parseOrder(orderBy)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending })
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data
    },

    async filter(match = {}, orderBy = '-created_at', limit = 50, offset = 0) {
      const [column, ascending] = parseOrder(orderBy)
      let query = supabase.from(table).select('*')
      for (const [key, value] of Object.entries(match)) {
        query = Array.isArray(value) ? query.in(key, value) : query.eq(key, value)
      }
      const { data, error } = await query.order(column, { ascending }).range(offset, offset + limit - 1)
      if (error) throw error
      return data
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      if (error) throw error
      return data
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single()
      if (error) throw error
      return data
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return true
    },

    /** Subscribe to realtime changes on this table. Returns an unsubscribe function. */
    subscribe(callback, filter) {
      const channel = supabase
        .channel(`${table}-changes-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter },
          (payload) => callback(payload)
        )
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

function parseOrder(orderBy) {
  if (orderBy.startsWith('-')) return [orderBy.slice(1), false]
  return [orderBy, true]
}

export const entities = {
  UserProfile: createEntity('user_profiles'),
  Career: createEntity('careers'),
  Opportunity: createEntity('opportunities'),
  Post: createEntity('posts'),
  Comment: createEntity('comments'),
  Like: createEntity('likes'),
  Follow: createEntity('follows'),
  Poll: createEntity('polls'),
  LiveStream: createEntity('live_streams'),
  Application: createEntity('applications'),
  SavedItem: createEntity('saved_items'),
  Notification: createEntity('notifications'),
}
