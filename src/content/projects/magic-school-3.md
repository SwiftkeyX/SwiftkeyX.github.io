---
title: Magic School 3
order: 1
kind: Personal project · Auto-chess · Unity 6 (URP 2D, UI Toolkit) · rebuilt as Magic School 4
tagline: An auto-chess game. Buy heroes, place them on a hex board, then watch them fight on their own. I built the combat loop and a data-driven skill system that 17 heroes' skills are composed from.
tech: [Unity 6, C#, UI Toolkit, Assembly definitions, A* on hex grid, State machine, ScriptableObjects]
highlights:
  - Combat loop — auto-attacks on an attack-speed cooldown, passives on trigger, an active skill when mana caps.
  - Data-driven skill system — every skill is a list of steps composed from actions, effects and conditions. 24 heroes, 17 with complete skills.
  - Modifiers & status effects — buffs, debuffs, damage/heal events with outcomes, resolved through one pipeline.
  - Rebuilt the skill system in Magic School 4 — each skill is its own class with named hooks, so the skill order is written out instead of tied to a list index.
itch: https://switftkeyx.itch.io/magicschool3
github: https://github.com/SwiftkeyX/Magic-School-3
itchUploadId: "19055895"
poster: /media/ms3-battle.gif
accent: "#3c4a8a"
---

> **Rebuilt as Magic School 4.** I rebuilt this game's skill system to fix its problems.
> [See what changed and why ↓](#magic-school-4-the-rebuild)

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

## Magic School 4: the rebuild

Magic School 4 keeps Magic School 3’s idea: a skill is built from small reusable parts. What changed is
how those parts are held together. [Magic School 3](#the-problem) ended with three problems
in its skill system, and Magic School 4 answers each one.

| Topic | Magic School 3 | Magic School 4 |
| --- | --- | --- |
| 1. Skill class now is more extensible. | A skill is a static builder that runs once. A hero that needs its own state needs a new helper class. | Each skill is its own class that can hold its own field and can run mid battle. Technically, it inherit from the `SkillDefinition`. |
| 2. Order of the skill is easier to understand. | Set by position in a list. Nothing checks or enforce it. | Now it was a virtual method in `SkillDefinition` that each skill inherit from it can override. e.g. `onStart`, `onHit`, `onExpired`. |

### 1. A skill is no longer static and can run mid-battle

Magic School 3’s skills were static, so it couldn’t keep its own field and skill is only run once in Build() so it never run mid-battle.

In Magic School 4 the skill is an object, so the counter is just a field. e.g. Dwarf’s blast grows every cast: 1 hex, then 2, then 3, then back to 1. That needs a counter that lives between casts and a skill that rebuild itself mid-battle.

<a class="btn" href="/projects/magic-school-3/code/skill/">Code: <code>LumenSkill.cs</code>, MS3 vs MS4 →</a>

This example is the job `ComboTracker.cs` did for Vharn in Magic School 3, through a callback wired into `SkillDefinition`. In Magic School 4 that class is gone, Dwarf counts casts directly in its own skill class via a `_attackCount` field and an `OnAutoAttack` override.

`Rider` is general enough to be put in shared code but is no longer in `templateAction`. It was move to `AOE`  which is the only one that use `Rider` .

### 2. The skill system is scraped

The problem come `HeroSkill` are rework because we don’t need the skill order tie to the array.

Now, the every skill are inherit from `SkillDefinition` and can override a hook to control the skill order: `OnCast`, `OnAutoAttack`, `OnCombatStart`, `OnHeroDied`,`OnDeath`, `OnHeroBurned` and `OnMarkedAllyDealtDamage`. For example, Troll gains health whenever an enemy dies, and that is one `OnHeroDied` override in `TrollSkill.cs`.

The skill system is deeply coupling in itself so when `HeroSkill` and `SkillDefinition`changed, we have to scrape the entire system.

- `HeroSkill` are rework because we don’t need the skill order tie to the array. Now it just a class with public method for the hero to called which is easier to understand.
- Once `TriggerEnum` is gone the old class have to be rework too. So we use this chance to rename the class too so it’s easier to understand more intuitively.
  - `SkillFlow` replace `SkillStep`
  - `SkillPart` replace `SkillActionGroup`
- This is the reference chain of how it use to look like:
  - MS4: `HeroSkill (rework)` ⇒ `SkillDefenition` ⇒ `SkillFlow` ⇒ `SkillPart` ⇒ `source` / `templateAction` / `target`
  - MS3: `HeroSkill` ⇒ `SkillDefinition` ⇒ `SkillStep` ⇒ `TriggerEnum` / `SkillActionGroup` ⇒ `source` / `templateAction` / `target`

<a class="btn" href="/projects/magic-school-3/code/hero-skill/">Code: <code>HeroSkill.cs</code>, MS3 vs MS4 →</a>

<a class="btn" href="/projects/magic-school-3/code/skill-definition/">Code: <code>SkillDefinition.cs</code>, MS3 vs MS4 →</a>

## Hex movement

How a hero moves across the hex board during a fight: pick a target, ask A\* for one step, decide whether to take it, then reserve and walk.

**One-line version:** pick the nearest enemy by steps → A\* gives one step around anything reserved → take it, unless an enemy is coming to you or it's a detour worth waiting a moment for → reserve the hex → slide there → ask again.

<a class="btn" href="/projects/magic-school-3/pathfinding/">How the A* pathfinding works, step by step →</a>
