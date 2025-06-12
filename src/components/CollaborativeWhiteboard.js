import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  IconButton,
  useColorModeValue,
  Heading,
  Collapse,
  HStack,
  Tooltip,
  ButtonGroup,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  SimpleGrid,
  useDisclosure,
  Text
} from '@chakra-ui/react';
import { 
  FaPencilAlt, 
  FaEraser, 
  FaTrash, 
  FaChevronDown, 
  FaChevronUp, 
  FaSave,
  FaShareSquare,
  FaCircle,
  FaSquare,
  FaArrowsAlt,
  FaUndo,
  FaRedo
} from 'react-icons/fa';
import { IconWrapper } from '../utils/IconWrapper';

const CollaborativeWhiteboard = ({ onShareWhiteboard }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const startPointRef = useRef(null);
  
  const { isOpen: isColorPickerOpen, onToggle: onColorPickerToggle, onClose: onColorPickerClose } = useDisclosure();
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const headerBgColor = useColorModeValue('blue.50', 'gray.700');
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const canvasBgColor = useColorModeValue('white', 'gray.700');
  
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
  ];
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  // Initialize canvas
  useEffect(() => {
    if (!isOpen) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;
    
    // Get context and set default styles
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;
    
    // Save initial state for undo
    saveCanvasState();
  }, [isOpen]);
  
  // Update context when color or brush size changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !contextRef.current) return;
      
      // Save current drawing
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      tempContext.drawImage(canvasRef.current, 0, 0);
      
      // Resize canvas
      canvasRef.current.width = canvasRef.current.offsetWidth * 2;
      canvasRef.current.height = canvasRef.current.offsetHeight * 2;
      canvasRef.current.style.width = `${canvasRef.current.offsetWidth}px`;
      canvasRef.current.style.height = `${canvasRef.current.offsetHeight}px`;
      
      // Restore context settings
      contextRef.current.scale(2, 2);
      contextRef.current.lineCap = 'round';
      contextRef.current.lineJoin = 'round';
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
      
      // Restore drawing
      contextRef.current.drawImage(tempCanvas, 0, 0);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [color, brushSize]);
  
  const saveCanvasState = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    
    setUndoStack(prev => [...prev, imageData]);
    // Clear redo stack when a new action is performed
    setRedoStack([]);
  };
  
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    
    if (tool === 'pencil' || tool === 'eraser') {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    } else if (tool === 'circle' || tool === 'rectangle') {
      startPointRef.current = { x: offsetX, y: offsetY };
      setIsDrawing(true);
    }
  };
  
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = nativeEvent;
    
    if (tool === 'pencil') {
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    } else if (tool === 'eraser') {
      const prevColor = contextRef.current.strokeStyle;
      contextRef.current.strokeStyle = canvasBgColor;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
      contextRef.current.strokeStyle = prevColor;
    } else if (tool === 'circle' || tool === 'rectangle') {
      // For shapes, we'll redraw on mouse move to show preview
      const canvas = canvasRef.current;
      const context = contextRef.current;
      
      // Restore previous state to clear the preview
      if (undoStack.length > 0) {
        const img = new Image();
        img.src = undoStack[undoStack.length - 1];
        img.onload = () => {
          context.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
          context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
          
          // Draw new preview
          const startPoint = startPointRef.current;
          
          if (tool === 'circle') {
            const radius = Math.sqrt(
              Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2)
            );
            context.beginPath();
            context.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
            context.stroke();
          } else if (tool === 'rectangle') {
            context.beginPath();
            context.rect(
              startPoint.x,
              startPoint.y,
              offsetX - startPoint.x,
              offsetY - startPoint.y
            );
            context.stroke();
          }
        };
      }
    }
  };
  
  const finishDrawing = () => {
    if (!isDrawing) return;
    
    if (tool === 'pencil' || tool === 'eraser') {
      contextRef.current.closePath();
    } else if (tool === 'circle' || tool === 'rectangle') {
      // The final shape is already drawn in the draw function
    }
    
    setIsDrawing(false);
    saveCanvasState();
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    saveCanvasState();
    context.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
  };
  
  const undo = () => {
    if (undoStack.length <= 1) return;
    
    // Move current state to redo stack
    const currentState = undoStack.pop();
    setRedoStack(prev => [...prev, currentState]);
    
    // Apply previous state
    const previousState = undoStack[undoStack.length - 1];
    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      context.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
    };
    
    // Update state
    setUndoStack([...undoStack]);
  };
  
  const redo = () => {
    if (redoStack.length === 0) return;
    
    // Get the last state from redo stack
    const stateToRestore = redoStack.pop();
    
    // Apply the state
    const img = new Image();
    img.src = stateToRestore;
    img.onload = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      context.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
    };
    
    // Update states
    setUndoStack(prev => [...prev, stateToRestore]);
    setRedoStack([...redoStack]);
  };
  
  const shareWhiteboard = () => {
    if (canvasRef.current && onShareWhiteboard) {
      canvasRef.current.toBlob((blob) => {
        onShareWhiteboard(blob, 'whiteboard.png');
      });
    }
  };
  
  const downloadWhiteboard = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'whiteboard.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };
  
  return (
    <Box
      bg={bgColor}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
      mb={4}
      overflow="hidden"
    >
      <Flex
        align="center"
        p={2}
        bg={headerBgColor}
        borderBottomWidth={isOpen ? "1px" : "0"}
        borderColor={borderColor}
        justifyContent="space-between"
        cursor="pointer"
        onClick={toggleOpen}
      >
        <HStack>
          <IconWrapper icon={FaPencilAlt} size={14} mr={2} />
          <Heading size="xs">Whiteboard</Heading>
        </HStack>
        <IconWrapper
          icon={isOpen ? FaChevronUp : FaChevronDown}
          size={12}
        />
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box p={3}>
          <Flex mb={2} gap={1}>
            <ButtonGroup size="xs" isAttached variant="outline">
              <Tooltip label="Pencil">
                <IconButton
                  icon={<IconWrapper icon={FaPencilAlt} />}
                  colorScheme={tool === 'pencil' ? 'blue' : 'gray'}
                  onClick={() => setTool('pencil')}
                  aria-label="Pencil tool"
                />
              </Tooltip>
              <Tooltip label="Eraser">
                <IconButton
                  icon={<IconWrapper icon={FaEraser} />}
                  colorScheme={tool === 'eraser' ? 'blue' : 'gray'}
                  onClick={() => setTool('eraser')}
                  aria-label="Eraser tool"
                />
              </Tooltip>
              <Tooltip label="Circle">
                <IconButton
                  icon={<IconWrapper icon={FaCircle} />}
                  colorScheme={tool === 'circle' ? 'blue' : 'gray'}
                  onClick={() => setTool('circle')}
                  aria-label="Circle tool"
                />
              </Tooltip>
              <Tooltip label="Rectangle">
                <IconButton
                  icon={<IconWrapper icon={FaSquare} />}
                  colorScheme={tool === 'rectangle' ? 'blue' : 'gray'}
                  onClick={() => setTool('rectangle')}
                  aria-label="Rectangle tool"
                />
              </Tooltip>
            </ButtonGroup>
            
            <Popover
              isOpen={isColorPickerOpen}
              onClose={onColorPickerClose}
              placement="bottom"
              closeOnBlur={true}
            >
              <PopoverTrigger>
                <IconButton
                  size="xs"
                  icon={
                    <Box 
                      w="14px" 
                      h="14px" 
                      borderRadius="sm" 
                      bg={color}
                      borderWidth="1px"
                      borderColor="gray.300"
                    />
                  }
                  onClick={onColorPickerToggle}
                  aria-label="Color picker"
                />
              </PopoverTrigger>
              <PopoverContent width="auto" p={2}>
                <PopoverArrow />
                <PopoverBody p={2}>
                  <SimpleGrid columns={5} spacing={2}>
                    {colors.map((c) => (
                      <Box
                        key={c}
                        w="20px"
                        h="20px"
                        borderRadius="sm"
                        bg={c}
                        borderWidth="1px"
                        borderColor="gray.300"
                        cursor="pointer"
                        onClick={() => {
                          setColor(c);
                          onColorPickerClose();
                        }}
                        _hover={{ transform: 'scale(1.1)' }}
                      />
                    ))}
                  </SimpleGrid>
                </PopoverBody>
              </PopoverContent>
            </Popover>
            
            <Box flex="1" px={2}>
              <Slider
                aria-label="brush-size"
                defaultValue={3}
                min={1}
                max={20}
                step={1}
                onChange={setBrushSize}
                colorScheme="blue"
                size="sm"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={3} />
              </Slider>
            </Box>
            
            <ButtonGroup size="xs" isAttached variant="outline">
              <Tooltip label="Undo">
                <IconButton
                  icon={<IconWrapper icon={FaUndo} />}
                  onClick={undo}
                  isDisabled={undoStack.length <= 1}
                  aria-label="Undo"
                />
              </Tooltip>
              <Tooltip label="Redo">
                <IconButton
                  icon={<IconWrapper icon={FaRedo} />}
                  onClick={redo}
                  isDisabled={redoStack.length === 0}
                  aria-label="Redo"
                />
              </Tooltip>
              <Tooltip label="Clear">
                <IconButton
                  icon={<IconWrapper icon={FaTrash} />}
                  onClick={clearCanvas}
                  aria-label="Clear canvas"
                />
              </Tooltip>
            </ButtonGroup>
          </Flex>
          
          <Box
            position="relative"
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            overflow="hidden"
            height="200px"
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: canvasBgColor,
                cursor: tool === 'pencil' ? 'crosshair' : tool === 'eraser' ? 'cell' : 'crosshair'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={finishDrawing}
              onMouseLeave={finishDrawing}
            />
          </Box>
          
          <Flex mt={2} justifyContent="space-between">
            <Text fontSize="xs" color="gray.500">
              {tool === 'pencil' ? 'Drawing' : 
               tool === 'eraser' ? 'Erasing' : 
               tool === 'circle' ? 'Drawing circle' : 'Drawing rectangle'}
            </Text>
            <ButtonGroup size="xs" isAttached>
              <Tooltip label="Save">
                <IconButton
                  icon={<IconWrapper icon={FaSave} />}
                  onClick={downloadWhiteboard}
                  aria-label="Save whiteboard"
                />
              </Tooltip>
              <Tooltip label="Share">
                <IconButton
                  icon={<IconWrapper icon={FaShareSquare} />}
                  onClick={shareWhiteboard}
                  aria-label="Share whiteboard"
                />
              </Tooltip>
            </ButtonGroup>
          </Flex>
        </Box>
      </Collapse>
    </Box>
  );
};

export default CollaborativeWhiteboard; 