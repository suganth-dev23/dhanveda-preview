import React from 'react';

export interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export interface DashboardSectionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * High-speed Dashboard Shell:
 * Renders immediately at full opacity without wrapping SVG charts in transform/opacity
 * animation layers, eliminating ResizeObserver thrashing and compositor re-rasterization.
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  className = 'space-y-6',
}) => {
  return <div className={className}>{children}</div>;
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  children,
  className = '',
}) => {
  return <div className={className}>{children}</div>;
};
