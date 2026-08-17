from rest_framework.routers import DefaultRouter
from .api import ChatMessageViewSet, ExpenseViewSet, GroupViewSet, ProfileViewSet, SettlementViewSet

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="group")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("settlements", SettlementViewSet, basename="settlement")
router.register("profiles", ProfileViewSet, basename="profile")
router.register("messages", ChatMessageViewSet, basename="message")

urlpatterns = router.urls
