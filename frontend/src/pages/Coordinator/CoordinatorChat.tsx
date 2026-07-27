import { useState, useMemo, useRef, useEffect } from 'react'
import CoordinatorSidebar from '../../components/CoordinatorSidebar'

type ChatContact = {
  id: string
  name: string
  email: string
  role: 'STAFF' | 'COORDINATOR'
}

type AttachmentType = 'photo' | 'file' | 'document'

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: string
  attachment?: { type: AttachmentType; name: string }
}

type DMConversation = {
  type: 'dm'
  id: string
  contact: ChatContact
  messages: ChatMessage[]
}

// Group-wide default permissions — what applies to a member UNLESS they
// have a specific override set (see MemberOverrides below).
type GroupPermissions = {
  sendText: boolean
  sharePhoto: boolean
  shareFile: boolean
  shareDocument: boolean
  addMembers: boolean
}

// What an admin (someone who isn't the group owner) is allowed to manage.
// The owner always has all of these implicitly — this only applies to
// members who've been promoted to admin.
type AdminPermissions = {
  manageMembers: boolean       // add / remove members
  editGroupInfo: boolean       // rename the group
  manageMemberPermissions: boolean // restrict/allow individual members
}

const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  manageMembers: true,
  editGroupInfo: true,
  manageMemberPermissions: true,
}

// Per-member override of the group-wide message/share permissions. Any
// key left undefined here means "use the group default" — only keys
// that are explicitly set (true or false) override it for this one
// person, without touching anyone else.
type MemberOverrides = Partial<Pick<GroupPermissions, 'sendText' | 'sharePhoto' | 'shareFile' | 'shareDocument'>>

type GroupMember = {
  contact: ChatContact
  isAdmin: boolean
  adminPermissions?: AdminPermissions // only meaningful if isAdmin is true
  overrides?: MemberOverrides
}

type GroupConversation = {
  type: 'group'
  id: string
  name: string
  unitCode: string
  creatorId: string
  members: GroupMember[]
  permissions: GroupPermissions
  messages: ChatMessage[]
}

type Conversation = DMConversation | GroupConversation

// --- MOCK DATA (stand-in until we wire this to a real backend) ---
const ALL_PEOPLE: ChatContact[] = [
  { id: 't1', name: 'Alex Thompson', email: 'alex.thompson@gmail.com', role: 'STAFF' },
  { id: 't2', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', role: 'STAFF' },
  { id: 't3', name: 'James Wilson', email: 'j.wilson@outlook.com', role: 'STAFF' },
  { id: 't4', name: 'Emily Chen', email: 'emily.chen@gmail.com', role: 'STAFF' },
  { id: 't5', name: 'Rohit Patel', email: 'rohit.patel@gmail.com', role: 'STAFF' },
]

const ALL_UNITS = [
  { code: 'CAB302', name: 'Software Development' },
  { code: 'IFN660', name: 'Advanced Topics in IT' },
  { code: 'CAB301', name: 'Algorithms and Complexity' },
]

const CURRENT_USER_ID = 'me'
const CURRENT_USER_NAME = 'You'
const CURRENT_USER_CONTACT: ChatContact = {
  id: CURRENT_USER_ID,
  name: CURRENT_USER_NAME,
  email: '',
  role: 'COORDINATOR',
}

const DEFAULT_PERMISSIONS: GroupPermissions = {
  sendText: true,
  sharePhoto: true,
  shareFile: true,
  shareDocument: true,
  addMembers: false,
}

const PERMISSION_LABELS: Record<keyof GroupPermissions, string> = {
  sendText: 'Send text messages',
  sharePhoto: 'Share photos',
  shareFile: 'Share files',
  shareDocument: 'Share documents',
  addMembers: 'Add members',
}

const ADMIN_PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  manageMembers: 'Add / remove members',
  editGroupInfo: 'Edit group name',
  manageMemberPermissions: 'Manage individual member permissions',
}

