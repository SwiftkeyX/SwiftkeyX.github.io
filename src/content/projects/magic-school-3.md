---
title: Magic School 3
order: 1
kind: Personal project · Auto-chess · Unity 6 (URP 2D, UI Toolkit)
tagline: An auto-chess game. Buy heroes, place them on a hex board, then watch them fight on their own. I built the combat loop and a data-driven skill system that 17 heroes' skills are composed from.
tech: [Unity 6, C#, UI Toolkit, Assembly definitions, A* on hex grid, State machine, ScriptableObjects]
highlights:
  - Combat loop — auto-attacks on an attack-speed cooldown, passives on trigger, an active skill when mana caps.
  - Data-driven skill system — every skill is a list of steps composed from actions, effects and conditions. 24 heroes, 17 with complete skills.
  - Modifiers & status effects — buffs, debuffs, damage/heal events with outcomes, resolved through one pipeline.
  - 13 runtime modules behind assembly definitions, with a Contracts assembly so features don't reference each other.
itch: https://switftkeyx.itch.io/magicschool3
github: https://github.com/SwiftkeyX/Magic-School-3
itchUploadId: "19055895"
poster: /media/ms3-battle.gif
accent: "#3c4a8a"
---

> **This is the earlier version.** [Magic School 4](/projects/magic-school-4/) rebuilds it with a
> placement mechanic, a shop and a simpler skill model. Its page compares the two side by side.

## Background

In an auto-chess game the player never presses "cast". Heroes fight on their own, so every skill has to
describe **when** it fires, **what** it spawns, **who** it hits and **what happens next**, all without any
input. With 24 heroes planned, writing each skill as its own hand-written MonoBehaviour would mean 24
copies of the same targeting, timing and damage code.

So I split a skill into small reusable parts and made each hero's skill a composition of those parts.

## How a skill is put together

Every hero's skill is a list of **steps**. Each step has a **trigger** (when it fires) and an **action
group** (what it spawns, where it starts, where it aims, and what it does to whoever it touches).

The steps never reference each other. They are linked only by their **order in the list** and their
**trigger**, and a **context** carries data from one to the next, such as where a projectile hit.

<a class="btn" href="/projects/magic-school-3/skill-system/">How a skill is put together, step by step →</a>

### The problem

<ol class="problem-list">
<li><code>SkillDefinition</code> have bad structure. Causing a new ugly helper class to born everytime we want to add new hero that break the template.</li>
<li>The order of the skill depend on array position but nothing enforce it properly</li>
<li>Beside no enforcement, the skill trigger order was too complicated in code</li>
</ol>

<a class="btn" href="/projects/magic-school-3/problem/">Read the whole problem →</a>

## Hex movement

How a hero moves across the hex board during a fight: pick a target, ask A\* for one step, decide whether to take it, then reserve and walk.

**One-line version:** pick the nearest enemy by steps → A\* gives one step around anything reserved → take it, unless an enemy is coming to you or it's a detour worth waiting a moment for → reserve the hex → slide there → ask again.

<a class="btn" href="/projects/magic-school-3/pathfinding/">How the A* pathfinding works, step by step →</a>
