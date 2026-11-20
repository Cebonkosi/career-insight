import { AdminPageHeader, Panel } from '@/components/admin/AdminUi'
import { VerifyContributors } from '@/components/admin/VerifyContributors'

export default function AdminContributors() {
  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Contributor verification"
        description="Confirm each organisation and representative before their listings reach learners."
      />
      <Panel>
        <VerifyContributors />
      </Panel>
    </div>
  )
}
