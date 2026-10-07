# Protein Pro

Single-file calorie and protein tracker. Open `index.html` in a browser (or host it as a static page and add it to your phone's home screen).

- Pick a food (search box), how it was cooked or its state (raw, cooked, dry), and an amount: grams, or a count such as 1, ½ or 1 1/2 of a typical unit (slice, medium orange, tbsp, cup). Unit sizes are estimates. Optionally add oil or butter in tsp.
- If you already know the calories, tick "I know the calories" and enter the totals yourself.
- Pick Breakfast, Lunch, Dinner or Snack before adding. The log is grouped by meal with subtotals. It defaults to a meal by time of day.
- Quick add: pin foods with ☆ Shortlist in the log, or use foods suggested from what you log often, and add them in one tap (with Undo).
- Workout section: log boxing, strength, walking and more with minutes and intensity. Strength sessions take exercises as sets × reps @ kg and show what you lifted last time. A weekly counter tracks sessions against your goal (set in Settings). Estimated calories burned (MET-based, above resting) are subtracted from the day's food calories: Food − Workout = Net, and the calorie target applies to Net. Because workouts are counted separately, the activity level should describe the rest of your day. A setting turns this off.
- Saved (custom) foods can be deleted. Past entries keep their numbers.
- Entries can be edited or deleted. Daily totals, targets and a 7-day view are shown.
- Targets come from Mifflin-St Jeor BMR × activity factor, minus a deficit (default 15%), with a 1,200 kcal floor. With workouts subtracted, the default activity factor is 1.3 (day-to-day, workouts excluded). Protein defaults to 1.9 g/kg. All editable in Settings.
- Data stays in the browser's localStorage. Use Export and Import for backups.
- Food values are approximate per-100 g figures (USDA-style). Weigh food in the state you select, and check packaged foods against the label.

Tests: `node test.js`
