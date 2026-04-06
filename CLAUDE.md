# Project Memory

## QA Testing Protocol

When asked to test this application (or any application), test like a real human user — NOT like a bot running scripted commands in bulk.

**Rules:**
1. **One action at a time.** Make ONE interaction (click a button, move a slider, type in a field), then STOP and look at the screen before doing anything else.
2. **Check the screen after every single action.** Take a screenshot or snapshot after each interaction. Look for errors, unexpected messages, visual glitches, layout issues — anything a human would notice.
3. **Test incremental states, not just completed states.** Don't fill in an entire form or matrix all at once. A real user fills in one field, pauses, fills in another. Test what the app looks like at 1/5 completed, 2/5 completed, etc.
4. **Use the app the way a first-time user would.** Start from scratch. Click tabs in order. Read what's on screen. Follow the natural flow.
5. **Don't batch-script interactions.** Avoid running eval scripts that set 5 values at once. That skips over the intermediate UI states where bugs hide.
6. **When the user says "thoroughly test," that means every feature, every tab, every interactive element — tested one at a time with visual verification after each step.**

This user tests like a human because they ARE a human. Match that standard.
