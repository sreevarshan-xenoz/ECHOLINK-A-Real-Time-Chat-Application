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
  Select,
  Tooltip
} from '@chakra-ui/react';
import { FaCheck, FaTrophy, FaShare, FaCode, FaCalendarAlt, FaStar } from 'react-icons/fa';
import { IconWrapper } from '../utils/IconWrapper';

const LeetCodeIntegration = () => {
  const [username, setUsername] = useState('');
  const [problemId, setProblemId] = useState('');
  const [savedProfile, setSavedProfile] = useState(localStorage.getItem('leetcodeProfile') || '');
  const [recentProblems, setRecentProblems] = useState([
    { id: 1, title: 'Two Sum', difficulty: 'Easy', completed: true },
    { id: 217, title: 'Contains Duplicate', difficulty: 'Easy', completed: true },
    { id: 53, title: 'Maximum Subarray', difficulty: 'Medium', completed: false },
    { id: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', completed: true }
  ]);
  const [dailyChallenge, setDailyChallenge] = useState({ 
    id: 2864, 
    title: 'Maximum Odd Binary Number', 
    difficulty: 'Easy',
    description: 'You are given a binary string s that contains at least one "1"...'
  });
  
  const toast = useToast();
  const bgColor = useColorModeValue('blue.50', 'gray.700');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.200', 'gray.600');

  useEffect(() => {
    // Simulating loading user profile
    if (savedProfile) {
      setUsername(savedProfile);
    }
  }, [savedProfile]);

  const saveProfile = () => {
    if (username.trim()) {
      localStorage.setItem('leetcodeProfile', username);
      setSavedProfile(username);
      toast({
        title: 'Profile Saved',
        description: `Your LeetCode profile "${username}" has been saved.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const shareProblem = () => {
    if (problemId.trim()) {
      const messageText = `Check out this LeetCode problem: https://leetcode.com/problems/${problemId}/`;
      // In a real implementation, this would share to the current chat
      navigator.clipboard.writeText(messageText);
      toast({
        title: 'Problem Shared',
        description: 'Problem link copied to clipboard.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Input Required',
        description: 'Please enter a problem ID or title.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const shareDailyChallenge = () => {
    const messageText = `Today's LeetCode Daily Challenge: "${dailyChallenge.title}" (${dailyChallenge.difficulty}) - https://leetcode.com/problems/${dailyChallenge.title.toLowerCase().replace(/\s+/g, '-')}/`;
    navigator.clipboard.writeText(messageText);
    toast({
      title: 'Daily Challenge Shared',
      description: 'Daily challenge link copied to clipboard.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const getColorScheme = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'green';
      case 'Medium': return 'orange';
      case 'Hard': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box p={4} bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
      <Heading size="md" mb={4}>LeetCode Integration</Heading>
      
      {!savedProfile ? (
        <VStack spacing={3} align="stretch" mb={4}>
          <Text fontSize="sm">Connect your LeetCode profile to share problems and track progress</Text>
          <Input 
            placeholder="LeetCode Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            size="sm"
          />
          <Button size="sm" colorScheme="blue" onClick={saveProfile}>
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
            <Heading size="xs" mb={2}>Share Problem</Heading>
            <HStack>
              <Input 
                placeholder="Problem ID or title" 
                size="sm" 
                value={problemId} 
                onChange={(e) => setProblemId(e.target.value)}
              />
              <Button size="sm" colorScheme="blue" onClick={shareProblem}>
                <IconWrapper icon={FaShare} size={14} />
              </Button>
            </HStack>
          </Box>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={2}>Daily Challenge</Heading>
            <Flex justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="bold">{dailyChallenge.title}</Text>
                <Badge colorScheme={getColorScheme(dailyChallenge.difficulty)}>
                  {dailyChallenge.difficulty}
                </Badge>
              </VStack>
              <Button size="sm" colorScheme="blue" onClick={shareDailyChallenge}>
                <HStack>
                  <IconWrapper icon={FaCalendarAlt} size={14} />
                  <Text>Share</Text>
                </HStack>
              </Button>
            </Flex>
          </Box>
          
          <Box bg={cardBgColor} p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
            <Heading size="xs" mb={3}>Recent Problems</Heading>
            <VStack spacing={2} align="stretch">
              {recentProblems.map(problem => (
                <Flex key={problem.id} justify="space-between" align="center">
                  <HStack>
                    {problem.completed && (
                      <IconWrapper icon={FaCheck} color="green.500" size={12} />
                    )}
                    <Text fontSize="sm">{problem.title}</Text>
                    <Badge size="sm" colorScheme={getColorScheme(problem.difficulty)}>
                      {problem.difficulty}
                    </Badge>
                  </HStack>
                  <Button 
                    size="xs" 
                    variant="ghost"
                    onClick={() => {
                      setProblemId(problem.title.toLowerCase().replace(/\s+/g, '-'));
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

export default LeetCodeIntegration; 