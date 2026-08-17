## Expense flow check

Opening `Add expense` displayed a focused modal with title, amount, category, split-mode controls, participant selection, receipt toggle, cancel, and save actions. Filling `Canal tour tickets` and `3200` updated the live preview to `৳ 800` per person for four participants, confirming the equal-split interaction is wired correctly.

## Ledger and planning checks

Saving the sample expense navigated to the ledger, increased the visible expense count from 4 to 5, inserted the new pending expense at the top, and displayed the toast `Expense saved and balances recalculated`. Opening the plan view displayed the itinerary, canal-tour vote controls, task ownership, due dates, and add actions.

## Chat check

The group chat view rendered the seeded conversation, contextual items, and composer. Sending `I’m in — add it to the trip budget` appended a new right-aligned message and displayed the toast `Message sent to the group`.

## BDT and Messenger update

The landing page now uses Bangladeshi taka (`৳`) in the hero demo, social proof, settlement visual, and pricing. The workspace uses Bangladeshi casual Gen Z demo names: Rafi, Tisha, Nabil, Mahi, and Shuvo. The overview shows BDT values and the profile account is Rafi.

The Messages screen now renders an inbox rail for the Dhaka trip group plus private chat entries, a group-people list, richer message bubbles, reactions, reply affordances, delivery state, a theme control, shared media/file counters, emoji picker, GIF action, file/photo/video attachment controls, and a profile action area. The live chat copy explicitly identifies the WebSocket-ready realtime messaging flow.

## Functional workspace update — 2026-08-17

- Opened the workspace preview and verified the new explicit active-group dropdown exposes Dhaka trip, Dhanmondi 3B, and Studio adda.
- Selected Dhanmondi 3B and verified the sidebar label, breadcrumb, page title, `Monthly household` metadata, spend total (`৳ 3,260`), progress percentage, member count (`4`), and success toast updated together.
- Opened the sidebar Messages entry and verified the Messenger-style inbox is directly discoverable, with the selected group name shown in the conversation rail and chat details panel.
- Verified the chat screen exposes group conversation, private-message entries, member profile actions, theme control, file/photo controls, emoji/GIF controls, and the composer.
- Seeded the backend with 5 users, 3 BDT groups, 5 expenses, 2 settlements, and 3 group chat messages using `python manage.py seed_demo`.
