# SplitWise+ — Stakeholder Presentation Update

## Deck direction

Create a modern 10-slide stakeholder deck in 16:9. Keep the dark liquid-glass visual system that matches the SplitWise+ product: near-black navy, translucent blue-gray surfaces, lime primary accent, soft blue, warm amber, blush accents, compact uppercase labels, editorial headlines, thin rules, and restrained build cues. Keep copy concise but add enough explanatory text for a project presentation. Never use personal names from the project owner; the product demo uses only casual Bangladeshi Gen Z names: Rafi, Tisha, Nabil, Mahi, and Shuvo. All money values use Bangladeshi taka (`৳`) and the backend currency code is BDT.

Use the existing local screenshots from `/home/ubuntu/split/docs/deck-assets/` where suitable, and update the visual narrative to show the new messaging experience through diagrams, icons, and UI references.

## Slide 1 — Cover

Title: `SplitWise+`
Subtitle: `Shared money, without the shared headache.`
Kicker: `A collaborative financial workspace for groups that share life.`
Keep the Student 1 + ID and Student 2 + ID fields as editable-looking glass fields. Add a small line: `BDT-first product presentation · 2025`.

## Slide 2 — The shift

Headline: `Shared money becomes messy when the story is split apart.`
Show three connected domains: `EXPENSES`, `CONVERSATION`, `DECISIONS`. Add a short supporting line: `The group should not have to reconstruct the truth from screenshots, receipts, and scattered chat messages.`

## Slide 3 — Product identity

Headline: `One group. One shared workspace.`
Center the `DHAKA TRIP` group identity with orbit nodes: `Expenses`, `Balances`, `Messages`, `Receipts`, `Plans`, `Budgets`. Show metric rail values: `8 members`, `৳ 14,560 tracked`, `61% budget used`. Add supporting text: `BDT is the default money language; group context stays connected around the people who share it.`

## Slide 4 — Product experience

Headline: `Every number is an action.`
Use the workspace screenshot with callouts for `Understand the balance`, `Inspect the spend`, and `Continue the conversation`. Add supporting text: `The dashboard compresses the next decision into a calm visual surface.`

## Slide 5 — Feature set

Headline: `The first release closes the loop.`
Use a 2×3 visual grid: `Groups`, `Expenses`, `Smart splits`, `Balances`, `Settlements`, `Messenger chat`. Descriptors: `People first`, `Equal / exact / percentage`, `Clear before save`, `Who owes whom`, `Fewer transfers`, `Live group + private threads`.

## Slide 6 — Messenger-style chat

Headline: `Chat that understands the money around it.`
Use a horizontal interaction strip: `MESSAGE` → `REACT` → `SHARE` → `ACT`. Show visual callouts for `Emoji + GIFs`, `Images + video`, `Files + receipts`, and `Expense actions from chat`. Add a concise paragraph: `The group conversation now behaves like a modern messenger while preserving financial context.`

## Slide 7 — Private threads and identity

Headline: `Click a person. Keep the context private.`
Show a profile interaction flow: `Tap avatar` → `View profile` → `Message privately` → `Return to group`. Add labels for `Profile photo`, `Online status`, `Short bio`, and `Direct-message thread`. Use the demo identities Rafi, Tisha, Nabil, Mahi, and Shuvo only.

## Slide 8 — Smart settlement

Headline: `Fewer payments. More moving on.`
Compare a tangled transfer network with a simplified network. Use taka values such as `৳ 340`, `৳ 620`, `৳ 190`, and show `3 payments instead of 5`. Add supporting text: `BDT balances are optimized into fewer, clearer requests.`

## Slide 9 — Architecture

Headline: `Predictable where it matters. Live where it helps.`
Show three layers: `React + TypeScript` with dashboard, messaging, media controls, and profiles; `Django REST + Channels` with groups, expenses, profiles, chat history, private messages, and WebSocket events; `SQLite/PostgreSQL + media storage` with financial records, avatars, receipts, attachments, and audit history. Add boundary note: `REST for durable operations; WebSocket rooms for group and direct delivery, typing, reactions, and read state.`

## Slide 10 — Close

Headline: `Make shared money feel simple.`
Show three words: `FAST` · `PRIVATE` · `COLLABORATIVE`. Use the landing screenshot or a wide dark product crop. Add a closing card: `Built for trips, homes, teams, and the people in between.` Add CTA: `Next step → validate the BDT-first MVP with real groups and real conversations.`
