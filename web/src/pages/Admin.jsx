import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ApprovalQueue } from '@/components/admin/ApprovalQueue'
import { ModerationQueue } from '@/components/admin/ModerationQueue'
import { VerifyContributors } from '@/components/admin/VerifyContributors'
import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog'

export default function Admin() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Admin</h1>
        <Button size="sm" variant="gradient" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New opportunity
        </Button>
      </div>

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="posts">Flagged posts</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities">
          <ApprovalQueue />
        </TabsContent>
        <TabsContent value="posts">
          <ModerationQueue />
        </TabsContent>
        <TabsContent value="contributors">
          <VerifyContributors />
        </TabsContent>
      </Tabs>

      <CreateOpportunityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['opportunities'] })}
      />
    </div>
  )
}
