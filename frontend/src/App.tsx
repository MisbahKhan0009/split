import {
  FormEvent,
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Command,
  Copy,
  FileText,
  Filter,
  Image,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Send,
  Settings2,
  Sparkles,
  Split,
  Sun,
  Target,
  Users,
  Video,
  WalletCards,
  X,
  Zap,
  Smile,
  Palette,
  UserRound,
  Download,
  Play,
  File,
  Reply,
} from "lucide-react";
import type {
  ActivityItem,
  AttachmentKind,
  ChatAttachment,
  ChatMessage,
  Conversation,
  Expense,
  Group,
  Member,
  View,
} from "./types";
import {
  api,
  clearSession,
  connectToDirectChat,
  connectToGroupChat,
  getAccessToken,
  saveSession,
  type AuthUser,
  type ChatConnection,
  type GroupMemberDTO,
  type MessageDTO,
  type ProfileDTO,
} from "./lib/api";

const money = (value: number) => `৳ ${value.toLocaleString("en-BD")}`;

const groups: Group[] = [];

const emptyGroup: Group = {
  id: "none",
  name: "No group yet",
  emoji: "+",
  meta: "Create or join a shared space",
  members: 0,
  total: 0,
  accent: "#b7f36b",
  currency: "BDT",
};

const members: Member[] = [
  {
    id: "me",
    name: "Rafi",
    initials: "RF",
    color: "#b7f36b",
    online: true,
    profile: { bio: "Always down for a good adda.", status: "Online now" },
  },
  {
    id: "tisha",
    name: "Tisha",
    initials: "TS",
    color: "#f7bf6d",
    online: true,
    profile: {
      bio: "Coffee, cameras, and clean splits.",
      status: "Online now",
    },
  },
  {
    id: "nabil",
    name: "Nabil",
    initials: "NB",
    color: "#99b8ff",
    online: true,
    profile: {
      bio: "Maps first, plans later.",
      status: "Active 2m ago",
      lastSeen: "2m ago",
    },
  },
  {
    id: "mahi",
    name: "Mahi",
    initials: "MH",
    color: "#e7a8ff",
    profile: {
      bio: "Designing the next hangout.",
      status: "Active 12m ago",
      lastSeen: "12m ago",
    },
  },
  {
    id: "shuvo",
    name: "Shuvo",
    initials: "SH",
    color: "#8dd8ff",
    profile: {
      bio: "Receipts are my love language.",
      status: "Active yesterday",
      lastSeen: "Yesterday",
    },
  },
];

const initialExpenses: Expense[] = [];

const initialActivity: ActivityItem[] = [];

const initialChat: ChatMessage[] = [];

const memberColors = [
  "#b7f36b",
  "#f7bf6d",
  "#99b8ff",
  "#e7a8ff",
  "#8dd8ff",
  "#ffb1d5",
];
const memberFromDTO = (member: GroupMemberDTO, index: number): Member => ({
  id: String(member.user_id),
  name: member.name,
  initials: member.initials,
  color: memberColors[index % memberColors.length],
  profile: {
    bio: member.profile?.bio || "No bio added yet.",
    status: member.profile?.status || "Available",
    theme: member.profile?.theme || "default",
    avatarUrl: member.profile?.avatar || undefined,
  },
});
const normalizeMessage = (
  row: MessageDTO,
  currentUserId?: number,
): ChatMessage => ({
  id: String(row.id),
  senderId: String(row.author),
  member: row.author_name,
  initials: row.author_initials,
  message: row.body,
  time: new Date(row.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
  color: memberColors[row.author % memberColors.length],
  mine: row.author === currentUserId,
  kind: row.kind,
  attachments: (row.attachments || []).map((attachment) => ({
    ...attachment,
    id: String(attachment.id),
    contentType: attachment.content_type,
  })),
  reactions: (row.reactions || []).map((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count,
    reacted: reaction.user_ids
      ? reaction.user_ids.includes(currentUserId ?? -1)
      : reaction.reacted,
    userIds: reaction.user_ids,
  })),
  replyTo: row.reply_to ? String(row.reply_to) : undefined,
  replyPreview: row.reply_preview
    ? {
        id: String(row.reply_preview.id),
        authorName: row.reply_preview.author_name,
        body: row.reply_preview.body,
      }
    : undefined,
  read: Boolean(row.read_at),
});

