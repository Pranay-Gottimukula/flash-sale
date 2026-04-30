import { type ReactNode } from 'react';

interface PageHeaderProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between border-b border-border-subtle pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}