// The four message/share permissions that can be overridden per-member.
// addMembers is deliberately excluded — that one only makes sense as a
// group-wide or admin-level setting.
const OVERRIDABLE_KEYS: (keyof MemberOverrides)[] = ['sendText', 'sharePhoto', 'shareFile', 'shareDocument']

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase()
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function CoordinatorChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeContactId, setActiveContactId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [draft, setDraft] = useState('')

  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null)
  const [openMemberPermId, setOpenMemberPermId] = useState<string | null>(null)
  const [openAdminPermId, setOpenAdminPermId] = useState<string | null>(null)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Create-group form state ──────────────────────────────
  const [groupName, setGroupName] = useState('')
  const [groupUnitCode, setGroupUnitCode] = useState(ALL_UNITS[0].code)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

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

  // The group owner is whoever created it — always fully trusted, never
  // shown in the "manage this admin's permissions" list, and the only
  // one who can grant/revoke what OTHER admins are allowed to do.
  const isOwner = activeConversation?.type === 'group' && activeConversation.creatorId === CURRENT_USER_ID

  // Am I an admin of the currently open group? (creator counts as admin)
  const isCurrentUserAdmin =
    activeConversation?.type === 'group' &&
    activeConversation.members.some(m => m.contact.id === CURRENT_USER_ID && m.isAdmin)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages.length])

  useEffect(() => {
    // Reset side-panel state whenever you switch conversations
    setShowGroupInfo(false)
    setShowAddMembers(false)
    setEditingName(false)
    setOpenMemberMenuId(null)
    setOpenMemberPermId(null)
    setOpenAdminPermId(null)
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
    if (activeConversation) {
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
      setConversations(prev => [newDM, ...prev])
      setActiveConversationId(newDM.id)
    }
  }

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return

    appendMessage({
      id: crypto.randomUUID(),
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      text,
      timestamp: new Date().toISOString(),
    })
    setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Mock "attach" — real file upload would replace this prompt() with an
  // actual <input type="file"> + upload call to your backend.
  const handleAttach = (type: AttachmentType) => {
    setShowAttachMenu(false)
    const name = window.prompt(`Enter a file name for this ${type}:`)
    if (!name) return

    appendMessage({
      id: crypto.randomUUID(),
      senderId: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      text: '',
      timestamp: new Date().toISOString(),
      attachment: { type, name },
    })
  }

  // ── Create group modal logic ─────────────────────────────
  const toggleMember = (id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetGroupForm = () => {
    setGroupName('')
    setGroupUnitCode(ALL_UNITS[0].code)
    setSelectedMemberIds(new Set())
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || selectedMemberIds.size === 0) return

    const chosenMembers: GroupMember[] = ALL_PEOPLE
      .filter(p => selectedMemberIds.has(p.id))
      .map(contact => ({ contact, isAdmin: false }))

    const newGroup: GroupConversation = {
      type: 'group',
      id: crypto.randomUUID(),
      name: groupName.trim(),
      unitCode: groupUnitCode,
      creatorId: CURRENT_USER_ID,
      members: [{ contact: CURRENT_USER_CONTACT, isAdmin: true }, ...chosenMembers],
      permissions: { ...DEFAULT_PERMISSIONS },
      messages: [],
    }

    setConversations(prev => [newGroup, ...prev])
    setShowGroupModal(false)
    resetGroupForm()
    openGroup(newGroup.id)
  }

  // ── Group info panel actions ──────────────────────────────
  const updateActiveGroup = (updater: (g: GroupConversation) => GroupConversation) => {
    setConversations(prev =>
      prev.map(c => (c.id === activeConversationId && c.type === 'group' ? updater(c) : c))
    )
  }

  const saveGroupName = () => {
    if (!nameDraft.trim()) return
    updateActiveGroup(g => ({ ...g, name: nameDraft.trim() }))
    setEditingName(false)
  }

  const togglePermission = (key: keyof GroupPermissions) => {
    updateActiveGroup(g => ({ ...g, permissions: { ...g.permissions, [key]: !g.permissions[key] } }))
  }

  const toggleAdmin = (memberId: string) => {
    updateActiveGroup(g => ({
      ...g,
      members: g.members.map(m =>
        m.contact.id === memberId
          ? {
              ...m,
              isAdmin: !m.isAdmin,
              // give a freshly-promoted admin the full default set of
              // admin permissions — the owner can then dial these back
              adminPermissions: !m.isAdmin ? { ...DEFAULT_ADMIN_PERMISSIONS } : m.adminPermissions,
            }
          : m
      ),
    }))
    setOpenMemberMenuId(null)
  }

  // Owner-only: grant/revoke a specific capability for a specific admin,
  // without touching any other admin's permissions.
  const updateAdminPermission = (adminId: string, key: keyof AdminPermissions) => {
    updateActiveGroup(g => ({
      ...g,
      members: g.members.map(m =>
        m.contact.id === adminId && m.isAdmin
          ? {
              ...m,
              adminPermissions: {
                ...(m.adminPermissions ?? DEFAULT_ADMIN_PERMISSIONS),
                [key]: !(m.adminPermissions ?? DEFAULT_ADMIN_PERMISSIONS)[key],
              },
            }
          : m
      ),
    }))
  }

  // Admin action: override one message/share permission for ONE member,
  // independent of the group-wide default and every other member.
  const setMemberOverride = (memberId: string, key: keyof MemberOverrides, value: boolean) => {
    updateActiveGroup(g => ({
      ...g,
      members: g.members.map(m =>
        m.contact.id === memberId
          ? { ...m, overrides: { ...m.overrides, [key]: value } }
          : m
      ),
    }))
  }

  // Clears one specific override, falling back to the group default again.
  const clearMemberOverride = (memberId: string, key: keyof MemberOverrides) => {
    updateActiveGroup(g => ({
      ...g,
      members: g.members.map(m => {
        if (m.contact.id !== memberId || !m.overrides) return m
        const nextOverrides = { ...m.overrides }
        delete nextOverrides[key]
        return { ...m, overrides: nextOverrides }
      }),
    }))
  }

  const removeMember = (memberId: string) => {
    updateActiveGroup(g => ({ ...g, members: g.members.filter(m => m.contact.id !== memberId) }))
    setOpenMemberMenuId(null)
  }

  const addMemberToGroup = (contact: ChatContact) => {
    updateActiveGroup(g => ({ ...g, members: [...g.members, { contact, isAdmin: false }] }))
  }

  const handleExitGroup = () => {
    if (!activeConversation) return
    const ok = window.confirm(`Exit "${activeConversation.type === 'group' ? activeConversation.name : ''}"? You'll stop seeing this conversation.`)
    if (!ok) return
    setConversations(prev => prev.filter(c => c.id !== activeConversation.id))
    setActiveConversationId(null)
    setShowGroupInfo(false)
  }

  const groupNonMembers =
    activeConversation?.type === 'group'
      ? ALL_PEOPLE.filter(p => !activeConversation.members.some(m => m.contact.id === p.id))
      : []

  const sharedMedia =
    activeConversation?.messages
      .filter(m => m.attachment)
      .map(m => m.attachment!) ?? []

  // admins other than the owner — these are the ones the owner can
  // actually manage permissions for
  const manageableAdmins =
    activeConversation?.type === 'group'
      ? activeConversation.members.filter(m => m.isAdmin && m.contact.id !== activeConversation.creatorId)
      : []

  return (
    <div className="chat-page">
      <CoordinatorSidebar />

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
                        <span className="chat-list-item-sub">{lastMessage?.text || (lastMessage?.attachment && `Sent a ${lastMessage.attachment.type}`)}</span>
                      </div>
                    </button>
                  )
                })}

                <div className="chat-section-header">
                  <span className="chat-list-label">Groups</span>
                  <button className="chat-add-group-btn" onClick={() => setShowGroupModal(true)} title="Create group">+</button>
                </div>
                {groupConversations.length === 0 && (
                  <div className="chat-empty-hint">No groups yet. Click + to create one.</div>
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
                    <button
                      className="chat-info-btn"
                      onClick={() => setShowGroupInfo(true)}
                      title="Group info"
                    >
                      i
                    </button>
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
                        <span className="chat-bubble-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-row">
                  <div className="chat-attach-wrapper">
                    <button className="chat-attach-btn" onClick={() => setShowAttachMenu(v => !v)} title="Attach">+</button>
                    {showAttachMenu && (
                      <div className="chat-attach-menu">
                        <button onClick={() => handleAttach('photo')}>Photo</button>
                        <button onClick={() => handleAttach('file')}>File</button>
                        <button onClick={() => handleAttach('document')}>Document</button>
                      </div>
                    )}
                  </div>
                  <textarea
                    rows={1}
                    placeholder="Type a message..."
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="chat-send-btn" onClick={sendMessage} disabled={!draft.trim()}>Send</button>
                </div>
              </>
            )}
          </section>

          {/* GROUP INFO SIDE PANEL */}
          {showGroupInfo && activeConversation?.type === 'group' && (
            <>
              <div className="group-info-overlay" onClick={() => setShowGroupInfo(false)} />
              <aside className="group-info-panel">
                <div className="group-info-header">
                  <h2>Group info</h2>
                  <button className="group-info-close" onClick={() => setShowGroupInfo(false)}>×</button>
                </div>

                <div className="group-info-scroll">
                  {/* Name */}
                  <section className="group-info-section">
                    {editingName ? (
                      <div className="group-name-edit-row">
                        <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} />
                        <button className="chat-confirm-btn" onClick={saveGroupName}>Save</button>
                        <button className="chat-cancel-btn" onClick={() => setEditingName(false)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="group-name-row">
                        <div>
                          <div className="group-info-name">{activeConversation.name}</div>
                          <div className="group-info-unit">{activeConversation.unitCode}</div>
                        </div>
                        {activeConversation.creatorId === CURRENT_USER_ID && (
                          <button
                            className="chat-cancel-btn"
                            onClick={() => { setEditingName(true); setNameDraft(activeConversation.name) }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Shared media */}
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

                  {/* Group-wide default permissions */}
                  <section className="group-info-section">
                    <h3>Group Default Permissions</h3>
                    <p className="chat-empty-hint perm-section-hint">
                      These apply to every member unless overridden individually below.
                    </p>
                    {(Object.keys(activeConversation.permissions) as (keyof GroupPermissions)[]).map(key => (
                      <label key={key} className="group-permission-row">
                        <span>{PERMISSION_LABELS[key]}</span>
                        <input
                          type="checkbox"
                          checked={activeConversation.permissions[key]}
                          disabled={!isCurrentUserAdmin}
                          onChange={() => togglePermission(key)}
                        />
                      </label>
                    ))}
                  </section>

                  {/* Admins */}
                  <section className="group-info-section">
                    <h3>Admins</h3>
                    {activeConversation.members.filter(m => m.isAdmin).map(m => (
                      <div key={m.contact.id} className="group-member-row">
                        <div className="chat-avatar chat-avatar-sm">{getInitials(m.contact.name)}</div>
                        <span>
                          {m.contact.name}
                          {m.contact.id === CURRENT_USER_ID ? ' (you)' : ''}
                          {m.contact.id === activeConversation.creatorId ? ' — Owner' : ''}
                        </span>
                      </div>
                    ))}
                  </section>

                  {/* Owner-only: manage what each (non-owner) admin can do */}
                  {isOwner && (
                    <section className="group-info-section">
                      <h3>Admin Permissions</h3>
                      {manageableAdmins.length === 0 && (
                        <div className="chat-empty-hint">
                          No other admins yet. Promote a member to admin first.
                        </div>
                      )}
                      {manageableAdmins.map(admin => {
                        const perms = admin.adminPermissions ?? DEFAULT_ADMIN_PERMISSIONS
                        const expanded = openAdminPermId === admin.contact.id
                        return (
                          <div key={admin.contact.id} className="admin-perm-block">
                            <button
                              type="button"
                              className="admin-perm-toggle"
                              onClick={() => setOpenAdminPermId(expanded ? null : admin.contact.id)}
                            >
                              <span className="admin-perm-name">
                                <span className="chat-avatar chat-avatar-sm">{getInitials(admin.contact.name)}</span>
                                {admin.contact.name}
                              </span>
                              <span className="admin-perm-chevron">{expanded ? '▲' : '▼'}</span>
                            </button>
                            {expanded && (
                              <div className="admin-perm-panel">
                                {(Object.keys(ADMIN_PERMISSION_LABELS) as (keyof AdminPermissions)[]).map(key => (
                                  <label key={key} className="group-permission-row">
                                    <span>{ADMIN_PERMISSION_LABELS[key]}</span>
                                    <input
                                      type="checkbox"
                                      checked={perms[key]}
                                      onChange={() => updateAdminPermission(admin.contact.id, key)}
                                    />
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </section>
                  )}

                  {/* Members */}
                  <section className="group-info-section">
                    <h3>Members ({activeConversation.members.length})</h3>
                    {activeConversation.members.map(m => {
                      const isSelf = m.contact.id === CURRENT_USER_ID
                      const isOwnerRow = m.contact.id === activeConversation.creatorId
                      const overrideCount = m.overrides ? Object.keys(m.overrides).length : 0
                      const permExpanded = openMemberPermId === m.contact.id

                      return (
                        <div key={m.contact.id} className="group-member-row-wrapper">
                          <button
                            className="group-member-row group-member-row-clickable"
                            onClick={() => setOpenMemberMenuId(v => (v === m.contact.id ? null : m.contact.id))}
                          >
                            <div className="chat-avatar chat-avatar-sm">{getInitials(m.contact.name)}</div>
                            <div className="chat-list-item-info">
                              <span className="chat-list-item-name">
                                {m.contact.name}{isSelf ? ' (you)' : ''}
                              </span>
                              <span className="chat-list-item-sub">
                                {m.isAdmin ? (isOwnerRow ? 'Owner' : 'Admin') : 'Member'}
                                {overrideCount > 0 && ` · ${overrideCount} custom permission${overrideCount !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </button>

                          {openMemberMenuId === m.contact.id && isCurrentUserAdmin && !isSelf && (
                            <div className="group-member-menu">
                              {!isOwnerRow && (
                                <button onClick={() => toggleAdmin(m.contact.id)}>
                                  {m.isAdmin ? 'Remove as admin' : 'Make admin'}
                                </button>
                              )}
                              {!m.isAdmin && (
                                <button
                                  onClick={() => {
                                    setOpenMemberPermId(m.contact.id)
                                    setOpenMemberMenuId(null)
                                  }}
                                >
                                  Manage permissions
                                </button>
                              )}
                              {!isOwnerRow && (
                                <button className="group-member-menu-danger" onClick={() => removeMember(m.contact.id)}>
                                  Remove from group
                                </button>
                              )}
                            </div>
                          )}

                          {/* Per-member permission overrides — only for
                              non-admin members, restricting/allowing them
                              individually without touching anyone else. */}
                          {permExpanded && !m.isAdmin && (
                            <div className="member-perm-panel">
                              <div className="member-perm-header">
                                <span>Permissions for {m.contact.name}</span>
                                <button className="group-info-close member-perm-close" onClick={() => setOpenMemberPermId(null)}>×</button>
                              </div>
                              {OVERRIDABLE_KEYS.map(key => {
                                const hasOverride = m.overrides?.[key] !== undefined
                                const effectiveValue = hasOverride
                                  ? (m.overrides![key] as boolean)
                                  : activeConversation.permissions[key]
                                return (
                                  <div key={key} className="member-perm-row">
                                    <label className="group-permission-row member-perm-checkbox-row">
                                      <span>{PERMISSION_LABELS[key]}</span>
                                      <input
                                        type="checkbox"
                                        checked={effectiveValue}
                                        onChange={e => setMemberOverride(m.contact.id, key, e.target.checked)}
                                      />
                                    </label>
                                    {hasOverride ? (
                                      <button
                                        className="member-perm-reset"
                                        onClick={() => clearMemberOverride(m.contact.id, key)}
                                      >
                                        Custom — reset to group default
                                      </button>
                                    ) : (
                                      <span className="member-perm-default-hint">Using group default</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </section>

                  {/* Add members */}
                  <section className="group-info-section">
                    <button className="chat-add-group-btn chat-add-group-btn-wide" onClick={() => setShowAddMembers(v => !v)}>
                      + Add members
                    </button>
                    {showAddMembers && (
                      <div className="group-add-list">
                        {groupNonMembers.length === 0 && (
                          <div className="chat-empty-hint">Everyone is already in this group.</div>
                        )}
                        {groupNonMembers.map(p => (
                          <div key={p.id} className="group-member-row">
                            <div className="chat-avatar chat-avatar-sm">{getInitials(p.name)}</div>
                            <span className="group-add-name">{p.name}</span>
                            <button className="chat-confirm-btn" onClick={() => addMemberToGroup(p)}>Add</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Exit group */}
                  <section className="group-info-section">
                    <button className="group-exit-btn" onClick={handleExitGroup}>Exit group</button>
                  </section>
                </div>
              </aside>
            </>
          )}
        </div>
      </main>

      {/* CREATE GROUP MODAL */}
      {showGroupModal && (
        <div className="chat-modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <h2>Create group</h2>
            <p className="chat-modal-sub">Start a group chat for a unit or department.</p>

            <form onSubmit={handleCreateGroup} className="chat-modal-form">
              <div className="chat-form-field">
                <label>Group name</label>
                <input type="text" placeholder="e.g. CAB302 Tutors" value={groupName} onChange={e => setGroupName(e.target.value)} required />
              </div>

              <div className="chat-form-field">
                <label>Unit / Department</label>
                <select value={groupUnitCode} onChange={e => setGroupUnitCode(e.target.value)}>
                  {ALL_UNITS.map(u => (
                    <option key={u.code} value={u.code}>{u.code} — {u.name}</option>
                  ))}
                </select>
              </div>

              <div className="chat-form-field">
                <label>Add people ({selectedMemberIds.size} selected)</label>
                <div className="chat-member-checklist">
                  {ALL_PEOPLE.map(person => {
                    const checked = selectedMemberIds.has(person.id)
                    return (
                      <label key={person.id} className={`chat-member-row ${checked ? 'checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleMember(person.id)} />
                        <div className="chat-avatar chat-avatar-sm">{getInitials(person.name)}</div>
                        <div className="chat-list-item-info">
                          <span className="chat-list-item-name">{person.name}</span>
                          <span className="chat-list-item-sub">{person.email}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="chat-modal-actions">
                <button type="button" className="chat-cancel-btn" onClick={() => { setShowGroupModal(false); resetGroupForm() }}>Cancel</button>
                <button type="submit" className="chat-confirm-btn" disabled={!groupName.trim() || selectedMemberIds.size === 0}>Create group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
