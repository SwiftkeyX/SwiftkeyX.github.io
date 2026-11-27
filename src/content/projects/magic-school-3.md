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

<figure class="diagram">
<svg viewBox="0 0 760 400" role="img" aria-labelledby="ms3-d-title">
<title id="ms3-d-title">Skill system: a SkillDefinition holds ordered steps; each step runs an action group made of a condition, a template action, effects and recipients; action events trigger the next step.</title>
<defs><marker id="ms3a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker><marker id="ms3h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow hl" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="20" y="16" width="240" height="58" rx="8"/>
<text class="t" x="36" y="41">SkillDefinition</text>
<text class="s" x="36" y="60">ActiveSteps · PassiveSteps</text>
<path class="edge" d="M140 74 V112" marker-end="url(#ms3a)"/>
<rect class="box" x="20" y="116" width="210" height="58" rx="8"/>
<text class="t" x="36" y="141">Step 0</text>
<text class="s" x="36" y="160">trigger: OnCast (mana full)</text>
<rect class="box" x="275" y="116" width="210" height="58" rx="8"/>
<text class="t" x="291" y="141">Step 1</text>
<text class="s" x="291" y="160">trigger: OnCastStart</text>
<rect class="box hl" x="530" y="116" width="210" height="58" rx="8"/>
<text class="t" x="546" y="141">Step 2</text>
<text class="s" x="546" y="160">trigger: OnHit / OnExpire …</text>
<path class="edge" d="M230 145 H271" marker-end="url(#ms3a)"/>
<path class="edge" d="M125 174 V226" marker-end="url(#ms3a)"/>
<rect class="band" x="20" y="230" width="720" height="150" rx="10"/>
<text class="bandlabel" x="36" y="252">SkillActionGroup — what one step does</text>
<rect class="box" x="36" y="272" width="130" height="62" rx="8"/>
<text class="t" x="50" y="298">Condition</text>
<text class="s" x="50" y="317">HasStatus · Number</text>
<rect class="box" x="186" y="272" width="230" height="62" rx="8"/>
<text class="t" x="200" y="298">TemplateAction</text>
<text class="s" x="200" y="317">Projectile · AOE · Hitbox · Move</text>
<rect class="box" x="436" y="272" width="150" height="62" rx="8"/>
<text class="t" x="450" y="298">Effects</text>
<text class="s" x="450" y="317">Damage · Heal · Apply</text>
<rect class="box" x="606" y="272" width="118" height="62" rx="8"/>
<text class="t" x="618" y="298">Recipients</text>
<text class="s" x="618" y="317">EnemiesInPath …</text>
<path class="edge" d="M166 303 H182" marker-end="url(#ms3a)"/>
<path class="edge" d="M416 303 H432" marker-end="url(#ms3a)"/>
<path class="edge" d="M586 303 H602" marker-end="url(#ms3a)"/>
<path class="edge hl" d="M380 272 C380 215 635 230 635 178" marker-end="url(#ms3h)"/>
<text class="s" x="190" y="212">OnHit(context) fires the next step</text>
<text class="s" x="36" y="362">One step can hold several groups — the condition picks which one plays.</text>
</svg>
<figcaption>How the pieces below fit together.</figcaption>
</figure>

### Explain `SkillDefinition`

a container for 1 whole skill. Hold passive and active skill. <span class="soft">e.g. Bulwark’s skill is to heal for 2 second and slam the ground when the duration is end.</span>

#### Passive & Active skill

both are the list of `step` .

- **passive skill** is played when certain condition is met. <span class="soft">e.g. this hero gain +5 atk every auto-attack.</span>
- **active skill** is played when the mana is capped. <span class="soft">e.g. Bulwark’s skill is played when mana is capped.</span>

### Explain `step`

a container for 1 part of the skill that can work independently but if work together with other step, could create a actual complex skill
<span class="soft">e.g.projectile that explode into AOE.</span>

It contain `TriggerEnum` and list of `SkillActionGroup`

#### `TriggerEnum`

A enum for if-else check when the skill should be fired.

```csharp
public enum TriggerEnum
{
    OnCast = 0,
    OnCastStart = 5,    // once the `OnCast` trigger
    OnKill = 1,         // once this hero kill someone
    OnExpired = 2,      // once the previous step expired
    OnHit = 3,          // once the previous step hit someone
    OnAttack = 4,       // once hero auto attack
}
```

#### `SkillActionGroup`

A action the hero do. It contain `templateAction` , `source` , and `target`.
<span class="soft">e.g. shoot a PiercingProjectile to the clustered of enemy.</span>

<a class="btn" href="/projects/magic-school-3/skills/">See Lyra, Spark, Lumen, Grimm and Bulwark in code →</a>

### The problem

<ol class="problem-list">
<li><code>SkillDefinition</code> is static and only run once when the battle begin through <code>Build(registry)</code></li>
<li>The order of the skill depend on array position but nothing enforce it properly</li>
<li>Beside no enforcement, the skill trigger order was too complicated in code</li>
</ol>

<a class="btn" href="/projects/magic-school-3/problem/">Read the whole problem →</a>

## Assembly definitions

The code is split into 13 runtime assemblies (Combat, Skills, Modifiers, StatScaling, Items, UI, VFX,
CombatRecording, …). Shared interfaces and event structs (`ICombatant`,
`IEffectable`, `DamageEvent`, `HealEvent`) live in a **Contracts** assembly, so Skills can damage a hero
without referencing Combat.

- **The good:** The compiler enforces which module may use which. If Skills tries to reach into Combat, it won't compile, so the dependency rules can't quietly break over time. A change also only recompiles the assemblies that depend on it, so compile times are faster.
- **The bad:** the overuse of interfaces. There are 23 interfaces, and 17 of them have exactly one implementer. This happens because the assembly definitions force each module to talk through interfaces.

<a class="btn" href="/projects/magic-school-3/interfaces/">From 23 interfaces: which ones are good and which are bad →</a>

## Hex movement

A\* pathfinding on the hex grid, with tile reservation so two heroes can't commit to the same hex in the
same frame.
