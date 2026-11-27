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

a container for 1 whole skill. Hold passive and active skill.

<div class="eg">

e.g. Bulwark’s skill is to heal for 2 second and slam the ground when the duration is end.

</div>

#### Passive & Active skill

both are the list of `step` .

- **passive skill** is played when certain condition is met. <span class="soft">e.g. this hero gain +5 atk every auto-attack.</span>
- **active skill** is played when the mana is capped. <span class="soft">e.g. Bulwark’s skill is played when mana is capped.</span>

### Explain `step`

a container for 1 part of the skill that can work independently but if work together with other step, could create a actual complex skill

<div class="eg">

e.g. projectile that explode into AOE.

</div>

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

From what you seeing, each `templateAction` have different behaviour even though they use the same variable `source` and `target`. This is simplification to make `templateAction` easier to read.

<div class="takeaway">

`TriggerEnum` is one of the problem that made this project harder to read because each step are tie to specific number which make thing hard to read.

</div>

### What a hero skill look like in code?

<a class="btn" href="/projects/magic-school-3/skills/">See Lyra, Spark, Lumen, Grimm and Bulwark in code →</a>

### The problem

In the end, this project will get ditched and turn into MagicSchool4. The reason mainly come from the code don’t have good enough readability that I satisfied with. After the codebase get bigger, I found myself getting confused several time of how the `steps` work. So I look into what wrong with the skill system:

#### 1. `SkillDefinition` is static and only run once when the battle begin through `Build(registry)`

- **static:** the class can’t hold the variable specific to different hero. So when we need that hero skill to do something that break the template, it’s structurally hard because the hero skill can’t hold its own variable.
- **run once:** it mean the class can’t run mid battle.

`Rider.cs & ComboTracker.cs` is the product of bad structure. When I want the hero skill to hold some variable, I need to create a new helper class and attach it somewhere to the existing system.

<div class="example">

<span class="label"><code>Rider.cs</code></span>

`Rider.cs` was to make the `templateAction` ride another `templateAction` .

For example, when Grimm charge forward, technically it was spawning a `AOE` that was riding on himself.

This class is put in `TemplateAction.cs` which is really weird at the beginning too because Grimm was the only hero that use `Rider.cs` at that time. But now we have 2 hero that use `Rider.cs`, so I think it was general enough to put in `TemplateAction` .

</div>

<div class="example">

<span class="label"><code>ComboTracker.cs</code></span>

`ComboTracker.cs` was to count the combo Vharn was doing when he use skill. This class have `Count()` method which wire to the skill system by making this method a callback function in `SkillDefinition.cs` which look really ugly.

At this point, I remember there’s no helper class before too so I have tolerance for it since I think I can polish it later once I understand the pattern more.

The callback function was never use in skill system at this point, so it kinda break the pattern of the skill system, and that look really out of place to me.

</div>

<div class="takeaway">

This problem indicate that everytime we have to add something new, the new helper class will be born, and will be somewhat put in somewhere really random in the project that feel like it doesn’t belong to. This show that skill system have structure problem.

</div>

#### 2. The order of the skill depend on array position but nothing enforce it properly

In code, if there’s something not written into this, thing will break.

1. `OnCast` must be `step[0]`
2. `OnCastStart` must be `step[1]`
3. passive must be `step[0]` too but with different boolean flag compared to `OnCast`

This wasn’t hard to fix but the main problem is

#### 3. Beside no enforcement, the skill trigger order was too complicated in code

Even though the idea for skill trigger order is really simple, it just `OnCast` ⇒ `OnCastStart` ⇒ `OnHit` / `OnExpired` / `Onkill` / etc…

But in code, the trigger order code just look so random and hard to read. I think the main reason is the order of the skill was made in `HeroSkill.cs` which isn’t intuitive to read because each trigger order was tied to array number:

- `OnCast`/Passive ⇒ only trigger on `step[0]`
- `OnCastStart` ⇒ only trigger on `step[1]`
- Other ⇒ check if the number matched the specify trigger.

It wasn’t intuitive to understand that each trigger was tied to each number. When read in code, it feel like magic number that reader don’t understand.

<a class="btn" href="/projects/magic-school-3/skills/#heroskillcs">See <code>HeroSkill.cs</code> →</a>

<div class="takeaway">

I scrape my skill system by creating new project, MagicSchool4.

</div>

## Assembly definitions

The code is split into 13 runtime assemblies (Combat, Skills, Modifiers, StatScaling, Items, UI, VFX,
CombatRecording, …). Shared interfaces and event structs (`ICombatant`,
`IEffectable`, `DamageEvent`, `HealEvent`) live in a **Contracts** assembly, so Skills can damage a hero
without referencing Combat.

- **The good:** The compiler enforces which module may use which. If Skills tries to reach into Combat, it won't compile, so the dependency rules can't quietly break over time. A change also only recompiles the assemblies that depend on it, so compile times are faster.
- **The bad:** the overuse of interfaces. There are 23 interfaces, and 17 of them have exactly one implementer. This happens because the assembly definitions force each module to talk through interfaces.

### From 23 interfaces: which ones are good and which are bad

Most of these interfaces exist so one assembly can talk to another. Some are justified and some are not.

