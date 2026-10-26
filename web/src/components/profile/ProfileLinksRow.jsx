import { Link } from 'react-router-dom'
import { createPageUrl } from '@/lib/utils'

export function ProfileLinksRow({ showCvBuilder }) {
  const links = [
    { label: 'Saved Items', page: 'SavedItems' },
    { label: 'Saved Downloads', page: 'MyApplications' },
    ...(showCvBuilder ? [{ label: 'CV', page: 'CVBuilder' }] : []),
  ]

  return (
    <div className="no-scrollbar flex gap-5 overflow-x-auto border-y border-border py-3 text-sm font-medium">
      {links.map((link) => (
        <Link key={link.page} to={createPageUrl(link.page)} className="shrink-0 text-foreground hover:text-primary">
          {link.label}
        </Link>
      ))}
    </div>
  )
}
