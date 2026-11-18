# The five-minute demo

A scripted walk through the core loop with the demo household: the parent approves on a
phone, the keeper plays today's session on an iPad, XP and streaks move, the keeper taps
**Something hurts** and training pauses, and the parent clears the pause.

The demo runs on your own machine, with the mock identity and the invented cast only:

| Who | Role | Account |
| --- | --- | --- |
| Kai | keeper | `kai@example.com` |
| Sam | parent | `sam@example.com` |

No real person's data is in it, and no deployed service is involved.

## Before the audience arrives

1. Start the demo server. It builds the web app, then serves it and the API on port 8080
   with the demo household seeded:

   ```bash
   npm install
   npm run demo
   ```

   `npm run demo` turns on the mock identity (`GOALIE_DEV_MOCK_IDENTITY=1`) and the demo seed
   (`GOALIE_DEMO_SEED=1`). Both are refused with `NODE_ENV=production`, and the seed refuses
   to run if the role seed (`GOALIE_ROLES`) names any account outside `@example.com`.
2. Open two browser windows, so each role keeps its own sign-in cookie:
   - **Window A (Sam, the parent):** a normal window, sized like a phone (in the browser's
     device toolbar, about 390 x 844).
   - **Window B (Kai, the keeper):** a private window, sized like an iPad in landscape (about
     1180 x 820).
3. Sign each window in with the dev-mock switch:
   - Window A: open `http://localhost:8080/api/dev/as?account=sam@example.com`, then
     `http://localhost:8080/`. It shows **Parent home**.
   - Window B: open `http://localhost:8080/api/dev/as?account=kai@example.com`, then
     `http://localhost:8080/`. It shows **Keeper home**.

What the seed gives you:

- The themed week, as the app runs it: three sessions, **Strong middle**, **Spring
  legs** and **Quick feet, strong arms**, each with its cards at their card doses, all
  approved as Sam.
- Sam's **Training days**, picked so that today is always one (below).
- Four requests waiting in Sam's inbox.
- Two weeks of history on the training days: five trained sessions and one safety stop (Stop
  pressed on a warning sign, which counts as a kept day), with planned rest days between.
  **Together so far** starts at a team streak of 6 training days and 94 XP.

### How the demo picks today

The seed sets Sam's training days to today's weekday and the weekdays two and four days
later, so today is always a training day and no two training days are back to back. Today
is always **Strong middle**, on any weekday: the demo starts the themes on today and goes on
in week order, so **Spring legs** is two days later and **Quick feet, strong arms** four
days later. (Outside the demo the themes start on the first training day of the week,
Monday first.)

| Today is | Training days | Strong middle | Spring legs | Quick feet, strong arms |
| --- | --- | --- | --- | --- |
| Monday | Mon, Wed, Fri | Mon | Wed | Fri |
| Tuesday | Tue, Thu, Sat | Tue | Thu | Sat |
| Wednesday | Wed, Fri, Sun | Wed | Fri | Sun |
| Thursday | Mon, Thu, Sat | Thu | Sat | Mon |
| Friday | Tue, Fri, Sun | Fri | Sun | Tue |
| Saturday | Mon, Wed, Sat | Sat | Mon | Wed |
| Sunday | Tue, Thu, Sun | Sun | Tue | Thu |

If Sam saves days that leave out today, the themes go back to the Monday-first order until
the next `npm run demo:reset`. The dates come from the machine's own clock and are never
real training records.

To start again at any time, run `npm run demo:reset` in a second terminal and reload both
windows. It restores the seeded state as of today, and refuses if the data holds any account
outside `@example.com`.

## The script

### 1. The parent approves on the phone (about 1 minute)

In **Window A (Sam, phone)**:

1. Point at **Together so far**: team streak 6 training days, Kai's and Sam's streaks 6 each,
   94 XP. "Rest days and pauses never break a streak."
2. Point at **This week**: the seven days, Monday first, each marked **Today**, **Planned** or
   **Rest** from Sam's training days, with "0 of 3 sessions" and the next session ("Next
   session" and the day two days on, **Spring legs**). A rest day, a pause or a safety stop
   never shows as missed: a safety stop counts as kept.
3. Point at **Training days**: today and the two days the table above gives are on, each
   with its session, today's always **Strong middle** (on a Thursday: "Mon: Quick feet,
   strong arms", "Thu: Strong middle", "Sat: Spring legs"). "Pick 3 days with a rest day
   between each": the server refuses two days back to back and says why. Leave the days as
   they are, so today stays the Strong middle day.
4. Scroll to **Inbox**, with its badge of **4**. Each request shows what would change and
   when it lapses: "silence never approves".
5. On **Squat to box** ("Bodyweight only, 2 sets of 10, 60 s rest"), tap **Approve**.
6. The badge drops to **3**, and the newest **History** entry is "Parent approved Squat to
   box". (The entries below it are the seed approving the week's sessions and cards as Sam.)

![Parent home on a phone, Together so far and This week with today marked and 0 of 3 sessions](demo/00-parent-home-phone.png)

