import React from 'react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

interface IconWrapperProps extends IconBaseProps {
  icon: IconType;
}

/**
 * Safely wraps react-icons to be compatible with Chakra UI v3
 * This resolves TypeScript errors when using react-icons directly
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({ icon: Icon, ...props }) => {
  return <Icon {...props} />;
}; 