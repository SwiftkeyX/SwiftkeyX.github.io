# Clip shot list

Record with OBS (or Win+Alt+R / Xbox Game Bar) at 1280×720 or higher, in the **Editor or a build with gizmos/debug visible where noted**.

**Export:** MP4 (H.264), 15–30 s, **no audio**, under 5 MB. A good one-liner if you install ffmpeg:

```powershell
ffmpeg -i raw.mp4 -t 25 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 28 -preset slow -movflags +faststart out.mp4
```

Also export one still frame as `.jpg` for the poster (shown before the video loads).

Put files in `public/media/` and add to the project's frontmatter in `src/content/projects/*.md`:

```yaml
clip: /media/souls-boss.mp4
poster: /media/souls-boss.jpg
```

---

## 1. Magic School 3 → `ms3-combat.mp4`
Already has `ms3-battle.gif` as a stand-in, so this one is the lowest priority.
- **0–5 s** Board before the fight: heroes placed on hexes.
- **5–20 s** The fight: heroes pathing hex to hex, auto-attacks, then **one or two clear skill casts**. Lyra's wave through a cluster and Bulwark's brace → slam are the best to show.
- **20–25 s** One hero's inspector panel showing the skill description.
- Tip: slow the game speed down so skills are readable.

## 2. Souls-like prototype → `souls-boss.mp4` (record this first, it's the most visual)
- **0–8 s** Boss observing/strafing, then closing in (the BT choosing tactics).
- **8–18 s** A **chained combo** (2–3 hits from the FSM). You dodge-roll through one hit.
- **18–25 s** You land hits and the boss health bar drops.
- Bonus clip `souls-hitbox.mp4` (5–8 s, Scene view): the same attack with **hitbox gizmos visible**, showing the collider turning on only during the active frames.

## 3. Farming sidescroller → `farming-loop.mp4`
- **0–6 s** Pick up items and see them land in the hotbar.
- **6–12 s** Open the backpack and drag/stack items. Craft a Storage Chest from 10 lumber.
- **12–18 s** Place the chest. Walk into the time-hop trigger so the clock and new-day banner change.
- **18–25 s** Wand vs slime: shoot it, and the slime chases and attacks.
