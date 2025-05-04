import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Button, 
  Input, 
  Flex, 
  VStack, 
  HStack, 
  useColorModeValue, 
  useToast,
  Badge,
  Link,
  Tooltip,
  Divider
} from '@chakra-ui/react';
import { FaCheck, FaTrophy, FaShare, FaCode, FaUsers, FaCertificate, FaRocket } from 'react-icons/fa';
import IconWrapper from '../utils/IconWrapper';

const HackerRankIntegration = () => {
  const [username, setUsername] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [savedProfile, setSavedProfile] = useState(localStorage.getItem('hackerrankProfile') || '');
  const [certifications, setCertifications] = useState([
    { id: 1, name: 'Problem Solving (Basic)', completed: true, date: '2023-10-15' },
    { id: 2, name: 'JavaScript (Intermediate)', completed: true, date: '2023-11-20' },
    { id: 3, name: 'React (Basic)', completed: false, date: null }
  ]);
  const [challenges, setChallenges] = useState([
    { id: 'diagonal-difference', name: 'Diagonal Difference', domain: 'Algorithms', completed: true },
    { id: 'jumping-on-clouds', name: 'Jumping on the Clouds', domain: 'Algorithms', completed: true },
    { id: 'counting-valleys', name: 'Counting Valleys', domain: 'Algorithms', completed: false }
  ]);
  
  const toast = useToast();
  const bgColor = useColorModeValue('blue.50', 'gray.700');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.200', 'gray.600');

  useEffect(() => {
    // Simulate loading user profile
    if (savedProfile) {
      setUsername(savedProfile);
    }
  }, [savedProfile]);

  const saveProfile = () => {
    if (username.trim()) {
      localStorage.setItem('hackerrankProfile', username);
      setSavedProfile(username);
      toast({
        title: 'Profile Saved',
        description: `Your HackerRank profile "${username}" has been saved.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const shareChallenge = () => {
    if (challengeId.trim()) {
      const messageText = `Check out this HackerRank challenge: https://www.hackerrank.com/challenges/${challengeId}/problem`;
      // In a real implementation, this would share to the current chat
      navigator.clipboard.writeText(messageText);
      toast({
        title: 'Challenge Shared',
        description: 'Challenge link copied to clipboard.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Input Required',
        description: 'Please enter a challenge ID or title.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const startPairProgramming = () => {
    const messageText = `I'd like to pair program on a HackerRank challenge. Are you available to join me?`;
    navigator.clipboard.writeText(messageText);
    toast({
      title: 'Pair Programming',
      description: 'Invitation message copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box p={4} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={4}>HackerRank Integration</Heading>
      
      {!savedProfile ? (
        <VStack spacing={3} align="stretch" mb={4}>
          <Text fontSize="sm">Connect your HackerRank profile to share challenges and showcase skills</Text>
          <Input 
            placeholder="HackerRank Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            size="sm"
          />
          <Button size="sm" colorScheme="green" onClick={saveProfile}>
            <HStack>
              <IconWrapper icon={FaCheck} size={14} />
              <Text>Save Profile</Text>
            </HStack>
          </Button>
        </VStack>
      ) : (
        <VStack spacing={4} align="stretch">
          <Flex justify="space-between" align="center">
            <Text fontWeight="bold">{savedProfile}</Text>
            <Tooltip label="Edit Profile">
              <Button size="xs" variant="ghost" onClick={() => setSavedProfile('')}>
                Edit
              </Button>
            </Tooltip>
          </Flex>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={2}>Share Challenge</Heading>
            <HStack>
              <Input 
                placeholder="Challenge ID or title" 
                size="sm" 
                value={challengeId} 
                onChange={(e) => setChallengeId(e.target.value)}
              />
              <Button size="sm" colorScheme="green" onClick={shareChallenge}>
                <IconWrapper icon={FaShare} size={14} />
              </Button>
            </HStack>
          </Box>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={2}>Pair Programming</Heading>
            <Button size="sm" colorScheme="green" onClick={startPairProgramming} width="full">
              <HStack>
                <IconWrapper icon={FaUsers} size={14} />
                <Text>Invite to Pair Program</Text>
              </HStack>
            </Button>
            <Text fontSize="xs" mt={2} color="gray.500">
              Collaborate in real-time on HackerRank challenges
            </Text>
          </Box>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={3}>Certifications</Heading>
            <VStack spacing={2} align="stretch">
              {certifications.map(cert => (
                <Flex key={cert.id} justify="space-between" align="center">
                  <HStack>
                    {cert.completed ? (
                      <IconWrapper icon={FaCertificate} color="green.500" size={12} />
                    ) : (
                      <IconWrapper icon={FaCertificate} color="gray.400" size={12} />
                    )}
                    <Text fontSize="sm">{cert.name}</Text>
                  </HStack>
                  {cert.completed && (
                    <Badge colorScheme="green" size="sm">Verified</Badge>
                  )}
                </Flex>
              ))}
            </VStack>
          </Box>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={3}>Recent Challenges</Heading>
            <VStack spacing={2} align="stretch">
              {challenges.map(challenge => (
                <Flex key={challenge.id} justify="space-between" align="center">
                  <HStack>
                    {challenge.completed && (
                      <IconWrapper icon={FaCheck} color="green.500" size={12} />
                    )}
                    <Text fontSize="sm">{challenge.name}</Text>
                  </HStack>
                  <Button 
                    size="xs" 
                    variant="ghost"
                    onClick={() => {
                      setChallengeId(challenge.id);
                    }}
                  >
                    <IconWrapper icon={FaShare} size={12} />
                  </Button>
                </Flex>
              ))}
            </VStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
};

export default HackerRankIntegration; 