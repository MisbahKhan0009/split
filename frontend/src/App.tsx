import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
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
  type ProfileDTO,
} from "./lib/api";
import {
  emptyGroup,
  groups,
  initialActivity,
  initialChat,
  initialExpenses,
  memberFromDTO,
  members,
  normalizeMessage,
} from "./data/demoData";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { NavIcon } from "./components/NavButton";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { Notifications } from "./components/Notifications";
import { GroupCreateModal } from "./components/GroupCreateModal";
import { InviteModal } from "./components/InviteModal";
import { ExpenseModal } from "./components/ExpenseModal";
import { ProfileDrawer } from "./components/ProfileDrawer";
import { CommandPalette } from "./components/CommandPalette";
import { AuthModal } from "./components/AuthModal";
import { Landing } from "./pages/Landing";
import { UserDashboardView } from "./pages/DashboardPage";
import { Overview } from "./pages/OverviewPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { SettlePage } from "./pages/SettlePage";
import { PlanPage } from "./pages/PlanPage";
import { ChatPage } from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ConnectedFeaturePanel } from "./pages/ConnectedFeaturePanel";
import { BudgetsPage } from "./pages/BudgetsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ActivityPage } from "./pages/ActivityPage";

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
  const [connectedSettlements, setConnectedSettlements] = useState<
    import("./lib/api").SettlementDTO[]
  >([]);
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
    // Each piece of connected data is fetched and applied independently.
    // Promise.all would reject the whole batch (and update nothing) if a
    // single endpoint failed; allSettled means one bad response can't block
    // budgets/events/polls/expenses/activity from loading for everyone else.
    const results = await Promise.allSettled([
      api.groupSummary(groupId).then(setConnectedSummary),
      api.budgets(groupId).then(setConnectedBudgets),
      api.notifications().then(setConnectedNotifications),
      api.settlementPlan(groupId).then(setConnectedSettlementPlan),
      api
        .settlements(groupId)
        .then(setConnectedSettlements),
      api.recurringExpenses(groupId).then(setConnectedRecurring),
      api.events(groupId).then(setConnectedEvents),
      api.polls(groupId).then(setConnectedPolls),
      api.expenses(groupId).then((backendExpenses) => {
        if (backendExpenses.length)
          setExpenses(
            backendExpenses.map((item) => ({
              id: String(item.id),
              backendId: item.id,
              title: item.title,
              category: item.category,
              amount: Number(item.amount),
              payer: item.payer_name,
              date: new Date(`${item.occurred_on}T00:00:00`).toLocaleDateString(
                "en-BD",
                { day: "numeric", month: "short", year: "numeric" },
              ),
              occurredOn: item.occurred_on,
              note: item.note,
              receipt: Boolean(item.receipt),
              receiptUrl: item.receipt ?? undefined,
              status: item.status === "confirmed" ? "Confirmed" : "Pending",
            })),
          );
      }),
      api.activity(groupId).then((backendActivity) => {
        if (backendActivity.length)
          setActivity(
            backendActivity.map((item) => ({
              id: String(item.id),
              member: item.actor_name,
              initials: item.actor_initials,
              action: item.action,
              target: item.target,
              time: new Date(item.created_at).toLocaleString(),
              timestamp: item.created_at,
              color: "#b7f36b",
            })),
          );
      }),
    ]);
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failures.length) {
      notify(
        failures[0].reason instanceof Error
          ? failures[0].reason.message
          : "Some group data could not sync.",
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
        const created = await api.createExpense({
          group: Number(activeGroup.id),
          title: expense.title,
          category: expense.category,
          amount: expense.amount.toFixed(2),
          payer: expense.backendPayerId ?? authUser.id,
          note: expense.note,
          occurred_on:
            expense.occurredOn ?? new Date().toISOString().slice(0, 10),
          split_mode: expense.splitMode ?? "equal",
          participants: expense.backendParticipants?.map((participant) => ({
            user: participant.user,
            share_amount: participant.share_amount,
            share_value: participant.share_value ?? 0,
          })),
        });
        if (expense.receiptFile) {
          try {
            await api.uploadExpenseReceipt(created.id, expense.receiptFile);
          } catch (uploadError) {
            notify(
              uploadError instanceof Error
                ? uploadError.message
                : "Expense saved, but the receipt could not be uploaded.",
            );
          }
        }
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
    } else {
      // Without a connected backend group there's nowhere to persist the file,
      // so keep a local object URL just long enough to preview it this session.
      const localExpense = expense.receiptFile
        ? { ...expense, receiptUrl: URL.createObjectURL(expense.receiptFile) }
        : expense;
      setExpenses((current) => [localExpense, ...current]);
    }
    setActivity((current) => [
      {
        id: crypto.randomUUID(),
        member: authUser?.display_name || "Rafi",
        initials: "RF",
        action: "added",
        target: expense.title,
        time: "Just now",
        timestamp: new Date().toISOString(),
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
              settlements={connectedSettlements}
              currentUserId={authUser?.id ?? 0}
              isGroupOwner={
                (
                  activeGroup.members_detail ?? []
                ).findIndex(
                  (m) =>
                    (m as import("./lib/api").GroupMemberDTO).user_id ===
                      authUser?.id &&
                    (m as import("./lib/api").GroupMemberDTO).role === "owner",
                ) >= 0
              }
              onRequestSettlement={async (fromUser, toUser, amount, note) => {
                await api.createSettlement({
                  group: Number(activeGroup.id),
                  from_user: fromUser,
                  to_user: toUser,
                  amount: amount.toFixed(2),
                  note,
                });
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
                notify("Settlement request sent.");
              }}
              onPaySettlement={async (id, paymentMethod) => {
                await api.paySettlement(id, { payment_method: paymentMethod });
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
                notify("Payment confirmed.");
              }}
              onSync={async () => {
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
              }}
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
          {hasGroups && activeView === "budgets" && (
            <BudgetsPage
              activeGroup={activeGroup}
              budgets={connectedBudgets}
              onSync={async () => {
                await loadConnectedGroup(activeGroup.id);
                await refreshDashboard();
              }}
              onToast={notify}
            />
          )}
          {hasGroups && activeView === "documents" && (
            <DocumentsPage
              activeGroup={activeGroup}
              expenses={expenses}
              onAddExpense={() => setShowExpense(true)}
            />
          )}
          {hasGroups && activeView === "activity" && (
            <ActivityPage activeGroup={activeGroup} activity={activity} />
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
          {hasGroups && activeView === "quick-access" && authUser && (
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

export default App;
