import React, { useState } from 'react';
import {
  Flex,
  HStack,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Badge,
  useColorMode,
  useBreakpointValue,
  Box,
} from '@chakra-ui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const SimpleNavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useBreakpointValue({ base: true, md: false });

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/chat', label: 'Chat', badge: 'P2P' },
    { path: '/ai', label: 'AI' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/github', label: 'GitHub' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchQuery.trim())) {
        navigate('/chat', { state: { connectToPeer: searchQuery.trim() } });
      }
      setSearchQuery('');
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  if (isMobile) {
    return (
      <MotionBox
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg={colorMode === 'dark' ? 'gray.800' : 'white'}
        borderTop="1px solid"
        borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
        zIndex={1000}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <HStack justify="space-around" py={2} px={4}>
          {navItems.slice(0, 4).map((item) => (
            <Box key={item.path} position="relative">
              <Button
                as={Link}
                to={item.path}
                variant={isActive(item.path) ? 'solid' : 'ghost'}
                colorScheme={isActive(item.path) ? 'blue' : 'gray'}
                size="sm"
              >
                {item.label}
              </Button>
              {item.badge && (
                <Badge
                  position="absolute"
                  top="-1"
                  right="-1"
                  fontSize="xs"
                  colorScheme="red"
                >
                  {item.badge}
                </Badge>
              )}
            </Box>
          ))}
          <Button size="sm" variant="ghost" onClick={toggleColorMode}>
            {colorMode === 'dark' ? '☀️' : '🌙'}
          </Button>
        </HStack>
      </MotionBox>
    );
  }

  return (
    <MotionBox
      position="sticky"
      top={0}
      zIndex={1000}
      bg={colorMode === 'dark' ? 'gray.800' : 'white'}
      borderBottom="1px solid"
      borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
      backdropFilter="blur(10px)"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Flex align="center" justify="space-between" px={6} py={3}>
        <Link to="/">
          <HStack spacing={2}>
            <Box
              w={8}
              h={8}
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
              fontWeight="bold"
            >
              E
            </Box>
            <Text fontSize="xl" fontWeight="bold" color="blue.500">
              EchoLink
            </Text>
          </HStack>
        </Link>

        <HStack spacing={1}>
          {navItems.map((item) => (
            <Box key={item.path} position="relative">
              <Button
                as={Link}
                to={item.path}
                variant={isActive(item.path) ? 'solid' : 'ghost'}
                colorScheme={isActive(item.path) ? 'blue' : 'gray'}
                size="md"
              >
                {item.label}
              </Button>
              {item.badge && (
                <Badge
                  position="absolute"
                  top="0"
                  right="0"
                  fontSize="xs"
                  colorScheme="purple"
                  borderRadius="full"
                >
                  {item.badge}
                </Badge>
              )}
            </Box>
          ))}
        </HStack>

        <HStack spacing={3}>
          <form onSubmit={handleSearch}>
            <InputGroup size="sm" maxW="200px">
              <InputLeftElement pointerEvents="none">
                🔍
              </InputLeftElement>
              <Input
                placeholder="Peer ID or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="full"
              />
            </InputGroup>
          </form>
          
          <Button variant="ghost" size="md" onClick={toggleColorMode}>
            {colorMode === 'dark' ? '☀️' : '🌙'}
          </Button>
        </HStack>
      </Flex>
    </MotionBox>
  );
};

export default SimpleNavBar;