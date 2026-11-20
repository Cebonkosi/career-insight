import { useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Trash2 } from 'lucide-react'
import {
  AdminPageHeader,
  FilterTabs,
  Pagination,
  Panel,
  Pill,
  QueryError,
  SearchBox,
  formatDateTime,
} from '@/components/admin/AdminUi'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { Button } from '@/components/ui/button'
import {
  POSTS_PAGE_SIZE,
  fetchAllPosts,
  fetchFlaggedPosts,
  fetchReportsForPosts,
  moderatePost,
  setPostCategory,
} from '@/lib/adminData'

const POST_TYPES = [
  { value: '', label: 'General' },
  { value: 'article', label: 'Article' },
  { value: 'tip', label: 'Tip' },
  { value: 'story', label: 'Story' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'question', label: 'Question' },
]

const TABS = [
  { value: 'reported', label: 'Reported' },
  { value: 'all', label: 'All posts' },
]

function PostSummary({ post }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <GradientAvatar name={post.author_name} src={post.author_avatar} />
      <div className="min-w-0">
        <p className="whitespace-pre-line text-[15px]">{post.content}</p>
        {post.media_urls?.[0] && (
          <img src={post.media_urls[0]} alt="Post attachment" className="mt-2 h-28 rounded-lg border border-border object-cover" />
        )}
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {[post.author_name, post.author_role, formatDateTime(post.created_at)].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}

function ReportedPosts({ onModerate, busy }) {
  const flagged = useQuery({ queryKey: ['admin', 'flagged-posts'], queryFn: () => fetchFlaggedPosts() })
  const ids = flagged.data?.rows.map((p) => p.id) ?? []
  const reports = useQuery({
    queryKey: ['admin', 'post-reports', ids],
    queryFn: () => fetchReportsForPosts(ids),
    enabled: ids.length > 0,
  })

  if (flagged.isError) return <QueryError error={flagged.error} onRetry={() => flagged.refetch()} what="reported posts" />
  if (!flagged.data?.rows.length) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {flagged.isPending ? 'Loading…' : 'Nothing reported. Reported posts are hidden from feeds until you decide.'}
      </p>
    )
  }

  return (
    <div>
      {flagged.data.rows.map((post) => {
        const postReports = reports.data?.[post.id] ?? []
        return (
          <div key={post.id} className="grid gap-4 border-b border-border py-5 last:border-0 lg:grid-cols-[1fr_260px]">
            <PostSummary post={post} />
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {postReports.length} report{postReports.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {postReports.map((r, i) => (
                    <li key={i}>
                      {r.reason} <span className="text-xs text-muted-foreground">· {formatDateTime(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full text-primary" disabled={busy} onClick={() => onModerate(post, 'restore')}>
                  <Check /> Restore
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-transparent bg-destructive-soft text-destructive hover:bg-destructive-soft/70"
                  disabled={busy}
                  onClick={() => onModerate(post, 'remove')}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AllPosts({ onModerate, busy }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const posts = useQuery({
    queryKey: ['admin', 'all-posts', { search, page }],
    queryFn: () => fetchAllPosts({ search, page }),
    placeholderData: keepPreviousData,
  })

  async function recategorise(post, type) {
    try {
      await setPostCategory(post.id, type)
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-posts'] })
      toast.success('Category updated')
    } catch (error) {
      toast.error(error.message ?? 'Could not update the category')
    }
  }

  return (
    <div className="space-y-4">
      <SearchBox
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(0)
        }}
        placeholder="Search post text or author"
      />
      {posts.isError && <QueryError error={posts.error} onRetry={() => posts.refetch()} what="posts" />}
      <div>
        {posts.data?.rows.map((post) => (
          <div key={post.id} className="grid gap-4 border-b border-border py-5 last:border-0 lg:grid-cols-[1fr_260px]">
            <PostSummary post={post} />
            <div className="space-y-3">
              {post.status === 'flagged' && <Pill tone="danger">Reported · hidden</Pill>}
              <label className="block text-xs font-semibold text-muted-foreground">
                Category
                <select
                  value={post.post_type ?? ''}
                  onChange={(e) => recategorise(post, e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-normal text-foreground"
                >
                  {POST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-transparent bg-destructive-soft text-destructive hover:bg-destructive-soft/70"
                disabled={busy}
                onClick={() => onModerate(post, 'remove')}
              >
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        ))}
        {posts.data && !posts.data.rows.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">No posts match.</p>
        )}
      </div>
      <Pagination page={page} pageSize={POSTS_PAGE_SIZE} total={posts.data?.total ?? 0} onPage={setPage} noun="posts" />
    </div>
  )
}

/** Content moderation (UAT POST-004, POST-011, ADM-004). */
export default function AdminModeration() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('reported')
  const [busy, setBusy] = useState(false)

  async function onModerate(post, action) {
    if (action === 'remove' && !window.confirm('Remove this post? It disappears from every feed and profile.')) return
    setBusy(true)
    try {
      await moderatePost(post.id, action)
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success(action === 'restore' ? 'Post restored to the feed' : 'Post removed')
    } catch (error) {
      toast.error(error.message ?? 'Could not moderate the post')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Content moderation"
        description="Review reported posts, recategorise content and remove anything that doesn't belong. Actions are audited."
      />
      <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
      <Panel>
        {tab === 'reported' ? <ReportedPosts onModerate={onModerate} busy={busy} /> : <AllPosts onModerate={onModerate} busy={busy} />}
      </Panel>
    </div>
  )
}
