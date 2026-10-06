# Protein Pro

Single-file calorie and protein tracker. Open `index.html` in a browser (or host it as a static page and add it to your phone's home screen).

- Pick a food (search box), how it was cooked or its state (raw, cooked, dry), and an amount: grams, or a count such as 1, ½ or 1 1/2 of a typical unit (slice, medium orange, tbsp, cup). Unit sizes are estimates. Optionally add oil or butter in tsp.
- If you already know the calories, tick "I know the calories" and enter the totals yourself.
- Entries can be edited or deleted. Daily totals, targets and a 7-day view are shown.
- Targets come from Mifflin-St Jeor BMR × activity factor, minus a deficit (default 15%), with a 1,200 kcal floor. Protein defaults to 1.9 g/kg. All editable in Settings.
- Data stays in the browser's localStorage. Use Export and Import for backups.
- Food values are approximate per-100 g figures (USDA-style). Weigh food in the state you select, and check packaged foods against the label.

Tests: `node test.js`