![the inbox on a phone, with its badge of 4 and the Squat to box request](demo/01-parent-inbox-phone.png)

![the same inbox after Approve: badge 3, Squat to box gone from it](demo/02-parent-approved-phone.png)

### 2. The keeper plays today's session on the iPad (about 2 minutes)

In **Window B (Kai, iPad)**:

1. **Keeper home** shows **Today**: the path of steps for **Strong middle** (warm-up, Front
   plank, Side plank, Glute bridge, cool-down, finish). Under it, **This week** shows the
   same strip as Sam's, and each card in **Your training** shows its next step: the next
   rung's name and the goal that opens it (for **Squat to box**, "Paused box squat", 2 sets
   of 15, all clean, two sessions in a row, then the parent decides).
2. Tap **Start session**.
3. Warm-up: each move runs on a countdown. To keep the demo short, tap **Next** six times.
4. **Front plank** (2 sets of a 20 s hold): the figure and its credit line sit beside the
   steps, cues, common mistakes and stop signs.
   1. Tap **Start set 1**, then **End set** (or let the 20 s run).
   2. Under "How did set 1 look?", tap the cue **Stay board-straight**. The app says
      "Stay board-straight: nice": the cue, never the person.
   3. Tap **Skip rest**, then **End set**, then tap **Keep breathing**.
5. **Side plank** (2 sets of a 15 s hold, each side):
   1. Tap **Start set 1**, then **End set** twice (one side, then the other).
   2. Tap **Hips high**, then **Skip rest**, **End set** twice and **Long body**.
6. **Glute bridge** (2 sets of 12):
   1. Tap **Start set 1**, then **Set done** (or tap **+1** twelve times).
   2. Tap **Push through heels**, then **Skip rest**, **Set done** and **Ribs down**.
7. Cool-down: tap **Next**.

![Keeper home on an iPad, Today's path for Strong middle with Start session](demo/03-keeper-today-ipad.png)

![the player on Front plank, figure and timer on the left, steps and cues on the right, Something hurts and Stop in the top bar](demo/04-keeper-player-ipad.png)

### 3. XP and streaks (about 30 seconds)

Still in **Window B**:

1. The finish screen says **Session done**, lists what looked good today, and shows the XP
   earned: a fixed session credit of 10 for the logged warm-up plus 2 for each set rated well.
   With every set of **Strong middle** rated, that is 6 sets and **+22 XP**. There is no
   "one more?" prompt.
2. Tap **Done for today**. **Today** now says "Done for today" and names the next session
   (the day two days on, **Spring legs**); **This week** marks today **Trained** and reads
   "1 of 3 sessions". **Together so far** now shows a team streak of 7 training days and
   116 XP. Reps and minutes earn nothing: XP counts showing up and good form.

![the Session done screen with the XP and the streaks](demo/05-keeper-finish-ipad.png)

### 4. The keeper taps "Something hurts" (about 30 seconds)

Still in **Window B**:

1. Tap **Something hurts** in the top bar of **Keeper home**. (It is on every player screen
   too, and ends a session at once.)
2. Under "Where does it hurt?", choose **Knee**. Leave the note empty.
3. Tap **Tell my parent**. The home now shows **Training is paused** and offers nothing to
   train. The pause holds on the device even with the network off.

![Keeper home showing Training is paused](demo/06-keeper-paused-ipad.png)

### 5. The parent clears the pause (about 1 minute)

In **Window A (Sam, phone)**:

1. Reload. The **Inbox** starts with an **Urgent** item, **Training paused: something
   hurts**, with the body area **Knee**.
2. Tap **Clear the pause**. Only a parent can: a keeper's attempt is refused and logged.
   **History** shows the pause and the clear, with roles and the body area only.
3. In **Window B (Kai, iPad)**, reload. The pause is lifted, and **Together so far** still
   shows the streak: a pause never breaks one.

![the parent's inbox on a phone with the urgent pause item and Clear the pause](demo/07-parent-urgent-phone.png)

![Keeper home after the clear, the streak unchanged](demo/08-keeper-cleared-ipad.png)

## After the demo

Run `npm run demo:reset` and reload both windows to put the household back as it started.
Stop the server with Ctrl+C; nothing is kept, since the demo stores live in memory.

## Quality audits on the demo

The quality rubric (`docs/knowledge/decisions/quality-rubric.md`, "Fixed for every audit")
runs on this demo, on any weekday, since today is always **Strong middle**. Its Script C
markers are unchanged: Start session gives "Knees up, arms swing", Next "Small circles, then
big", **Set done** (on Glute bridge) "How did set 1 look?", and **Approve** on the inbox's
first request "Parent approved Starter plan". K4 (Glute bridge set 2) and K5 (the Front
plank rest) are in today's session.

## Taking the screenshots

- Take them from this local run with the demo household only, at the window sizes above.
- Crop to the app's own page: no browser address bar, tabs or bookmarks.
- Save as PNG or WebP with the metadata stripped, under `docs/demo/`, with the file names
  in the placeholders. Camera formats are refused by the privacy guard.
