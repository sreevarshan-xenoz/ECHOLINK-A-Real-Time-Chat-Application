import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, Button, VStack, Alert, AlertIcon } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box p={8} maxW="md" mx="auto" mt={16}>
          <VStack spacing={4}>
            <Alert status="error">
              <AlertIcon />
              <Box>
                <Heading size="md">Something went wrong</Heading>
                <Text mt={2}>
                  {this.state.error?.message || 'An unexpected error occurred'}
                </Text>
              </Box>
            </Alert>
            
            <Button colorScheme="blue" onClick={this.handleReset}>
              Try Again
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box as="pre" fontSize="xs" p={4} bg="gray.100" borderRadius="md" overflow="auto">
                {this.state.errorInfo.componentStack}
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;