#### Combat assembly:

<table class="iface">
<thead>
<tr><th>Interface</th><th>Implementer</th><th>What it does</th><th>Notes</th></tr>
</thead>
<tbody>
<tr>
<td><code>ICombatant</code></td>
<td><code>Hero</code></td>
<td>A unit that can fight on the board.</td>
<td><span class="ok">Justified:</span> the Skills assembly needs an interface to talk to <code>Hero</code>. <br><br>It's used 173 times across 35 files.</td>
</tr>
<tr>
<td><code>IEffectable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>A unit that can be affected by attacks, heals, buffs and debuffs.</td>
<td><span class="ok">Justified:</span> it's also used on its own, not only through <code>ICombatant</code>. <code>SkillCondition</code> and the combat recorder both hold an <code>IEffectable</code> directly. <br><br>It's used 51 times across 18 files.</td>
</tr>
<tr>
<td><code>ITargeter</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>Finds an enemy to target based on a specific condition.</td>
<td><span class="ok">Justified:</span> the Skills assembly uses <code>ITargeter</code> through <code>ICombatant</code>.<br><br>Its methods are used a lot by other files, especially in the Skills assembly. <br>This interface also simplifies the targeting logic by grouping it in one place, which improves readability.</td>
</tr>
<tr>
<td><code>IHexPlaceable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>To place <code>ICombatant</code> on a hex tile.</td>
<td><span class="bad">Not justified:</span> This interface is the hero's side of the hex, not the hex itself. It holds <code>ReservedHex</code> and <code>SetReservedHex</code>, which are used for walking on the hex. <br><br>It exists because those members can't go into <code>IPlaceable</code>. <code>IPlaceable</code> lives in Contracts assembly, and Contracts assembly isn't allowed to see <code>Hex</code>, so they had to be split out into <code>IHexPlaceable</code>. <br><br>Worth mentioning: <code>IHexPlaceable</code> is in the same assembly as <code>Hero</code>, and <code>Hero</code> is its only implementer. So this hex code could use <code>Hero</code> directly and drop this ugly interface.</td>
</tr>
<tr>
<td><code>IPlaceable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code> and <code>IHexPlaceable</code>)</td>
<td>Puts a unit onto a placement (a hex or a bench slot).</td>
<td><span class="ok">Justified:</span> not related to the assembly split.<br><br>I want a placement to hold a hero without knowing it's a hero.</td>
</tr>
<tr>
<td><code>IHeroStats</code></td>
<td><code>Hero</code></td>
<td>Reads a hero's stats.</td>
<td><span class="ok">Justified:</span> the Skills, StatScaling and Modifiers assemblies need a hero's stats to calculate damage. <br><br>It's used 23 times across 14 files.</td>
</tr>
<tr>
<td><code>IInspectableHero</code></td>
<td><code>Hero</code></td>
<td>Shows a hero's details in the inspector panel.</td>
<td><span class="bad">Not justified:</span> the UI assembly already references Combat, so the inspector could read <code>Hero</code> directly. <br><br>The interface is only needed because <code>PlayerController</code> sends the selected hero through <code>IInspectorPanel</code>. That lives in the Contracts assembly, which can't see <code>Hero</code> or <code>Item</code>. So it's a knock-on effect of the panel interfaces below. <br><br>If <code>IInspectorPanel</code> goes, <code>IInspectableHero</code> and <code>IInspectableItem</code> can go with it.</td>
</tr>
</tbody>
</table>

#### UI assembly:

<table class="iface">
<thead>
<tr><th>Interface</th><th>Implementer</th><th>What it does</th><th>Notes</th></tr>
</thead>
<tbody>
<tr>
<td><code>IBannerPanel</code></td>
<td><code>ResultBannerController</code></td>
<td><code>IBannerPanel</code> mirrors the public methods of <code>ResultBannerController</code>; it adds nothing of its own.</td>
<td><span class="bad">Not justified:</span> it only exists so <code>GameManager</code> can call down into the UI assembly.</td>
</tr>
<tr>
<td><code>IHintPanel</code></td>
<td><code>PhaseHintController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> same as <code>IBannerPanel</code>.</td>
</tr>
<tr>
<td><code>IScoreboardPanel</code></td>
<td><code>ScoreboardController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> same as <code>IBannerPanel</code>.</td>
</tr>
<tr>
<td><code>IRewardPanel</code></td>
<td><code>RewardPanelController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>GameManager</code> and <code>PlayerController</code> can call down into UI.</td>
</tr>
<tr>
<td><code>IHeroCountPanel</code></td>
<td><code>HeroCountController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>PlayerController</code> can call down into UI.</td>
</tr>
<tr>
<td><code>IInspectorPanel</code></td>
<td><code>InspectorController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>PlayerController</code> can call down into UI.</td>
</tr>
</tbody>
</table>

<div class="takeaway">

There are more of them, but these are enough to make the point. This project has too many interfaces, and they complicate it for no good reason.

This is especially true in the UI assembly. It doesn't need this many interfaces, because the data can flow another way, for example by subscribing to events.

</div>

## Hex movement

A\* pathfinding on the hex grid, with tile reservation so two heroes can't commit to the same hex in the
same frame.
