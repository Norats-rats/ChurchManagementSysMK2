import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';
import '../../App.css';
import { normalizeRole } from '../../permissions';
import { useFeedbackModal } from './feedbackmodal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMembersPanel, setShowAddMembersPanel] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [membersToAdd, setMembersToAdd] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastSentAtRef = useRef(0);
  const textareaRef = useRef(null);
  const { askConfirmation, showFeedback, FeedbackModal } = useFeedbackModal();

  const normalizedRole = normalizeRole(user?.role);
  const isPrivilegedRole = normalizedRole === 'Admin' || normalizedRole === 'Ministry Leader';

  const selectedConversation = conversations.find(item => String(item._id) === String(selectedId));
  const isGroupOwner = selectedConversation?.type === 'group' && String(selectedConversation.owner) === String(user?._id);
  const canManageParticipants = selectedConversation?.type === 'group' && (isGroupOwner || isPrivilegedRole);

  const activeMembers = useMemo(() => members.filter(member => !member.status || member.status === 'Active'), [members]);
  const otherMembers = useMemo(() => members.filter(member => String(member._id) !== String(user?._id)), [members, user?._id]);

  // Members shown in the right-hand sidebar depend on the open conversation type:
  // public -> everyone active, group -> only that group's participants, direct -> hidden entirely.
  const sidebarMembers = useMemo(() => {
    if (!selectedConversation) return [];
    if (selectedConversation.type === 'public') return activeMembers;
    if (selectedConversation.type === 'group') {
      const participantIds = new Set((selectedConversation.participants || []).map(p => String(p._id || p)));
      return activeMembers.filter(member => participantIds.has(String(member._id)));
    }
    return [];
  }, [selectedConversation, activeMembers]);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return otherMembers;
    return otherMembers.filter(member => `${getFullName(member)} ${member.email || ''}`.toLowerCase().includes(query));
  }, [memberSearch, otherMembers]);

  const availableToAdd = useMemo(() => {
    if (!selectedConversation?.participants) return [];
    const participantIds = new Set(selectedConversation.participants.map(p => String(p._id || p)));
    const remaining = members.filter(m => !participantIds.has(String(m._id)));
    const query = addMemberSearch.trim().toLowerCase();
    if (!query) return remaining;
    return remaining.filter(m => `${getFullName(m)} ${m.email || ''}`.toLowerCase().includes(query));
  }, [members, selectedConversation, addMemberSearch]);

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [draft]);

  const handleAddMembers = async () => {
    if (!membersToAdd.length || !selectedId) return;
    try {
      await api.addChatMembers(selectedId, membersToAdd, user._id);
      setMembersToAdd([]);
      await loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add members.');
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    askConfirmation(`Remove ${memberName || 'this member'} from the group?`, async () => {
      if (!selectedId) return;
      try {
        await api.removeChatMember(selectedId, memberId, user._id);
        await loadConversations();
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to remove member.');
      }
    });
  };

  const handleTransferOwnership = (newOwnerId, memberName) => {
    askConfirmation(`Make ${memberName || 'this member'} the owner of this group?`, async () => {
      if (!selectedId) return;
      try {
        await api.transferChatOwnership(selectedId, newOwnerId, user._id);
        await loadConversations();
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to transfer ownership.');
      }
    });
  };

  const handleDeleteConversationItem = (conversation) => {
    if (!conversation?._id) return;
    const isGroup = conversation.type === 'group';
    const isDirect = conversation.type === 'direct';
    if (!isGroup && !isDirect) return;

    const confirmMessage = isGroup
      ? 'Delete this group for everyone? This cannot be undone.'
      : 'Delete this conversation? It will be removed for everyone.';
    const successMessage = isGroup ? 'Group deleted.' : 'Conversation deleted.';

    askConfirmation(confirmMessage, async () => {
      try {
        await api.deleteChatConversation(conversation._id, user._id);
        await loadConversations(false);
        showFeedback(successMessage);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to delete conversation.');
      }
    });
  };

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
      setShowCreateModal(false);
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
        <span className="chat-status">{members.length || 'All'} members connected</span>
      </header>

      {error && <div className="chat-error" role="alert">{error}</div>}
      <FeedbackModal />

      <div className="chat-layout chat-layout-discord">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-heading"><strong>Conversations</strong><span>{conversations.length}</span></div>
            {loading ? <p className="chat-muted">Loading conversations...</p> : conversations.map((conversation) => {
              const canDeleteItem = conversation.type !== 'public' && (
                (conversation.type === 'group' && String(conversation.owner) === String(user?._id)) ||
                (conversation.type === 'direct' && (conversation.participants || []).some(p => String(p._id || p) === String(user?._id)))
              );
              return (
                <div
                  key={conversation._id}
                  className={`chat-conversation ${String(selectedId) === String(conversation._id) ? 'active' : ''}`}
                  onClick={() => setSelectedId(conversation._id)}
                >
                  <span className="chat-conversation-content">
                    <span className="chat-conversation-icon">{conversation.type === 'public' ? '◎' : conversation.type === 'direct' ? '↗' : '◌'}</span>
                    <span><strong>{conversationLabel(conversation)}</strong><small>{conversation.type === 'public' ? 'Open forum' : conversation.type === 'direct' ? 'Private' : 'Group chat'}</small></span>
                  </span>
                  {canDeleteItem && (
                    <button
                      type="button"
                      className="chat-conversation-delete"
                      title={conversation.type === 'group' ? 'Delete group' : 'Delete conversation'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversationItem(conversation);
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>
              );
            })}
        </aside>

        <main className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-panel-heading">
                <div>
                  <span className="chat-eyebrow">{selectedConversation.type === 'public' ? 'Public forum' : selectedConversation.type === 'group' ? 'Group chat' : 'Private message'}</span>
                  <h2>{conversationLabel(selectedConversation)}</h2>
                </div>
              </div>

              <div className="chat-messages" aria-live="polite">
                {messagesLoading && !messages.length ? <p className="chat-muted">Loading messages...</p> : messages.length ? messages.map(message => {
                  const mine = String(message.senderId) === String(user._id);
                  const attachmentData = message.attachmentData || message.imageData;
                  const attachmentType = message.attachmentType || (message.imageData ? 'image/*' : '');
                  const attachmentName = message.attachmentName || 'Download attachment';
                  return <article className={`chat-message ${mine ? 'mine' : ''}`} key={message._id}><div className="chat-avatar">{message.senderProfilePicture ? <img src={message.senderProfilePicture} alt="" /> : getInitials(message.senderName)}</div><div><div className="chat-message-meta"><strong>{mine ? 'You' : message.senderName}</strong><time>{new Date(message.createdAt).toLocaleString()}</time></div>{message.text && <p>{message.text}</p>}{attachmentData && attachmentType.startsWith('image/') ? <img className="chat-message-image" src={attachmentData} alt={attachmentName} /> : attachmentData && <a className="chat-file-link" href={attachmentData} download={attachmentName} target="_blank" rel="noreferrer"><span aria-hidden="true">&#128196;</span><span>{attachmentName}</span></a>}</div></article>;
                }) : <div className="chat-empty"><strong>Make the first connection.</strong><p>Start the conversation with a thoughtful message.</p></div>}
              </div>
              <form className="chat-composer" onSubmit={sendMessage}><label className="chat-image-button" title="Attach a file"><span aria-hidden="true">&#128206;</span><input type="file" accept="*/*" onChange={handleAttachmentSelected} /></label><div className="chat-composer-fields">{attachmentDraft && <div className="chat-image-preview">{attachmentDraft.isImage ? <img src={attachmentDraft.data} alt="Selected attachment" /> : <span className="chat-file-preview-icon" aria-hidden="true">&#128196;</span>}<span>{attachmentDraft.name}</span><button type="button" onClick={() => setAttachmentDraft(null)}>Remove</button></div>}<textarea ref={textareaRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message..." maxLength="2000" rows="1" /></div><button className="chat-primary-button" type="submit" disabled={(!draft.trim() && !attachmentDraft) || sending}>{sending ? 'Sending...' : 'Send'}</button></form>
            </>
          ) : <div className="chat-empty"><strong>Choose a conversation</strong><p>The public forum is available to every active member.</p></div>}
        </main>

        {selectedConversation && selectedConversation.type !== 'direct' && (
          <aside className="chat-members-sidebar">
            <div className="chat-sidebar-heading">
              <strong>{selectedConversation.type === 'public' ? 'Active Members' : 'Group Members'}</strong>
              <span>{sidebarMembers.length}</span>
            </div>
            <div className="chat-members-scroll">
              <div className="chat-members-list">
                {sidebarMembers.length ? sidebarMembers.map(member => {
                  const isSelf = String(member._id) === String(user._id);
                  const isMemberOwner = selectedConversation.type === 'group' && String(selectedConversation.owner) === String(member._id);
                  const showQuickActions = !isSelf && canManageParticipants && !isMemberOwner;
                  return (
                    <div className="chat-member-row" key={member._id}>
                      <span className="chat-member-online-dot" aria-hidden="true" />
                      {member.profilePicture ? <img className="chat-member-avatar" src={member.profilePicture} alt="" /> : <span className="chat-member-avatar chat-member-avatar-fallback">{getInitials(getFullName(member))}</span>}
                      <span className="chat-member-row-info">
                        <strong>{getFullName(member)}{isSelf ? ' (You)' : ''}</strong>
                        <small>{member.role || 'Member'}{isMemberOwner ? ' · 👑 Owner' : ''}</small>
                      </span>
                      {showQuickActions && (
                        <div className="chat-member-quick-actions">
                          <button type="button" title="Make group owner" onClick={() => handleTransferOwnership(member._id, getFullName(member))}>👑</button>
                          <button type="button" title="Remove from group" onClick={() => handleRemoveMember(member._id, getFullName(member))}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                }) : <p className="chat-muted">No members to show.</p>}
              </div>
            </div>

            {canManageParticipants && (
              <div className="chat-add-member-footer">
                <button type="button" className="chat-add-member-button" onClick={() => setShowAddMembersPanel(true)}>
                  Add a New member
                </button>
              </div>
            )}
          </aside>
        )}

        {showAddMembersPanel && (
          <div className="chat-add-modal-overlay" role="presentation" onClick={() => setShowAddMembersPanel(false)}>
            <div className="chat-add-modal" role="dialog" aria-modal="true" aria-label="Add members" onClick={event => event.stopPropagation()}>
              <div className="chat-create-modal-header">
                <h3>Add members to group</h3>
                <button type="button" onClick={() => setShowAddMembersPanel(false)}>×</button>
              </div>
              <input
                className="chat-member-search"
                value={addMemberSearch}
                onChange={e => setAddMemberSearch(e.target.value)}
                placeholder="Search members by name or email..."
                aria-label="Search members"
              />
              <div className="chat-add-members-list">
                {availableToAdd.length ? availableToAdd.map(m => (
                  <label key={m._id}>
                    <input
                      type="checkbox"
                      checked={membersToAdd.includes(m._id)}
                      onChange={() => setMembersToAdd(prev => prev.includes(m._id) ? prev.filter(id => id !== m._id) : [...prev, m._id])}
                    />
                    {m.profilePicture ? <img className="chat-member-avatar" src={m.profilePicture} alt="" /> : <span className="chat-member-avatar chat-member-avatar-fallback">{getInitials(getFullName(m))}</span>}
                    <span>{getFullName(m)}</span>
                  </label>
                )) : <span className="chat-muted">No members available to add.</span>}
              </div>
              <div className="chat-modal-actions">
                <button type="button" className="chat-primary-button" onClick={handleAddMembers} disabled={!membersToAdd.length}>
                  Add Selected Members
                </button>
                <button type="button" className="chat-cancel-button" onClick={() => setShowAddMembersPanel(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button type="button" className="chat-fab" title="Start a conversation" onClick={() => setShowCreateModal(true)}>+</button>

      {showCreateModal && (
        <div className="chat-create-modal-overlay" role="presentation" onClick={() => setShowCreateModal(false)}>
          <div className="chat-create-modal" role="dialog" aria-modal="true" aria-label="Start a conversation" onClick={event => event.stopPropagation()}>
            <div className="chat-create-modal-header">
              <h3>Start a conversation</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form className="chat-new-form" onSubmit={createConversation}>
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
          </div>
        </div>
      )}
    </section>
  );
};

export default Chat;