import { useState, useEffect, useRef } from 'react';
import supabase from '../helper/supabaseClient';
import { FiSend, FiX } from 'react-icons/fi';
import { FaUserCircle } from 'react-icons/fa';

const ChatModal = ({ isOpen, onClose, recipientId, recipientName }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientProfilePic, setRecipientProfilePic] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const userIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadData = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        userIdRef.current = auth.user.id;
        
        // Load both users' profile pictures from the database
        const { data: pics } = await supabase
          .from('users')
          .select('id, profile_picture_url')
          .in('id', [auth.user.id, recipientId]);
        const picFor = (id) => pics?.find(p => p.id === id)?.profile_picture_url || null;
        setUserProfilePic(picFor(auth.user.id));
        setRecipientProfilePic(picFor(recipientId));
        
        await fetchMessages(auth.user.id);
        subscribeToMessages(auth.user.id);
        
        // Mark all messages from this recipient as read
        markMessagesAsRead(auth.user.id, recipientId);
      }
    };

    if (isOpen && recipientId) {
      loadData();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Function to mark all messages from a sender as read
  const markMessagesAsRead = async (userId, senderId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('sender_id', senderId)
        .eq('is_read', false);
        
      if (error) {
        console.error('Error marking messages as read:', error);
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const fetchMessages = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(display_name)')
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }

    setLoading(false);
  };

  const subscribeToMessages = (userId) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`chat-${userId}-${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or=(and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId}))`,
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', payload.new.sender_id)
            .single();

          const enrichedMessage = {
            ...payload.new,
            sender: senderData ? { display_name: senderData.display_name } : null,
          };

          setMessages((prev) => [...prev, enrichedMessage]);
          
          // If the new message is from the recipient, mark it as read immediately
          if (payload.new.sender_id === recipientId && payload.new.recipient_id === userId) {
            markMessagesAsRead(userId, recipientId);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userId = userIdRef.current;

    const messageData = {
      sender_id: userId,
      recipient_id: recipientId,
      content: newMessage.trim(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select('*, sender:sender_id(display_name)')
      .single();

    if (error) {
      console.error('Error sending message:', error);
      alert(error.message?.includes('blocked')
        ? "This message can't be sent because one of you has blocked the other."
        : 'Your message could not be sent. Please try again.');
    } else {
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">Chat with {recipientName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === recipientId ? 'justify-start' : 'justify-end'} items-center`}
              >
                {message.sender_id === recipientId && (
                  <div className="flex-shrink-0 mr-2">
                    {recipientProfilePic ? (
                      <img 
                        src={recipientProfilePic} 
                        alt={recipientName} 
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <FaUserCircle className={`w-8 h-8 text-gray-600 ${recipientProfilePic ? 'hidden' : ''}`} />
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg shadow-md ${
                    message.sender_id === recipientId
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  <p className="font-semibold text-sm mb-1">
                    {message.sender?.display_name || 'User'}
                  </p>
                  <p>{message.content}</p>
                  <span className="text-xs opacity-75 mt-1 block text-right">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {message.sender_id !== recipientId && (
                  <div className="flex-shrink-0 ml-2">
                    {userProfilePic ? (
                      <img 
                        src={userProfilePic} 
                        alt="You" 
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <FaUserCircle className={`w-8 h-8 text-gray-600 ${userProfilePic ? 'hidden' : ''}`} />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="border-t p-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors"
              disabled={!newMessage.trim()}
            >
              <FiSend size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;

