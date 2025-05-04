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

export const LazyLeetCodeIntegration = lazy(() => 
  import('./LeetCodeIntegration').then(module => ({
    default: module.default
  }))
);

export const LazyHackerRankIntegration = lazy(() => 
  import('./HackerRankIntegration').then(module => ({
    default: module.default
  }))
);

export const LazyMiniAIChat = lazy(() => 
  import('./MiniAIChat').then(module => ({
    default: module.default
  }))
); 