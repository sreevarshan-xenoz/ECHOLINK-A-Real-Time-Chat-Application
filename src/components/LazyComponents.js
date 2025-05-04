import { lazy } from 'react';

// Separate file for lazy-loaded components to avoid circular dependencies
export const LazyAISettings = lazy(() => 
  import('./AISettings').then(module => ({
    default: module.default
  }))
);

export const LazyProfile = lazy(() => 
  import('./Profile').then(module => ({
    default: module.default
  }))
); 