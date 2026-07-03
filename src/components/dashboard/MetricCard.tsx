import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
}

export function MetricCard({ title, value, description, icon, href }: MetricCardProps) {
  const content = (
    <Card className={`p-6 ${href ? 'transition hover:border-black/20 hover:bg-black/5' : ''}`}>
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-[color:var(--text)]">{title}</h3>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-[color:var(--text)]">{value}</div>
        {description && (
          <p className="text-xs text-slate-500 mt-1">
            {description}
          </p>
        )}
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
