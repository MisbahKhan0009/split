from rest_framework.routers import DefaultRouter
from .api import ExpenseViewSet, GroupViewSet, SettlementViewSet

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="group")
router.register("expenses", ExpenseViewSet, basename="expense")
router.register("settlements", SettlementViewSet, basename="settlement")

urlpatterns = router.urls
