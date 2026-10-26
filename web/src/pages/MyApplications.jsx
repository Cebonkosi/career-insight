import { useQuery } from '@tanstack/react-query'
import { Download as DownloadIcon, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

export default function MyApplications() {
  const { user } = useAuth()

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', user?.id],
    queryFn: () => entities.Application.filter({ user_id: user.id }, '-download_date', 100),
    enabled: Boolean(user?.id),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="font-display text-xl font-bold">Saved downloads</h1>

      {isLoading ? (
        <LoadingState />
      ) : !applications?.length ? (
        <EmptyState icon={FileText} title="No downloads yet" description="Forms you download will show up here." />
      ) : (
        applications.map((app) => (
          <Card key={app.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{app.opportunity_title}</p>
                <p className="text-xs text-muted-foreground">
                  {app.organization_name} ·{' '}
                  {app.download_date &&
                    `Downloaded ${formatDistanceToNow(new Date(app.download_date), { addSuffix: true })}`}
                </p>
              </div>
              {app.form_url && (
                <a href={app.form_url} target="_blank" rel="noreferrer" aria-label="Download again">
                  <DownloadIcon className="h-5 w-5 text-primary" />
                </a>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
