import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../helper/supabaseClient';
import {
  FaUserCircle,
  FaEnvelope,
  FaEnvelopeOpen,
  FaTrash,
} from 'react-icons/fa';
import ChatModal from '../components/ChatModal';

function Inbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          setError('You must be logged in to view messages');
          setLoading(false);
          return;
        }

        setCurrentUser(authData.user);

        const userId = authData.user.id;

        const { data: allMessages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: false });

        if (msgError) throw msgError;

        const userIds = new Set();
        allMessages.forEach((msg) => {
          const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
          userIds.add(otherId);
        });

        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name, profile_picture_url')
          .in('id', Array.from(userIds));

        const userMap = {};
        usersData.forEach((user) => {
          userMap[user.id] = user;
        });

        const latestMessagesMap = {};
        for (const msg of allMessages) {
          const otherUserId =
            msg.sender_id === userId ? msg.recipient_id : msg.sender_id;

          if (!latestMessagesMap[otherUserId]) {
            latestMessagesMap[otherUserId] = {
              ...msg,
              otherUser: userMap[otherUserId] || {
                display_name: 'Unknown',
                profile_picture_url: null,
              },
            };
          }
        }

        setMessages(Object.values(latestMessagesMap));
      } catch (err) {
        console.error('Inbox fetch error:', err);
        setError('Failed to load inbox');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Set up subscription for new messages
    const userId = currentUser?.id;
    if (userId) {
      const channel = supabase
        .channel('messages-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${userId}`,
          },
          async (payload) => {
            if (payload.new) {
              // Highlight the new message
              setHighlightedMessageId(payload.new.id);
              
              // Remove highlight after 5 seconds
              setTimeout(() => {
                setHighlightedMessageId(null);
              }, 5000);
              
              // Fetch user info for the new message
              const { data: userData } = await supabase
                .from('users')
                .select('id, display_name, profile_picture_url')
                .eq('id', payload.new.sender_id)
                .single();
                
              // Update messages state with new message
              setMessages(prevMessages => {
                // Check if we already have a message from this sender
                const existingMsgIndex = prevMessages.findIndex(
                  msg => msg.sender_id === payload.new.sender_id || msg.recipient_id === payload.new.sender_id
                );
                
                if (existingMsgIndex >= 0) {
                  // Update the existing message
                  const updatedMessages = [...prevMessages];
                  updatedMessages[existingMsgIndex] = {
                    ...payload.new,
                    otherUser: userData || {
                      id: payload.new.sender_id,
                      display_name: 'Unknown',
                      profile_picture_url: null
                    }
                  };
                  return updatedMessages;
                } else {
                  // Add new message to the top
                  return [
                    {
                      ...payload.new,
                      otherUser: userData || {
                        id: payload.new.sender_id,
                        display_name: 'Unknown',
                        profile_picture_url: null
                      }
                    },
                    ...prevMessages
                  ];
                }
              });
            }
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser?.id]);

  const handleOpenChat = async (msg) => {
    setChatRecipient(msg.otherUser);
    setShowChatModal(true);
    
    // If the message is unread and the current user is the recipient, mark it as read
    if (!msg.is_read && msg.recipient_id === currentUser?.id) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', msg.id);
        
        if (!error) {
          // Update local state
          setMessages(prevMessages =>
            prevMessages.map(m =>
              m.id === msg.id ? { ...m, is_read: true } : m
            )
          );
        }
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      // Remove the message from the state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  if (loading) return <div className="text-center p-6">Loading...</div>;
  if (error) return <div className="text-red-500 text-center p-6">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded shadow">
        <h2 className="text-xl font-bold text-orange-600 px-6 py-4 border-b">Inbox</h2>

        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No messages yet.</p>
        ) : (
          <div className="divide-y">
            {messages.map((msg) => {
              const isUnread = !msg.is_read && msg.recipient_id === currentUser?.id;
              const isHighlighted = msg.id === highlightedMessageId;
              
              return (
                <div
                  key={msg.id}
                  onClick={() => handleOpenChat(msg)}
                  className={`flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-all duration-300 ${
                    isUnread ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                  } ${isHighlighted ? 'animate-pulse bg-orange-100' : ''}`}
                >
                  <div className="relative">
                    {msg.otherUser.profile_picture_url ? (
                      <img
                        src={msg.otherUser.profile_picture_url}
                        className="w-10 h-10 rounded-full object-cover"
                        alt={msg.otherUser.display_name}
                      />
                    ) : (
                      <FaUserCircle className="w-10 h-10 text-gray-400" />
                    )}
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 rounded-full w-3 h-3"></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isUnread ? 'text-orange-700 font-bold' : 'text-gray-800'}`}>
                      {msg.otherUser.display_name}
                    </p>
                    <p className={`text-sm ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'} truncate`}>
                      {msg.content || msg.message_text}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 pt-1">
                    {isUnread ? (
                      <FaEnvelope className="text-orange-500" />
                    ) : (
                      <FaEnvelopeOpen className="text-gray-400" />
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const isConfirmed = window.confirm("Are you sure you want to delete this message?");
                        if (isConfirmed) {
                          deleteMessage(msg.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete message"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showChatModal && chatRecipient && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.display_name}
        />
      )}
    </div>
  );
}

export default Inbox;