import { useEffect, useRef } from 'react';
import { formatDate } from '../../utils/helpers';
import { Paperclip, CheckCheck, Check } from 'lucide-react';

const MessageList = ({ messages, currentUserId, onScroll, loading }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Scroll to bottom on initial load and when new messages arrive
    scrollToBottom();
  }, [messages.length]);

  const handleScroll = (e) => {
    const { scrollTop } = e.target;

    // Load more messages when scrolling to top
    if (scrollTop === 0 && onScroll) {
      onScroll();
    }
  };

  const isOwnMessage = (message) => {
    return message.sender?._id === currentUserId;
  };

  const isRead = (message) => {
    // Check if message has been read by others
    if (isOwnMessage(message)) {
      return message.readBy && message.readBy.length > 1; // More than just sender
    }
    return false;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Show time for messages within 24 hours
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      // Show date for older messages
      return formatDate(timestamp);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '400px' }}
    >
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      )}

      {messages.map((message, index) => {
        const isOwn = isOwnMessage(message);
        const showSender =
          index === 0 ||
          messages[index - 1]?.sender?._id !== message.sender?._id;

        return (
          <div
            key={message._id || message.tempId || index}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Sender Name */}
              {!isOwn && showSender && (
                <div className="flex items-center gap-2 mb-1 px-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary-700">
                      {message.sender?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {message.sender?.username || 'Unknown'}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`rounded-lg px-4 py-2 ${
                  isOwn
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Message Body */}
                {message.body && (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 p-2 rounded ${
                          isOwn
                            ? 'bg-primary-700 hover:bg-primary-800'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Paperclip size={14} />
                        <span className="text-xs truncate">{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Timestamp and Read Receipt */}
                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <span
                    className={`text-xs ${
                      isOwn ? 'text-primary-200' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                  {isOwn && (
                    <span>
                      {isRead(message) ? (
                        <CheckCheck size={14} className="text-primary-200" />
                      ) : (
                        <Check size={14} className="text-primary-200" />
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Sending indicator */}
              {message.tempId && !message._id && (
                <span className="text-xs text-gray-500 mt-1 px-2">
                  Sending...
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

