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
> [See what changed and why ↓](#problems-and-fixes)

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

## Problems and fixes

This design worked, but it had three problems. I rebuilt the skill system in Magic School 4 to fix them. Each problem below is followed straight away by its fix.

### 1. A skill could not remember anything

**Problem.** A skill was a static `Build()` method. It ran once to produce a list of steps, so it could not store anything between casts. A hero that needed to remember something got its own helper class. For example, Vharn's attack combo was counted in `ComboTracker.cs`, wired into `SkillDefinition` through a callback. Each new hero like that meant another helper class.

**Fix.** In Magic School 4, each skill is a class that inherits from `SkillDefinition`. Anything it needs to remember is just a field. `ComboTracker.cs` is gone: Dire Wolf counts its attacks in an `_attackCount` field, updated in `OnAutoAttack`.

Lumen is the same skill in both games:

<a class="btn" href="/projects/magic-school-3/code/skill/">Code: <code>LumenSkill.cs</code>, MS3 vs MS4 →</a>

Dwarf is Lumen with one addition: the blast grows every cast, from 1 hex to 2 to 3, then back to 1. That takes one field, `_blastHexes`, and an `OnCast` override that resizes the blast before firing. Nothing outside `DwarfSkill.cs` had to change.

<a class="btn" href="/projects/magic-school-3/code/dwarf-skill/">Code: MS4 <code>LumenSkill.cs</code> vs <code>DwarfSkill.cs</code> →</a>

### 2. Skill order depended on position in a list

**Problem.** `HeroSkill` found each step by its index in the list: the cast step had to be index 0, and the step that starts with it had to be index 1. Nothing checked this. A step in the wrong slot simply never fired.

**Fix.** In Magic School 4, order is spelled out in two places:

- **When a skill runs.** `SkillDefinition` has one method per trigger: `OnCast`, `OnAutoAttack`, `OnCombatStart`, `OnHeroDied`, `OnDeath`, `OnHeroBurned` and `OnMarkedAllyDealtDamage`. A skill overrides only the ones it needs. Troll gains health whenever an enemy dies, and that is one `OnHeroDied` override in [`TrollSkill.cs`](/projects/magic-school-3/code/troll-skill/).
- **What happens within a cast.** A `SkillFlow` names its parts by role: `onStart`, then `onHit` or `onExpired`. Lumen is `Flow(onStart: Shoot, onHit: Explode)`.

### 3. The trigger code was hard to follow

**Problem.** Even when the order was right, following a skill meant tracing `HeroSkill` through index checks, `TriggerEnum` matches and callbacks built for the next step.

**Fix.** `HeroSkill` now just calls the skill's methods. Its cast trigger went from a chain of index checks to a single call to `_skill.OnCast()`.

<a class="btn" href="/projects/magic-school-3/code/hero-skill/">Code: <code>HeroSkill.cs</code>, MS3 vs MS4 →</a>

The skill system is tightly coupled, so changing `HeroSkill` and `SkillDefinition` meant rewriting the classes under them. With `TriggerEnum` gone, I renamed those classes to say what they are:

- `SkillStep` became `SkillFlow`.
- `SkillActionGroup` became `SkillPart`.

The chain, before and after:

- **MS3:** `HeroSkill` → `SkillDefinition` → `SkillStep` → `TriggerEnum` / `SkillActionGroup` → `source` / `templateAction` / `target`
- **MS4:** `HeroSkill` → `SkillDefinition` → `SkillFlow` → `SkillPart` → `source` / `templateAction` / `target`

<a class="btn" href="/projects/magic-school-3/code/skill-definition/">Code: <code>SkillDefinition.cs</code>, MS3 vs MS4 →</a>

One smaller cleanup: `Rider` (an action that rides on another action) used to sit in `TemplateAction`, the base class of every action. Only `AOE` uses it, so it moved into `AOE`.

<a class="btn" href="/projects/magic-school-3/problem/">The full write-up of the Magic School 3 problems →</a>

## Hex movement

How a hero moves across the hex board during a fight: pick a target, ask A\* for one step, decide whether to take it, then reserve and walk.

**One-line version:** pick the nearest enemy by steps → A\* gives one step around anything reserved → take it, unless an enemy is coming to you or it's a detour worth waiting a moment for → reserve the hex → slide there → ask again.

<a class="btn" href="/projects/magic-school-3/pathfinding/">How the A* pathfinding works, step by step →</a>
