from django.contrib import admin
from .models import ChatMessage, Expense, ExpenseParticipant, Group, GroupMembership, Settlement

admin.site.register([Group, GroupMembership, Expense, ExpenseParticipant, Settlement, ChatMessage])
