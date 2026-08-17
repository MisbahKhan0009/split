from rest_framework.routers import DefaultRouter

from .api import (
    ActivityViewSet,
    BudgetViewSet,
    ChatMessageViewSet,
    ExpenseViewSet,
    GroupCommentViewSet,
    GroupEventViewSet,
    GroupInvitationViewSet,
    GroupViewSet,
    NotificationViewSet,
    PollViewSet,
    ProfileViewSet,
    RecurringExpenseViewSet,
    SettlementViewSet,
    UserDirectoryViewSet,
)

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="group")
router.register("directory/users", UserDirectoryViewSet, basename="directory-user")
router.register("invitations", GroupInvitationViewSet, basename="invitation")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("settlements", SettlementViewSet, basename="settlement")
router.register("budgets", BudgetViewSet, basename="budget")
router.register(
    "recurring-expenses", RecurringExpenseViewSet, basename="recurring-expense"
)
router.register("activity", ActivityViewSet, basename="activity")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("polls", PollViewSet, basename="poll")
router.register("events", GroupEventViewSet, basename="event")
router.register("group-comments", GroupCommentViewSet, basename="group-comment")
router.register("profiles", ProfileViewSet, basename="profile")
router.register("messages", ChatMessageViewSet, basename="message")

urlpatterns = router.urls
