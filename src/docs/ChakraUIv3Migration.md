# Chakra UI v3 Migration Guide

This document provides solutions for common issues when migrating to Chakra UI v3.

## 1. React Icons Integration

React Icons cannot be used directly as JSX components in Chakra UI v3 due to TypeScript type incompatibilities. Use the `IconWrapper` utility:

```tsx
// Import the IconWrapper
import { IconWrapper } from '../../utils/IconWrapper';
import { FaUser } from 'react-icons/fa';

// Use it to wrap any react-icon
<Box>
  <IconWrapper icon={FaUser} />
</Box>

// With size props
<IconWrapper icon={FaRobot} size={20} />
```

## 2. Component Naming Changes

Many components in Chakra UI v3 now follow a namespace pattern:

| v2 Components | v3 Components |
|--------------|--------------|
| `<Tabs>` | `<Tabs.Root>` |
| `<TabList>` | `<Tabs.List>` |
| `<Tab>` | `<Tabs.Trigger>` |
| `<TabPanels>` | `<Tabs.ContentGroup>` |
| `<TabPanel>` | `<Tabs.Content value="0">` |
| `<Divider>` | `<Separator>` |
| `<AlertIcon>` | `<Alert.Indicator>` |
| `<AvatarBadge>` | Use custom Box for badge |

## 3. Tabs Component Example

```tsx
// Old version
<Tabs>
  <TabList>
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>Content 1</TabPanel>
    <TabPanel>Content 2</TabPanel>
  </TabPanels>
</Tabs>

// New version
<Tabs.Root>
  <Tabs.List>
    <Tabs.Trigger>Tab 1</Tabs.Trigger>
    <Tabs.Trigger>Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.ContentGroup>
    <Tabs.Content value="0">Content 1</Tabs.Content>
    <Tabs.Content value="1">Content 2</Tabs.Content>
  </Tabs.ContentGroup>
</Tabs.Root>
```

## 4. Button with Icon

In v2, the `leftIcon` prop was used. In v3, use a Flex layout instead:

```tsx
// Old version
<Button leftIcon={<Icon as={FaUser} />}>Button Text</Button>

// New version
<Button>
  <Flex align="center">
    <Box mr={2}>
      <IconWrapper icon={FaUser} />
    </Box>
    <Text>Button Text</Text>
  </Flex>
</Button>
```

## 5. Alert Component

```tsx
// Old version
<Alert status="error">
  <AlertIcon />
  Error message
</Alert>

// New version
<Alert.Root status="error">
  <Alert.Indicator>
    <IconWrapper icon={FaExclamationTriangle} />
  </Alert.Indicator>
  <Alert.Description>Error message</Alert.Description>
</Alert.Root>

// Or use a simpler alternative with Box and Flex
<Box p={3} bg="red.50" color="red.600" borderRadius="md">
  <Flex align="center">
    <Box mr={2}>
      <IconWrapper icon={FaExclamationTriangle} />
    </Box>
    <Text>Error message</Text>
  </Flex>
</Box>
```

## 6. Avatar with Badge

```tsx
// Old version
<Avatar src={user.avatarUrl}>
  <AvatarBadge bg="green.500" />
</Avatar>

// New version
<Box position="relative">
  <Avatar.Root>
    <Avatar.Image src={user.avatarUrl} />
    <Avatar.Fallback>U</Avatar.Fallback>
  </Avatar.Root>
  <Box 
    position="absolute" 
    bottom="0" 
    right="0"
    width="10px" 
    height="10px" 
    borderRadius="full" 
    bg="green.500"
    border="2px solid white"
  />
</Box>

// Or simpler alternative
<Box position="relative" borderRadius="full" overflow="hidden">
  <Image src={user.avatarUrl} />
  <Box 
    position="absolute" 
    bottom="0" 
    right="0"
    width="10px" 
    height="10px" 
    borderRadius="full" 
    bg="green.500"
    border="2px solid white"
  />
</Box>
```

## 7. External Links

```tsx
// Old version
<Link href="https://example.com" isExternal>Link Text</Link>

// New version
<Box
  as="span"
  onClick={() => window.open('https://example.com', '_blank')}
  color="blue.500"
  cursor="pointer"
  _hover={{ textDecoration: "underline" }}
>
  Link Text
</Box>
```

By following these patterns, you can successfully migrate your components to Chakra UI v3. 