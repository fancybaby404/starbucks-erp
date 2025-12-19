import Link from "next/link";
import React from "react";

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ href, title, description }) => (
  <Link href={href} className="sb-card p-6 hover:shadow-md transition block">
    <h2 className="text-xl font-semibold text-[var(--sb-dark)]">{title}</h2>
    <p className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)] mt-2">{description}</p>
  </Link>
);
