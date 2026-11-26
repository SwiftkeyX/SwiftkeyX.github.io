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

<!-- REVIEW (Pasit): this page is a first draft written from the repo. Correct anything wrong, and add the "why" behind decisions where only you know it. Delete these comments when done. -->

## The problem

In an auto-chess game the player never presses "cast". Heroes fight on their own, so every skill has to
describe **when** it fires, **what** it spawns, **who** it hits and **what happens next**, all without any
input. With 24 heroes planned, writing each skill as its own hand-written MonoBehaviour would mean 24
copies of the same targeting, timing and damage code.

So I split a skill into small reusable parts and made each hero's skill a composition of those parts.

## How a skill is put together

A `SkillDefinition` holds two lists of **steps**, active (fired when mana caps) and passive (fired by
triggers like *on attack* or *combat start*). Each step has a **trigger** and one or more **action
groups**. An action group picks a **template action** (projectile, AoE, hitbox, move), tunes it, and
attaches **effects** (damage, heal, apply modifier) aimed at a **recipient** (enemies in path, allies in
path, self…). An optional **condition** chooses between groups.

Steps chain through events. When a projectile hits, it raises `OnHit` with a context (hit position,
targets), and the next step whose trigger is `OnHit` fires from there.

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
<figcaption>A skill is data: ordered steps, each a composition of condition → action → effects → recipients. Action events chain steps together.</figcaption>
</figure>

### What a hero's skill looks like

Lyra's skill sends a wave through the most clustered part of the enemy line. Enemies in its path take
damage, and allies in its path get a permanent attack-speed buff. The whole skill is one step:

```csharp
private static SkillStep Wave(TemplateActionRegistrySO registry)
{
    IModifier ASBuff = Bundle(
        duration: -1f,                       // lasts the rest of the fight
        Buff(modifier: ModifierEnum.AS,
             source: ScalingSourceEnum.Recipient,
             ratios: (StatEnum.AS, ASbuff, ScaleFromEnum.Base)));

    SkillActionGroup wave = ActionGroup(
        registry: registry,
        source: ActionSourceEnum.Self,
        action: TemplateActionEnum.PiercingProjectile,
        target: AimTargetEnum.ClusteredLaser,
        tuning: TuneProjectile(size: WaveSize),

        Damage(recipient: EffectRecipientEnum.EnemiesInPath,
               ratios: (StatEnum.AP, DamageRatio)),
        Apply(recipient: EffectRecipientEnum.AlliesInPath,
              modifier: ASBuff));

    return Step(trigger: TriggerEnum.OnCast, groups: wave);
}
```

<small>From <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/main/Assets/Scripts/Skills/Library/Build/LyraSkill.cs"><code>Skills/Library/Build/LyraSkill.cs</code></a></small>

Nothing in it is specific to Lyra except the numbers. The piercing projectile, cluster aiming,
"enemies in path" and the modifier pipeline are shared by every hero. Bulwark's two-step skill (brace,
then slam when the brace *expires*) uses the same parts with a different trigger on step 2:

<figure>
<img src="/media/ms3-bulwark-skill.gif" alt="Bulwark braces, gaining shield and healing, then slams the ground when the brace expires" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
<figcaption>Bulwark: step 1 braces (heal + damage reduction), step 2 fires on the brace expiring.</figcaption>
</figure>

## Keeping 24 heroes maintainable

- **Assembly definitions.** The code is split into 13 runtime assemblies (Combat, Skills, Modifiers,
  StatScaling, Items, UI, VFX, CombatRecording, …) plus an Editor assembly. Shared interfaces and event
  structs (`ICombatant`, `IEffectable`, `DamageEvent`, `HealEvent`) live in a **Contracts** assembly, so
  Skills can damage a hero without referencing Combat.
- **Combat recording.** Every fight can be exported to CSV (damage dealt and taken, mitigated, overkill,
  healing, overhealing, per hero) so balancing works from numbers, not impressions.
- **Hex movement.** A\* pathfinding on the hex grid, with tile reservation so two heroes can't commit to
  the same hex in the same frame.

## What I'd do differently

<!-- REVIEW (Pasit): these are drawn from FLAGGING comments and the code. Keep the ones you agree with and put them in your own words. -->

- **Skills started as ScriptableObject assets and moved into code builders** (`SkillFactory`). Code
  gave me compile-time checks and readable diffs. The cost is that a designer can't tweak a skill
  without a programmer. Next I'd generate the data from the builders, or add an editor on top, to get both.
- **Generic trigger events.** `SkillDefinition.InvokeTrigger(TriggerEnum)` broadcasts to every listener,
  which then filter. I already flagged it in the code as too generic. Typed events per trigger would
  make the flow traceable.
- **Not finished yet:** the gold economy and trait panel. Lyra's per-enemy damage falloff is also still a
  flat hit, as noted in her skill file.
