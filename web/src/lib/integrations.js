import { supabase } from './supabaseClient'

const MEDIA_BUCKET = 'public-media'
const FORMS_BUCKET = 'forms'

async function uploadToBucket(bucket, file, folder = '') {
  const ext = file.name.split('.').pop()
  const path = `${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

export const integrations = {
  /** Uploads an image/video and returns its public URL. */
  async UploadPublicFile(file, folder = '') {
    return uploadToBucket(MEDIA_BUCKET, file, folder)
  },

  /** Uploads a downloadable application form and returns its public URL. */
  async UploadForm(file, folder = 'application-forms') {
    return uploadToBucket(FORMS_BUCKET, file, folder)
  },

  /** Calls the career-chatbot edge function, which holds the Anthropic key server-side. */
  async InvokeLLM({ messages, studentContext }) {
    const { data, error } = await supabase.functions.invoke('career-chatbot', {
      body: { messages, studentContext },
    })
    if (error) throw error
    return data
  },

  /** Sends a transactional email via the Resend-backed edge function. */
  async SendEmail({ to, subject, html, text }) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, text },
    })
    if (error) throw error
    return data
  },
}
