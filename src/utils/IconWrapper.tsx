import React from 'react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

interface IconWrapperProps extends Omit<IconBaseProps, 'as'> {
  icon: IconType;
}

/**
 * Safely wraps react-icons to be compatible with Chakra UI v3
 * This resolves TypeScript errors when using react-icons directly
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({ icon: Icon, ...props }) => {
  // The "as any" is required because IconType from react-icons is not directly compatible
  // with React's typing system in strictest mode, but it works in practice
  const IconComponent = Icon as any;
  return <IconComponent {...props} />;
}; 