import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import '../../App.css';

const getFullName = (member) => `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || member?.email || 'Member';

const Chat = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [newType, setNewType] = useState('group');
  const [newTitle, setNewTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedConversation = conversations.find(item => String(item._id) === String(selectedId));
  const otherMembers = useMemo(() => members.filter(member => String(member._id) !== String(user?._id)), [members, user?._id]);

  const loadConversations = async (keepSelection = true) => {
    try {
      const response = await api.getChatConversations(user._id);
      const items = Array.isArray(response.data) ? response.data : [];
      setConversations(items);
      if (!keepSelection || !items.some(item => String(item._id) === String(selectedId))) {
        setSelectedId(items[0]?._id || null);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load community chat.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId = selectedId) => {
    if (!conversationId) return;
    setMessagesLoading(true);
    try {
      const response = await api.getChatMessages(conversationId, user._id);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.getMembers(), api.getChatConversations(user._id)])
      .then(([membersResponse, conversationsResponse]) => {
        if (!active) return;
        setMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
        const items = Array.isArray(conversationsResponse.data) ? conversationsResponse.data : [];
        setConversations(items);
        setSelectedId(items[0]?._id || null);
      })
      .catch(err => setError(err.response?.data?.message || 'Unable to load community chat.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user._id]);

  useEffect(() => {
    loadMessages();
    if (!selectedId) return undefined;
    const timer = setInterval(() => loadMessages(selectedId), 10000);
    return () => clearInterval(timer);
  }, [selectedId]);

  const createConversation = async (event) => {
    event.preventDefault();
    const participantIds = selectedMembers.map(member => member._id);
    if (newType === 'group' && !newTitle.trim()) return setError('Give the group a name.');
    if (newType === 'direct' && participantIds.length !== 1) return setError('Choose one member for a private conversation.');
    try {
      const response = await api.createChatConversation({
        type: newType,
        title: newTitle.trim(),
        participantIds
      }, user._id);
      setNewTitle('');
      setSelectedMembers([]);
      await loadConversations(false);
      setSelectedId(response.data._id);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create conversation.');
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedId) return;
    try {
      await api.sendChatMessage(selectedId, { text: draft.trim() }, user._id);
      setDraft('');
      await loadMessages(selectedId);
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send message.');
    }
  };

  const toggleMember = (member) => {
    setSelectedMembers(current => current.some(item => item._id === member._id)
      ? current.filter(item => item._id !== member._id)
      : [...current, member]);
  };

  const conversationLabel = (conversation) => {
    if (conversation.type !== 'direct') return conversation.title;
    const other = conversation.participants?.find(item => String(item._id || item) !== String(user._id));
    return other?.firstName ? getFullName(other) : conversation.title || 'Private conversation';
  };

  return (
    <section className="chat-shell">
      <header className="chat-header">
        <div>
          <p className="chat-eyebrow">Fellowship conversations</p>
          <h1>Community Chat</h1>
          <p>Share updates publicly, gather a ministry group, or message one member privately.</p>
        </div>
        <span className="chat-status">{members.length || 'All'} members connected</span>
      </header>

      {error && <div className="chat-error" role="alert">{error}</div>}

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-heading"><strong>Conversations</strong><span>{conversations.length}</span></div>
          {loading ? <p className="chat-muted">Loading conversations...</p> : conversations.map(conversation => (
            <button
              type="button"
              key={conversation._id}
              className={`chat-conversation ${String(selectedId) === String(conversation._id) ? 'active' : ''}`}
              onClick={() => setSelectedId(conversation._id)}
            >
              <span className="chat-conversation-icon">{conversation.type === 'public' ? '◎' : conversation.type === 'direct' ? '↗' : '◌'}</span>
              <span><strong>{conversationLabel(conversation)}</strong><small>{conversation.type === 'public' ? 'Open forum' : conversation.type === 'direct' ? 'Private' : 'Group chat'}</small></span>
            </button>
          ))}

          <form className="chat-new-form" onSubmit={createConversation}>
            <strong>Start a conversation</strong>
            <div className="chat-type-switcher">
              <button type="button" className={newType === 'group' ? 'active' : ''} onClick={() => setNewType('group')}>Group</button>
              <button type="button" className={newType === 'direct' ? 'active' : ''} onClick={() => setNewType('direct')}>Private</button>
            </div>
            {newType === 'group' && <input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Group name" maxLength="80" />}
            <div className="chat-member-picker">
              {otherMembers.map(member => (
                <label key={member._id}>
                  <input type={newType === 'direct' ? 'radio' : 'checkbox'} name="chat-member" checked={selectedMembers.some(item => item._id === member._id)} onChange={() => newType === 'direct' ? setSelectedMembers([member]) : toggleMember(member)} />
                  <span>{getFullName(member)}</span>
                </label>
              ))}
            </div>
            <button className="chat-primary-button" type="submit">Create {newType === 'group' ? 'group' : 'private chat'}</button>
          </form>
        </aside>

        <main className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-panel-heading"><div><span className="chat-eyebrow">{selectedConversation.type === 'public' ? 'Public forum' : selectedConversation.type === 'group' ? 'Group chat' : 'Private message'}</span><h2>{conversationLabel(selectedConversation)}</h2></div><span>{selectedConversation.participants?.length || 'Everyone'} participants</span></div>
              <div className="chat-messages" aria-live="polite">
                {messagesLoading && !messages.length ? <p className="chat-muted">Loading messages...</p> : messages.length ? messages.map(message => {
                  const mine = String(message.senderId) === String(user._id);
                  return <article className={`chat-message ${mine ? 'mine' : ''}`} key={message._id}><div className="chat-avatar">{message.senderName?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><div className="chat-message-meta"><strong>{mine ? 'You' : message.senderName}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></div><p>{message.text}</p></div></article>;
                }) : <div className="chat-empty"><strong>Make the first connection.</strong><p>Start the conversation with a thoughtful message.</p></div>}
              </div>
              <form className="chat-composer" onSubmit={sendMessage}><textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message..." maxLength="2000" rows="2" /><button className="chat-primary-button" type="submit" disabled={!draft.trim()}>Send</button></form>
            </>
          ) : <div className="chat-empty"><strong>Choose a conversation</strong><p>The public forum is available to every active member.</p></div>}
        </main>
      </div>
    </section>
  );
};

export default Chat;