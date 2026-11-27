---
title: Magic School 4
order: 0
badge: Latest
kind: Personal project · Auto-chess · Unity 6 (URP 2D, UI Toolkit) · successor to Magic School 3
tagline: The rebuild of Magic School 3. Heroes now buff each other through where you place them on the hex board, skills are rewritten around a simpler flow model, and the game has a working shop. Plus editor tools I built to balance 49 heroes.
tech: [Unity 6, C#, UI Toolkit, Assembly definitions, Editor tooling, EditMode tests, A* on hex grid, ScriptableObjects]
highlights:
  - Align mechanic — each hero marks hexes around it, and an ally standing on a mark gets (or gives) a bonus. Placement becomes the strategy.
  - Skill system v2 — skills are flows (on start → on hit / on expired, repeatable), so 41 of 49 heroes have complete skills.
  - Shop & economy — wallet, tier odds by stage, buy / sell / lock, and 3-copy star upgrades, in their own Economy module.
  - Balancing tools — an Align Editor, a live Skill Tuner that writes numbers back into code, and a benchmark that runs every hero through DPS / AoE / tank tests.
github: https://github.com/SwiftkeyX/Magic-School-4
accent: "#4a3c8a"
---

<!-- REVIEW (Pasit): first draft written from the repo (main @ Oct 18). Correct anything wrong and add the "why". MS4's own README and ARCHITECTURE.md are still copies of MS3's (they say 24 heroes / 17 skills / Bulwark), so update those too before a reviewer clicks through. -->

## Why a fourth version

[Magic School 3](/projects/magic-school-3/) proved the combat and skill pipeline worked, but it had two
problems. It had no economy, so there was no game around the fights. And its trait panel was an empty
slot, so nothing gave you a reason to place a hero *here* instead of *there*. In MS4 I fixed both,
and rewrote the skill model where MS3 had shown me its weak spots.

## MS3 → MS4 at a glance

| | Magic School 3 | Magic School 4 |
| --- | --- | --- |
| Heroes / complete skills | 24 / 17 | **49 / 41** |
| Placement strategy | trait panel planned, never built | **Align marks**: heroes buff each other by position |
| Skill model | indexed steps, each with a `TriggerEnum`, plus a generic `InvokeTrigger` broadcast | **`SkillFlow`**: `onStart → onHit / onExpired`, `Repeat(...)`, plus per-hero overrides |
| Economy | shop could not charge | **Wallet, shop odds by stage, sell, lock, 3-copy star upgrade** |
| Runtime modules | 13 | 14 (new **Economy**) |
| Balancing | CSV log of each fight | + **Align Editor**, **Skill Tuner**, **Hero Benchmark** |

## The Align mechanic

Every hero has **marks**: hexes at fixed directions and distances from where it stands. Each mark is
a colour:

- **Green** pays the **ally** standing on it. Ettin marks the two hexes behind him, so an ally there
  attacks 30% faster.
- **Orange** pays the **owner**, once for every ally standing on it.
- **White (special)** pays nobody, but the hero's *skill* reads who stands there. Rock Golem's "Ward"
  mark decides which allies his shield also covers.

A hero can have several patterns, and rotating it switches to the next one. An item lying on a marked
hex is *worn* by that hero. Bonuses are recalculated whenever a hero moves during preparation, and
again when the fight starts.

<figure class="diagram">
<svg viewBox="0 0 760 260" role="img" aria-labelledby="ms4-d-title">
<title id="ms4-d-title">Align marks on a hex board: Ettin marks the two hexes behind him in green, where an Elf stands and gains attack speed, and a hex ahead in orange, where a Knight stands and Ettin gains a bonus.</title>
<polygon class="hex" points="100.0,58.0 85.0,84.0 55.0,84.0 40.0,58.0 55.0,32.0 85.0,32.0"/>
<polygon class="hex" points="100.0,110.0 85.0,135.9 55.0,135.9 40.0,110.0 55.0,84.0 85.0,84.0"/>
<polygon class="hex" points="100.0,161.9 85.0,187.9 55.0,187.9 40.0,161.9 55.0,135.9 85.0,135.9"/>
<polygon class="hex" points="100.0,213.9 85.0,239.9 55.0,239.9 40.0,213.9 55.0,187.9 85.0,187.9"/>
<polygon class="hex green" points="145.0,84.0 130.0,110.0 100.0,110.0 85.0,84.0 100.0,58.0 130.0,58.0"/>
<polygon class="hex green" points="145.0,135.9 130.0,161.9 100.0,161.9 85.0,135.9 100.0,110.0 130.0,110.0"/>
<polygon class="hex" points="145.0,187.9 130.0,213.9 100.0,213.9 85.0,187.9 100.0,161.9 130.0,161.9"/>
<polygon class="hex" points="190.0,58.0 175.0,84.0 145.0,84.0 130.0,58.0 145.0,32.0 175.0,32.0"/>
<polygon class="hex hero" points="190.0,110.0 175.0,135.9 145.0,135.9 130.0,110.0 145.0,84.0 175.0,84.0"/>
<polygon class="hex" points="190.0,161.9 175.0,187.9 145.0,187.9 130.0,161.9 145.0,135.9 175.0,135.9"/>
<polygon class="hex" points="190.0,213.9 175.0,239.9 145.0,239.9 130.0,213.9 145.0,187.9 175.0,187.9"/>
<polygon class="hex" points="235.0,84.0 220.0,110.0 190.0,110.0 175.0,84.0 190.0,58.0 220.0,58.0"/>
<polygon class="hex" points="235.0,135.9 220.0,161.9 190.0,161.9 175.0,135.9 190.0,110.0 220.0,110.0"/>
<polygon class="hex" points="235.0,187.9 220.0,213.9 190.0,213.9 175.0,187.9 190.0,161.9 220.0,161.9"/>
<polygon class="hex orange" points="280.0,58.0 265.0,84.0 235.0,84.0 220.0,58.0 235.0,32.0 265.0,32.0"/>
<polygon class="hex" points="280.0,110.0 265.0,135.9 235.0,135.9 220.0,110.0 235.0,84.0 265.0,84.0"/>
<polygon class="hex" points="280.0,161.9 265.0,187.9 235.0,187.9 220.0,161.9 235.0,135.9 265.0,135.9"/>
<polygon class="hex" points="280.0,213.9 265.0,239.9 235.0,239.9 220.0,213.9 235.0,187.9 265.0,187.9"/>
<polygon class="hex" points="325.0,84.0 310.0,110.0 280.0,110.0 265.0,84.0 280.0,58.0 310.0,58.0"/>
<polygon class="hex" points="325.0,135.9 310.0,161.9 280.0,161.9 265.0,135.9 280.0,110.0 310.0,110.0"/>
<polygon class="hex" points="325.0,187.9 310.0,213.9 280.0,213.9 265.0,187.9 280.0,161.9 310.0,161.9"/>
<text class="ht" x="160.0" y="114.0">Ettin</text>
<text class="ht" x="115.0" y="88.0">Elf</text>
<text class="ht" x="250.0" y="62.0">Knight</text>
<rect class="box soft" x="372" y="24" width="370" height="214" rx="10"/>
<polygon class="hex green" points="420,56 412,70 396,70 388,56 396,42 412,42"/>
<text class="t" x="432" y="61">Green: the ally gets the bonus</text>
<text class="s" x="432" y="80">Elf behind Ettin → +30% attack speed</text>
<polygon class="hex orange" points="420,118 412,132 396,132 388,118 396,104 412,104"/>
<text class="t" x="432" y="123">Orange: the owner gets the bonus</text>
<text class="s" x="432" y="142">Knight on the mark → Ettin gains, once per ally</text>
<text class="s" x="390" y="182">Rotate a hero to switch pattern.</text>
<text class="s" x="390" y="200">Items lying on a mark are worn by its owner.</text>
<text class="s" x="390" y="218">Recomputed on every move and at fight start.</text>
</svg>
<figcaption>Ettin's green marks are from his real pattern. The orange mark is a simplified example to show both colours.</figcaption>
</figure>

Hand-typing "SW 1, NW 1" into an Inspector for 49 heroes wasn't going to work, so I built an
**Align Editor** window: pick a hero, click hexes to add them to a mark, and switch between pattern
tabs. It also works in Play mode, so I can adjust a mark and see the bonus change straight away.

## Skills v2: from steps to flows

In MS3 a skill was a list of steps, each tagged with a trigger, and the steps found each other through
a generic `InvokeTrigger(TriggerEnum)` broadcast. I had already flagged that as too generic. MS4
removes `TriggerEnum` completely. A skill is a **flow** of parts:

```csharp
// Dwarf: shoot a homing shot at the densest cluster; where it lands, it explodes
protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
    => Flow(onStart: Shoot(registry),
            onHit:   Explode(registry));

private SkillPart Explode(TemplateActionRegistrySO registry)
    => Part(registry: registry,
            source: ActionSourceEnum.WhereProjectileHit,
            action: TemplateActionEnum.CircleAOE,
            target: AimTargetEnum.WhereProjectileHit,
            tuning: _blastTuning = TuneAOE(),
            Damage(recipient: EffectRecipientEnum.EnemiesInArea,
                   ratios: (StatEnum.ATK, SmallBlastDmg)).AmplifiedBy(BlastAmplifier));
```

<small>From <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/main/Assets/Scripts/Skills/Library/Build/DwarfSkill.cs"><code>Skills/Library/Build/DwarfSkill.cs</code></a>, trimmed</small>

The order of events is now written in the code itself (`onStart`, `onHit`, `onExpired`,
`Repeat(flow, times: 3)`) instead of living in an index and an enum. Each hero's skill is also a
subclass of `SkillDefinition`, so a hero with unusual rules overrides a hook instead of adding a
special case to the shared pipeline. Rock Golem, for example, shields every ally on his Ward mark:

```csharp
public override bool OnCast()
{
    if (!base.OnCast()) return false;
    Caster.AddModifier(_shield, Caster as IHeroStats);

    // his wards: the allies standing on his "Ward" mark
    if (Caster is IAligned aligned)
        foreach (ICombatant ward in aligned.AlliesOnSpecialMark(WardMark))
            if (ward != null && ward.IsAlive) ward.AddModifier(_shield, Caster as IHeroStats);

    return true;
}
```

New template actions (summons, companions) and new stat systems (crit, omnivamp, shields, stat steal)
were added on top of the same pipeline.

## Balancing 49 heroes

- **Skill Tuner.** Every skill number is written as `Tuned(200f)`. An editor window lists them all,
  lets me change them while the game runs, and writes the values I keep **back into the skill's
  source file**. That way the code is still where the numbers live.
- **Hero Benchmark.** Runs every hero, 8 at a time, through three fixed tests: DPS against a dummy
  at 15 s and 30 s, AoE against a cluster of 4, and survival under constant damage. It runs with a
  fixed time step and no rendering, writes a CSV, and **flags any hero more than 20% away from its
  role's median**.
- **Tests.** EditMode tests cover targeting on the hex board (24 cases, with a board fixture).

## Shop & economy

Gold moves through a separate **Economy** module: `Wallet`, `Shop` (slots, refresh, lock, restock
each stage), `ShopOddsSO` (hero tier odds that change with the stage), and `Seller` (refunds).
Three copies of a hero combine into a higher star. The UI reads the shop only through an `IShop`
interface in Contracts, so the panel never references the Economy module.
