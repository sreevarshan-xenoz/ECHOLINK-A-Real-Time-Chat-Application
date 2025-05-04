import React, { useState, Suspense } from 'react';
import { 
  Box, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  useColorModeValue,
  Heading,
  Flex,
  Spinner,
  Collapse,
  Button
} from '@chakra-ui/react';
import { FaCode, FaHackerrank, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { SiLeetcode } from 'react-icons/si';
import { IconWrapper } from '../utils/IconWrapper';
import { LazyLeetCodeIntegration, LazyHackerRankIntegration } from './LazyComponents';

const CodingPlatformsTab = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const tabBg = useColorModeValue('blue.50', 'gray.700');
  const activeTabBg = useColorModeValue('white', 'gray.800');
  const boxBg = useColorModeValue('gray.50', 'gray.800');

  const handleTabsChange = (index) => {
    setTabIndex(index);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const LoadingFallback = () => (
    <Box p={4} textAlign="center">
      <Spinner size="md" color={useColorModeValue('blue.500', 'blue.300')} />
    </Box>
  );

  return (
    <Box bg={boxBg} borderRadius="md" borderWidth="1px" borderColor={borderColor} mb={4}>
      <Flex 
        align="center" 
        p={3} 
        borderBottomWidth={isOpen ? "1px" : "0"} 
        borderColor={borderColor}
        justifyContent="space-between"
        cursor="pointer"
        onClick={toggleOpen}
      >
        <Flex align="center">
          <IconWrapper icon={FaCode} size={16} mr={2} />
          <Heading size="sm">Coding Platforms</Heading>
        </Flex>
        <IconWrapper 
          icon={isOpen ? FaChevronUp : FaChevronDown} 
          size={14} 
        />
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Tabs 
          isFitted 
          variant="enclosed" 
          index={tabIndex} 
          onChange={handleTabsChange}
          colorScheme={tabIndex === 0 ? "blue" : "green"}
        >
          <TabList mb="1em">
            <Tab 
              _selected={{ bg: activeTabBg, borderBottomColor: activeTabBg }} 
              bg={tabBg}
              borderTopRadius="md"
            >
              <Flex align="center">
                <IconWrapper icon={SiLeetcode} size={14} mr={2} />
                LeetCode
              </Flex>
            </Tab>
            <Tab 
              _selected={{ bg: activeTabBg, borderBottomColor: activeTabBg }} 
              bg={tabBg}
              borderTopRadius="md"
            >
              <Flex align="center">
                <IconWrapper icon={FaHackerrank} size={14} mr={2} />
                HackerRank
              </Flex>
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel p={0}>
              <Suspense fallback={<LoadingFallback />}>
                <LazyLeetCodeIntegration />
              </Suspense>
            </TabPanel>
            <TabPanel p={0}>
              <Suspense fallback={<LoadingFallback />}>
                <LazyHackerRankIntegration />
              </Suspense>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Collapse>
    </Box>
  );
};

export default CodingPlatformsTab; 