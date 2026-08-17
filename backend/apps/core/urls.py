from rest_framework.routers import DefaultRouter
from .api import ProfileViewSet
from apps.finance.api import ExpenseViewSet, SettlementViewSet
from apps.groups.api import GroupViewSet
from apps.messaging.api import ChatMessageViewSet

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="group")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("settlements", SettlementViewSet, basename="settlement")
router.register("profiles", ProfileViewSet, basename="profile")
router.register("messages", ChatMessageViewSet, basename="message")

urlpatterns = router.urls
