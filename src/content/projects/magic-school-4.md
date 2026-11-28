---
title: Magic School 4
order: 1
kind: Personal project · Auto-chess · Unity 6 (URP 2D, UI Toolkit)
tagline: An auto-chess game. Buy heroes, place them on a hex board, then watch them fight on their own. I built the combat loop and the skill system that all 41 heroes' skills are built from.
tech: [Unity 6, C#, UI Toolkit, Assembly definitions, A* on hex grid, State machine, ScriptableObjects]
highlights:
  - Combat loop — auto-attacks on an attack-speed cooldown, an active skill when mana caps, and passives that react to what happens in the fight.
  - Skill system — every hero's skill is its own class, built from shared parts (projectiles, AOEs, moves, buffs) played in a named order.
  - Hooks — a skill reacts to a moment in the fight (a cast, an auto attack, a death) by overriding one method. 41 heroes.
  - Modifiers & status effects — buffs, debuffs, damage/heal events with outcomes, resolved through one pipeline.
itch: https://switftkeyx.itch.io/magicschool3
github: https://github.com/SwiftkeyX/Magic-School-4
itchUploadId: "19055895"
poster: /media/ms3-battle.gif
accent: "#3c4a8a"
---

> The clip above and the itch.io build are from the earlier version of this game, Magic School 3. The code on this page is Magic School 4.

## Background

In an auto-chess game the player never presses "cast". Heroes fight on their own, so every skill has to
describe **when** it fires, **what** it spawns, **who** it hits and **what happens next**, all without any
input. With 41 heroes, writing each skill as its own hand-written MonoBehaviour would mean 41
copies of the same targeting, timing and damage code.

So I split a skill into small reusable parts and made each hero's skill a class that puts those parts together.

## How a skill is put together

Every hero's skill is a class that inherits from **`SkillDefinition`**. It is built from **parts**: each part
says what it spawns, where it starts, where it aims, and what it does to whoever it touches.

A **flow** puts the parts in order with named slots: **`onStart`**, then **`onHit`** when it hits or
**`onExpired`** when it ends. When something happens in the fight, such as mana filling up or an enemy dying,
the hero calls a **hook** on its skill, and each skill overrides only the hooks it needs.

<a class="btn" href="/projects/magic-school-4/skill-system/">How a skill is put together, step by step →</a>

## Hex movement

How a hero moves across the hex board during a fight: pick a target, ask A\* for one step, decide whether to take it, then reserve and walk.

**One-line version:** pick the nearest enemy by steps → A\* gives one step around anything reserved → take it, unless an enemy is coming to you or it's a detour worth waiting a moment for → reserve the hex → slide there → ask again.

<a class="btn" href="/projects/magic-school-4/pathfinding/">How the A* pathfinding works, step by step →</a>
