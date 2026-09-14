import { useState, useMemo, useRef, useEffect } from 'react'
import StaffSidebar from '../../components/TutorSidebar'


type ChatContact = {
  id: string
  name: string
  email: string
  role: 'STAFF' | 'COORDINATOR'
}

type AttachmentType = 'photo' | 'file' | 'document'

// Sent → this mock's version of "delivered" (no real backend to
// distinguish the two); Read → the other side has opened the
// conversation. Purely a client-side simulation (see appendMessage)
// since there's no real read-receipt channel here.
type MessageStatus = 'sent' | 'read'

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  attachment?: { type: AttachmentType; name: string }
  status?: MessageStatus
}

type DMConversation = {
  type: 'dm'
  id: string
  contact: ChatContact
  messages: ChatMessage[]
}

type GroupMember = {
  contact: ChatContact
  isAdmin: boolean
}

type GroupPermissions = {
  sendText: boolean
  sharePhoto: boolean
  shareFile: boolean
  shareDocument: boolean
  addMembers: boolean
}

type GroupConversation = {
  type: 'group'
  id: string
  name: string
  unitCode: string
  members: GroupMember[]
  permissions: GroupPermissions
  messages: ChatMessage[]
}

type Conversation = DMConversation | GroupConversation

// --- MOCK DATA (UI only — no connection to coordinator's chat) ---
const CURRENT_USER_ID = 'me'
const CURRENT_USER_NAME = localStorage.getItem('sessioneer_name') || 'You'

const CURRENT_USER: ChatContact = {
  id: CURRENT_USER_ID,
  name: CURRENT_USER_NAME,
  email: '',
  role: 'STAFF',
}

// People the tutor can search for and message directly
const ALL_PEOPLE: ChatContact[] = [
  { id: 'c1', name: 'Sarah Chen', email: 'coordinator@qut.edu.au', role: 'COORDINATOR' },
  { id: 't2', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'STAFF' },
  { id: 't3', name: 'James Wilson', email: 'j.wilson@outlook.com', role: 'STAFF' },
  { id: 't4', name: 'Emily Chen', email: 'emily.chen@gmail.com', role: 'STAFF' },
  { id: 't5', name: 'Rohit Patel', email: 'rohit.patel@gmail.com', role: 'STAFF' },
]

