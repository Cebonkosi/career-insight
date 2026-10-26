import { supabase } from './supabaseClient'
import { entities } from './entities'

export const auth = {
  async signUpWithPassword(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },

  async verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) throw error
    return data
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) throw error
  },

  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
    return data
  },

  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  async setNewPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },

  /** Returns the authenticated Supabase user + their UserProfile row (or null profile if onboarding isn't done). */
  async me() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const profiles = await entities.UserProfile.filter({ user_id: user.id })
    return { ...user, profile: profiles[0] ?? null }
  },

  async isAuthenticated() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return Boolean(session)
  },

  async logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  },

  redirectToLogin() {
    window.location.href = '/login'
  },

  /** Invites a contributor/collaborator by email. Requires the invite-user edge function + email provider (not yet configured). */
  async inviteUser(email, role) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role },
    })
    if (error) throw error
    return data
  },
}
