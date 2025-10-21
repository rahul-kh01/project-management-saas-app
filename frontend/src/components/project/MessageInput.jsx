import { useState, useRef } from 'react';
import Button from '../common/Button';
import { Send, Paperclip, X } from 'lucide-react';

const MessageInput = ({ onSend, onTyping, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Emit typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      onTyping && onTyping(true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping && onTyping(false);
    }, 1000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim() && attachments.length === 0) return;

    onSend({ body: message, attachments });

    // Reset
    setMessage('');
    setAttachments([]);
    setIsTyping(false);
    onTyping && onTyping(false);

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5000000) {
        // 5MB
        alert(`${file.name} is too large. Maximum file size is 5MB.`);
        return false;
      }
      return true;
    });

    setAttachments(validFiles);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="input min-h-[60px] max-h-[120px] resize-none"
            disabled={disabled}
            rows={2}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-[60px]"
        >
          <Paperclip size={18} />
        </Button>

        <Button
          type="submit"
          size="sm"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="h-[60px]"
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;

