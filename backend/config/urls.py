from apps.accounts.auth import (
    AccountActivityView,
    AccountSessionsView,
    CurrentUserDashboardView,
    CurrentUserView,
    LoginView,
    RegisterView,
    RevokeAllSessionsView,
    RevokeCurrentSessionView,
    RevokeSessionView,
    SessionRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", LoginView.as_view(), name="token_obtain_pair"),
    path(
        "api/v1/auth/token/refresh/", SessionRefreshView.as_view(), name="token_refresh"
    ),
    path("api/v1/auth/register/", RegisterView.as_view(), name="register"),
    path("api/v1/auth/me/", CurrentUserView.as_view(), name="current_user"),
    path(
        "api/v1/auth/me/dashboard/",
        CurrentUserDashboardView.as_view(),
        name="current_user_dashboard",
    ),
    path("api/v1/account/activity/", AccountActivityView.as_view(), name="account_activity"),
    path("api/v1/account/sessions/", AccountSessionsView.as_view(), name="account_sessions"),
    path("api/v1/account/sessions/current/revoke/", RevokeCurrentSessionView.as_view(), name="revoke_current_session"),
    path("api/v1/account/sessions/revoke-all/", RevokeAllSessionsView.as_view(), name="revoke_all_sessions"),
    path("api/v1/account/sessions/<uuid:session_key>/revoke/", RevokeSessionView.as_view(), name="revoke_session"),
    path("api/v1/", include("apps.core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
