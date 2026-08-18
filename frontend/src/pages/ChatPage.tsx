import React, { FormEvent, useRef, useState } from "react";
import {
  Download,
  File,
  FileText,
  Image,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Palette,
  Reply,
  Search,
  Send,
  Smile,
  Split,
  UserRound,
  X,
} from "lucide-react";
import type {
  ChatAttachment,
  ChatMessage,
  Conversation,
  Group,
  Member,
} from "../types";
import { Avatar } from "../components/Avatar";

export function ChatPage({
  activeGroup,
  members: chatMembers,
  conversations,
  activeConversation,
  onSelectConversation,
  chat,
  onSend,
  onUpload,
  onTyping,
  typingNames,
  onReact,
  onMarkRead,
  onOpenProfile,
  onOpenDirect,
  chatTheme,
  onThemeChange,
}: {
  activeGroup: Group;
  members: Member[];
  conversations: Conversation[];
  activeConversation: Conversation;
  onSelectConversation: (conversation: Conversation) => void;
  chat: ChatMessage[];
  onSend: (
    message: string,
    attachments?: ChatAttachment[],
    replyTo?: string,
  ) => Promise<void>;
  onUpload: (file: File) => Promise<ChatAttachment>;
  onTyping: (isTyping: boolean) => void;
  typingNames: string[];
  onReact: (id: string, emoji: string) => Promise<void>;
  onMarkRead: () => Promise<void>;
  onOpenProfile: (id: string) => void;
  onOpenDirect: (member: Member) => void;
  chatTheme: string;
  onThemeChange: (theme: string) => Promise<void>;
}) {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const [inboxMenu, setInboxMenu] = useState(false);
  const [toolbarMenu, setToolbarMenu] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(true);
  const [gallery, setGallery] = useState<"media" | "files" | null>(null);
  const directMember = chatMembers.find(
    (member) => member.id === activeConversation.memberId,
  );
  const query = search.trim().toLowerCase();
  const filteredConversations = conversations.filter(
    (item) =>
      !query ||
      `${item.title} ${item.lastMessage}`.toLowerCase().includes(query),
  );
  const filteredPeople = chatMembers.filter(
    (member) =>
      member.id !== directMember?.id &&
      (!query ||
        `${member.name} ${member.profile.status}`
          .toLowerCase()
          .includes(query)),
  );
  const media = chat.flatMap((message) =>
    (message.attachments ?? []).filter(
      (attachment) => attachment.kind !== "file",
    ),
  );
  const files = chat.flatMap((message) =>
    (message.attachments ?? []).filter(
      (attachment) => attachment.kind === "file",
    ),
  );
  const links = chat.flatMap(
    (message) => message.message.match(/https?:\/\/[^\s]+/g) ?? [],
  );
  const nextTheme = () =>
    chatTheme === "default"
      ? "midnight"
      : chatTheme === "midnight"
        ? "soft"
        : "default";
  const showGallery = (kind: "media" | "files") => {
    setGallery(kind);
    setDetailsVisible(true);
    setToolbarMenu(false);
  };
  return (
    <>
      <div className="page-header chat-page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> REAL-TIME MESSAGING
          </div>
          <h1>
            {activeConversation.kind === "group"
              ? "Talk it out"
              : `DM with ${activeConversation.title}`}{" "}
            <span>⌁</span>
          </h1>
          <p>
            Messages, replies, reactions, and durable shared files in one
            thread.
          </p>
        </div>
        <div className="online-label">
          {activeConversation.kind === "group"
            ? `${chatMembers.length || activeGroup.members} members`
            : activeConversation.subtitle}
        </div>
      </div>
      <div
        className={`messenger-shell chat-theme-${chatTheme} ${detailsVisible ? "" : "details-hidden"}`}
      >
        <aside className="conversation-rail">
          <div className="conversation-heading">
            <div>
              <span className="muted-label">MESSAGES</span>
              <h2>Inbox</h2>
            </div>
            <div className="menu-wrap">
              <button
                className="icon-button"
                onClick={() => setInboxMenu((open) => !open)}
                aria-label="Inbox actions"
              >
                <MoreHorizontal size={17} />
              </button>
              {inboxMenu && (
                <div className="chat-menu">
                  <button
                    onClick={() => {
                      setSearch("");
                      setInboxMenu(false);
                    }}
                  >
                    Show all conversations
                  </button>
                  <button
                    onClick={() => {
                      void onMarkRead();
                      setInboxMenu(false);
                    }}
                  >
                    Mark current thread read
                  </button>
                </div>
              )}
            </div>
          </div>
          <label className="conversation-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats and people"
            />
          </label>
          {filteredConversations.map((item) => (
            <button
              key={item.id}
              className={`conversation-item ${activeConversation.id === item.id || (item.kind === "group" && activeConversation.kind === "group") ? "active" : ""}`}
              onClick={() => onSelectConversation(item)}
            >
              {item.kind === "group" ? (
                <span className="conversation-avatar group-avatar">
                  <Split size={16} />
                </span>
              ) : (
                <Avatar
                  member={
                    chatMembers.find(
                      (member) => member.id === item.memberId,
                    ) ?? {
                      initials: item.title.slice(0, 2).toUpperCase(),
                      color: item.accent,
                    }
                  }
                  size="md"
                />
              )}
              <span>
                <strong>
                  {item.kind === "group" ? activeGroup.name : item.title}
                </strong>
                <small>{item.lastMessage}</small>
              </span>
              {item.unread > 0 && <b>{item.unread}</b>}
            </button>
          ))}
          <div className="conversation-people">
            <span className="muted-label">GROUP PEOPLE</span>
            {filteredPeople.map((member) => (
              <div className="people-row" key={member.id}>
                <button onClick={() => onOpenProfile(member.id)}>
                  <Avatar member={member} size="sm" />
                  <span>{member.name}</span>
                </button>
                <button
                  className="people-message"
                  onClick={() => onOpenDirect(member)}
                  aria-label={`Message ${member.name}`}
                >
                  <MessageCircle size={13} />
                </button>
              </div>
            ))}
          </div>
        </aside>
        <section className="messenger-main">
          <div className="messenger-toolbar">
            <button
              className="messenger-title"
              onClick={() =>
                activeConversation.kind === "direct"
                  ? onOpenProfile(activeConversation.memberId ?? "")
                  : setDetailsVisible((visible) => !visible)
              }
            >
              <span className="toolbar-avatar">
                {activeConversation.kind === "group" ? (
                  <Split size={15} />
                ) : (
                  <Avatar
                    member={
                      directMember ?? {
                        initials: activeConversation.title.slice(0, 2),
                        color: activeConversation.accent,
                      }
                    }
                    size="sm"
                  />
                )}
              </span>
              <span>
                <strong>{activeConversation.title}</strong>
                <small>
                  {activeConversation.kind === "group"
                    ? `${chatMembers.length} members`
                    : activeConversation.subtitle}
                </small>
              </span>
            </button>
            <div className="messenger-actions">
              <button
                className="icon-button"
                onClick={() => void onThemeChange(nextTheme())}
                title="Change chat theme"
              >
                <Palette size={16} />
              </button>
              <button
                className="icon-button"
                onClick={() =>
                  activeConversation.kind === "direct"
                    ? onOpenProfile(activeConversation.memberId ?? "")
                    : setDetailsVisible((visible) => !visible)
                }
                title={
                  activeConversation.kind === "direct"
                    ? "View profile"
                    : "Toggle group details"
                }
              >
                <UserRound size={16} />
              </button>
              <div className="menu-wrap">
                <button
                  className="icon-button"
                  onClick={() => setToolbarMenu((open) => !open)}
                  aria-label="Conversation actions"
                >
                  <MoreHorizontal size={16} />
                </button>
                {toolbarMenu && (
                  <div className="chat-menu toolbar-menu">
                    <button
                      onClick={() => {
                        setDetailsVisible(true);
                        setGallery(null);
                        setToolbarMenu(false);
                      }}
                    >
                      Conversation details
                    </button>
                    <button
                      onClick={() => {
                        void onMarkRead();
                        setToolbarMenu(false);
                      }}
                    >
                      Mark as read
                    </button>
                    <button onClick={() => showGallery("media")}>
                      Shared media
                    </button>
                    <button onClick={() => showGallery("files")}>
                      Files and links
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="chat-messages messenger-messages">
            {chat.length ? (
              chat.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  members={chatMembers}
                  onReact={onReact}
                  onReply={() => setReplyTarget(message)}
                  onOpenProfile={onOpenProfile}
                  onSelect={() =>
                    setSelectedMessage(
                      selectedMessage === message.id ? null : message.id,
                    )
                  }
                  selected={selectedMessage === message.id}
                />
              ))
            ) : (
              <div className="chat-empty">
                No messages yet. Start the conversation.
              </div>
            )}
            {typingNames.length > 0 && (
              <div className="typing-indicator">
                <span />
                <span />
                <span /> {typingNames.join(", ")}{" "}
                {typingNames.length === 1 ? "is" : "are"} typing…
              </div>
            )}
          </div>
          <ChatComposer
            onSend={onSend}
            onUpload={onUpload}
            onTyping={onTyping}
            replyTarget={replyTarget}
            onClearReply={() => setReplyTarget(null)}
          />
        </section>
        {detailsVisible && (
          <aside className="chat-info-panel">
            <div className="chat-info-header">
              <span className="muted-label">CHAT DETAILS</span>
              <button
                className="icon-button"
                onClick={() => setDetailsVisible(false)}
                aria-label="Close chat details"
              >
                <X size={15} />
              </button>
            </div>
            <div className="chat-cover">
              <div className="chat-cover-mark">
                <MessageCircle size={23} />
              </div>
              <strong>
                {activeConversation.kind === "group"
                  ? activeGroup.name
                  : activeConversation.title}
              </strong>
              <span>
                {activeConversation.kind === "group"
                  ? `${chatMembers.length || activeGroup.members} members`
                  : "Private conversation"}
              </span>
            </div>
            <button
              className={`detail-row ${gallery === "media" ? "active" : ""}`}
              onClick={() => setGallery(gallery === "media" ? null : "media")}
            >
              <Image size={15} />
              <span>Shared media</span>
              <b>{media.length}</b>
            </button>
            <button
              className={`detail-row ${gallery === "files" ? "active" : ""}`}
              onClick={() => setGallery(gallery === "files" ? null : "files")}
            >
              <File size={15} />
              <span>Files and links</span>
              <b>{files.length + links.length}</b>
            </button>
            <button
              className="detail-row"
              onClick={() => void onThemeChange(nextTheme())}
            >
              <Palette size={15} />
              <span>Theme</span>
              <b>{chatTheme === "default" ? "Lime" : chatTheme}</b>
            </button>
            {gallery === "media" && (
              <div className="detail-gallery">
                {media.length ? (
                  media.map((attachment) => (
                    <AttachmentPreview
                      key={attachment.id}
                      attachment={attachment}
                      compact
                    />
                  ))
                ) : (
                  <small>No shared media in this thread.</small>
                )}
              </div>
            )}
            {gallery === "files" && (
              <div className="detail-gallery">
                {files.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    compact
                  />
                ))}
                {links.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer">
                    <FileText size={13} />
                    {link}
                  </a>
                ))}
                {files.length + links.length === 0 && (
                  <small>No files or links in this thread.</small>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

export function MessageBubble({
  message,
  members: chatMembers,
  onReact,
  onReply,
  onOpenProfile,
  onSelect,
  selected,
}: {
  message: ChatMessage;
  members: Member[];
  onReact: (id: string, emoji: string) => Promise<void>;
  onReply: () => void;
  onOpenProfile: (id: string) => void;
  onSelect: () => void;
  selected: boolean;
}) {
  const member = chatMembers.find((item) => item.id === message.senderId);
  return (
    <div
      className={`chat-message messenger-message ${message.mine ? "mine" : ""}`}
      onClick={onSelect}
    >
      <button
        onClick={(event) => {
          event.stopPropagation();
          onOpenProfile(message.senderId);
        }}
        aria-label={`Open ${message.member}'s profile`}
      >
        <Avatar
          member={
            member ?? { initials: message.initials, color: message.color }
          }
          size="sm"
        />
      </button>
      <div className="message-column">
        <span className="message-meta">
          <strong>{message.member}</strong>
          <small>{message.time}</small>
        </span>
        {message.replyTo && (
          <div className="reply-preview">
            <Reply size={12} />
            <span>
              <b>{message.replyPreview?.authorName ?? "Earlier message"}</b>
              {message.replyPreview?.body || "Referenced message"}
            </span>
          </div>
        )}
        {message.message && <p>{message.message}</p>}
        {message.attachments?.map((attachment) => (
          <AttachmentPreview key={attachment.id} attachment={attachment} />
        ))}
        <div className="reaction-row">
          {(message.reactions ?? []).map((reaction) => (
            <button
              className={reaction.reacted ? "reacted" : ""}
              key={reaction.emoji}
              onClick={(event) => {
                event.stopPropagation();
                void onReact(message.id, reaction.emoji);
              }}
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
          <button
            onClick={(event) => {
              event.stopPropagation();
              void onReact(message.id, "👍");
            }}
            aria-label="Toggle thumbs up reaction"
          >
            ＋
          </button>
        </div>
        {selected && (
          <div className="message-actions">
            <button
              onClick={(event) => {
                event.stopPropagation();
                void onReact(message.id, "❤️");
              }}
            >
              ❤️
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                void onReact(message.id, "😂");
              }}
            >
              😂
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onReply();
              }}
            >
              Reply
            </button>
          </div>
        )}
        {message.mine && (
          <small className="read-receipt">
            {message.read ? "Seen" : "Delivered"}
          </small>
        )}
      </div>
    </div>
  );
}
export function AttachmentPreview({
  attachment,
  compact = false,
}: {
  attachment: ChatAttachment;
  compact?: boolean;
}) {
  const size =
    typeof attachment.size === "number"
      ? `${Math.max(attachment.size / 1024, 1).toFixed(0)} KB`
      : attachment.size;
  return (
    <div
      className={`attachment-preview attachment-${attachment.kind} ${compact ? "compact" : ""}`}
    >
      {attachment.kind === "image" && (
        <a href={attachment.url} target="_blank" rel="noreferrer">
          <img src={attachment.url} alt={attachment.name} />
        </a>
      )}
      {attachment.kind === "video" && (
        <video controls preload="metadata" src={attachment.url}>
          Your browser cannot play this video.
        </video>
      )}
      {attachment.kind === "gif" && (
        <a href={attachment.url} target="_blank" rel="noreferrer">
          <img src={attachment.url} alt={attachment.name} />
        </a>
      )}
      {attachment.kind === "file" && (
        <a
          className="file-thumb"
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          download
        >
          <File size={20} />
          <span>
            {attachment.name}
            <small>{size}</small>
          </span>
          <Download size={15} />
        </a>
      )}
      <a
        className="attachment-name"
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
      >
        {attachment.name}
      </a>
    </div>
  );
}
export function ChatComposer({
  onSend,
  onUpload,
  onTyping,
  replyTarget,
  onClearReply,
}: {
  onSend: (
    message: string,
    attachments?: ChatAttachment[],
    replyTo?: string,
  ) => Promise<void>;
  onUpload: (file: File) => Promise<ChatAttachment>;
  onTyping: (isTyping: boolean) => void;
  replyTarget?: ChatMessage | null;
  onClearReply?: () => void;
}) {
  const [value, setValue] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const finish = () => {
    setValue("");
    setError("");
    setShowEmoji(false);
    onClearReply?.();
    onTyping(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || (!value.trim() && !replyTarget)) return;
    setBusy(true);
    setError("");
    try {
      await onSend(value, [], replyTarget?.id);
      finish();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Message could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  };
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const attachment = await onUpload(file);
      await onSend(value, [attachment], replyTarget?.id);
      finish();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "File could not be shared.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };
  const updateValue = (next: string) => {
    setValue(next);
    onTyping(Boolean(next));
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping(false), 1200);
  };
  const addEmoji = (emoji: string) => updateValue(value + emoji);
  const sendGif = async () => {
    if (busy) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140"><rect width="100%" height="100%" rx="18" fill="#182b38"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="58">🎉</text></svg>`;
    const attachment: ChatAttachment = {
      id: crypto.randomUUID(),
      kind: "gif",
      name: "celebration.svg",
      url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      size: svg.length,
    };
    setBusy(true);
    setError("");
    try {
      await onSend(value, [attachment], replyTarget?.id);
      finish();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "GIF could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="chat-composer messenger-composer" onSubmit={submit}>
      {replyTarget && (
        <div className="composer-reply">
          <Reply size={13} /> Replying to {replyTarget.member}
          <button type="button" onClick={onClearReply} disabled={busy}>
            <X size={13} />
          </button>
        </div>
      )}
      {error && <div className="composer-error">{error}</div>}
      <div className="composer-row">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip"
          hidden
          onChange={onFile}
        />
        <input
          ref={mediaRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          hidden
          onChange={onFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach document or archive"
          disabled={busy}
        >
          <Paperclip size={17} />
        </button>
        <button
          type="button"
          onClick={() => mediaRef.current?.click()}
          title="Share photo or video"
          disabled={busy}
        >
          <Image size={17} />
        </button>
        <input
          value={value}
          onChange={(event) => updateValue(event.target.value)}
          placeholder="Write a message…"
          disabled={busy}
        />
        <button
          type="button"
          className={showEmoji ? "active" : ""}
          onClick={() => setShowEmoji((current) => !current)}
          title="Emoji picker"
          disabled={busy}
        >
          <Smile size={18} />
        </button>
        <button
          type="button"
          onClick={() => void sendGif()}
          title="Send celebration GIF"
          disabled={busy}
        >
          <span className="gif-button">GIF</span>
        </button>
        <button
          type="submit"
          className="send-button"
          disabled={busy || !value.trim()}
          aria-label="Send message"
        >
          {busy ? <span className="sending-dot" /> : <Send size={16} />}
        </button>
      </div>
      {showEmoji && (
        <div className="emoji-picker">
          {[
            "👍",
            "❤️",
            "😂",
            "🔥",
            "🥳",
            "👏",
            "🙌",
            "😅",
            "💸",
            "✨",
            "👀",
            "✅",
          ].map((emoji) => (
            <button type="button" key={emoji} onClick={() => addEmoji(emoji)}>
              {emoji}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
