## The Example

Dwarf’s skill is one **flow** with two **parts** which is `Shoot` and `Explode`:

- When `onStart` (mana is capped), `shoot` a projectile.
- When `onHit` (projectile hit something), `explode` as AOE on the projectile hit position.

```csharp
// === this is flow ===
protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
    => Flow(
            // === this is 2 parts ===
            onStart: Shoot(registry),
            onHit: Explode(registry)
        );
```

`Shoot` is to spawn a `projectile` from `myself` which travel to `clustered of enemy`.

```csharp
private SkillPart Shoot(TemplateActionRegistrySO registry)
{
    _shotTuning = TuneProjectile();

    SkillPart shoot = Part(
        registry: registry,
        source: ActionSourceEnum.Self,
        action: TemplateActionEnum.HomingProjectile,
        target: AimTargetEnum.ClusteredCircle,
        tuning: _shotTuning
    );

    return shoot;
}
```

`Explode` is to spawn a `AOE` at `where the projectile hit` and point its tip toward `where the projectile hit`.

```csharp
private SkillPart Explode(TemplateActionRegistrySO registry)
{
    _blastTuning = TuneAOE();

    SkillPart explode = Part(
        registry: registry,
        source: ActionSourceEnum.WhereProjectileHit,
        action: TemplateActionEnum.CircleAOE,
        target: AimTargetEnum.WhereProjectileHit,
        tuning: _blastTuning,

        Damage(
            recipient: EffectRecipientEnum.EnemiesInArea,
            ratios: (StatEnum.ATK, SmallBlastDmg)
        ).AmplifiedBy(BlastAmplifier)
    );

    return explode;
}
```

Read full skill here [DwarfSkill.cs](https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/DwarfSkill.cs)

In short, Dwarf’s flow is to shoot a projectile that explode once the projectile hit the cluster of enemy.

## The parts

- **`SkillDefinition`** is the whole skill. Every hero’s skill is a class that inherits from it. Dwarf’s
  builds its flow in `BuildActiveFlow`, which plays when mana is full. A skill can also build a
  `BuildAutoAttackFlow`, which plays on every auto attack. e.g. Dire Wolf heals himself every auto attack.
- **`SkillFlow`** puts the parts in order. It has 3 pre-author parts: **`onStart`** (what the skill starts
  with), **`onHit`** (what plays when `onStart` hits something) and **`onExpired`** (what plays when
  `onStart` ends).
- **`SkillPart`** answers four questions about what one piece of the skill does. Let use Dwarf as a example again:

| | Question | Part1 (`onStart` ⇒ `Shoot`) | Part2 (`onHit` ⇒ `Explode`) |
| --- | --- | --- | --- |
| `action` | What does it spawn? | `HomingProjectile` | `CircleAOE` |
| `source` | Where does it start? | `Self`: Dwarf | `WhereProjectileHit` |
| `target` | Where does it aim? | `ClusteredCircle`: the densest group | `WhereProjectileHit` |
| effects | What happens to who it touches? | nothing, it only carries the shot | `Damage` 250% ATK to `EnemiesInArea` |

A skill reacts to the fight through **hooks**: methods on `SkillDefinition` that the hero calls when
something happens. A skill overrides only the ones it needs, and the rest do nothing:

```csharp
public virtual bool OnCast()                                   // mana is full: play the active flow
public virtual bool OnAutoAttack(ICombatant target)            // auto attack: play the auto-attack flow
public virtual ICombatant OnPickAutoAttackTarget(ICombatant target)   // pick who to auto attack
public virtual bool OnCombatStart()                            // the fight starts
public virtual void OnHeroDied(ICombatant dead)                // any hero dies
public virtual void OnDeath()                                  // this hero dies
public virtual void OnHeroBurned(ICombatant burned)            // any hero takes a burn tick
public virtual void OnMarkedAllyDealtDamage(string mark, ICombatant ally, DamageEvent hit)
```

