import React, { memo, useEffect } from 'react';
import { Message, Reaction } from '../types/message';
import { useAppDispatch } from '../store/hooks';
import { addReaction } from '../store/slices/messagesSlice';

interface MessageStatusProps {
  status: Message['status'];
  timestamp: string;
}

const MessageStatus: React.FC<MessageStatusProps> = memo(({ status, timestamp }) => {
  return (
    <div className="message-status">
      {status === 'sending' && <span className="status-icon sending">●</span>}
      {status === 'sent' && <span className="status-icon sent">✓</span>}
      {status === 'delivered' && <span className="status-icon delivered">✓✓</span>}
      {status === 'read' && <span className="status-icon read">✓✓</span>}
      {status === 'error' && <span className="status-icon error">!</span>}
      {status === 'queued' && <span className="status-icon queued">⏱</span>}
      {timestamp && <span className="status-time">{new Date(timestamp).toLocaleTimeString()}</span>}
    </div>
  );
});

interface MessageItemProps {
  message: Message;
  onRetry: (message: Message) => void;
  onMarkAsRead: (message: Message) => void;
  onDelete: (message: Message) => void;
  isCurrentUser: boolean;
}

const MessageItem: React.FC<MessageItemProps> = memo(({ 
  message, 
  onRetry, 
  onMarkAsRead, 
  onDelete,
  isCurrentUser 
}) => {
  const dispatch = useAppDispatch();
  
  const handleReaction = (emoji: string) => {
    const reaction: Reaction = {
      emoji,
      userId: 'current-user', // Replace with actual current user ID
      timestamp: new Date().toISOString()
    };
    
    dispatch(addReaction({ 
      messageId: message.id, 
      reaction 
    }));
  };
  
  const handleRetry = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRetry(message);
  };
  
  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDelete(message);
  };
  
  useEffect(() => {
    // Send read receipt when message is visible and not from current user
    if (!isCurrentUser && message.status !== 'read') {
      onMarkAsRead(message);
    }
  }, [message, onMarkAsRead, isCurrentUser]);
  
  return (
    <div className={`message ${isCurrentUser ? 'sent' : 'received'}`}>
      <div className="message-content">
        {message.text}
        
        {message.fileMetadata && (
          <div className="file-attachment">
            <div className="file-name">{message.fileMetadata.name}</div>
            <div className="file-size">{formatFileSize(message.fileMetadata.size)}</div>
          </div>
        )}
        
        {message.codeMetadata && (
          <div className="code-block">
            <div className="code-language">{message.codeMetadata.language}</div>
            <pre>
              <code>{message.codeMetadata.code}</code>
            </pre>
          </div>
        )}
      </div>
      
      <div className="message-meta">
        <MessageStatus status={message.status} timestamp={message.timestamp} />
        
        {message.offline && <span className="offline-indicator">offline</span>}
        
        <div className="message-reactions">
          {message.reactions?.map((reaction, index) => (
            <span key={index} className="reaction">{reaction.emoji}</span>
          ))}
        </div>
        
        {message.status === 'error' && (
          <div className="message-actions">
            <button className="retry-button" onClick={handleRetry}>Retry</button>
            <button className="delete-button" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
});

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
};

export default MessageItem; 