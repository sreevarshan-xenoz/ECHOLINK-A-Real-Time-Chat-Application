import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
  HStack,
  Box,
  useToast,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode.react';

interface SimpleOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  peerId: string;
  onComplete: () => void;
}

const MotionBox = motion(Box);

const SimpleOnboarding: React.FC<SimpleOnboardingProps> = ({
  isOpen,
  onClose,
  peerId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const toast = useToast();

  const steps = [
    {
      title: "🎉 Welcome to EchoLink!",
      content: "Your Peer ID",
      description: "This is your unique ID for secure P2P connections. Share it with friends to start chatting!",
    },
    {
      title: "💬 Send Your First Message",
      content: "AI Magic Awaits",
      description: "Send a message to unlock AI assistance! Try asking questions or get smart replies.",
    },
    {
      title: "⚙️ Customize Your Experience",
      content: "Dashboard & Settings",
      description: "Visit your dashboard to set up GitHub integration, AI preferences, and more!",
    },
  ];

  const copyPeerId = async () => {
    try {
      await navigator.clipboard.writeText(peerId);
      toast({
        title: "Copied!",
        description: "Peer ID copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const skipTour = () => {
    localStorage.setItem('tourSeen', 'true');
    onClose();
  };

  const completeTour = () => {
    localStorage.setItem('tourSeen', 'true');
    onComplete();
    onClose();
    toast({
      title: "🚀 You're all set!",
      description: "Start connecting and chatting securely!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <VStack spacing={4} align="center">
            <MotionBox
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <QRCode 
                value={peerId} 
                size={150}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </MotionBox>
            <Box 
              bg="gray.100" 
              p={3} 
              borderRadius="md" 
              border="2px dashed"
              borderColor="blue.300"
              w="full"
            >
              <HStack justify="space-between">
                <Text fontSize="sm" fontFamily="mono" color="gray.700">
                  {peerId}
                </Text>
                <Button size="sm" colorScheme="blue" variant="ghost" onClick={copyPeerId}>
                  📋 Copy
                </Button>
              </HStack>
            </Box>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Share this QR code or ID with friends to connect instantly!
            </Text>
          </VStack>
        );
      
      case 1:
        return (
          <VStack spacing={4} align="center">
            <MotionBox
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Box fontSize="4xl" mb={2}>🤖</Box>
            </MotionBox>
            <Text textAlign="center" color="gray.600">
              Once you send your first message, you'll unlock:
            </Text>
            <VStack spacing={2} align="start">
              <HStack>
                <Badge colorScheme="purple">✨</Badge>
                <Text fontSize="sm">AI-powered smart replies</Text>
              </HStack>
              <HStack>
                <Badge colorScheme="blue">🌍</Badge>
                <Text fontSize="sm">Real-time translation</Text>
              </HStack>
              <HStack>
                <Badge colorScheme="green">💡</Badge>
                <Text fontSize="sm">Intelligent suggestions</Text>
              </HStack>
            </VStack>
          </VStack>
        );
      
      case 2:
        return (
          <VStack spacing={4} align="center">
            <MotionBox
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Box fontSize="4xl" mb={2}>⚙️</Box>
            </MotionBox>
            <Text textAlign="center" color="gray.600">
              Customize your experience in the Dashboard:
            </Text>
            <VStack spacing={2} align="start">
              <HStack>
                <Badge colorScheme="orange">🐙</Badge>
                <Text fontSize="sm">GitHub integration</Text>
              </HStack>
              <HStack>
                <Badge colorScheme="purple">🎨</Badge>
                <Text fontSize="sm">Themes & appearance</Text>
              </HStack>
              <HStack>
                <Badge colorScheme="cyan">🔧</Badge>
                <Text fontSize="sm">AI model preferences</Text>
              </HStack>
            </VStack>
          </VStack>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={skipTour} closeOnOverlayClick={false} size="md">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text>{steps[currentStep].title}</Text>
              <Text fontSize="lg" fontWeight="bold" color="blue.500">
                {steps[currentStep].content}
              </Text>
            </VStack>
            <Button size="sm" variant="ghost" onClick={skipTour}>
              ✕
            </Button>
          </Flex>
        </ModalHeader>
        
        <ModalBody>
          <VStack spacing={4}>
            <Text color="gray.600" textAlign="center">
              {steps[currentStep].description}
            </Text>
            {renderStepContent()}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="full" justify="space-between">
            <HStack spacing={1}>
              {steps.map((_, index) => (
                <Box
                  key={index}
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={index === currentStep ? "blue.500" : "gray.300"}
                  transition="all 0.2s"
                />
              ))}
            </HStack>
            
            <HStack>
              <Button variant="ghost" onClick={skipTour}>
                ⏭️ Skip
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={nextStep}
              >
                {currentStep < steps.length - 1 ? '➡️ Next' : '🚀 Get Started!'}
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SimpleOnboarding;