import React from 'react';
import { Icon } from '@chakra-ui/react';

export const IconWrapper = ({ icon, size, color, mr, ml, ...props }) => {
  return (
    <Icon 
      as={icon} 
      boxSize={size} 
      color={color}
      mr={mr}
      ml={ml}
      {...props}
    />
  );
}; 