function Avatar({
  member,
  size = "md",
  avatarUrl,
}: {
  member: Member | { initials: string; color: string };
  size?: "sm" | "md" | "lg";
  avatarUrl?: string;
}) {
  const source =
    avatarUrl ?? ("profile" in member ? member.profile.avatarUrl : undefined);
  return source ? (
    <img
      className={`avatar avatar-${size}`}
      src={source}
      alt={member.initials}
    />
  ) : (
    <span
      className={`avatar avatar-${size}`}
      style={{ background: member.color }}
    >
      {member.initials}
    </span>
  );
}

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activeGroup, setActiveGroup] = useState(emptyGroup);
  const [availableGroups, setAvailableGroups] = useState<Group[]>(groups);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invitations, setInvitations] = useState<
    import("./lib/api").GroupInvitation[]
  >([]);
  const [dismissedInvitations, setDismissedInvitations] = useState<number[]>(
    [],
  );
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [activity, setActivity] = useState(initialActivity);
  const [chat, setChat] = useState(initialChat);
  const [privateChats, setPrivateChats] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [conversation, setConversation] = useState<Conversation>({
    id: "group",
    kind: "group",
    title: "Group chat",
    subtitle: "Your shared conversation",
    unread: 0,
    lastMessage: "Start the conversation",
    accent: "#b7f36b",
  });
  const [showExpense, setShowExpense] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState<Member | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [chatTheme, setChatTheme] = useState("default");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [profileImage, setProfileImage] = useState<string | undefined>();
  const [connectedSummary, setConnectedSummary] = useState<{
    total_spend: string;
    expense_count: number;
    member_count: number;
  } | null>(null);
  const [connectedBudgets, setConnectedBudgets] = useState<
    import("./lib/api").Budget[]
  >([]);
  const [connectedNotifications, setConnectedNotifications] = useState<
    import("./lib/api").NotificationItem[]
  >([]);
  const [connectedSettlementPlan, setConnectedSettlementPlan] = useState<
    import("./lib/api").SettlementPlan | null
  >(null);
  const [connectedRecurring, setConnectedRecurring] = useState<
    import("./lib/api").RecurringExpense[]
  >([]);
  const [connectedEvents, setConnectedEvents] = useState<
    import("./lib/api").GroupEvent[]
  >([]);
  const [userDashboard, setUserDashboard] = useState<
    import("./lib/api").UserDashboard | null
  >(null);
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState<Date | null>(
    null,
  );
  const [connectedPolls, setConnectedPolls] = useState<
    import("./lib/api").Poll[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const chatConnection = useRef<ChatConnection | null>(null);
  const markingRead = useRef(new Set<string>());
  const isBackendGroup = Boolean(authUser && /^\d+$/.test(activeGroup.id));
  const activeMembers = useMemo(
    () =>
      isBackendGroup
        ? (activeGroup.members_detail ?? []).map((member, index) =>
            memberFromDTO(member as GroupMemberDTO, index),
          )
        : members,
    [activeGroup.members_detail, isBackendGroup],
  );
  const currentMember =
    activeMembers.find((member) => member.id === String(authUser?.id)) ??
    (authUser
      ? {
          id: String(authUser.id),
          name: authUser.display_name,
          initials: authUser.display_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          color: "#b7f36b",
          online: true,
          profile: { bio: "", status: "Signed in" },
        }
      : (activeMembers[0] ?? members[0]));
  const groupConversation = useMemo<Conversation>(
    () => ({
      id: `group-${activeGroup.id}`,
      kind: "group",
      title: activeGroup.name,
      subtitle: `${activeMembers.length || activeGroup.members} members`,
      unread: 0,
      lastMessage: chat.length
        ? chat[chat.length - 1].message
        : "Start the group conversation",
      accent: activeGroup.accent,
    }),
    [
      activeGroup.id,
      activeGroup.name,
      activeGroup.members,
      activeGroup.accent,
      activeMembers.length,
      chat,
    ],
  );
  const directConversations = useMemo<Conversation[]>(
    () =>
      activeMembers
        .filter(
          (member) => member.id !== String(authUser?.id) && member.id !== "me",
        )
        .map((member) => ({
          id: `dm-${member.id}`,
          kind: "direct",
          title: member.name,
          subtitle: member.profile.status || "Available",
          memberId: member.id,
          unread: (privateChats[member.id] ?? []).filter(
            (message) => !message.mine && !message.read,
          ).length,
          lastMessage: privateChats[member.id]?.length
            ? privateChats[member.id][privateChats[member.id].length - 1]
                .message
            : "Start a private chat",
          accent: member.color,
        })),
    [activeMembers, authUser?.id, privateChats],
  );
  const conversations = useMemo(
    () => [groupConversation, ...directConversations],
    [groupConversation, directConversations],
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const enterWorkspace = () => {
    setShowAuth(false);
    setShowLanding(false);
  };
  const handleAuthSuccess = (payload: {
    access: string;
    refresh: string;
    user: AuthUser;
  }) => {
    saveSession(payload);
    setAuthUser(payload.user);
    setAvailableGroups([]);
    setActiveGroup(emptyGroup);
    setUserDashboard(null);
    setProfile(null);
    setProfileImage(undefined);
    setShowAccountMenu(false);
    setActiveView("dashboard");
    setShowAuth(false);
    setShowLanding(false);
    notify(`Welcome to SplitWise+, ${payload.user.display_name}.`);
  };
  const handleSignOut = async () => {
    try {
      await api.revokeCurrentSession();
    } catch {
      // Local sign-out still completes if the current token has expired.
    }
    clearSession();
    setAuthUser(null);
    setProfile(null);
    setProfileImage(undefined);
    setShowAccountMenu(false);
    setShowLanding(true);
    setShowAuth(false);
    notify("You have been signed out.");
  };
  const updateProfile = async (
    payload: Partial<Pick<ProfileDTO, "bio" | "status" | "theme">>,
  ) => {
    const nextProfile = await api.updateProfile(payload);
    setProfile(nextProfile);
    setProfileImage(nextProfile.avatar ?? undefined);
    if (nextProfile.theme === "light" || nextProfile.theme === "dark")
      setTheme(nextProfile.theme);
    setChatTheme(nextProfile.theme || "default");
    notify("Settings saved to your account.");
  };
  const uploadProfilePicture = async (file: File) => {
    const body = new FormData();
    body.append("avatar", file);
    const nextProfile = await api.updateProfile(body);
    setProfile(nextProfile);
    setProfileImage(nextProfile.avatar ?? undefined);
    notify("Profile picture updated.");
  };
  const navigate = (view: View) => {
    setActiveView(view);
    setShowLanding(false);
  };
  const selectGroup = (group: Group) => {
    setActiveGroup(group);
    setShowGroupMenu(false);
    setActiveView("overview");
    notify(`Switched to ${group.name}.`);
  };
  // Notifications are account-wide, so they refresh independently of the active group.
  const refreshNotifications = async () => {
    try {
      setConnectedNotifications(await api.notifications());
    } catch {
      /* background refresh stays silent */
    }
  };
  const refreshInvitations = async (silent = false) => {
    try {
      setInvitations(await api.invitations());
    } catch (requestError) {
      if (silent) return;
      notify(
        requestError instanceof Error
          ? requestError.message
          : "Could not load invitations.",
      );
    }
  };
  const refreshGroups = async () => {
    const items = await api.groups();
    const backendGroups = items.map((item, index) => ({
      id: String(item.id),
      name: item.name,
      emoji: item.emoji || "✦",
      meta: "Synced workspace",
      members: item.member_count,
      total: 0,
      members_detail: item.members_detail || [],
      accent: ["#b7f36b", "#8dd8ff", "#ffb1d5"][index % 3],
      currency: "BDT" as const,
    }));
    setAvailableGroups(backendGroups);
    if (backendGroups.length) {
      if (!backendGroups.some((group) => group.id === activeGroup.id))
        setActiveGroup(backendGroups[0]);
    } else {
      setActiveGroup(emptyGroup);
      setActiveView("dashboard");
    }
  };
  const refreshDashboard = async () => {
    if (!getAccessToken()) return;
    try {
      const snapshot = await api.dashboard();
      setUserDashboard(snapshot);
      setDashboardUpdatedAt(new Date());
    } catch (requestError) {
      notify(
        requestError instanceof Error
          ? requestError.message
          : "Could not load your dashboard.",
      );
    }
  };
  const createGroup = async (payload: {
    name: string;
    emoji: string;
    description: string;
  }) => {
    const item = await api.createGroup({
      ...payload,
      slug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    });
    const group: Group = {
      id: String(item.id),
      name: item.name,
      emoji: item.emoji || "✦",
      meta: "Synced workspace",
      members: item.member_count,
      total: 0,
      members_detail: item.members_detail || [],
      accent: "#b7f36b",
      currency: "BDT",
    };
    setAvailableGroups((current) => [...current, group]);
    setActiveGroup(group);
    setShowGroupCreate(false);
    setActiveView("overview");
    await refreshDashboard();
    notify(`Created ${group.name}.`);
  };
  const hasGroups = availableGroups.length > 0;
  // Only invitations addressed to the signed-in user should be actionable.
  const incomingInvitations = invitations.filter(
    (item) => item.status === "pending" && item.invitee === authUser?.id,
  );
  const bannerInvitations = incomingInvitations.filter(
    (item) => !dismissedInvitations.includes(item.id),
  );
  // Drives the bell indicator: unread notifications plus invitations awaiting a reply.
  const alertCount =
    connectedNotifications.filter((item) => !item.is_read).length +
    incomingInvitations.length;
  const acceptGroupInvitation = async (id: number) => {
    await api.acceptInvitation(id);
    await Promise.all([
      refreshGroups(),
      refreshInvitations(),
      refreshDashboard(),
    ]);
    notify("Invitation accepted and membership updated.");
  };
  const declineGroupInvitation = async (id: number) => {
    await api.declineInvitation(id);
    await Promise.all([refreshInvitations(), refreshDashboard()]);
    notify("Invitation declined.");
  };
  const activeMessages =
    conversation.kind === "group"
      ? chat
      : (privateChats[conversation.memberId ?? ""] ?? []);
  const updateActiveMessage = (message: ChatMessage) => {
    const merge = (items: ChatMessage[]) =>
      items.some((item) => item.id === message.id)
        ? items.map((item) => (item.id === message.id ? message : item))
        : [...items, message];
    if (conversation.kind === "group") setChat(merge);
    else
      setPrivateChats((current) => ({
        ...current,
        [conversation.memberId ?? ""]: merge(
          current[conversation.memberId ?? ""] ?? [],
        ),
      }));
  };
  const hydrateMessages = async () => {
    if (!getAccessToken() || !isBackendGroup) return;
    if (conversation.kind === "group") setChat([]);
    else if (conversation.memberId)
      setPrivateChats((current) => ({
        ...current,
        [conversation.memberId as string]: [],
      }));
    try {
      const rows =
        conversation.kind === "group"
          ? await api.groupMessages(activeGroup.id)
          : await api.directMessages(conversation.memberId ?? "");
      const mapped = rows.map((row) => normalizeMessage(row, authUser?.id));
      if (conversation.kind === "group") setChat(mapped);
      else if (conversation.memberId)
        setPrivateChats((current) => ({
          ...current,
          [conversation.memberId as string]: mapped,
        }));
    } catch (requestError) {
      notify(
        requestError instanceof Error
          ? requestError.message
          : "Could not load chat history.",
      );
    }
  };

  useEffect(() => {
    void hydrateMessages();
  }, [activeGroup.id, conversation.kind, conversation.memberId, authUser?.id]);

  useEffect(() => {
    setConversation({
      id: `group-${activeGroup.id}`,
      kind: "group",
      title: activeGroup.name,
      subtitle: `${activeGroup.members} members`,
      unread: 0,
      lastMessage: "Start the group conversation",
      accent: activeGroup.accent,
    });
  }, [activeGroup.id]);

  useEffect(() => {
    if (!getAccessToken()) return;
    api
      .me()
      .then((user) => {
        setAuthUser(user);
        setShowLanding(false);
      })
      .catch(() => {
        clearSession();
        setAuthUser(null);
      });
  }, []);

  useEffect(() => {
    if (!authUser) return;
    Promise.all([
      refreshGroups(),
      refreshInvitations(),
      refreshNotifications(),
      api.profile().then((nextProfile) => {
        setProfile(nextProfile);
        setProfileImage(nextProfile.avatar ?? undefined);
        setChatTheme(nextProfile.theme || "default");
        setTheme(nextProfile.theme === "light" ? "light" : "dark");
      }),
      refreshDashboard(),
    ]).catch((requestError) =>
      notify(
        requestError instanceof Error
          ? requestError.message
          : "Could not load your workspace.",
      ),
    );
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshDashboard();
      void refreshInvitations(true);
      void refreshNotifications();
    };
    const interval = window.setInterval(refreshWhenVisible, 10000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (activeView !== "chat" || !isBackendGroup) return;
    const handlePayload = (event: import("./lib/api").ChatEvent) => {
      if (
        (event.event === "message" ||
          event.event === "reaction" ||
          event.event === "read") &&
        event.message
      ) {
        updateActiveMessage(normalizeMessage(event.message, authUser?.id));
      } else if (event.event === "typing" && event.user) {
        const key = String(event.user.id);
        setTypingUsers((current) => {
          const next = { ...current };
          if (event.is_typing) next[key] = event.user?.name ?? "Someone";
          else delete next[key];
          return next;
        });
      } else if (event.event === "error")
        notify("The realtime chat action could not be completed.");
    };
    const connection =
      conversation.kind === "group"
        ? connectToGroupChat(activeGroup.id, handlePayload)
        : connectToDirectChat(conversation.memberId ?? "", handlePayload);
    chatConnection.current = connection;
    return () => {
      connection.close();
      if (chatConnection.current === connection) chatConnection.current = null;
      setTypingUsers({});
    };
  }, [
    activeGroup.id,
    activeView,
    conversation.kind,
    conversation.memberId,
    isBackendGroup,
    authUser?.id,
  ]);

  useEffect(() => {
    if (activeView !== "chat" || !isBackendGroup) return;
    activeMessages
      .filter(
        (message) =>
          !message.mine &&
          !message.read &&
          /^\d+$/.test(message.id) &&
          !markingRead.current.has(message.id),
      )
      .forEach((message) => {
        markingRead.current.add(message.id);
        api
          .markMessageRead(message.id)
          .then((row) =>
            updateActiveMessage(normalizeMessage(row, authUser?.id)),
          )
          .catch(() => markingRead.current.delete(message.id));
      });
  }, [activeView, activeMessages, isBackendGroup, authUser?.id]);

  const loadConnectedGroup = async (groupId: string) => {
    if (!getAccessToken() || !/^\d+$/.test(groupId)) return;
    try {
      const [
        summary,
        budgets,
        notifications,
        settlementPlan,
        recurring,
        events,
        polls,
      ] = await Promise.all([
        api.groupSummary(groupId),
        api.budgets(groupId),
        api.notifications(),
        api.settlementPlan(groupId),
        api.recurringExpenses(groupId),
        api.events(groupId),
        api.polls(groupId),
      ]);
      setConnectedSummary(summary);
      setConnectedBudgets(budgets);
      setConnectedNotifications(notifications);
      setConnectedSettlementPlan(settlementPlan);
      setConnectedRecurring(recurring);
      setConnectedEvents(events);
      setConnectedPolls(polls);
      const backendExpenses = (await api.expenses(groupId)) as Array<{
        id: number;
        title: string;
        category: string;
        amount: string;
        payer_name: string;
        occurred_on: string;
        note: string;
        status: string;
      }>;
      if (backendExpenses.length)
        setExpenses(
          backendExpenses.map((item) => ({
            id: String(item.id),
            title: item.title,
            category: item.category,
            amount: Number(item.amount),
            payer: item.payer_name,
            date: item.occurred_on,
            note: item.note,
            status: item.status === "confirmed" ? "Confirmed" : "Pending",
          })),
        );
      const backendActivity = await api.activity(groupId);
      if (backendActivity.length)
        setActivity(
          backendActivity.map((item) => ({
            id: String(item.id),
            member: item.actor_name,
            initials: item.actor_initials,
            action: item.action,
            target: item.target,
            time: new Date(item.created_at).toLocaleString(),
            color: "#b7f36b",
          })),
        );
    } catch (requestError) {
      notify(
        requestError instanceof Error
          ? requestError.message
          : "Could not sync this group.",
      );
    }
  };

  useEffect(() => {
    if (authUser) void loadConnectedGroup(activeGroup.id);
  }, [authUser, activeGroup.id]);

  useEffect(() => {
    if (!authUser) return;
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    api
      .acceptInvitationByToken(token)
      .then(async () => {
        window.history.replaceState({}, "", window.location.pathname);
        await refreshGroups();
        await refreshInvitations();
        notify("Invitation accepted. You are now a group member.");
      })
      .catch((requestError) =>
        notify(
          requestError instanceof Error
            ? requestError.message
            : "Could not accept this invitation.",
        ),
      );
  }, [authUser]);

  const addExpense = async (expense: Expense) => {
    if (authUser && /^\d+$/.test(activeGroup.id)) {
      try {
        await api.createExpense({
          group: Number(activeGroup.id),
          title: expense.title,
          category: expense.category,
          amount: expense.amount.toFixed(2),
          payer: expense.backendPayerId ?? authUser.id,
          note: expense.note,
          occurred_on: new Date().toISOString().slice(0, 10),
          split_mode: expense.status === "Confirmed" ? "equal" : "exact",
          participants: expense.backendParticipants?.map((participant) => ({
            user: participant.user,
            share_amount: participant.share_amount,
            share_value: 0,
          })),
        });
        await loadConnectedGroup(activeGroup.id);
        await refreshDashboard();
      } catch (requestError) {
        notify(
          requestError instanceof Error
            ? requestError.message
            : "Could not save the expense.",
        );
        return;
      }
    } else setExpenses((current) => [expense, ...current]);
    setActivity((current) => [
      {
        id: crypto.randomUUID(),
        member: authUser?.display_name || "Rafi",
        initials: "RF",
        action: "added",
        target: expense.title,
        time: "Just now",
        color: "#b7f36b",
      },
      ...current,
    ]);
    setShowExpense(false);
    navigate("expenses");
    notify("Expense saved and balances recalculated in ৳");
  };

  const sendMessage = async (
    message: string,
    attachments: ChatAttachment[] = [],
    replyTo?: string,
  ) => {
    if (!message.trim() && attachments.length === 0)
      throw new Error("Write a message or add an attachment.");
    if (isBackendGroup) {
      try {
        const saved = await api.sendMessage(
          conversation.kind === "group"
            ? {
                group: Number(activeGroup.id),
                kind: "group",
                body: message,
                attachments,
                reply_to: replyTo ? Number(replyTo) : undefined,
              }
            : {
                recipient: Number(conversation.memberId),
                kind: "direct",
                body: message,
                attachments,
                reply_to: replyTo ? Number(replyTo) : undefined,
              },
        );
        updateActiveMessage(normalizeMessage(saved, authUser?.id));
      } catch (requestError) {
        const error =
          requestError instanceof Error
            ? requestError
            : new Error("Could not send the message.");
        notify(error.message);
        throw error;
      }
    } else {
      const next: ChatMessage = {
        id: crypto.randomUUID(),
        senderId: "me",
        member: currentMember.name,
        initials: currentMember.initials,
        message,
        time: "Now",
        color: currentMember.color,
        mine: true,
        attachments,
        replyTo,
        read: false,
      };
      updateActiveMessage(next);
    }
    notify(attachments.length ? "Shared to the conversation" : "Message sent");
  };

  const uploadChatAttachment = async (file: File) => {
    if (!isBackendGroup)
      return {
        id: crypto.randomUUID(),
        kind: (file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
            ? "video"
            : "file") as AttachmentKind,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
      };
    const attachment = await api.uploadMessageAttachment(
      file,
      conversation.kind === "group"
        ? { group: Number(activeGroup.id) }
        : { recipient: Number(conversation.memberId) },
    );
    return {
      ...attachment,
      contentType: attachment.content_type,
    } as ChatAttachment;
  };
  const openDirect = (member: Member) => {
    const direct = directConversations.find(
      (item) => item.memberId === member.id,
    );
    if (direct) setConversation(direct);
  };
  const addReaction = async (id: string, emoji: string) => {
    if (isBackendGroup && /^\d+$/.test(id)) {
      try {
        updateActiveMessage(
          normalizeMessage(await api.reactMessage(id, emoji), authUser?.id),
        );
      } catch (requestError) {
        notify(
          requestError instanceof Error
            ? requestError.message
            : "Could not update reaction.",
        );
      }
      return;
    }
    const updater = (items: ChatMessage[]) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const existing = (item.reactions ?? []).find(
          (reaction) => reaction.emoji === emoji,
        );
        const reactions = (item.reactions ?? []).filter(
          (reaction) => reaction.emoji !== emoji,
        );
        if (!existing?.reacted)
          reactions.push({
            emoji,
            count: (existing?.count ?? 0) + 1,
            reacted: true,
          });
        else if (existing.count > 1)
          reactions.push({
            ...existing,
            count: existing.count - 1,
            reacted: false,
          });
        return { ...item, reactions };
      });
    if (conversation.kind === "group") setChat(updater);
    else
      setPrivateChats((current) => ({
        ...current,
        [conversation.memberId ?? ""]: updater(
          current[conversation.memberId ?? ""] ?? [],
        ),
      }));
  };
  const markCurrentThreadRead = async () => {
    const unread = activeMessages.filter(
      (message) => !message.mine && !message.read && /^\d+$/.test(message.id),
    );
    await Promise.all(
      unread.map((message) =>
        api
          .markMessageRead(message.id)
          .then((row) =>
            updateActiveMessage(normalizeMessage(row, authUser?.id)),
          ),
      ),
    );
    notify(
      unread.length
        ? "Conversation marked read."
        : "No unread messages in this conversation.",
    );
  };
  const changeChatTheme = async (nextTheme: string) => {
    setChatTheme(nextTheme);
    if (authUser) {
      try {
        await api.updateProfile({ theme: nextTheme });
      } catch (requestError) {
        notify(
          requestError instanceof Error
            ? requestError.message
            : "Theme could not be saved.",
        );
      }
    }
  };

  if (showLanding) {
    return (
      <>
        <Landing
          onEnter={() => {
            setAuthMode("signin");
            setShowAuth(true);
          }}
          onNavigate={navigate}
        />
        {showAuth && (
          <AuthModal
            mode={authMode}
            onModeChange={setAuthMode}
            onClose={() => setShowAuth(false)}
            onSuccess={handleAuthSuccess}
            onDemo={enterWorkspace}
          />
        )}
      </>
    );
  }

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        activeView={activeView}
        onNavigate={navigate}
        onLanding={() => setShowLanding(true)}
        activeGroup={activeGroup}
        availableGroups={availableGroups}
        groupMenuOpen={showGroupMenu}
        onToggleGroupMenu={() => setShowGroupMenu((value) => !value)}
        onGroupChange={selectGroup}
        onCreateGroup={() => setShowGroupCreate(true)}
        onOpenInvite={() => {
          if (hasGroups) setShowInvite(true);
        }}
        onOpenPalette={() => setShowPalette(true)}
        profileImage={profileImage ?? currentMember.profile.avatarUrl}
        profile={profile}
        accountMenuOpen={showAccountMenu}
        onToggleAccountMenu={() => setShowAccountMenu((value) => !value)}
        onOpenSettings={() => {
          setShowAccountMenu(false);
          navigate("settings");
        }}
        onToggleTheme={() => {
          const nextTheme = theme === "dark" ? "light" : "dark";
          setTheme(nextTheme);
          void updateProfile({ theme: nextTheme });
        }}
        onSignOut={handleSignOut}
        authUser={authUser}
      />
      <main className="main-content">
        <Topbar
          activeGroup={activeGroup}
          query={query}
          setQuery={setQuery}
          onOpenInvite={() => {
            if (hasGroups) setShowInvite(true);
          }}
          onNotifications={() => {
            setShowNotifications((value) => !value);
            void refreshInvitations();
          }}
          onTheme={() => {
            const nextTheme = theme === "dark" ? "light" : "dark";
            setTheme(nextTheme);
            void updateProfile({ theme: nextTheme });
          }}
          theme={theme}
          alertCount={alertCount}
        />
        {showNotifications && (
          <Notifications
            notifications={connectedNotifications}
            invitations={incomingInvitations}
            onClose={() => setShowNotifications(false)}
            onAction={(message) => {
              setShowNotifications(false);
              notify(message);
            }}
            onAccept={acceptGroupInvitation}
            onDecline={declineGroupInvitation}
          />
        )}
        <div className="page-content">
          {bannerInvitations.length > 0 && (
            <AnnouncementBanner
              invitation={bannerInvitations[0]}
              extraCount={bannerInvitations.length - 1}
              onAccept={acceptGroupInvitation}
              onDecline={declineGroupInvitation}
              onDismiss={(id) =>
                setDismissedInvitations((current) => [...current, id])
              }
              onViewAll={() => setShowNotifications(true)}
            />
          )}
          {activeView === "settings" && authUser && (
            <SettingsPage
              authUser={authUser}
              profile={profile}
              profileImage={profileImage}
              theme={theme}
              onProfileSaved={updateProfile}
              onAvatarUpload={uploadProfilePicture}
              onThemeChange={(nextTheme) => {
                setTheme(nextTheme);
                void updateProfile({ theme: nextTheme });
              }}
              onSignOut={handleSignOut}
            />
          )}
          {activeView === "dashboard" && (
            <UserDashboardView
              dashboard={userDashboard}
              dashboardUpdatedAt={dashboardUpdatedAt}
              onCreateGroup={() => setShowGroupCreate(true)}
              onNavigate={navigate}
            />
          )}
          {hasGroups && activeView === "overview" && (
            <Overview
              activeGroup={activeGroup}
              summary={connectedSummary}
              settlementPlan={connectedSettlementPlan}
              budgets={connectedBudgets}
              onAddExpense={() => setShowExpense(true)}
              onNavigate={navigate}
              expenses={expenses}
              activity={activity}
            />
          )}
          {hasGroups && activeView === "expenses" && (
            <ExpensesPage
              activeGroup={activeGroup}
              expenses={expenses}
              onAddExpense={() => setShowExpense(true)}
              query={query}
              onToast={notify}
            />
          )}
          {hasGroups && activeView === "settle" && (
            <SettlePage
              activeGroup={activeGroup}
              settlementPlan={connectedSettlementPlan}
              onToast={notify}
            />
          )}
          {hasGroups && activeView === "plan" && (
            <PlanPage
              activeGroup={activeGroup}
              events={connectedEvents}
              polls={connectedPolls}
              recurring={connectedRecurring}
              currentUserId={authUser?.id ?? 0}
              onSync={async () => {
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
              }}
              onToast={notify}
            />
          )}
          {hasGroups && activeView === "chat" && (
            <ChatPage
              activeGroup={activeGroup}
              members={activeMembers}
              conversations={conversations}
              activeConversation={conversation}
              onSelectConversation={setConversation}
              chat={activeMessages}
              onSend={sendMessage}
              onUpload={uploadChatAttachment}
              onTyping={(isTyping) => {
                chatConnection.current?.send({
                  event: "typing",
                  is_typing: isTyping,
                });
              }}
              typingNames={Object.values(typingUsers)}
              onReact={addReaction}
              onMarkRead={markCurrentThreadRead}
              onOpenProfile={(id) => {
                if (id === String(authUser?.id) || id === "me") {
                  navigate("settings");
                  return;
                }
                setShowProfile(
                  activeMembers.find((member) => member.id === id) ?? null,
                );
              }}
              onOpenDirect={openDirect}
              chatTheme={chatTheme}
              onThemeChange={changeChatTheme}
            />
          )}
          {authUser && hasGroups && (
            <ConnectedFeaturePanel
              activeGroup={activeGroup}
              currentUserId={authUser.id}
              summary={connectedSummary}
              budgets={connectedBudgets}
              notifications={connectedNotifications}
              settlementPlan={connectedSettlementPlan}
              recurring={connectedRecurring}
              events={connectedEvents}
              polls={connectedPolls}
              onSync={async () => {
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
              }}
              onToast={notify}
            />
          )}
        </div>
      </main>
      {hasGroups && (
        <div className="mobile-nav">
          {(["overview", "expenses", "settle", "plan", "chat"] as View[]).map(
            (view) => (
              <button
                key={view}
                className={activeView === view ? "active" : ""}
                onClick={() => navigate(view)}
              >
                <NavIcon view={view} />
                <span>
                  {view === "overview"
                    ? "Home"
                    : view === "settle"
                      ? "Settle"
                      : view[0].toUpperCase() + view.slice(1)}
                </span>
              </button>
            ),
          )}
        </div>
      )}
      {showExpense && hasGroups && (
        <ExpenseModal
          onClose={() => setShowExpense(false)}
          onSave={addExpense}
          memberOptions={
            availableGroups.find((group) => group.id === activeGroup.id)
              ?.members_detail ?? []
          }
          currentUserId={authUser?.id ?? 0}
        />
      )}
      {showGroupCreate && (
        <GroupCreateModal
          onClose={() => setShowGroupCreate(false)}
          onCreate={createGroup}
        />
      )}
      {showInvite && hasGroups && (
        <InviteModal
          group={activeGroup}
          invitations={invitations}
          currentUserId={authUser?.id ?? 0}
          onClose={() => setShowInvite(false)}
          onInvite={async (username) => {
            await api.createInvitation({
              group: Number(activeGroup.id),
              username,
            });
            await refreshInvitations();
          }}
          onAccept={acceptGroupInvitation}
          onDecline={declineGroupInvitation}
          onToast={notify}
        />
      )}

      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onNavigate={navigate}
          onAddExpense={() => {
            setShowPalette(false);
            if (hasGroups) setShowExpense(true);
          }}
        />
      )}
      {showProfile &&
        showProfile.id !== String(authUser?.id) &&
        showProfile.id !== "me" && (
          <ProfileDrawer
            member={showProfile}
            isSelf={
              showProfile.id === String(authUser?.id) || showProfile.id === "me"
            }
            avatarUrl={
              showProfile.id === String(authUser?.id) ||
              showProfile.id === currentMember.id
                ? profileImage
                : showProfile.profile.avatarUrl
            }
            onClose={() => setShowProfile(null)}
            onMessage={() => {
              if (
                showProfile.id !== String(authUser?.id) &&
                showProfile.id !== "me"
              ) {
                openDirect(showProfile);
              }
              setShowProfile(null);
              navigate("chat");
            }}
            onAvatarChange={(url) => {
              setProfileImage(url);
              notify("Profile picture updated");
            }}
          />
        )}
      {toast && (
        <div className="toast">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

function UserDashboardView({
  dashboard,
  dashboardUpdatedAt,
  onCreateGroup,
  onNavigate,
}: {
  dashboard: import("./lib/api").UserDashboard | null;
  dashboardUpdatedAt: Date | null;
  onCreateGroup: () => void;
  onNavigate: (view: View) => void;
}) {
  if (!dashboard)
    return (
      <section className="page-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PERSONAL DASHBOARD
          </div>
          <h1>Loading your overview…</h1>
          <p>
            Pulling your current balances, activity, and groups from Django.
          </p>
        </div>
      </section>
    );
  const hasGroups = dashboard.group_count > 0;
  const groupSpend = dashboard.groups.map((group) => ({
    label: group.name,
    value: Number(group.total_spend),
  }));
  const position = [
    { label: "Paid", value: Number(dashboard.paid_total) },
    { label: "Share", value: Number(dashboard.owed_total) },
    { label: "To pay", value: Number(dashboard.pending_to_pay) },
    { label: "To receive", value: Number(dashboard.pending_to_receive) },
  ];
  return (
    <section className="user-dashboard">
      <div className="page-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> PERSONAL DASHBOARD
          </div>
          <h1>
            Hi,{" "}
            {dashboard.user.first_name ||
              dashboard.user.display_name.split(" ")[0]}
            .
          </h1>
          <p>
            Your personal view of shared money, balances, and group activity.
          </p>
          <small className="dashboard-sync-status">
            <span className="live-dot" /> Backend synced{" "}
            {dashboardUpdatedAt
              ? dashboardUpdatedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "just now"}{" "}
            · refreshes every 10s
          </small>
        </div>
        <button
          className="outline-button"
          onClick={() => onNavigate("overview")}
          disabled={!hasGroups}
        >
          <LayoutDashboard size={15} /> Current workspace
        </button>
      </div>
      {!hasGroups ? (
        <>
          <div className="glass-card dashboard-empty">
            <div className="auth-mark">
              <Users size={20} />
            </div>
            <span className="muted-label">YOUR SHARED MONEY STARTS HERE</span>
            <h2>No groups yet.</h2>
            <p>
              You are not automatically added to any group. Create your first
              group or accept an invitation from your inbox when someone invites
              you.
            </p>
            <button className="primary-button" onClick={onCreateGroup}>
              <Plus size={16} /> Create your first group
            </button>
          </div>
          <div className="dashboard-chart-grid">
            <DashboardBarChart
              title="Shared spend by group"
              subtitle="Your group totals will appear here"
              data={[]}
              currency="৳"
            />
            <DashboardBarChart
              title="Money position"
              subtitle="Your paid, shared, and settlement totals"
              data={position}
              currency="৳"
            />
          </div>
        </>
      ) : (
        <>
          <div className="insight-grid dashboard-insights">
            <div className="glass-card insight-card">
              <span className="muted-label">TOTAL SHARED SPEND</span>
              <strong>{money(Number(dashboard.total_spend))}</strong>
              <small>
                {dashboard.expense_count} expenses across{" "}
                {dashboard.group_count} groups
              </small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">YOU PAID</span>
              <strong>{money(Number(dashboard.paid_total))}</strong>
              <small>recorded payments</small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">YOUR SHARE</span>
              <strong>{money(Number(dashboard.owed_total))}</strong>
              <small>your participant shares</small>
            </div>
            <div className="glass-card insight-card">
              <span className="muted-label">TO SETTLE</span>
              <strong>{money(Number(dashboard.pending_to_pay))}</strong>
              <small>
                {money(Number(dashboard.pending_to_receive))} coming back to you
              </small>
            </div>
          </div>
          <div className="dashboard-chart-grid">
            <DashboardBarChart
              title="Shared spend by group"
              subtitle="Live totals from your groups"
              data={groupSpend}
              currency="৳"
            />
            <DashboardBarChart
              title="Money position"
              subtitle="Current user-level finance snapshot"
              data={position}
              currency="৳"
            />
          </div>
          <div className="dashboard-grid">
            <div className="glass-card dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">YOUR GROUPS</span>
                  <h2>Shared spaces</h2>
                </div>
                <button className="text-button" onClick={onCreateGroup}>
                  <Plus size={15} /> New group
                </button>
              </div>
              {dashboard.groups.map((group) => (
                <div className="connected-list-row" key={group.id}>
                  <span>
                    <b>{group.emoji}</b> {group.name}
                    <small>
                      {group.member_count} members ·{" "}
                      {group.total_spend === "0"
                        ? "No spend yet"
                        : money(Number(group.total_spend))}
                    </small>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("overview")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="glass-card dashboard-section">
              <div className="section-heading">
                <div>
                  <span className="muted-label">YOUR ATTENTION</span>
                  <h2>Next steps</h2>
                </div>
              </div>
              <div className="dashboard-next-step">
                <Bell size={17} />
                <span>
                  <strong>{dashboard.unread_notifications}</strong> unread
                  notifications
                </span>
              </div>
              <div className="dashboard-next-step">
                <Users size={17} />
                <span>
                  <strong>{dashboard.pending_invitations}</strong> pending
                  invitations
                </span>
              </div>
              <div className="dashboard-next-step">
                <WalletCards size={17} />
                <span>
                  <strong>{money(Number(dashboard.pending_to_pay))}</strong>{" "}
                  waiting to settle
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function DashboardBarChart({
  title,
  subtitle,
  data,
  currency,
}: {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  currency: string;
}) {
  const hasValue = data.some((item) => item.value > 0);
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.length ? data : [{ label: "No data", value: 0 }];
  return (
    <div className="glass-card dashboard-chart">
      <div className="section-heading">
        <div>
          <span className="muted-label">CHART</span>
          <h2>{title}</h2>
          <small>{subtitle}</small>
        </div>
        <span className="chart-total">
          {currency}
          {Math.round(
            data.reduce((sum, item) => sum + item.value, 0),
          ).toLocaleString()}
        </span>
      </div>
      <div className="chart-area">
        <div className="chart-y-axis">
          <span>
            {currency}
            {Math.round(max).toLocaleString()}
          </span>
          <span>
            {currency}
            {Math.round(max / 2).toLocaleString()}
          </span>
          <span>{currency}0</span>
        </div>
        <div className="chart-plot">
          <div className="chart-gridline top" />
          <div className="chart-gridline middle" />
          <div className="chart-gridline baseline" />{" "}
          <div className="chart-bars">
            {points.map((item) => (
              <div className="chart-column" key={item.label}>
                <div
                  className={`chart-bar ${item.value === 0 ? "zero" : ""}`}
                  style={{
                    height: `${Math.max((item.value / max) * 100, item.value === 0 ? 2 : 6)}%`,
                  }}
                  title={`${item.label}: ${currency}${item.value.toLocaleString()}`}
                >
                  <span>
                    {item.value > 0
                      ? `${currency}${Math.round(item.value).toLocaleString()}`
                      : "0"}
                  </span>
                </div>
                <small>
                  {item.label.length > 12
                    ? `${item.label.slice(0, 12)}…`
                    : item.label}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
      {!hasValue && (
        <div className="chart-empty-note">
          <Activity size={13} /> No recorded amounts yet. The axes are ready for
          your first shared transaction.
        </div>
      )}
    </div>
  );
}
function ConnectedFeaturePanel({
  activeGroup,
  currentUserId,
  summary,
  budgets,
  notifications,
  settlementPlan,
  recurring,
  events,
  polls,
  onSync,
  onToast,
}: {
  activeGroup: Group;
  currentUserId: number;
  summary: {
    total_spend: string;
    expense_count: number;
    member_count: number;
  } | null;
  budgets: import("./lib/api").Budget[];
  notifications: import("./lib/api").NotificationItem[];
  settlementPlan: import("./lib/api").SettlementPlan | null;
  recurring: import("./lib/api").RecurringExpense[];
  events: import("./lib/api").GroupEvent[];
  polls: import("./lib/api").Poll[];
  onSync: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const isConnected = /^\d+$/.test(activeGroup.id);
  const createBudget = async () => {
    if (!isConnected || !budgetName || !budgetAmount) return;
    try {
      await api.createBudget({
        group: Number(activeGroup.id),
        name: budgetName,
        category: "All",
        amount: budgetAmount,
        period: "monthly",
        starts_on: new Date().toISOString().slice(0, 10),
      });
      setBudgetName("");
      setBudgetAmount("");
      await onSync();
      onToast("Budget created in the shared workspace.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not create budget.",
      );
    }
  };
  const createPoll = async () => {
    if (!isConnected || !pollQuestion) return;
    try {
      await api.createPoll({
        group: Number(activeGroup.id),
        question: pollQuestion,
        options: ["Yes, I’m in", "Maybe", "Not this time"],
      });
      setPollQuestion("");
      await onSync();
      onToast("Poll published to the group.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not publish poll.",
      );
    }
  };
  const createRecurring = async () => {
    if (!isConnected || !recurringTitle || !recurringAmount) return;
    try {
      await api.createRecurringExpense({
        group: Number(activeGroup.id),
        title: recurringTitle,
        category: "Other",
        amount: recurringAmount,
        payer: currentUserId,
        frequency: "monthly",
        next_run: new Date().toISOString().slice(0, 10),
        split_mode: "equal",
      });
      setRecurringTitle("");
      setRecurringAmount("");
      await onSync();
      onToast("Recurring expense scheduled.");
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not schedule recurring expense.",
      );
    }
  };
  const createEvent = async () => {
    if (!isConnected || !eventTitle) return;
    try {
      await api.createEvent({
        group: Number(activeGroup.id),
        title: eventTitle,
        description: "Shared group event",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        location: "To be decided",
        budget: "0",
        checklist: [],
      });
      setEventTitle("");
      await onSync();
      onToast("Group event created.");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "Could not create event.",
      );
    }
  };
  return (
    <section className="connected-feature-panel">
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP WORKSPACE
          </div>
          <h2>Shared finances, in one place.</h2>
          <p>
            {isConnected
              ? "Live balances, budgets, plans, and decisions for " +
                activeGroup.name +
                "."
              : "Connect to a group to load its shared workspace data."}
          </p>
        </div>
        <button className="outline-button" onClick={() => void onSync()}>
          <Activity size={15} /> Sync now
        </button>
      </div>
      <div className="insight-grid">
        <div className="glass-card insight-card">
          <span className="muted-label">SHARED SPEND</span>
          <strong>
            {summary ? money(Number(summary.total_spend)) : "৳ —"}
          </strong>
          <small>
            {summary?.expense_count ?? 0} expenses ·{" "}
            {summary?.member_count ?? activeGroup.members} members
          </small>
        </div>
        <div className="glass-card insight-card">
          <span className="muted-label">ACTIVE BUDGETS</span>
          <strong>{budgets.length}</strong>
          <small>
            {budgets.filter((budget) => budget.percent >= 80).length} need
            attention
          </small>
        </div>
        <div className="glass-card insight-card">
          <span className="muted-label">INBOX</span>
          <strong>
            {notifications.filter((item) => !item.is_read).length}
          </strong>
          <small>unread group updates</small>
        </div>
      </div>
      <div className="connected-action-grid">
        <div className="glass-card connected-action">
          <span className="muted-label">NEW BUDGET</span>
          <div className="connected-form-row">
            <input
              value={budgetName}
              onChange={(event) => setBudgetName(event.target.value)}
              placeholder="e.g. April groceries"
            />
            <input
              value={budgetAmount}
              onChange={(event) =>
                setBudgetAmount(event.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="৳ amount"
              inputMode="decimal"
            />
            <button
              className="primary-button"
              onClick={() => void createBudget()}
            >
              <Target size={15} /> Save
            </button>
          </div>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">QUICK POLL</span>
          <div className="connected-form-row">
            <input
              value={pollQuestion}
              onChange={(event) => setPollQuestion(event.target.value)}
              placeholder="Ask the group a decision question"
            />
            <button
              className="secondary-button"
              onClick={() => void createPoll()}
            >
              <Check size={15} /> Publish
            </button>
          </div>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">RECURRING EXPENSE</span>
          <div className="connected-form-row">
            <input
              value={recurringTitle}
              onChange={(event) => setRecurringTitle(event.target.value)}
              placeholder="e.g. Monthly Wi‑Fi"
            />
            <input
              value={recurringAmount}
              onChange={(event) =>
                setRecurringAmount(event.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="৳ amount"
            />
            <button
              className="secondary-button"
              onClick={() => void createRecurring()}
            >
              <CalendarDays size={15} /> Schedule
            </button>
          </div>
          <small>{recurring.length} scheduled in this group</small>
        </div>
        <div className="glass-card connected-action">
          <span className="muted-label">GROUP EVENT</span>
          <div className="connected-form-row">
            <input
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              placeholder="e.g. Friday river cruise"
            />
            <button
              className="secondary-button"
              onClick={() => void createEvent()}
            >
              <CalendarDays size={15} /> Add event
            </button>
          </div>
          <small>
            {events.length} upcoming events · {polls.length} active polls
          </small>
        </div>
      </div>
      <div className="glass-card connected-action settlement-summary">
        <span className="muted-label">OPTIMIZED SETTLEMENTS</span>
        {settlementPlan?.transfers.length ? (
          settlementPlan.transfers.map((transfer) => (
            <div
              className="connected-list-row"
              key={`${transfer.from_user}-${transfer.to_user}`}
            >
              <span>
                {transfer.from_name} → {transfer.to_name}
              </span>
              <strong>{money(Number(transfer.amount))}</strong>
            </div>
          ))
        ) : (
          <small>
            No open transfers yet. Add shared expenses to generate the fewest
            payments.
          </small>
        )}
      </div>
    </section>
  );
}

function AuthModal({
  mode,
  onModeChange,
  onClose,
  onSuccess,
  onDemo,
}: {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  onClose: () => void;
  onSuccess: (payload: {
    access: string;
    refresh: string;
    user: AuthUser;
  }) => void;
  onDemo: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (isSignup && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const payload = isSignup
        ? await api.signup({
            username,
            password,
            password_confirm: confirm,
            first_name: firstName,
            last_name: lastName,
            email,
          })
        : await api.signin({ username, password });
      onSuccess(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not complete that request.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="auth-close icon-button"
          onClick={onClose}
          aria-label="Close authentication"
        >
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Split size={19} />
        </div>
        <span className="muted-label">SPLITWISE+ ACCOUNT</span>
        <h2>
          {isSignup
            ? "Start sharing smarter."
            : "Welcome back to your workspace."}
        </h2>
        <p className="auth-subtitle">
          {isSignup
            ? "Create your account and bring every shared ৳ decision into context."
            : "Sign in to continue to your groups, balances, and conversations."}
        </p>
        <div className="auth-tabs">
          <button
            type="button"
            className={!isSignup ? "active" : ""}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={isSignup ? "active" : ""}
            onClick={() => onModeChange("signup")}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit}>
          {isSignup && (
            <div className="auth-grid">
              <label>
                First name
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Rafi"
                  required
                />
              </label>
              <label>
                Last name
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Hasan"
                  required
                />
              </label>
            </div>
          )}
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="rafi_bd"
              autoComplete="username"
              required
            />
          </label>
          {isSignup && (
            <label>
              Email <span className="optional">optional</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>
          {isSignup && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />
            </label>
          )}
          {error && (
            <div className="auth-error">
              <CircleDollarSign size={15} />
              {error}
            </div>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy
              ? "Connecting…"
              : isSignup
                ? "Create my account"
                : "Sign in to SplitWise+"}
            <ArrowUpRight size={15} />
          </button>
        </form>
        <div className="auth-footnote">
          <Check size={13} /> BDT-first workspace · secure JWT session
        </div>
      </section>
    </div>
  );
}

function Landing({
  onEnter,
  onNavigate,
}: {
  onEnter: () => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <button className="brand" onClick={onEnter}>
          <span className="brand-mark">
            <Split size={17} />
          </span>
          <span>
            splitwise<span className="brand-plus">+</span>
          </span>
        </button>
        <nav>
          <a href="#product">Product</a>
          <a href="#solutions">Solutions</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          <button className="ghost-button" onClick={onEnter}>
            <LogIn size={15} /> Sign in
          </button>
          <button className="primary-button small" onClick={onEnter}>
            Get started <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> THE SHARED MONEY WORKSPACE
          </div>
          <h1>
            Shared money,
            <br />
            <em>without</em> the shared headache.
          </h1>
          <p>
            Split expenses, plan together, settle up, and keep every shared
            financial decision in one calm place — built around ৳.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={onEnter}>
              Start for free <ArrowUpRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                document
                  .getElementById("product")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore the product <span>↓</span>
            </button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <span
                className="avatar avatar-sm"
                style={{ background: "#b7f36b" }}
              >
                ৳
              </span>
              <span
                className="avatar avatar-sm"
                style={{ background: "#8dd8ff" }}
              >
                +
              </span>
              <span
                className="avatar avatar-sm"
                style={{ background: "#ffb1d5" }}
              >
                ↗
              </span>
            </div>
            <span>
              Built for the people
              <br />
              <strong>you share life with.</strong>
            </span>
          </div>
        </div>
        <div className="hero-demo" id="product">
          <div className="demo-glow" />
          <div className="demo-window">
            <div className="demo-window-top">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <span>your shared workspace</span>
              <span className="demo-lock">BDT</span>
            </div>
            <div className="demo-window-body">
              <div className="demo-mini-sidebar">
                <span className="active">
                  <LayoutDashboard size={14} />
                </span>
                <span>
                  <Receipt size={14} />
                </span>
                <span>
                  <WalletCards size={14} />
                </span>
                <span>
                  <MessageCircle size={14} />
                </span>
              </div>
              <div className="demo-panel">
                <div className="demo-heading">
                  <div>
                    <span className="muted-label">YOUR WORKSPACE</span>
                    <h3>
                      Shared finances <ChevronDown size={14} />
                    </h3>
                  </div>
                  <span className="demo-members">
                    <span
                      className="avatar avatar-sm"
                      style={{ background: "#b7f36b" }}
                    >
                      ৳
                    </span>
                    <span
                      className="avatar avatar-sm"
                      style={{ background: "#8dd8ff" }}
                    >
                      +
                    </span>
                    <b>Live</b>
                  </span>
                </div>
                <div className="demo-balance">
                  <span className="muted-label">CURRENT STATUS</span>
                  <strong>Connected</strong>
                  <span>Groups, expenses, plans, and chat in one place</span>
                </div>
                <div className="demo-tabs">
                  <button className="selected" onClick={onEnter}>
                    Expenses
                  </button>
                  <button onClick={onEnter}>Balances</button>
                  <button
                    onClick={() => {
                      onEnter();
                      onNavigate("chat");
                    }}
                  >
                    Messages
                  </button>
                </div>
                <div className="demo-card">
                  <div className="demo-card-icon">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <strong>Track every shared expense</strong>
                    <span>Participants, notes, and settlement context</span>
                  </div>
                  <b>৳</b>
                </div>
                <div className="demo-card faded">
                  <div className="demo-card-icon soft">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <strong>Plan together</strong>
                    <span>Budgets, polls, events, and recurring costs</span>
                  </div>
                  <button onClick={onEnter} className="demo-action">
                    Open
                  </button>
                </div>
                <div className="demo-chat">
                  <span className="chat-dot" />
                  <span>Real-time updates across your group</span>
                  <button
                    onClick={() => {
                      onEnter();
                      onNavigate("chat");
                    }}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="social-proof">
        <div>
          <strong>BDT</strong>
          <span>default currency</span>
        </div>
        <div>
          <strong>Live</strong>
          <span>group updates</span>
        </div>
        <div>
          <strong>Clear</strong>
          <span>settlement steps</span>
        </div>
        <div>
          <strong>Private</strong>
          <span>shared spaces</span>
        </div>
      </section>
      <section className="landing-section problem" id="solutions">
        <div className="section-kicker">THE OLD WAY</div>
        <div className="split-heading">
          <h2>
            Money gets messy
            <br />
            <em>when it gets shared.</em>
          </h2>
          <p>
            SplitWise+ turns the awkward questions into clear next steps —
            without making your group feel like a finance department.
          </p>
        </div>
        <div className="problem-grid">
          <div className="problem-card">
            <span>01</span>
            <h3>Know who paid and why</h3>
            <p>
              Keep every expense, participant, note, and settlement detail in
              the same shared context.
            </p>
            <button onClick={onEnter}>
              Track expenses <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="problem-card active-problem">
            <span>02</span>
            <h3>Close the balance clearly</h3>
            <p>
              See the recommended transfers and confirm payments without
              group-chat archaeology.
            </p>
            <button onClick={onEnter}>
              See balances <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="problem-card">
            <span>03</span>
            <h3>Plan before spending</h3>
            <p>
              Use budgets, polls, events, recurring expenses, and activity to
              keep everyone aligned.
            </p>
            <button onClick={onEnter}>
              Plan together <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <section className="workspace-section" id="features">
        <div className="workspace-copy">
          <div className="section-kicker">ONE GROUP. ONE WORKSPACE.</div>
          <h2>
            Everything shared,
            <br />
            <em>finally together.</em>
          </h2>
          <p>
            Expenses are just the beginning. Bring the conversation, decisions,
            plans, and money into the same shared context.
          </p>
          <div className="feature-list">
            <button className="feature-item active" onClick={onEnter}>
              <span className="feature-icon lime">
                <Receipt size={18} />
              </span>
              <span>
                <strong>Expenses that explain themselves</strong>
                <small>
                  Splits, notes, participants, and settlement context
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button
              className="feature-item"
              onClick={() => {
                onEnter();
                onNavigate("chat");
              }}
            >
              <span className="feature-icon blue">
                <MessageCircle size={18} />
              </span>
              <span>
                <strong>Messenger-style conversation</strong>
                <small>
                  Private threads, media, reactions, and live delivery
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button className="feature-item" onClick={onEnter}>
              <span className="feature-icon pink">
                <Target size={18} />
              </span>
              <span>
                <strong>Plans tied to reality</strong>
                <small>Budgets, votes, events, and recurring expenses</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="orbit-visual">
          <div className="orbit-core">
            <Split size={27} />
            <span>
              shared
              <br />
              workspace
            </span>
          </div>
          <div className="orbit-node node-expenses">
            <Receipt size={17} />
            <span>Expenses</span>
          </div>
          <div className="orbit-node node-chat">
            <MessageCircle size={17} />
            <span>Live chat</span>
          </div>
          <div className="orbit-node node-budget">
            <Target size={17} />
            <span>Budget</span>
          </div>
          <div className="orbit-node node-plan">
            <CalendarDays size={17} />
            <span>Plans</span>
          </div>
        </div>
      </section>
      <section className="settlement-section">
        <div className="settlement-visual">
          <div className="settlement-before">
            <span className="muted-label">BEFORE</span>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>unclear</strong>
            </div>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>untracked</strong>
            </div>
            <div>
              <b>?</b>
              <span /> <b>?</b>
              <strong>awkward</strong>
            </div>
          </div>
          <div className="settlement-arrow">
            <Sparkles size={18} />
            <ArrowUpRight size={18} />
          </div>
          <div className="settlement-after">
            <span className="muted-label">WITH SPLITWISE+</span>
            <div>
              <b>৳</b>
              <span /> <b>↗</b>
              <strong>clear</strong>
            </div>
            <div>
              <b>✓</b>
              <span /> <b>৳</b>
              <strong>settled</strong>
            </div>
            <small>Fewer, clearer next steps</small>
          </div>
        </div>
        <div className="settlement-copy">
          <div className="section-kicker">SMART SETTLEMENT</div>
          <h2>
            Less paying back.
            <br />
            <em>More moving on.</em>
          </h2>
          <p>
            SplitWise+ simplifies shared debts into the fewest, clearest
            payments — so your group can close the loop together.
          </p>
          <button className="text-button" onClick={onEnter}>
            See the workspace <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
      <section className="pricing-section" id="pricing">
        <div className="section-kicker">SIMPLE BY DESIGN</div>
        <h2>
          Start together.
          <br />
          <em>Grow when you need to.</em>
        </h2>
        <div className="pricing-grid">
          <div className="price-card">
            <span className="price-label">FREE</span>
            <h3>For the everyday share</h3>
            <div className="price">
              ৳ 0 <small>/ forever</small>
            </div>
            <p>Everything a small group needs to stay in sync.</p>
            <ul>
              <li>
                <Check size={15} /> Shared expenses
              </li>
              <li>
                <Check size={15} /> Settlement planning
              </li>
              <li>
                <Check size={15} /> Group chat
              </li>
            </ul>
            <button className="secondary-button" onClick={onEnter}>
              Get started
            </button>
          </div>
          <div className="price-card featured">
            <span className="price-label">
              PLUS <i>for growing groups</i>
            </span>
            <h3>For groups with more to manage</h3>
            <div className="price">
              ৳ 400 <small>/ member / month</small>
            </div>
            <p>More space for plans, budgets, media, and history.</p>
            <ul>
              <li>
                <Check size={15} /> Everything in Free
              </li>
              <li>
                <Check size={15} /> Media-rich messaging
              </li>
              <li>
                <Check size={15} /> Advanced analytics
              </li>
            </ul>
            <button className="primary-button" onClick={onEnter}>
              Start Plus <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="price-card">
            <span className="price-label">TEAMS</span>
            <h3>For communities in motion</h3>
            <div className="price">Let’s talk</div>
            <p>Permissions, workspaces, and control for larger groups.</p>
            <ul>
              <li>
                <Check size={15} /> Everything in Plus
              </li>
              <li>
                <Check size={15} /> Team permissions
              </li>
              <li>
                <Check size={15} /> Workspace controls
              </li>
            </ul>
            <button className="secondary-button" onClick={onEnter}>
              Contact us
            </button>
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <button className="brand" onClick={onEnter}>
          <span className="brand-mark">
            <Split size={17} />
          </span>
          <span>
            splitwise<span className="brand-plus">+</span>
          </span>
        </button>
        <span>Shared money, without the shared headache.</span>
        <span>© 2026 SplitWise+</span>
      </footer>
    </div>
  );
}
function AccountMenu({
  profile,
  onOpenSettings,
  onToggleTheme,
  onSignOut,
}: {
  profile: ProfileDTO | null;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
}) {
  const isLight = profile?.theme === "light";
  return (
    <div className="account-menu" role="menu">
      <div className="account-menu-heading">
        <span className="muted-label">ACCOUNT</span>
        <small>{profile?.status || "Available"}</small>
      </div>
      <button type="button" onClick={onToggleTheme}>
        <Sun size={15} />
        <span>{isLight ? "Use dark theme" : "Use light theme"}</span>
        <span className="menu-value">{isLight ? "Light" : "Dark"}</span>
      </button>
      <button type="button" onClick={onOpenSettings}>
        <Settings2 size={15} />
        <span>Settings</span>
        <ChevronDown size={14} className="menu-chevron" />
      </button>
      <div className="account-menu-divider" />
      <button type="button" className="account-menu-danger" onClick={onSignOut}>
        <LogIn size={15} />
        <span>Sign out</span>
      </button>
    </div>
  );
}

function SettingsPage({
  authUser,
  profile,
  profileImage,
  theme,
  onProfileSaved,
  onAvatarUpload,
  onThemeChange,
  onSignOut,
}: {
  authUser: AuthUser;
  profile: ProfileDTO | null;
  profileImage?: string;
  theme: "dark" | "light";
  onProfileSaved: (
    payload: Partial<Pick<ProfileDTO, "bio" | "status" | "theme">>,
  ) => Promise<void>;
  onAvatarUpload: (file: File) => Promise<void>;
  onThemeChange: (theme: "dark" | "light") => void;
  onSignOut: () => void | Promise<void>;
}) {
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [status, setStatus] = useState(profile?.status ?? "Available");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activityItems, setActivityItems] = useState<
    import("./lib/api").AccountActivityItem[]
  >([]);
  const [sessions, setSessions] = useState<
    import("./lib/api").AccountSession[]
  >([]);
  const [accountDataLoading, setAccountDataLoading] = useState(true);
  const [accountDataError, setAccountDataError] = useState("");
  const [sessionAction, setSessionAction] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const initials =
    profile?.initials ||
    authUser.display_name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  useEffect(() => {
    setBio(profile?.bio ?? "");
    setStatus(profile?.status ?? "Available");
  }, [profile?.bio, profile?.status]);

  const loadAccountData = async () => {
    setAccountDataLoading(true);
    setAccountDataError("");
    try {
      const [nextActivity, nextSessions] = await Promise.all([
        api.accountActivity(),
        api.accountSessions(),
      ]);
      setActivityItems(nextActivity);
      setSessions(nextSessions);
    } catch (requestError) {
      setAccountDataError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load account activity.",
      );
    } finally {
      setAccountDataLoading(false);
    }
  };

  useEffect(() => {
    void loadAccountData();
  }, []);

  const revokeSession = async (sessionId: string, current: boolean) => {
    setSessionAction(sessionId);
    try {
      if (current) {
        await onSignOut();
        return;
      }
      await api.revokeSession(sessionId);
      await loadAccountData();
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not revoke this session.",
      );
    } finally {
      setSessionAction("");
    }
  };

  const revokeOtherSessions = async () => {
    setSessionAction("all");
    try {
      await api.revokeAllSessions();
      await loadAccountData();
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not revoke other sessions.",
      );
    } finally {
      setSessionAction("");
    }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onProfileSaved({
        bio: bio.trim(),
        status: status.trim() || "Available",
      });
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your profile settings.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Choose an image file for your profile picture.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Profile pictures must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      await onAvatarUpload(file);
    } catch (requestError) {
      window.alert(
        requestError instanceof Error
          ? requestError.message
          : "Could not upload your profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="page-section settings-page">
      <div className="page-header settings-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> ACCOUNT SETTINGS
          </div>
          <h1>Make this workspace yours.</h1>
          <p>Update your profile, appearance, and account preferences.</p>
        </div>
        <span className="settings-security-note">
          <Check size={14} /> Changes save to your account
        </span>
      </div>
      <div className="settings-grid">
        <form className="glass-card settings-card" onSubmit={saveProfile}>
          <div className="section-heading">
            <div>
              <span className="muted-label">PROFILE</span>
              <h2>Your presence</h2>
            </div>
          </div>
          <div className="settings-profile-hero">
            <button
              type="button"
              className="settings-avatar-button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload profile picture"
            >
              <Avatar
                member={{ initials, color: "#b7f36b" }}
                size="lg"
                avatarUrl={profileImage}
              />
              <span className="settings-avatar-badge">
                <Image size={13} />
              </span>
            </button>
            <div>
              <strong>{authUser.display_name}</strong>
              <small>@{authUser.username}</small>
              <button
                type="button"
                className="text-button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Change profile picture"}
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
          />
          <label className="field-label">
            Status
            <input
              value={status}
              maxLength={80}
              onChange={(event) => setStatus(event.target.value)}
              placeholder="Available"
            />
          </label>
          <label className="field-label">
            About you
            <textarea
              value={bio}
              maxLength={240}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell your group a little about you"
              rows={4}
            />
          </label>
          <div className="settings-form-footer">
            <small>{bio.length}/240 characters</small>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
        <div className="settings-column">
          <div className="glass-card settings-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">APPEARANCE</span>
                <h2>Theme</h2>
              </div>
              <Palette size={18} />
            </div>
            <p className="settings-description">
              Choose the workspace appearance used across your signed-in
              sessions.
            </p>
            <div className="theme-options">
              {(["dark", "light"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`theme-option ${theme === option ? "selected" : ""}`}
                  onClick={() => onThemeChange(option)}
                >
                  <span className={`theme-preview ${option}`} />
                  <span>
                    <strong>
                      {option === "dark" ? "Dark glass" : "Light glass"}
                    </strong>
                    <small>
                      {theme === option ? "Active" : "Use this theme"}
                    </small>
                  </span>
                  {theme === option && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">SECURITY</span>
                <h2>Active sessions</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => void loadAccountData()}
                title="Refresh sessions"
              >
                <Activity size={16} />
              </button>
            </div>
            <p className="settings-description">
              Review where your account is signed in and revoke anything
              unfamiliar.
            </p>
            {accountDataError && (
              <p className="settings-inline-error">{accountDataError}</p>
            )}
            {accountDataLoading ? (
              <p className="settings-empty-state">Loading active sessions…</p>
            ) : sessions.length ? (
              <div className="session-list">
                {sessions.map((session) => (
                  <div className="session-row" key={session.id}>
                    <div className="session-icon">
                      <UserRound size={16} />
                    </div>
                    <div className="session-copy">
                      <strong>
                        {session.device_label}
                        {session.is_current ? " · This device" : ""}
                      </strong>
                      <small>
                        Last active{" "}
                        {new Date(session.last_seen_at).toLocaleString(
                          "en-BD",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}
                      </small>
                      <small>{session.ip_address || "IP unavailable"}</small>
                    </div>
                    <button
                      type="button"
                      className="text-button session-revoke-button"
                      disabled={sessionAction === session.id}
                      onClick={() =>
                        void revokeSession(session.id, session.is_current)
                      }
                    >
                      {sessionAction === session.id
                        ? "Revoking…"
                        : session.is_current
                          ? "Sign out"
                          : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-empty-state">No active sessions found.</p>
            )}
            {sessions.some((session) => !session.is_current) && (
              <button
                type="button"
                className="outline-button settings-wide-button"
                disabled={sessionAction === "all"}
                onClick={() => void revokeOtherSessions()}
              >
                {sessionAction === "all"
                  ? "Revoking…"
                  : "Revoke all other sessions"}
              </button>
            )}
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">ACCOUNT</span>
                <h2>Account details</h2>
              </div>
              <UserRound size={18} />
            </div>
            <div className="settings-detail-row">
              <span>Name</span>
              <strong>{authUser.display_name}</strong>
            </div>
            <div className="settings-detail-row">
              <span>Username</span>
              <strong>@{authUser.username}</strong>
            </div>
            <div className="settings-detail-row">
              <span>Email</span>
              <strong>{authUser.email || "Not added"}</strong>
            </div>
            <p className="settings-description">
              Your account identity is managed through the secure sign-in flow.
            </p>
          </div>
          <div className="glass-card settings-card account-details-card">
            <div className="section-heading">
              <div>
                <span className="muted-label">AUDIT TRAIL</span>
                <h2>Recent activity</h2>
              </div>
              <Activity size={18} />
            </div>
            <p className="settings-description">
              A private record of sign-ins, profile changes, and session
              actions.
            </p>
            {accountDataLoading ? (
              <p className="settings-empty-state">Loading activity…</p>
            ) : activityItems.length ? (
              <div className="activity-log-list">
                {activityItems.slice(0, 8).map((item) => (
                  <div className="settings-activity-row" key={item.id}>
                    <span className="activity-log-dot" />
                    <div>
                      <strong>{item.description}</strong>
                      <small>
                        {item.device_label} ·{" "}
                        {new Date(item.created_at).toLocaleString("en-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings-empty-state">
                No account activity has been recorded yet.
              </p>
            )}
          </div>
          <div className="glass-card settings-card danger-card">
            <div>
              <span className="muted-label">SESSION</span>
              <h2>Sign out everywhere</h2>
              <p className="settings-description">
                End this browser session and return to the public landing page.
              </p>
            </div>
            <button
              type="button"
              className="outline-button danger-button"
              onClick={onSignOut}
            >
              <LogIn size={15} /> Sign out
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Sidebar({
  activeView,
  onNavigate,
  onLanding,
  activeGroup,
  availableGroups,
  groupMenuOpen,
  onToggleGroupMenu,
  onGroupChange,
  onCreateGroup,
  onOpenInvite,
  onOpenPalette,
  profileImage,
  profile,
  accountMenuOpen,
  onToggleAccountMenu,
  onOpenSettings,
  onToggleTheme,
  onSignOut,
  authUser,
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  onLanding: () => void;
  activeGroup: Group;
  availableGroups: Group[];
  groupMenuOpen: boolean;
  onToggleGroupMenu: () => void;
  onGroupChange: (group: Group) => void;
  onCreateGroup: () => void;
  onOpenInvite: () => void;
  onOpenPalette: () => void;
  profileImage?: string;
  profile: ProfileDTO | null;
  accountMenuOpen: boolean;
  onToggleAccountMenu: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
  authUser: AuthUser | null;
}) {
  const accountInitials = (authUser?.display_name || "Account")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <button type="button" className="brand app-brand" onClick={onLanding}>
        <span className="brand-mark">
          <Split size={17} />
        </span>
        <span>
          splitwise<span className="brand-plus">+</span>
        </span>
      </button>
      <div className="group-switcher-wrap">
        <button
          type="button"
          className="group-switcher"
          onClick={onToggleGroupMenu}
          aria-expanded={groupMenuOpen}
        >
          <span
            className="group-symbol"
            style={{ background: activeGroup.accent }}
          >
            {activeGroup.emoji}
          </span>
          <span>
            <small>ACTIVE GROUP</small>
            <strong>{activeGroup.name}</strong>
          </span>
          <ChevronDown size={15} />
        </button>
        {groupMenuOpen && (
          <div className="group-menu">
            {availableGroups.map((group) => (
              <button
                type="button"
                key={group.id}
                className={group.id === activeGroup.id ? "selected" : ""}
                onClick={() => onGroupChange(group)}
              >
                <span
                  className="group-symbol"
                  style={{ background: group.accent }}
                >
                  {group.emoji}
                </span>
                <span>
                  <strong>{group.name}</strong>
                  <small>
                    {group.members} members · {money(group.total)}
                  </small>
                </span>
                {group.id === activeGroup.id && <Check size={14} />}
              </button>
            ))}
            <div className="group-menu-actions">
              <button type="button" onClick={onCreateGroup}>
                <Plus size={14} /> New group
              </button>
              {activeGroup.id !== "none" && (
                <button type="button" onClick={onOpenInvite}>
                  <Users size={14} /> Invite people
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <nav className="side-nav">
        <span className="nav-section">Workspace</span>
        <NavButton
          icon={<LayoutDashboard size={17} />}
          label="Dashboard"
          active={activeView === "dashboard"}
          onClick={() => onNavigate("dashboard")}
        />
        <NavButton
          icon={<Receipt size={17} />}
          label="Expenses"
          active={activeView === "expenses"}
          onClick={() => onNavigate("expenses")}
        />
        <NavButton
          icon={<WalletCards size={17} />}
          label="Settle up"
          active={activeView === "settle"}
          onClick={() => onNavigate("settle")}
        />
        <NavButton
          icon={<CalendarDays size={17} />}
          label="Plan"
          active={activeView === "plan"}
          onClick={() => onNavigate("plan")}
        />
        <NavButton
          icon={<MessageCircle size={17} />}
          label="Messages"
          active={activeView === "chat"}
          onClick={() => onNavigate("chat")}
        />
        <span className="nav-section space-top">Manage</span>
        <NavButton
          icon={<Target size={17} />}
          label="Budgets"
          onClick={() => onNavigate("overview")}
        />
        <NavButton
          icon={<FileText size={17} />}
          label="Documents"
          onClick={() => onNavigate("overview")}
        />
        <NavButton
          icon={<Activity size={17} />}
          label="Activity"
          onClick={() => onNavigate("overview")}
        />
      </nav>
      <div className="sidebar-bottom">
        <button type="button" className="command-hint" onClick={onOpenPalette}>
          <Command size={14} />
          <span>Quick actions</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          type="button"
          className="profile profile-button"
          onClick={onToggleAccountMenu}
          aria-expanded={accountMenuOpen}
        >
          <Avatar
            member={{ initials: accountInitials, color: "#b7f36b" }}
            avatarUrl={profileImage}
          />
          <span>
            <strong>{authUser?.display_name || "Account"}</strong>
            <small>{authUser ? "Signed in account" : "Account"}</small>
          </span>
          <MoreHorizontal size={16} />
        </button>
        {accountMenuOpen && (
          <AccountMenu
            profile={profile}
            onOpenSettings={onOpenSettings}
            onToggleTheme={onToggleTheme}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </aside>
  );
}
function GroupCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    emoji: string;
    description: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✦");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onCreate({ name, emoji, description });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the group.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close icon-button" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Users size={19} />
        </div>
        <span className="muted-label">NEW SHARED SPACE</span>
        <h2>Create a group</h2>
        <p className="auth-subtitle">
          Start a real BDT workspace, then invite people by username.
        </p>
        <form onSubmit={submit}>
          <label>
            Group name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dhanmondi house"
              required
            />
          </label>
          <div className="auth-grid">
            <label>
              Icon
              <input
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                maxLength={2}
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you sharing?"
              />
            </label>
          </div>
          {error && (
            <div className="auth-error">
              <CircleDollarSign size={15} />
              {error}
            </div>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? "Creating…" : "Create group"}
            <ArrowUpRight size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}

function InviteModal({
  group,
  invitations,
  currentUserId,
  onClose,
  onInvite,
  onAccept,
  onDecline,
  onToast,
}: {
  group: Group;
  invitations: import("./lib/api").GroupInvitation[];
  currentUserId: number;
  onClose: () => void;
  onInvite: (username: string) => Promise<void>;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<
    import("./lib/api").DirectoryUser[]
  >([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api
        .directoryUsers(search)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const invite = async (username: string) => {
    setBusy(true);
    try {
      await onInvite(username);
      setSearch("");
      setSuggestions([]);
      onToast(`Invitation sent to @${username}.`);
    } catch (requestError) {
      onToast(
        requestError instanceof Error
          ? requestError.message
          : "Could not send invitation.",
      );
    } finally {
      setBusy(false);
    }
  };
  const copyLink = async (token: string) => {
    await navigator.clipboard?.writeText(
      `${window.location.origin}/?invite=${token}`,
    );
    onToast(
      "Invitation link copied. The invited user must sign in as the matching username.",
    );
  };
  return (
    <div className="auth-backdrop" onClick={onClose}>
      <section
        className="auth-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="auth-close icon-button" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="auth-mark">
          <Users size={19} />
        </div>
        <span className="muted-label">GROUP INVITATIONS</span>
        <h2>Invite to {group.name}</h2>
        <p className="auth-subtitle">
          Search every active SplitWise+ account by username. Invitations are
          delivered to the recipient’s inbox.
        </p>
        <label>
          Search username
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="tisha_bd"
            autoComplete="off"
          />
        </label>
        {suggestions.length > 0 && (
          <div className="invite-suggestions">
            {suggestions.map((user) => (
              <button key={user.id} onClick={() => void invite(user.username)}>
                <Avatar
                  member={{ initials: user.initials, color: "#8dd8ff" }}
                  size="sm"
                  avatarUrl={user.avatar ?? undefined}
                />
                <span>
                  <strong>{user.display_name}</strong>
                  <small>@{user.username}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
        )}
        <div className="invite-list">
          <span className="muted-label">YOUR INVITATIONS</span>
          {invitations.length === 0 && <small>No invitations yet.</small>}
          {invitations.map((item) => {
            // Only the invited account can respond; the sender gets the share link.
            const isRecipient = item.invitee === currentUserId;
            return (
              <div className="invite-row" key={item.id}>
                <span className="invite-row-copy">
                  <strong>{item.group_name}</strong>
                  <small>
                    {isRecipient
                      ? `${item.inviter_name} invited you`
                      : `You invited @${item.invitee_username}`}
                    {" · "}
                    {item.status}
                  </small>
                </span>
                {item.status === "pending" &&
                  (isRecipient ? (
                    <span className="invite-row-actions">
                      <button
                        className="secondary-button small"
                        onClick={() => void onAccept(item.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void onDecline(item.id)}
                      >
                        Decline
                      </button>
                    </span>
                  ) : (
                    <button
                      className="icon-button"
                      onClick={() => void copyLink(item.token)}
                      title="Copy invitation link"
                    >
                      <Copy size={15} />
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
        <button className="secondary-button" onClick={onClose}>
          Done
        </button>
      </section>
    </div>
  );
}

function AnnouncementBanner({
  invitation,
  extraCount,
  onAccept,
  onDecline,
  onDismiss,
  onViewAll,
}: {
  invitation: import("./lib/api").GroupInvitation;
  extraCount: number;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
  onDismiss: (id: number) => void;
  onViewAll: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "That invitation action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="announcement-banner" role="status">
      <span className="announcement-icon">
        <Users size={15} />
      </span>
      <p className="announcement-copy">
        <strong>{invitation.inviter_name}</strong> invited you to join{" "}
        <strong>{invitation.group_name}</strong>.
        {extraCount > 0 && (
          <button
            type="button"
            className="announcement-more"
            onClick={onViewAll}
          >
            +{extraCount} more invitation{extraCount > 1 ? "s" : ""}
          </button>
        )}
        {error && <small className="announcement-error">{error}</small>}
      </p>
      <div className="announcement-actions">
        <button
          type="button"
          className="announcement-join"
          disabled={busy}
          onClick={() => void run(() => onAccept(invitation.id))}
        >
          {busy ? "Working…" : "Join group"} <ArrowUpRight size={14} />
        </button>
        <button
          type="button"
          className="announcement-decline"
          disabled={busy}
          onClick={() => void run(() => onDecline(invitation.id))}
        >
          Decline
        </button>
      </div>
      <button
        type="button"
        className="announcement-close"
        onClick={() => onDismiss(invitation.id)}
        aria-label="Dismiss announcement"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: ReactElement;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {badge && <b>{badge}</b>}
    </button>
  );
}
function NavIcon({ view }: { view: View }) {
  return view === "overview" ? (
    <LayoutDashboard size={17} />
  ) : view === "expenses" ? (
    <Receipt size={17} />
  ) : view === "settle" ? (
    <WalletCards size={17} />
  ) : view === "plan" ? (
    <CalendarDays size={17} />
  ) : (
    <MessageCircle size={17} />
  );
}
function Topbar({
  activeGroup,
  query,
  setQuery,
  onOpenInvite,
  onNotifications,
  onTheme,
  theme,
  alertCount,
}: {
  activeGroup: Group;
  query: string;
  setQuery: (value: string) => void;
  onOpenInvite: () => void;
  onNotifications: () => void;
  onTheme: () => void;
  theme: string;
  alertCount: number;
}) {
  return (
    <header className="topbar">
      <div className="breadcrumbs">
        <span>Groups</span>
        <b>/</b>
        <strong>{activeGroup.name}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anything"
          />
          <kbd>⌘ K</kbd>
        </label>
        <button
          className="icon-button theme-toggle"
          onClick={onTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={17} /> : <Zap size={17} />}
        </button>
        <button
          className="icon-button notification-button"
          onClick={onNotifications}
          aria-label={
            alertCount > 0
              ? `Open notifications, ${alertCount} unread`
              : "Open notifications"
          }
        >
          <Bell size={17} />
          {alertCount > 0 && <i />}
        </button>
        {activeGroup.id !== "none" && (
          <button className="invite-button" onClick={onOpenInvite}>
            <Plus size={16} /> Invite
          </button>
        )}
      </div>
    </header>
  );
}

function Overview({
  activeGroup,
  summary,
  settlementPlan,
  budgets,
  onAddExpense,
  onNavigate,
  expenses,
  activity,
}: {
  activeGroup: Group;
  summary: {
    total_spend: string;
    expense_count: number;
    member_count: number;
  } | null;
  settlementPlan: import("./lib/api").SettlementPlan | null;
  budgets: import("./lib/api").Budget[];
  onAddExpense: () => void;
  onNavigate: (view: View) => void;
  expenses: Expense[];
  activity: ActivityItem[];
}) {
  const total = Number(summary?.total_spend ?? 0);
  const transfers = settlementPlan?.transfers ?? [];
  const membersDetail = activeGroup.members_detail ?? [];
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP OVERVIEW
          </div>
          <h1>
            {activeGroup.name} <span>{activeGroup.emoji}</span>
          </h1>
          <p>{activeGroup.meta} · live data from your shared workspace.</p>
        </div>
        <div className="page-actions">
          <button
            className="secondary-button"
            onClick={() => onNavigate("chat")}
          >
            <MessageCircle size={15} /> Open group chat
          </button>
          <button className="primary-button" onClick={onAddExpense}>
            <Plus size={17} /> Add expense
          </button>
        </div>
      </div>
      <div className="overview-grid">
        <div className="balance-card glass-card">
          <div className="card-topline">
            <span className="muted-label">SHARED SPEND</span>
            <button
              className="more-button"
              onClick={() => onNavigate("expenses")}
            >
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="balance-number">{money(total)}</div>
          <div className="balance-explainer">
            <span className="positive-dot" /> {summary?.expense_count ?? 0}{" "}
            recorded expenses
          </div>
          <button
            className="card-action"
            onClick={() => onNavigate("expenses")}
          >
            Open group ledger <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="budget-card glass-card">
          <div className="card-topline">
            <span className="muted-label">BUDGETS</span>
            <span className="trend positive">{budgets.length} active</span>
          </div>
          {budgets.length ? (
            <>
              <div className="budget-number">
                {money(Number(budgets[0].spent))}{" "}
                <small>of {money(Number(budgets[0].amount))}</small>
              </div>
              <div className="progress-track">
                <span style={{ width: `${budgets[0].percent}%` }} />
              </div>
              <div className="budget-meta">
                <span>{budgets[0].name}</span>
                <strong>{budgets[0].percent}%</strong>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <strong>No budgets yet.</strong>
              <span>Create one from the connected group controls.</span>
            </div>
          )}
          <button
            className="card-action"
            onClick={() => onNavigate("overview")}
          >
            Manage budgets <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="members-card glass-card">
          <div className="card-topline">
            <span className="muted-label">GROUP MEMBERS</span>
            <button className="more-button" onClick={() => onNavigate("chat")}>
              <MoreHorizontal size={17} />
            </button>
          </div>
          <div className="member-count">
            <strong>{summary?.member_count ?? activeGroup.members}</strong>
            <span>
              people
              <br />
              in this group
            </span>
          </div>
          <div className="member-avatars">
            {membersDetail.slice(0, 5).map((member) => (
              <span
                key={member.user_id}
                className="avatar avatar-md"
                style={{ background: "#8dd8ff" }}
              >
                {member.initials}
              </span>
            ))}
          </div>
          <div className="member-online">
            <span className="positive-dot" /> Membership synced from Django
          </div>
          <button className="card-action" onClick={() => onNavigate("chat")}>
            <MessageCircle size={15} /> Open conversation
          </button>
        </div>
      </div>
      <div className="section-row">
        <div>
          <span className="muted-label">RECENT ACTIVITY</span>
          <h2>What is happening now</h2>
        </div>
        <button className="text-button" onClick={() => onNavigate("expenses")}>
          View ledger <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="lower-grid">
        <div className="activity-card glass-card">
          {activity.length ? (
            activity.slice(0, 6).map((item) => (
              <div className="activity-row" key={item.id}>
                <Avatar
                  member={{ initials: item.initials, color: item.color }}
                  size="sm"
                />
                <span>
                  <strong>{item.member}</strong> {item.action}{" "}
                  <b>{item.target}</b>
                  <small>{item.time}</small>
                </span>
                <button
                  className="row-arrow"
                  onClick={() => onNavigate("expenses")}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Activity size={22} />
              </div>
              <h3>No activity yet.</h3>
              <p>
                New expenses, messages, invitations, and decisions will appear
                here.
              </p>
            </div>
          )}
        </div>
        <div className="insight-card">
          <div className="insight-icon">
            <Sparkles size={18} />
          </div>
          <span className="muted-label">WORKSPACE STATUS</span>
          <h3>
            {transfers.length
              ? `${transfers.length} settlement steps`
              : "No settlements yet"}
          </h3>
          <p>
            {transfers.length
              ? "Review the recommended transfers to close the group balance."
              : "Add a shared expense to calculate optimized settlement steps."}
          </p>
          <button className="text-button" onClick={() => onNavigate("settle")}>
            View settlement plan <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
function ExpensesPage({
  activeGroup,
  expenses,
  onAddExpense,
  query,
  onToast,
}: {
  activeGroup: Group;
  expenses: Expense[];
  onAddExpense: () => void;
  query: string;
  onToast: (message: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const filtered = expenses.filter(
    (expense) =>
      `${expense.title} ${expense.category} ${expense.payer}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All" || expense.category === filter),
  );
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> GROUP LEDGER
          </div>
          <h1>
            Expenses <span className="count-pill">{expenses.length}</span>
          </h1>
          <p>
            {activeGroup.name} · every shared cost, with the full story
            attached.
          </p>
        </div>
        <button className="primary-button" onClick={onAddExpense}>
          <Plus size={17} /> Add expense
        </button>
      </div>
      <div className="toolbar glass-card">
        <div className="filter-tabs">
          {["All", "Food", "Stay", "Transport", "Activities"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="outline-button"
          onClick={() => onToast("More filters are ready to use")}
        >
          <Filter size={15} /> Filters
        </button>
      </div>
      <div className="expense-list glass-card">
        {filtered.length === 0 ? (
          <EmptyState onAddExpense={onAddExpense} />
        ) : (
          filtered.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <span
                className={`expense-category ${expense.category.toLowerCase()}`}
              >
                {expense.category === "Food"
                  ? "◒"
                  : expense.category === "Stay"
                    ? "⌂"
                    : expense.category === "Transport"
                      ? "↗"
                      : "✦"}
              </span>
              <span className="expense-main">
                <strong>{expense.title}</strong>
                <small>{expense.note}</small>
              </span>
              <span className="expense-payer">
                <small>Paid by</small>
                <strong>{expense.payer}</strong>
              </span>
              <span className="expense-date">{expense.date}</span>
              <span className="expense-status">
                <i className={expense.status === "Pending" ? "pending" : ""} />
                {expense.status}
              </span>
              <strong className="expense-amount">
                {money(expense.amount)}
              </strong>
              <button
                className="row-arrow"
                onClick={() => onToast(`${expense.title} details opened`)}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="page-footer-hint">
        <Sparkles size={15} /> Tip: attach a receipt to make every expense
        easier to trust.
      </div>
    </>
  );
}
function EmptyState({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Receipt size={22} />
      </div>
      <h3>No expenses match that filter.</h3>
      <p>Try another category or add the first expense for this group.</p>
      <button className="secondary-button" onClick={onAddExpense}>
        <Plus size={15} /> Add expense
      </button>
    </div>
  );
}
function SettlePage({
  activeGroup,
  settlementPlan,
  onToast,
}: {
  activeGroup: Group;
  settlementPlan: import("./lib/api").SettlementPlan | null;
  onToast: (message: string) => void;
}) {
  const transfers = settlementPlan?.transfers ?? [];
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> CLOSE THE LOOP
          </div>
          <h1>
            Settle up <span>↗</span>
          </h1>
          <p>
            {activeGroup.name} · live recommended transfers from the group
            ledger.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            onToast(
              transfers.length
                ? "Choose a transfer to continue settlement."
                : "Add an expense before requesting settlement.",
            )
          }
        >
          <ArrowUpRight size={16} /> Request settlement
        </button>
      </div>
      <div className="settle-hero glass-card">
        <div>
          <span className="muted-label">OPEN TRANSFERS</span>
          <strong>{transfers.length}</strong>
          <p>recommended next steps</p>
        </div>
        <div className="settle-spark">
          <Sparkles size={23} />
          <span>
            Smart
            <br />
            simplify
          </span>
        </div>
        <div className="settle-total">
          <small>GROUP TOTAL TO SETTLE</small>
          <b>
            {money(
              transfers.reduce((sum, item) => sum + Number(item.amount), 0),
            )}
          </b>
        </div>
      </div>
      <div className="settle-grid">
        <div className="glass-card settle-list">
          <div className="card-heading">
            <div>
              <span className="muted-label">RECOMMENDED TRANSFERS</span>
              <h2>Where money should move</h2>
            </div>
          </div>
          {transfers.length ? (
            transfers.map((transfer) => (
              <TransferRow
                key={`${transfer.from_user}-${transfer.to_user}`}
                from={transfer.from_name}
                to={transfer.to_name}
                amount={Number(transfer.amount)}
                color="#8dd8ff"
                onToast={onToast}
              />
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <WalletCards size={22} />
              </div>
              <h3>No open transfers.</h3>
              <p>
                Once the group has shared expenses, optimized settlement
                recommendations will appear here.
              </p>
            </div>
          )}
        </div>
        <div className="glass-card breakdown-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">SETTLEMENT STATUS</span>
              <h2>
                {transfers.length ? "Ready to review" : "Nothing to settle"}
              </h2>
            </div>
          </div>
          <p className="breakdown-note">
            <Sparkles size={14} /> This view is calculated from the current
            group expenses and membership.
          </p>
        </div>
      </div>
    </>
  );
}
function TransferRow({
  from,
  to,
  amount,
  color,
  onToast,
}: {
  from: string;
  to: string;
  amount: number;
  color: string;
  onToast: (message: string) => void;
}) {
  return (
    <div className="transfer-row">
      <span className="transfer-avatar" style={{ background: color }}>
        {to.slice(0, 1)}
      </span>
      <span>
        <strong>
          {from} <ArrowUpRight size={13} /> {to}
        </strong>
        <small>Outstanding balance</small>
      </span>
      <b>{money(amount)}</b>
      <button
        className="settle-button"
        onClick={() => onToast(`Settlement request sent to ${to}`)}
      >
        Request
      </button>
    </div>
  );
}
function PlanPage({
  activeGroup,
  events,
  polls,
  recurring,
  onToast,
  onSync,
  currentUserId,
}: {
  activeGroup: Group;
  events: import("./lib/api").GroupEvent[];
  polls: import("./lib/api").Poll[];
  recurring: import("./lib/api").RecurringExpense[];
  onToast: (message: string) => void;
  onSync: () => Promise<void>;
  currentUserId: number;
}) {
  const [form, setForm] = useState<"event" | "poll" | "recurring" | null>(null);
  const [busy, setBusy] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventBudget, setEventBudget] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [recurringNextRun, setRecurringNextRun] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const isConnected = /^\d+$/.test(activeGroup.id);
  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await operation();
      await onSync();
      setForm(null);
      onToast(success);
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Could not complete that plan action.",
      );
    } finally {
      setBusy(false);
    }
  };
  const createEvent = () => {
    if (!eventTitle.trim() || !eventDate || !isConnected) return;
    void run(async () => {
      await api.createEvent({
        group: Number(activeGroup.id),
        title: eventTitle.trim(),
        description: "",
        starts_at: new Date(eventDate).toISOString(),
        location: eventLocation.trim(),
        budget: eventBudget || "0",
        checklist: [],
      });
      setEventTitle("");
      setEventDate("");
      setEventLocation("");
      setEventBudget("");
    }, "Event created in the group calendar.");
  };
  const createPoll = () => {
    const options = pollOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    if (!pollQuestion.trim() || options.length < 2 || !isConnected) return;
    void run(async () => {
      await api.createPoll({
        group: Number(activeGroup.id),
        question: pollQuestion.trim(),
        options,
      });
      setPollQuestion("");
      setPollOptions("Yes\nNo");
    }, "Poll published for the group.");
  };
  const createRecurring = () => {
    if (
      !recurringTitle.trim() ||
      !recurringAmount ||
      !recurringNextRun ||
      !isConnected
    )
      return;
    void run(async () => {
      await api.createRecurringExpense({
        group: Number(activeGroup.id),
        title: recurringTitle.trim(),
        category: "Other",
        amount: recurringAmount,
        payer: currentUserId,
        frequency: recurringFrequency,
        next_run: recurringNextRun,
        split_mode: "equal",
      });
      setRecurringTitle("");
      setRecurringAmount("");
    }, "Recurring expense scheduled.");
  };
  const vote = (pollId: number, optionId: number) => {
    void run(async () => {
      await api.votePoll(pollId, optionId);
    }, "Vote recorded.");
  };
  const rsvp = (eventId: number) => {
    void run(async () => {
      await api.rsvpEvent(eventId);
    }, "Event attendance updated.");
  };
  const generate = (recurringId: number) => {
    void run(async () => {
      await api.generateRecurringExpense(recurringId);
    }, "Recurring expense generated in the ledger.");
  };
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow muted">
            <span className="eyebrow-dot" /> PLAN TOGETHER
          </div>
          <h1>
            Group plans <span>✦</span>
          </h1>
          <p>
            {activeGroup.name} · create and manage events, decisions, and
            recurring commitments.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="secondary-button"
            onClick={() => setForm("poll")}
            disabled={!isConnected}
          >
            <Check size={15} /> New poll
          </button>
          <button
            className="primary-button"
            onClick={() => setForm("event")}
            disabled={!isConnected}
          >
            <Plus size={17} /> Add event
          </button>
        </div>
      </div>
      {form && (
        <div className="glass-card plan-form-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">
                {form === "event"
                  ? "NEW GROUP EVENT"
                  : form === "poll"
                    ? "NEW GROUP POLL"
                    : "NEW RECURRING EXPENSE"}
              </span>
              <h2>
                {form === "event"
                  ? "Schedule something together"
                  : form === "poll"
                    ? "Ask the group"
                    : "Schedule a shared commitment"}
              </h2>
            </div>
            <button className="icon-button" onClick={() => setForm(null)}>
              <X size={16} />
            </button>
          </div>
          {form === "event" && (
            <div className="connected-form-grid">
              <label>
                Title
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  placeholder="Friday dinner"
                />
              </label>
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  value={eventLocation}
                  onChange={(event) => setEventLocation(event.target.value)}
                  placeholder="Dhanmondi"
                />
              </label>
              <label>
                Budget
                <input
                  value={eventBudget}
                  onChange={(event) =>
                    setEventBudget(event.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="৳ amount"
                />
              </label>
              <button
                className="primary-button"
                onClick={createEvent}
                disabled={busy || !eventTitle.trim() || !eventDate}
              >
                {busy ? "Saving…" : "Create event"}
              </button>
            </div>
          )}
          {form === "poll" && (
            <div className="connected-form-grid">
              <label>
                Question
                <input
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Where should we eat?"
                />
              </label>
              <label>
                Options <small>one per line</small>
                <textarea
                  value={pollOptions}
                  onChange={(event) => setPollOptions(event.target.value)}
                  rows={4}
                />
              </label>
              <button
                className="primary-button"
                onClick={createPoll}
                disabled={
                  busy ||
                  !pollQuestion.trim() ||
                  pollOptions.split("\n").filter((option) => option.trim())
                    .length < 2
                }
              >
                {busy ? "Publishing…" : "Publish poll"}
              </button>
            </div>
          )}
          {form === "recurring" && (
            <div className="connected-form-grid">
              <label>
                Expense title
                <input
                  value={recurringTitle}
                  onChange={(event) => setRecurringTitle(event.target.value)}
                  placeholder="Monthly Wi-Fi"
                />
              </label>
              <label>
                Amount
                <input
                  value={recurringAmount}
                  onChange={(event) =>
                    setRecurringAmount(
                      event.target.value.replace(/[^0-9.]/g, ""),
                    )
                  }
                  placeholder="৳ amount"
                />
              </label>
              <label>
                Frequency
                <select
                  value={recurringFrequency}
                  onChange={(event) =>
                    setRecurringFrequency(event.target.value)
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </label>
              <label>
                Next run
                <input
                  type="date"
                  value={recurringNextRun}
                  onChange={(event) => setRecurringNextRun(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={createRecurring}
                disabled={busy || !recurringTitle.trim() || !recurringAmount}
              >
                {busy ? "Scheduling…" : "Schedule expense"}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="plan-grid">
        <div className="glass-card timeline-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">UPCOMING EVENTS</span>
              <h2>Shared calendar</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setForm("event")}
              disabled={!isConnected}
            >
              <Plus size={16} />
            </button>
          </div>
          {events.length ? (
            events.map((event) => (
              <div className="timeline-item" key={event.id}>
                <div className="timeline-date">
                  <b>{new Date(event.starts_at).getDate()}</b>
                  <span>
                    {new Date(event.starts_at)
                      .toLocaleString("en", { month: "short" })
                      .toUpperCase()}
                  </span>
                </div>
                <div className="timeline-copy">
                  <span className="status-chip blue">EVENT</span>
                  <h3>{event.title}</h3>
                  <p>
                    {new Date(event.starts_at).toLocaleString()} ·{" "}
                    {event.location || "Location to be decided"} · budget{" "}
                    {money(Number(event.budget))}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => rsvp(event.id)}
                    disabled={busy}
                  >
                    {event.attendees.includes(currentUserId)
                      ? "Cancel RSVP"
                      : "RSVP"}{" "}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarDays size={22} />
              </div>
              <h3>No events scheduled.</h3>
              <p>Create a group event and invite members to RSVP.</p>
              <button
                className="secondary-button"
                onClick={() => setForm("event")}
                disabled={!isConnected}
              >
                <Plus size={15} /> Create event
              </button>
            </div>
          )}
        </div>
        <div className="glass-card task-card">
          <div className="card-heading">
            <div>
              <span className="muted-label">DECISIONS & COMMITMENTS</span>
              <h2>Keep plans current</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setForm("poll")}
              disabled={!isConnected}
            >
              <Plus size={16} />
            </button>
          </div>
          {polls.length ? (
            polls.map((poll) => (
              <div className="plan-poll" key={poll.id}>
                <div className="task-person">
                  <span className="feature-icon blue">
                    <Check size={15} />
                  </span>
                  <span>
                    <strong>{poll.question}</strong>
                    <small>
                      {poll.total_votes} votes ·{" "}
                      {poll.is_closed ? "Closed" : "Open"}
                    </small>
                  </span>
                </div>
                <div className="poll-options">
                  {poll.options.map((option) => (
                    <button
                      key={option.id}
                      className="poll-option"
                      onClick={() => vote(poll.id, option.id)}
                      disabled={busy || poll.is_closed}
                    >
                      <span>{option.label}</span>
                      <b>{option.votes}</b>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Check size={22} />
              </div>
              <h3>No polls yet.</h3>
              <p>Publish a decision and let the group vote.</p>
              <button
                className="secondary-button"
                onClick={() => setForm("poll")}
                disabled={!isConnected}
              >
                <Plus size={15} /> Create poll
              </button>
            </div>
          )}
          {recurring.length ? (
            <div className="recurring-list">
              {recurring.map((item) => (
                <div className="task-person" key={item.id}>
                  <span className="feature-icon lime">
                    <CalendarDays size={15} />
                  </span>
                  <span>
                    <strong>
                      {item.title} · {money(Number(item.amount))}
                    </strong>
                    <small>
                      {item.frequency} · next run {item.next_run}
                    </small>
                  </span>
                  <button
                    className="text-button"
                    onClick={() => generate(item.id)}
                    disabled={busy || !item.is_active}
                  >
                    Generate now
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              className="card-action"
              onClick={() => setForm("recurring")}
              disabled={!isConnected}
            >
              <Plus size={15} /> Schedule recurring expense
            </button>
          )}
        </div>
      </div>
    </>
  );
}
function ChatPage({
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

function MessageBubble({
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
function AttachmentPreview({
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
function ChatComposer({
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

function ProfileDrawer({
  member,
  isSelf,
  avatarUrl,
  onClose,
  onMessage,
  onAvatarChange,
}: {
  member: Member;
  isSelf: boolean;
  avatarUrl?: string;
  onClose: () => void;
  onMessage: () => void;
  onAvatarChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const avatar = <Avatar member={member} size="lg" avatarUrl={avatarUrl} />;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="profile-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button drawer-close" onClick={onClose}>
          <X size={17} />
        </button>
        <div className="profile-hero">
          {isSelf ? (
            <button
              className="profile-avatar-button"
              onClick={() => fileRef.current?.click()}
            >
              {avatar}
              <span>
                <Image size={13} />
              </span>
            </button>
          ) : (
            <div className="profile-avatar-button">{avatar}</div>
          )}
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAvatarChange(URL.createObjectURL(file));
            }}
          />
          <h2>{member.name}</h2>
          <p>{member.profile.status}</p>
        </div>
        <div className="profile-copy">
          <span className="muted-label">ABOUT</span>
          <p>{member.profile.bio}</p>
          <div className="profile-stat">
            <span>Profile picture</span>
            <strong>
              {isSelf ? "Tap avatar to update" : "Visible to group"}
            </strong>
          </div>
        </div>
        <div className="profile-actions">
          {!isSelf && (
            <button className="primary-button" onClick={onMessage}>
              <MessageCircle size={15} /> Message privately
            </button>
          )}
          {isSelf && (
            <button
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
            >
              <Image size={15} /> Update profile picture
            </button>
          )}
          <button className="outline-button" onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
function Notifications({
  notifications,
  invitations,
  onClose,
  onAction,
  onAccept,
  onDecline,
}: {
  notifications: import("./lib/api").NotificationItem[];
  invitations: import("./lib/api").GroupInvitation[];
  onClose: () => void;
  onAction: (message: string) => void;
  onAccept: (id: number) => Promise<void>;
  onDecline: (id: number) => Promise<void>;
}) {
  const pending = invitations.filter((item) => item.status === "pending");
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div
        className="notification-popover"
        role="dialog"
        aria-label="Notifications"
      >
        <div className="popover-heading">
          <span className="muted-label">NOTIFICATIONS</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={15} />
          </button>
        </div>
        {pending.map((item) => (
          <div className="popover-invite" key={`invite-${item.id}`}>
            <span className="popover-invite-copy">
              <strong>{item.group_name}</strong>
              <small>{item.inviter_name} invited you</small>
            </span>
            <span className="popover-invite-actions">
              <button
                className="secondary-button small"
                onClick={() => void onAccept(item.id)}
              >
                Join
              </button>
              <button
                className="text-button"
                onClick={() => void onDecline(item.id)}
              >
                Decline
              </button>
            </span>
          </div>
        ))}
        {notifications.map((item) => (
          <button
            className="popover-row"
            key={item.id}
            onClick={() => onAction(item.title)}
          >
            {item.title}
            <small>{item.body}</small>
          </button>
        ))}
        {pending.length === 0 && notifications.length === 0 && (
          <small className="popover-empty">
            No new notifications or invitations.
          </small>
        )}
      </div>
    </>
  );
}
function ExpenseModal({
  onClose,
  onSave,
  memberOptions,
  currentUserId,
}: {
  onClose: () => void;
  onSave: (expense: Expense) => void;
  memberOptions: {
    user_id: number;
    name: string;
    initials: string;
    role: string;
  }[];
  currentUserId: number;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [mode, setMode] = useState("Equal");
  const [payer, setPayer] = useState(
    memberOptions.find((member) => member.user_id === currentUserId)?.name ||
      memberOptions[0]?.name ||
      "Rafi",
  );
  const [note, setNote] = useState("");
  const [receiptAttached, setReceiptAttached] = useState(false);
  const [participants, setParticipants] = useState(() =>
    memberOptions.length
      ? memberOptions.map((member) => member.name)
      : ["Rafi", "Tisha", "Nabil", "Mahi"],
  );
  const parsedAmount = Number(amount) || 0;
  const perPerson = parsedAmount / Math.max(participants.length, 1);
  const canSave =
    title.trim().length > 1 && parsedAmount > 0 && participants.length > 0;
  const categories = [
    { name: "Food", icon: "◒", hint: "Meals, coffee, snacks" },
    { name: "Stay", icon: "⌂", hint: "Hotels and rentals" },
    { name: "Transport", icon: "↗", hint: "Rides and tickets" },
    { name: "Activities", icon: "✦", hint: "Plans and experiences" },
  ];
  const people = memberOptions.length
    ? memberOptions.map((member) => member.name)
    : ["Rafi", "Tisha", "Nabil", "Mahi", "Shuvo"];
  const toggleParticipant = (name: string) =>
    setParticipants((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  return (
    <div
      className="modal-backdrop expense-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="expense-modal expense-modal-modern"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          onSave({
            id: crypto.randomUUID(),
            title: title.trim(),
            category,
            amount: parsedAmount,
            payer,
            date: "Just now",
            note:
              note.trim() ||
              (mode === "Equal"
                ? "Split equally with the group"
                : `${mode} split`),
            receipt: receiptAttached,
            status: "Confirmed",
            backendPayerId:
              memberOptions.find((member) => member.name === payer)?.user_id ??
              currentUserId,
            backendParticipants: participants.map((name) => ({
              user:
                memberOptions.find((member) => member.name === name)?.user_id ??
                currentUserId,
              share_amount: mode === "Equal" ? perPerson : perPerson,
            })),
          });
        }}
      >
        <div className="expense-modal-head">
          <div className="expense-kicker">
            <span className="expense-kicker-dot" /> NEW SHARED EXPENSE
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close expense modal"
          >
            <X size={18} />
          </button>
          <h2>Make the split feel easy.</h2>
          <p>Add one expense and we’ll keep the group balance clear.</p>
        </div>
        <div className="expense-modal-body">
          <div className="expense-form-column">
            <label className="expense-field expense-title-field">
              <span>What did you pay for?</span>
              <div className="expense-input-shell">
                <Receipt size={17} />
                <input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Dinner at Dhanmondi"
                />
              </div>
            </label>
            <div className="expense-two-col">
              <label className="expense-field">
                <span>Amount</span>
                <div className="expense-input-shell amount-shell">
                  <b>৳</b>
                  <input
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/[^0-9.]/g, ""))
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </label>
              <label className="expense-field">
                <span>Paid by</span>
                <div className="expense-select-shell">
                  <Avatar
                    member={
                      members.find((member) => member.name === payer) ||
                      members[0]
                    }
                    size="sm"
                  />
                  <select
                    value={payer}
                    onChange={(event) => setPayer(event.target.value)}
                  >
                    {people.map((person) => (
                      <option key={person}>{person}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </label>
            </div>
            <div className="expense-section-label">
              <span>Choose a category</span>
              <small>Helps your group understand the spend</small>
            </div>
            <div className="expense-category-grid">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`expense-category-choice ${category === item.name ? "selected" : ""}`}
                  onClick={() => setCategory(item.name)}
                >
                  <span>{item.icon}</span>
                  <strong>{item.name}</strong>
                  <small>{item.hint}</small>
                </button>
              ))}
            </div>
            <div className="expense-section-label">
              <span>Who is included?</span>
              <small>
                {participants.length} of {people.length} people selected
              </small>
            </div>
            <div className="participant-picker">
              {people.map((person) => {
                const member =
                  members.find((item) => item.name === person) || members[0];
                const selected = participants.includes(person);
                return (
                  <button
                    type="button"
                    key={person}
                    className={`participant-chip ${selected ? "selected" : ""}`}
                    onClick={() => toggleParticipant(person)}
                  >
                    <Avatar member={member} size="sm" />
                    <span>{person}</span>
                    {selected ? <Check size={13} /> : <Plus size={13} />}
                  </button>
                );
              })}
            </div>
            <div className="expense-section-label split-label">
              <span>How should this split?</span>
              <small>Change this later if the group decides differently</small>
            </div>
            <div className="split-mode-grid">
              {[
                {
                  name: "Equal",
                  icon: <Users size={16} />,
                  copy: "Everyone pays the same",
                },
                {
                  name: "Exact",
                  icon: <WalletCards size={16} />,
                  copy: "Set each person’s amount",
                },
                {
                  name: "Percentage",
                  icon: <Split size={16} />,
                  copy: "Split by contribution",
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.name}
                  className={`split-mode-choice ${mode === item.name ? "selected" : ""}`}
                  onClick={() => setMode(item.name)}
                >
                  {item.icon}
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.copy}</small>
                  </span>
                  {mode === item.name && <Check size={14} />}
                </button>
              ))}
            </div>
            <label className="expense-field expense-note-field">
              <span>
                Note <em>Optional</em>
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a little context for the group…"
                rows={2}
              />
            </label>
            <button
              type="button"
              className={`receipt-upload ${receiptAttached ? "attached" : ""}`}
              onClick={() => setReceiptAttached((value) => !value)}
            >
              <span className="receipt-upload-icon">
                {receiptAttached ? (
                  <Check size={16} />
                ) : (
                  <Paperclip size={16} />
                )}
              </span>
              <span>
                <strong>
                  {receiptAttached ? "Receipt attached" : "Attach a receipt"}
                </strong>
                <small>
                  {receiptAttached
                    ? "Ready to keep the expense trustworthy"
                    : "Optional · JPG, PNG or PDF"}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          </div>
          <aside className="expense-preview-panel">
            <div className="preview-eyebrow">LIVE SPLIT PREVIEW</div>
            <div className="preview-orb">
              <Sparkles size={18} />
            </div>
            <h3>{title.trim() || "Your new expense"}</h3>
            <p>
              {category} · paid by {payer}
            </p>
            <div className="preview-total">
              <small>Total</small>
              <strong>{money(parsedAmount)}</strong>
            </div>
            <div className="preview-divider" />
            <div className="preview-split-row">
              <span>
                <Users size={15} /> {participants.length} people
              </span>
              <strong>{money(perPerson)} each</strong>
            </div>
            <div className="preview-members">
              {participants.slice(0, 4).map((person) => (
                <Avatar
                  key={person}
                  member={
                    members.find((member) => member.name === person) ||
                    members[0]
                  }
                  size="sm"
                />
              ))}
              {participants.length > 4 && (
                <span className="preview-more">+{participants.length - 4}</span>
              )}
            </div>
            <div className="preview-tip">
              <Sparkles size={14} />
              <span>
                Everyone sees the same story, from payment to settlement.
              </span>
            </div>
          </aside>
        </div>
        <div className="expense-modal-footer">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="expense-save-button"
            type="submit"
            disabled={!canSave}
          >
            <span>{canSave ? "Save expense" : "Add a title and amount"}</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
function CommandPalette({
  onClose,
  onNavigate,
  onAddExpense,
}: {
  onClose: () => void;
  onNavigate: (view: View) => void;
  onAddExpense: () => void;
}) {
  const actions = [
    {
      label: "Open overview",
      icon: <LayoutDashboard size={16} />,
      action: () => onNavigate("overview"),
    },
    {
      label: "Open messages",
      icon: <MessageCircle size={16} />,
      action: () => onNavigate("chat"),
    },
    { label: "Add expense", icon: <Plus size={16} />, action: onAddExpense },
  ];
  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="palette-search">
          <Search size={17} />
          <input autoFocus placeholder="Jump to anything…" />
        </div>
        {actions.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
