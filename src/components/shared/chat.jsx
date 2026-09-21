import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';
import '../../App.css';

const getFullName = (member) => `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || member?.email || 'Member';
const getInitials = (name) => name?.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'M';

const Chat = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [attachmentDraft, setAttachmentDraft] = useState(null);
  const [newType, setNewType] = useState('group');
  const [newTitle, setNewTitle] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastSentAtRef = useRef(0);

  const selectedConversation = conversations.find(item => String(item._id) === String(selectedId));
  const otherMembers = useMemo(() => members.filter(member => String(member._id) !== String(user?._id)), [members, user?._id]);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return otherMembers;
    return otherMembers.filter(member => `${getFullName(member)} ${member.email || ''}`.toLowerCase().includes(query));
  }, [memberSearch, otherMembers]);

  const loadConversations = useCallback(async (keepSelection = true) => {
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
  }, [selectedId, user._id]);

  const loadMessages = useCallback(async (conversationId = selectedId) => {
    if (!conversationId) return;
    if (Date.now() - lastSentAtRef.current < 1200) return;
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
  }, [selectedId, user._id]);

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
    const messageTimer = setInterval(() => loadMessages(selectedId), 5000);
    const conversationTimer = setInterval(() => loadConversations(), 15000);
    return () => {
      clearInterval(messageTimer);
      clearInterval(conversationTimer);
    };
  }, [loadConversations, loadMessages, selectedId]);

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
      setMemberSearch('');
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
    const text = draft.trim();
    if ((!text && !attachmentDraft) || !selectedId || sending) return;
    setSending(true);
    try {
      const response = await api.sendChatMessage(selectedId, {
        text,
        attachmentData: attachmentDraft?.data || '',
        attachmentName: attachmentDraft?.name || '',
        attachmentType: attachmentDraft?.type || ''
      }, user._id);
      lastSentAtRef.current = Date.now();
      setDraft('');
      setAttachmentDraft(null);
      if (response.data?._id) {
        setMessages(current => current.some(message => String(message._id) === String(response.data._id))
          ? current
          : [...current, response.data]);
      }
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Attachments must be 10MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDraft({
        data: String(reader.result || ''),
        name: file.name,
        type: file.type || 'application/octet-stream',
        isImage: file.type.startsWith('image/')
      });
      setError('');
    };
    reader.readAsDataURL(file);
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
            <input className="chat-member-search" value={memberSearch} onChange={event => setMemberSearch(event.target.value)} placeholder="Search members by name or email" aria-label="Search members" />
            <div className="chat-member-picker">
              {filteredMembers.length ? filteredMembers.map(member => (
                <label key={member._id}>
                  <input type={newType === 'direct' ? 'radio' : 'checkbox'} name="chat-member" checked={selectedMembers.some(item => item._id === member._id)} onChange={() => newType === 'direct' ? setSelectedMembers([member]) : toggleMember(member)} />
                  {member.profilePicture ? <img className="chat-member-avatar" src={member.profilePicture} alt="" /> : <span className="chat-member-avatar chat-member-avatar-fallback">{getInitials(getFullName(member))}</span>}
                  <span>{getFullName(member)}</span>
                </label>
              )) : <span className="chat-muted">No members match this search.</span>}
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
                  const attachmentData = message.attachmentData || message.imageData;
                  const attachmentType = message.attachmentType || (message.imageData ? 'image/*' : '');
                  const attachmentName = message.attachmentName || 'Download attachment';
                  return <article className={`chat-message ${mine ? 'mine' : ''}`} key={message._id}><div className="chat-avatar">{message.senderProfilePicture ? <img src={message.senderProfilePicture} alt="" /> : getInitials(message.senderName)}</div><div><div className="chat-message-meta"><strong>{mine ? 'You' : message.senderName}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></div>{message.text && <p>{message.text}</p>}{attachmentData && attachmentType.startsWith('image/') ? <img className="chat-message-image" src={attachmentData} alt={attachmentName} /> : attachmentData && <a className="chat-file-link" href={attachmentData} download={attachmentName} target="_blank" rel="noreferrer"><span aria-hidden="true">&#128196;</span><span>{attachmentName}</span></a>}</div></article>;
                }) : <div className="chat-empty"><strong>Make the first connection.</strong><p>Start the conversation with a thoughtful message.</p></div>}
              </div>
              <form className="chat-composer" onSubmit={sendMessage}><label className="chat-image-button" title="Attach a file"><span aria-hidden="true">&#128206;</span><input type="file" accept="*/*" onChange={handleAttachmentSelected} /></label><div className="chat-composer-fields">{attachmentDraft && <div className="chat-image-preview">{attachmentDraft.isImage ? <img src={attachmentDraft.data} alt="Selected attachment" /> : <span className="chat-file-preview-icon" aria-hidden="true">&#128196;</span>}<span>{attachmentDraft.name}</span><button type="button" onClick={() => setAttachmentDraft(null)}>Remove</button></div>}<textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message..." maxLength="2000" rows="2" /></div><button className="chat-primary-button" type="submit" disabled={(!draft.trim() && !attachmentDraft) || sending}>{sending ? 'Sending...' : 'Send'}</button></form>
            </>
          ) : <div className="chat-empty"><strong>Choose a conversation</strong><p>The public forum is available to every active member.</p></div>}
        </main>
      </div>
    </section>
  );
};

export default Chat;