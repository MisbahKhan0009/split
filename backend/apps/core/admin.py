from django.contrib import admin

from .models import (
    ChatMessage,
    Expense,
    ExpenseParticipant,
    Group,
    GroupMembership,
    Settlement,
    UserProfile,
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "status", "theme", "updated_at")
    search_fields = ("user__username", "user__first_name", "user__last_name", "bio")


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "currency", "currency_symbol", "owner", "created_at")
    search_fields = ("name", "slug")


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "role", "is_active")
    list_filter = ("role", "is_active")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "group", "amount", "payer", "status", "created_at")
    list_filter = ("status", "category", "split_mode")
    search_fields = ("title", "note")


@admin.register(ExpenseParticipant)
class ExpenseParticipantAdmin(admin.ModelAdmin):
    list_display = ("expense", "user", "share_amount", "share_value")


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ("group", "from_user", "to_user", "amount", "status", "created_at")
    list_filter = ("status",)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "kind",
        "group",
        "author",
        "recipient",
        "body",
        "created_at",
        "read_at",
    )
    list_filter = ("kind", "created_at")
    search_fields = ("body", "author__username", "recipient__username")
