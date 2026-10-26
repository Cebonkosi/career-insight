import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { integrations } from '@/lib/integrations'

export function AvatarUploader({ url, name, onUploaded }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const initials = (name || '?').slice(0, 1).toUpperCase()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const publicUrl = await integrations.UploadPublicFile(file, 'avatars')
      onUploaded(publicUrl)
    } catch (error) {
      toast.error(error.message ?? 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative h-24 w-24">
      <Avatar className="h-24 w-24">
        <AvatarImage src={url} alt={name} />
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white shadow"
        aria-label="Change photo"
      >
        <Camera className="h-4 w-4" />
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
