import Link from 'next/link';
import { BookOpen, Code, GitBranch, Rocket, Server } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card }       from '@/components/ui/card';

const SECTIONS = [
  {
    icon:        Rocket,
    title:       'Quick Start',
    description: 'Get up and running in 5 minutes',
  },
  {
    icon:        Code,
    title:       'SDK Reference',
    description: 'Browser SDK API documentation',
  },
  {
    icon:        Server,
    title:       'Server Integration',
    description: 'Verify tokens and handle releases',
  },
  {
    icon:        GitBranch,
    title:       'Architecture',
    description: 'How the queue engine works under the hood',
  },
] as const;

export default function DocsPage() {
  return (
    <>
      <PageHeader
        title="Documentation"
        description="Learn how to integrate FlashEngine with your store"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ icon: Icon, title, description }) => (
          <Link key={title} href="#" className="group block">
            <Card interactive>
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
                  <Icon size={18} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-text-primary">{title}</p>
                  <p className="text-xs text-text-tertiary">{description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-text-tertiary">
        Documentation is being written. Check back soon.
      </p>
    </>
  );
}
