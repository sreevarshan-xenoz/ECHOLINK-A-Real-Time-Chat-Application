import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  useColorModeValue,
  Heading,
  Flex
} from '@chakra-ui/react';
import { FaCode, FaHackerrank } from 'react-icons/fa';
import { SiLeetcode } from 'react-icons/si';
import IconWrapper from '../utils/IconWrapper';
import LeetCodeIntegration from './LeetCodeIntegration';
import HackerRankIntegration from './HackerRankIntegration';

const CodingPlatformsTab = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const tabBg = useColorModeValue('blue.50', 'gray.700');
  const activeTabBg = useColorModeValue('white', 'gray.800');
  const boxBg = useColorModeValue('gray.50', 'gray.800');

  const handleTabsChange = (index) => {
    setTabIndex(index);
  };

  return (
    <Box bg={boxBg} borderRadius="md" borderWidth="1px" borderColor={borderColor} mb={4}>
      <Flex align="center" p={3} borderBottomWidth="1px" borderColor={borderColor}>
        <IconWrapper icon={FaCode} size={16} mr={2} />
        <Heading size="sm">Coding Platforms</Heading>
      </Flex>
      
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
            <LeetCodeIntegration />
          </TabPanel>
          <TabPanel p={0}>
            <HackerRankIntegration />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default CodingPlatformsTab; 