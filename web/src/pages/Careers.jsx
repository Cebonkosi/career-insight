import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Compass } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { CareerCard } from '@/components/careers/CareerCard'
import { CategoryFilterChips } from '@/components/careers/CategoryFilterChips'
import { entities } from '@/lib/entities'
import { CAREER_CATEGORIES } from '@/lib/constants'

export default function Careers() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)

  const { data: careers, isLoading } = useQuery({
    queryKey: ['careers', 'published'],
    queryFn: () => entities.Career.filter({ status: 'published' }, '-created_at', 100),
  })

  const filtered = (careers ?? []).filter((c) => {
    const matchesCategory = !category || c.category === category
    const matchesSearch =
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="font-display text-xl font-bold">Careers</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search careers..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <CategoryFilterChips categories={CAREER_CATEGORIES} active={category} onChange={setCategory} />

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Compass} title="No careers found" description="Try a different search or category." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((career) => (
            <CareerCard key={career.id} career={career} />
          ))}
        </div>
      )}
    </div>
  )
}
