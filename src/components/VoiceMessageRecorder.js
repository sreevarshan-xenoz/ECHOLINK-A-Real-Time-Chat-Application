import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  IconButton,
  useColorModeValue,
  Heading,
  Collapse,
  HStack,
  Progress,
  Tooltip,
  Badge,
  VStack
} from '@chakra-ui/react';
import { 
  FaMicrophone, 
  FaStop, 
  FaTrash, 
  FaPlay, 
  FaPause, 
  FaChevronDown, 
  FaChevronUp, 
  FaPaperPlane,
  FaVolumeUp
} from 'react-icons/fa';
import { IconWrapper } from '../utils/IconWrapper';

const VoiceMessageRecorder = ({ onSendVoiceMessage }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingHistory, setRecordingHistory] = useState([]);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(new Audio());
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const headerBgColor = useColorModeValue('blue.50', 'gray.700');
  const borderColor = useColorModeValue('blue.200', 'gray.600');
  const controlsBgColor = useColorModeValue('white', 'gray.700');
  
  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      clearInterval(timerRef.current);
    }
  };
  
  const playRecording = () => {
    if (audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const sendVoiceMessage = () => {
    if (audioBlob && onSendVoiceMessage) {
      // Create a recording history item
      const historyItem = {
        id: Date.now(),
        duration: recordingTime,
        timestamp: new Date().toISOString(),
        blob: audioBlob,
        url: audioUrl
      };
      
      setRecordingHistory(prev => [historyItem, ...prev].slice(0, 5));
      
      // Send to parent component
      onSendVoiceMessage(audioBlob, recordingTime);
      
      // Clear current recording
      deleteRecording();
    }
  };
  
  const playHistoryItem = (url) => {
    // Stop current playback if any
    pausePlayback();
    
    // Play the selected recording
    audioRef.current.src = url;
    audioRef.current.play();
    setIsPlaying(true);
  };
  
  // Handle audio playback ended
  useEffect(() => {
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    
    return () => {
      audioRef.current.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
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
          <IconWrapper icon={FaMicrophone} size={14} mr={2} />
          <Heading size="xs">Voice Messages</Heading>
          {isRecording && (
            <Badge colorScheme="red" variant="solid" fontSize="10px" animation="pulse 1.5s infinite">
              REC
            </Badge>
          )}
        </HStack>
        <IconWrapper
          icon={isOpen ? FaChevronUp : FaChevronDown}
          size={12}
        />
      </Flex>
      
      <Collapse in={isOpen} animateOpacity>
        <Box p={3}>
          {/* Recording controls */}
          <Box
            bg={controlsBgColor}
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
            mb={2}
          >
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="xs" fontWeight="bold">
                {isRecording ? 'Recording...' : audioUrl ? 'Recording ready' : 'Ready to record'}
              </Text>
              <Text fontSize="xs" fontWeight="bold" color={isRecording ? 'red.500' : 'gray.500'}>
                {formatTime(recordingTime)}
              </Text>
            </Flex>
            
            {isRecording && (
              <Progress 
                size="xs" 
                colorScheme="red" 
                isIndeterminate 
                mb={2}
              />
            )}
            
            <Flex justify="center" gap={2}>
              {!isRecording && !audioUrl && (
                <Tooltip label="Start recording">
                  <IconButton
                    icon={<IconWrapper icon={FaMicrophone} />}
                    colorScheme="red"
                    size="sm"
                    isRound
                    onClick={startRecording}
                    aria-label="Start recording"
                  />
                </Tooltip>
              )}
              
              {isRecording && (
                <Tooltip label="Stop recording">
                  <IconButton
                    icon={<IconWrapper icon={FaStop} />}
                    colorScheme="red"
                    size="sm"
                    isRound
                    onClick={stopRecording}
                    aria-label="Stop recording"
                  />
                </Tooltip>
              )}
              
              {audioUrl && !isPlaying && (
                <Tooltip label="Play recording">
                  <IconButton
                    icon={<IconWrapper icon={FaPlay} />}
                    colorScheme="blue"
                    size="sm"
                    isRound
                    onClick={playRecording}
                    aria-label="Play recording"
                  />
                </Tooltip>
              )}
              
              {audioUrl && isPlaying && (
                <Tooltip label="Pause playback">
                  <IconButton
                    icon={<IconWrapper icon={FaPause} />}
                    colorScheme="blue"
                    size="sm"
                    isRound
                    onClick={pausePlayback}
                    aria-label="Pause playback"
                  />
                </Tooltip>
              )}
              
              {audioUrl && (
                <>
                  <Tooltip label="Delete recording">
                    <IconButton
                      icon={<IconWrapper icon={FaTrash} />}
                      colorScheme="gray"
                      size="sm"
                      isRound
                      onClick={deleteRecording}
                      aria-label="Delete recording"
                    />
                  </Tooltip>
                  
                  <Tooltip label="Send voice message">
                    <IconButton
                      icon={<IconWrapper icon={FaPaperPlane} />}
                      colorScheme="green"
                      size="sm"
                      isRound
                      onClick={sendVoiceMessage}
                      aria-label="Send voice message"
                    />
                  </Tooltip>
                </>
              )}
            </Flex>
          </Box>
          
          {/* Recording history */}
          {recordingHistory.length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="bold" mb={1}>Recent Recordings:</Text>
              <VStack spacing={1} align="stretch">
                {recordingHistory.map((item) => (
                  <Flex
                    key={item.id}
                    bg={controlsBgColor}
                    p={1}
                    borderRadius="sm"
                    fontSize="xs"
                    align="center"
                    justify="space-between"
                  >
                    <HStack>
                      <IconButton
                        icon={<IconWrapper icon={FaPlay} size={10} />}
                        size="xs"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => playHistoryItem(item.url)}
                        aria-label="Play recording"
                      />
                      <Text>
                        {formatTime(item.duration)}
                      </Text>
                    </HStack>
                    <Text fontSize="10px" color="gray.500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default VoiceMessageRecorder; 