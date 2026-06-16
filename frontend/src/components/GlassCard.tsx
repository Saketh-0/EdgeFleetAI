import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: 'purple' | 'teal' | 'none';
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  interactive = false,
  ...props
}) => {
  const glowClass = glow === 'purple' ? 'glow-purple' : glow === 'teal' ? 'glow-teal' : '';
  const interactiveClass = interactive ? 'interactive-card' : '';

  return (
    <div
      className={`glass-panel ${glowClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
