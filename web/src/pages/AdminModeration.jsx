import { AdminPageHeader, Panel } from '@/components/admin/AdminUi'
import { ModerationQueue } from '@/components/admin/ModerationQueue'

export default function AdminModeration() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Content moderation"
        description="Posts that were flagged for review. Restore what's fine and remove what isn't."
      />
      <Panel>
        <ModerationQueue />
      </Panel>
    </div>
  )
}
