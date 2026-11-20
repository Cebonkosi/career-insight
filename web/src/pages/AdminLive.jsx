import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarPlus, ExternalLink, Link2, Play, Square, Upload } from 'lucide-react'
import { AdminPageHeader, FilterTabs, Panel, Pill, QueryError, formatDateTime } from '@/components/admin/AdminUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  RECORDING_MAX_BYTES,
  RECORDING_TYPES,
  createStream,
  fetchStreams,
  updateStream,
  uploadRecording,
} from '@/lib/adminData'

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live now' },
  { value: 'ended', label: 'Ended' },
]

const STATUS_PILL = {
  upcoming: <Pill tone="primary">Upcoming</Pill>,
  live: <Pill tone="danger">Live</Pill>,
  ended: <Pill tone="muted">Ended</Pill>,
}

function isHttps(value) {
  return /^https:\/\/\S+\.\S+/.test(value.trim())
}

function ScheduleForm({ hostId, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', stream_url: '', scheduled_date: '' })
  const [saving, setSaving] = useState(false)
  const valid = form.title.trim().length >= 3 && isHttps(form.stream_url) && form.scheduled_date

  async function submit(e) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await createStream(hostId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        stream_url: form.stream_url.trim(),
        scheduled_date: new Date(form.scheduled_date).toISOString(),
      })
      setForm({ title: '', description: '', stream_url: '', scheduled_date: '' })
      toast.success('Session scheduled — learners have been notified')
      onCreated()
    } catch (error) {
      toast.error(error.message ?? 'Could not schedule the session')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Starts (SAST)</Label>
        <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Stream link</Label>
        <Input
          value={form.stream_url}
          placeholder="https://youtube.com/live/… or a Zoom/Meet link"
          onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
        />
        {form.stream_url && !isHttps(form.stream_url) && <p className="text-xs text-destructive">Use a full https:// link.</p>}
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <Label>Description</Label>
        <Textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={!valid || saving}>
          <CalendarPlus /> {saving ? 'Scheduling…' : 'Schedule session'}
        </Button>
      </div>
    </form>
  )
}

function StreamRow({ stream, userId, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState('')
  const fileInput = useRef(null)

  async function change(changes, message) {
    setBusy(true)
    try {
      await updateStream(stream.id, changes)
      toast.success(message)
      onChanged()
    } catch (error) {
      toast.error(error.message ?? 'Could not update the session')
    } finally {
      setBusy(false)
    }
  }

  async function upload(file) {
    if (!file) return
    if (!RECORDING_TYPES.includes(file.type)) return toast.error('Recordings must be MP4 or MOV.')
    if (file.size > RECORDING_MAX_BYTES) return toast.error('Recordings can be up to 50 MB. Use a link for larger files.')
    setBusy(true)
    try {
      const url = await uploadRecording(userId, file)
      await updateStream(stream.id, { recording_url: url })
      toast.success('Recording attached — learners can watch and download it')
      onChanged()
    } catch (error) {
      toast.error(error.message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 border-b border-border py-5 last:border-0 lg:grid-cols-[1fr_320px]">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_PILL[stream.status]}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(stream.scheduled_date)} · {stream.viewers_count} viewer{stream.viewers_count === 1 ? '' : 's'}
          </span>
        </div>
        <p className="font-display text-lg font-semibold">{stream.title}</p>
        <p className="text-xs text-muted-foreground">Hosted by {stream.host_name ?? '—'}</p>
        <a href={stream.stream_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="h-3 w-3" /> Stream link
        </a>
        {stream.recording_url && (
          <a href={stream.recording_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Play className="h-3 w-3" /> Recording
          </a>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {stream.status === 'upcoming' && (
          <Button size="sm" disabled={busy} onClick={() => change({ status: 'live' }, 'Session is live')}>
            <Play /> Start session
          </Button>
        )}
        {stream.status === 'live' && (
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => window.confirm('End this session?') && change({ status: 'ended' }, 'Session ended')}
          >
            <Square /> End session
          </Button>
        )}
        {stream.status === 'ended' && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
              <Upload /> {stream.recording_url ? 'Replace recording' : 'Upload recording (MP4, 50 MB)'}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => {
                upload(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <div className="flex gap-2">
              <Input value={link} placeholder="…or paste a recording link" onChange={(e) => setLink(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !isHttps(link)}
                onClick={() => change({ recording_url: link.trim() }, 'Recording link saved')}
                aria-label="Save recording link"
              >
                <Link2 />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Live sessions for admins (UAT LIVE-001, LIVE-006). */
export default function AdminLive() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const streams = useQuery({ queryKey: ['admin', 'streams'], queryFn: fetchStreams })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'streams'] })
  const visible = (streams.data ?? []).filter((s) => s.status === tab)

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Live sessions"
        description="Schedule and run sessions for learners and parents, then share the recording."
      />

      <Panel>
        <h2 className="mb-4 font-display text-xl font-semibold">Schedule a session</h2>
        <ScheduleForm hostId={user?.id} onCreated={refresh} />
      </Panel>

      <FilterTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        counts={Object.fromEntries(TABS.map((t) => [t.value, (streams.data ?? []).filter((s) => s.status === t.value).length]))}
      />
      <Panel>
        {streams.isError ? (
          <QueryError error={streams.error} onRetry={() => streams.refetch()} what="sessions" />
        ) : visible.length ? (
          visible.map((stream) => <StreamRow key={stream.id} stream={stream} userId={user?.id} onChanged={refresh} />)
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">{streams.isPending ? 'Loading…' : 'No sessions here.'}</p>
        )}
      </Panel>
    </div>
  )
}