For example, Dwarf overrides `OnCast` to grow his blast: The blast grows every cast: 1 hex, then 2, then 3, then back to 1.

```csharp
private int _blastHexes = StartBlastHexes;

// on cast, fire with the blast at its current size, then grow it for the next one
public override bool OnCast()
{
    float diameter = BlastDiameter(_blastHexes);
    _shotTuning.Spread = diameter / 2f;
    _blastTuning.Length = diameter;
    _blastTuning.Width = diameter;

    if (!base.OnCast()) return false;   // play the flow at the new size

    _firedHexes = _blastHexes;
    _blastHexes = _blastHexes >= MaxBlastHexes ? StartBlastHexes : _blastHexes + 1;
    return true;
}
```

## Here is other usage in the game

Ten heroes, each showing one thing the system can do. Click a name for the code.

<div class="hero-grid">
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/KnightSkill.cs"><b>Knight</b></a></p>
<img src="/media/ms4-skill-knight.gif" alt="Knight: Leaps into the densest enemies and stuns everyone where he lands." loading="lazy" width="640" height="360">
<p>Leaps into the densest enemies and stuns everyone where he lands.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/ShieldKnightSkill.cs"><b>Shield Knight</b></a></p>
<img src="/media/ms4-skill-shieldknight.gif" alt="Shield Knight: Braces, then slams the ground when the brace ends." loading="lazy" width="640" height="360">
<p>Braces, then slams the ground when the brace ends.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/CentaurSkill.cs"><b>Centaur</b></a></p>
<img src="/media/ms4-skill-centaur.gif" alt="Centaur: The hitbox rides along with the charge, hitting everyone on the way." loading="lazy" width="640" height="360">
<p>The hitbox rides along with the charge, hitting everyone on the way.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/RogueSkill.cs"><b>Rogue</b></a></p>
<img src="/media/ms4-skill-rogue.gif" alt="Rogue: Dash to a random side, then charge the enemy line. Three times." loading="lazy" width="640" height="360">
<p>Dash to a random side, then charge the enemy line. Three times.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/FencerSkill.cs"><b>Fencer</b></a></p>
<img src="/media/ms4-skill-fencer.gif" alt="Fencer: Vanishes and strikes the closest enemy: 3 hits, +1 per 10% crit." loading="lazy" width="640" height="360">
<p>Vanishes and strikes the closest enemy: 3 hits, +1 per 10% crit.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/WerewolfSkill.cs"><b>Werewolf</b></a></p>
<img src="/media/ms4-skill-werewolf.gif" alt="Werewolf: Transformed, his auto attack is a combo: box, triangle, circle." loading="lazy" width="640" height="360">
<p>Transformed, his auto attack is a combo: box, triangle, circle.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/GoblinArcherSkill.cs"><b>Goblin Archer</b></a></p>
<img src="/media/ms4-skill-goblinarcher.gif" alt="Goblin Archer: Each auto attack picks a new random enemy, no repeats." loading="lazy" width="640" height="360">
<p>Each auto attack picks a new random enemy, no repeats.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/TrollSkill.cs"><b>Troll</b></a></p>
<img src="/media/ms4-skill-troll.gif" alt="Troll: Every enemy death gives him bonus health and heals him." loading="lazy" width="640" height="360">
<p>Every enemy death gives him bonus health and heals him.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/BigSlimeSkill.cs"><b>Big Slime</b></a></p>
<img src="/media/ms4-skill-bigslime.gif" alt="Big Slime: Splits into Small Slimes when he dies." loading="lazy" width="640" height="360">
<p>Splits into Small Slimes when he dies.</p>
</div>
<div class="hero-cell">
<p class="hero-name"><a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/ImpSkill.cs"><b>Imp</b></a></p>
<img src="/media/ms4-skill-imp.gif" alt="Imp: Gains attack speed whenever an enemy takes a burn tick." loading="lazy" width="640" height="360">
<p>Gains attack speed whenever an enemy takes a burn tick.</p>
</div>
</div>
