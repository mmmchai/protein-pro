# Protein Pro

Single-file calorie and protein tracker. Open `index.html` in a browser (or host it as a static page and add it to your phone's home screen).

- Pick a food, how it was cooked or its state (raw, cooked, dry), and the weight in grams. Optionally add oil or butter in tsp.
- Entries can be edited or deleted. Daily totals, targets and a 7-day view are shown.
- Targets come from Mifflin-St Jeor BMR × activity factor, minus a deficit (default 15%), with a 1,200 kcal floor. Protein defaults to 1.9 g/kg. All editable in Settings.
- Data stays in the browser's localStorage. Use Export and Import for backups.
- Food values are approximate per-100 g figures (USDA-style). Weigh food in the state you select, and check packaged foods against the label.

Tests: `node test.js`