// Pretend the coordinator already added this tutor to these groups.
// This is static mock data just so the UI has something to show —
// it is NOT linked to the real coordinator chat in any way.
const MOCK_GROUPS: GroupConversation[] = [
  {
    type: 'group',
    id: 'g1',
    name: 'CAB302 Tutors',
    unitCode: 'CAB302',
    members: [
      { contact: { id: 'c1', name: 'Sarah Chen', email: 'coordinator@qut.edu.au', role: 'COORDINATOR' }, isAdmin: true },
      { contact: CURRENT_USER, isAdmin: false },
      { contact: { id: 't2', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'STAFF' }, isAdmin: false },
    ],
    permissions: {
      sendText: true,
      sharePhoto: true,
      shareFile: true,
      shareDocument: true,
      addMembers: false,
    },
    messages: [
      {
        id: 'm1',
        senderId: 'c1',
        senderName: 'Sarah Chen',
        text: 'Welcome to the CAB302 tutors group! Availability deadline is in 14 days.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
    ],
  },
]

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// How long a message you sent stays "Sent" before this mock marks it as
// "Read" — stands in for a real read-receipt event from the other side.
const SEEN_DELAY_MS = 2000

// WhatsApp-style double tick: gray/white for sent, teal-highlighted for
// seen. Only ever rendered next to messages the current user sent.
function MessageTicks({ status }: { status?: MessageStatus }) {
  const read = status === 'read'
  return (
    <span className={`chat-ticks ${read ? 'chat-ticks-read' : ''}`} title={read ? 'Seen' : 'Sent'}>
      ✓✓
    </span>
  )
}

export default function TutorChat() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_GROUPS)
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [draft, setDraft] = useState('')

  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const dmConversations = conversations.filter((c): c is DMConversation => c.type === 'dm')
  const groupConversations = conversations.filter((c): c is GroupConversation => c.type === 'group')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const existingIds = new Set(dmConversations.map(c => c.contact.id))
    return ALL_PEOPLE.filter(
      p => !existingIds.has(p.id) && p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, dmConversations])

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  const activeContactFromSearch = ALL_PEOPLE.find(p => p.id === activeContactId)

  const headerInfo =
    activeConversation?.type === 'group'
      ? { title: activeConversation.name, sub: `${activeConversation.members.length} members · ${activeConversation.unitCode}` }
      : activeConversation?.type === 'dm'
        ? { title: activeConversation.contact.name, sub: activeConversation.contact.email }
        : activeContactFromSearch
          ? { title: activeContactFromSearch.name, sub: activeContactFromSearch.email }
          : null

  // Is the current tutor an admin in the open group? (usually false — coordinator is admin)
  const isCurrentUserAdmin =
    activeConversation?.type === 'group' &&
    activeConversation.members.some(m => m.contact.id === CURRENT_USER_ID && m.isAdmin)

  const canSendText =
    activeConversation?.type !== 'group' || isCurrentUserAdmin || activeConversation.permissions.sendText

  const canShare = (type: AttachmentType) => {
    if (activeConversation?.type !== 'group') return true
    if (isCurrentUserAdmin) return true
    const key = type === 'photo' ? 'sharePhoto' : type === 'file' ? 'shareFile' : 'shareDocument'
    return activeConversation.permissions[key as keyof GroupPermissions]
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages.length])

  useEffect(() => {
    setShowGroupInfo(false)
  }, [activeConversationId])

  const openDM = (contactId: string) => {
    setActiveContactId(contactId)
    setActiveConversationId(contactId)
    setSearchQuery('')
  }

  const openGroup = (groupId: string) => {
    setActiveContactId(null)
    setActiveConversationId(groupId)
    setSearchQuery('')
  }

  const appendMessage = (message: ChatMessage) => {
    let conversationId: string | null = null
    if (activeConversation) {
      conversationId = activeConversation.id
      setConversations(prev =>
        prev.map(c => (c.id === activeConversation.id ? { ...c, messages: [...c.messages, message] } : c))
      )
    } else if (activeContactFromSearch) {
      const newDM: DMConversation = {
        type: 'dm',
        id: activeContactFromSearch.id,
        contact: activeContactFromSearch,
        messages: [message],
      }
      conversationId = newDM.id
      setConversations(prev => [newDM, ...prev])
      setActiveConversationId(newDM.id)
    }

    // Simulate the other side reading it — there's no real read-receipt
    // backend behind this chat, so "seen" is just a timed flip of this
    // one message's status from sent -> read, purely for display.
    if (message.senderId === CURRENT_USER_ID && conversationId) {
      const cid = conversationId
      setTimeout(() => {
        setConversations(prev =>
          prev.map(c =>
            c.id === cid
              ? { ...c, messages: c.messages.map(m => (m.id === message.id ? { ...m, status: 'read' } : m)) }
              : c
          )
        )
      }, SEEN_DELAY_MS)
    }
  }

  const sendMessage = () => {
    const text = draft.trim()
    if (!text || !canSendText) return

    appendMessage({
      id: crypto.randomUUID(),
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
    })
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAttach = (type: AttachmentType) => {
    setShowAttachMenu(false)
    if (!canShare(type)) return
    const name = window.prompt(`Enter a file name for this ${type}:`)
    if (!name) return

    appendMessage({
      id: crypto.randomUUID(),
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      text: '',
      timestamp: new Date().toISOString(),
      attachment: { type, name },
      status: 'sent',
    })
  }

  const sharedMedia = activeConversation?.messages.filter(m => m.attachment).map(m => m.attachment!) ?? []

  return (
    <div className="chat-page">
      <StaffSidebar />

      <main className="chat-main">
        <div className="chat-shell">
          {/* LEFT PANEL */}
          <aside className="chat-list-panel">
            <div className="chat-search-box">
              <input
                type="text"
                placeholder="Search people to message..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {searchQuery.trim() ? (
              <div className="chat-search-results">
                <div className="chat-list-label">Search results</div>
                {searchResults.length === 0 && (
                  <div className="chat-empty-hint">No matching people found.</div>
                )}
                {searchResults.map(person => (
                  <button key={person.id} className="chat-list-item" onClick={() => openDM(person.id)}>
                    <div className="chat-avatar">{getInitials(person.name)}</div>
                    <div className="chat-list-item-info">
                      <span className="chat-list-item-name">{person.name}</span>
                      <span className="chat-list-item-sub">{person.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="chat-lists-scroll">
                <div className="chat-list-label">Direct messages</div>
                {dmConversations.length === 0 && (
                  <div className="chat-empty-hint">Search above to start a conversation.</div>
                )}
                {dmConversations.map(conv => {
                  const lastMessage = conv.messages[conv.messages.length - 1]
                  return (
                    <button
                      key={conv.id}
                      className={`chat-list-item ${activeConversationId === conv.id ? 'active' : ''}`}
                      onClick={() => openDM(conv.contact.id)}
                    >
                      <div className="chat-avatar">{getInitials(conv.contact.name)}</div>
                      <div className="chat-list-item-info">
                        <span className="chat-list-item-name">{conv.contact.name}</span>
                        <span className="chat-list-item-sub">
                          {lastMessage?.text || (lastMessage?.attachment && `Sent a ${lastMessage.attachment.type}`)}
                        </span>
                      </div>
                    </button>
                  )
                })}

                <div className="chat-list-label">Groups</div>
                {groupConversations.length === 0 && (
                  <div className="chat-empty-hint">You haven't been added to any groups yet.</div>
                )}
                {groupConversations.map(conv => {
                  const lastMessage = conv.messages[conv.messages.length - 1]
                  return (
                    <button
                      key={conv.id}
                      className={`chat-list-item ${activeConversationId === conv.id ? 'active' : ''}`}
                      onClick={() => openGroup(conv.id)}
                    >
                      <div className="chat-avatar chat-avatar-group">{conv.unitCode.slice(0, 2)}</div>
                      <div className="chat-list-item-info">
                        <span className="chat-list-item-name">{conv.name}</span>
                        <span className="chat-list-item-sub">
                          {lastMessage?.text || (lastMessage?.attachment && `Sent a ${lastMessage.attachment.type}`) || `${conv.members.length} members`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          {/* RIGHT PANEL */}
          <section className="chat-window">
            {!headerInfo && (
              <div className="chat-window-empty">
                <p>Select a conversation, or search for someone to message.</p>
              </div>
            )}

            {headerInfo && (
              <>
                <header className="chat-window-header">
                  <div className={`chat-avatar ${activeConversation?.type === 'group' ? 'chat-avatar-group' : ''}`}>
                    {activeConversation?.type === 'group'
                      ? activeConversation.unitCode.slice(0, 2)
                      : getInitials(headerInfo.title)}
                  </div>
                  <div className="chat-window-header-text">
                    <div className="chat-window-name">{headerInfo.title}</div>
                    <div className="chat-window-sub">{headerInfo.sub}</div>
                  </div>
                  {activeConversation?.type === 'group' && (
                    <button className="chat-info-btn" onClick={() => setShowGroupInfo(true)} title="Group info">i</button>
                  )}
                </header>

                <div className="chat-messages">
                  {(!activeConversation || activeConversation.messages.length === 0) && (
                    <div className="chat-empty-hint chat-first-message-hint">
                      This is the start of the conversation.
                    </div>
                  )}
                  {activeConversation?.messages.map(msg => (
                    <div key={msg.id} className={`chat-bubble-row ${msg.senderId === CURRENT_USER_ID ? 'mine' : 'theirs'}`}>
                      <div className="chat-bubble">
                        {activeConversation.type === 'group' && msg.senderId !== CURRENT_USER_ID && (
                          <span className="chat-bubble-sender">{msg.senderName}</span>
                        )}
                        {msg.attachment ? (
                          <span className="chat-attachment-tag">📎 {msg.attachment.name}</span>
                        ) : (
                          <span>{msg.text}</span>
                        )}
                        <span className="chat-bubble-meta">
                          <span className="chat-bubble-time">{formatTime(msg.timestamp)}</span>
                          {msg.senderId === CURRENT_USER_ID && <MessageTicks status={msg.status} />}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {!canSendText && (
                  <div className="chat-permission-notice">Only admins can send messages in this group.</div>
                )}

                <div className="chat-input-row">
                  <div className="chat-attach-wrapper">
                    <button className="chat-attach-btn" onClick={() => setShowAttachMenu(v => !v)} title="Attach">+</button>
                    {showAttachMenu && (
                      <div className="chat-attach-menu">
                        <button disabled={!canShare('photo')} onClick={() => handleAttach('photo')}>Photo</button>
                        <button disabled={!canShare('file')} onClick={() => handleAttach('file')}>File</button>
                        <button disabled={!canShare('document')} onClick={() => handleAttach('document')}>Document</button>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={1}
                    placeholder={canSendText ? 'Type a message...' : "You don't have permission to send messages"}
                    value={draft}
                    disabled={!canSendText}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="chat-send-btn" onClick={sendMessage} disabled={!draft.trim() || !canSendText}>Send</button>
                </div>
              </>
            )}
          </section>

          {/* GROUP INFO SIDE PANEL — read-only for tutors (no edit/admin controls) */}
          {showGroupInfo && activeConversation?.type === 'group' && (
            <>
              <div className="group-info-overlay" onClick={() => setShowGroupInfo(false)} />
              <aside className="group-info-panel">
                <div className="group-info-header">
                  <h2>Group info</h2>
                  <button className="group-info-close" onClick={() => setShowGroupInfo(false)}>×</button>
                </div>

                <div className="group-info-scroll">
                  <section className="group-info-section">
                    <div className="group-info-name">{activeConversation.name}</div>
                    <div className="group-info-unit">{activeConversation.unitCode}</div>
                  </section>

                  <section className="group-info-section">
                    <h3>Shared media</h3>
                    {sharedMedia.length === 0 && <div className="chat-empty-hint">Nothing shared yet.</div>}
                    {sharedMedia.map((a, i) => (
                      <div key={i} className="group-media-row">
                        <span className="group-media-type">{a.type}</span>
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </section>

                  <section className="group-info-section">
                    <h3>Permissions</h3>
                    <p className="chat-empty-hint">Only group admins can change these.</p>
                    <div className="group-permission-row"><span>Send text messages</span><span>{activeConversation.permissions.sendText ? 'Allowed' : 'Admins only'}</span></div>
                    <div className="group-permission-row"><span>Share photos</span><span>{activeConversation.permissions.sharePhoto ? 'Allowed' : 'Admins only'}</span></div>
                    <div className="group-permission-row"><span>Share files</span><span>{activeConversation.permissions.shareFile ? 'Allowed' : 'Admins only'}</span></div>
                    <div className="group-permission-row"><span>Share documents</span><span>{activeConversation.permissions.shareDocument ? 'Allowed' : 'Admins only'}</span></div>
                    <div className="group-permission-row"><span>Add members</span><span>{activeConversation.permissions.addMembers ? 'Allowed' : 'Admins only'}</span></div>
                  </section>

                  <section className="group-info-section">
                    <h3>Admins</h3>
                    {activeConversation.members.filter(m => m.isAdmin).map(m => (
                      <div key={m.contact.id} className="group-member-row">
                        <div className="chat-avatar chat-avatar-sm">{getInitials(m.contact.name)}</div>
                        <span>{m.contact.name}</span>
                      </div>
                    ))}
                  </section>

                  <section className="group-info-section">
                    <h3>Members ({activeConversation.members.length})</h3>
                    {activeConversation.members.map(m => (
                      <div key={m.contact.id} className="group-member-row">
                        <div className="chat-avatar chat-avatar-sm">{getInitials(m.contact.name)}</div>
                        <div className="chat-list-item-info">
                          <span className="chat-list-item-name">
                            {m.contact.name}{m.contact.id === CURRENT_USER_ID ? ' (you)' : ''}
                          </span>
                          <span className="chat-list-item-sub">{m.isAdmin ? 'Admin' : 'Member'}</span>
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              </aside>
            </>
          )}
        </div>
      </main>
    </div>
  )
}