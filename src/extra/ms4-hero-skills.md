<ul class="toc">
<li><a href="#dwarf-onstart--onhit-plus-oncast">Dwarf</a></li>
<li><a href="#dire-wolf-onstart--onexpired-plus-onautoattack">Dire Wolf</a></li>
<li><a href="#centaur-two-parts-together-in-onstart">Centaur</a></li>
<li><a href="#werewolf-onautoattack">Werewolf</a></li>
<li><a href="#troll-onherodied">Troll</a></li>
<li><a href="#heroskillcs">HeroSkill.cs</a></li>
</ul>

## Dwarf: `onStart` → `onHit`, plus `OnCast`

Dwarf's skill is a flow with 2 parts, and one hook:

- **`Shoot()`**: in `onStart` (mana is capped), shoot a homing projectile at the densest group of enemies.
- **`Explode()`**: in `onHit` (the shot hit something), spawn a circle AOE where it hit.
- **`OnCast()`**: before each cast, size the blast: 1 hex, then 2, then 3, then back to 1.

<div class="example">

<span class="label">Shoot()</span>

- slot ⇒ When is the part played? **`onStart`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`HomingProjectile`** (follows its target)
- `source` ⇒ Where the `HomingProjectile` was spawned? **`Self`** (Dwarf)
- `target` ⇒ Where the `HomingProjectile` was travel to? **`ClusteredCircle`** (the circle that hits the most enemies)

</div>

<div class="example">

<span class="label">Explode()</span>

- slot ⇒ When is the part played? **`onHit`** (`Shoot` hit something)
- `templateAction` ⇒ What action hero do? **`CircleAOE`**
- `source` ⇒ Where the `CircleAOE` was spawned? **`WhereProjectileHit`**
- `target` ⇒ Where the `CircleAOE` was aimed? **`WhereProjectileHit`**

</div>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/DwarfSkill.cs">DwarfSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class DwarfSkill : SkillDefinition
    {
        // the blast's damage by its size, % AD
        private static float SmallBlastDmg => Tuned(250f);     // 1 hex
        private static float MediumBlastDmg => Tuned(250f);    // 2 hexes
        private static float BigBlastDmg => Tuned(500f);       // 3 hexes

        // blast radius of the skill: 1 -> 2 -> 3 -> 1 -> ... one step every cast
        private static int StartBlastHexes => Tuned(1);
        private static int MaxBlastHexes => Tuned(3);
        private int _blastHexes = StartBlastHexes;
        private int _firedHexes = StartBlastHexes;     // the size of the shot in flight - the blast lands after the next size is set

        private ProjectileTuning _shotTuning;
        private AOETuning _blastTuning;

        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new DwarfSkill(registry);

        private DwarfSkill(TemplateActionRegistrySO registry) : base(registry) { }

        public override string SkillName => "Blast Charge";

        public override string Description
            => "Fires a homing shot into the densest cluster of enemies. "
             + $"It bursts where it lands, damaging everyone inside the blast. "
             + $"The blast starts at {StartBlastHexes} hex and grows by 1 hex every cast up to {MaxBlastHexes}, then starts small again. "
             + $"It deals {SmallBlastDmg}% AD at 1 hex, {MediumBlastDmg}% AD at 2 and {BigBlastDmg}% AD at 3.";

        // get the blast diameter of the skill
        private static float BlastDiameter(int hexes) => hexes * 2f + 0.5f;

        // % AD by the size it was fired at; past 3 counts as the biggest
        private static float DamageFor(int hexes) => hexes <= 1 ? SmallBlastDmg : hexes == 2 ? MediumBlastDmg : BigBlastDmg;

        // the damage effect is built at the small blast's number; this scales it to the size in flight
        private float BlastAmplifier(IEffectable _) => SmallBlastDmg > 0f ? DamageFor(_firedHexes) / SmallBlastDmg - 1f : 0f;

        // ============================== passive ==============================
        // at combat start, the blast is small again
        public override bool OnCombatStart()
        {
            _blastHexes = StartBlastHexes;

            return base.OnCombatStart();
        }

        // ============================== active ==============================
        // on cast, fire with the blast at its current size, 
        // then grow it for the next one
        public override bool OnCast()
        {
            float diameter = BlastDiameter(_blastHexes);
            _shotTuning.Spread = diameter / 2f;
            _blastTuning.Length = diameter;
            _blastTuning.Width = diameter;

            if (!base.OnCast()) return false;

            _firedHexes = _blastHexes;
            _blastHexes = _blastHexes >= MaxBlastHexes ? StartBlastHexes : _blastHexes + 1;
            return true;
        }

        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
            => Flow(
                    onStart: Shoot(registry),
                    onHit: Explode(registry)
                );

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
    }
}
```

## Dire Wolf: `onStart` → `onExpired`, plus `OnAutoAttack`

Dire Wolf's skill is a flow with 2 parts, an auto-attack flow, and two hooks:

- **`Cast()`**: in `onStart` (mana is capped), buff himself with +200% attack speed for 5 seconds.
- **`OnCastExpired()`**: in `onExpired` (the buff ended), howl: stun every enemy around him.
- **`BuildAutoAttackFlow()`**: on every auto attack, heal himself.
- **`OnAutoAttack()`**: count his auto attacks. Every 5 attacks add 0.5 seconds to the stun.
- **`OnCombatStart()`**: reset the count and cut his AD for the fight.

<div class="example">

<span class="label">Cast()</span>

- slot ⇒ When is the part played? **`onStart`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`Cast`** (applies its effects to himself)
- `source` ⇒ Where the `Cast` was spawned? **`Self`** (Dire Wolf)
- `target` ⇒ Where the `Cast` was aimed? **`Self`** (Dire Wolf)

</div>

<div class="example">

<span class="label">OnCastExpired()</span>

- slot ⇒ When is the part played? **`onExpired`** (the buff from `Cast` ended)
- `templateAction` ⇒ What action hero do? **`CircleAOE`**
- `source` ⇒ Where the `CircleAOE` was spawned? **`Self`** (Dire Wolf)
- `target` ⇒ Where the `CircleAOE` was aimed? **`Self`** (around Dire Wolf)

</div>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/DireWolfSkill.cs">DireWolfSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class DireWolfSkill : SkillDefinition
    {
        // buff
        private static float AttackSpeedBuff => Tuned(200f);   // +200%
        private static float BuffDuration => Tuned(5f);

        // stun of DireWolf can grows with every x auto attacks
        private static float StunDuration => Tuned(0.5f);
        private static float StunPerGrowth => Tuned(0.5f);
        private static int AttacksPerGrowth => Tuned(5);
        private int _attackCount;

        // passive
        private static float AttackCut => Tuned(50f);   // -50% base AD
        private static float HealOnAA => Tuned(30f);
        private static float RestOfFight => Tuned(-1f);

        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new DireWolfSkill(registry);

        private DireWolfSkill(TemplateActionRegistrySO registry) : base(registry) { }

        public override string SkillName => "Frenzy";

        public override string Description
            => $"Works himself into a frenzy for {BuffDuration} seconds, gaining {AttackSpeedBuff}% "
             + "attack speed. When it wears off he lets out a howl that stuns every enemy around him "
             + $"for {StunDuration} seconds. Every {AttacksPerGrowth} auto attacks add {StunPerGrowth} seconds to the stun.";

        public override string PassiveDescription
            => $"His AD is cut by {AttackCut}%. Every auto attack he lands heals him for {HealOnAA}% AP.";

        private float CurrentStun => StunDuration + StunPerGrowth * (_attackCount / AttacksPerGrowth);

        // ============================== active ==============================
        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
            => Flow(onStart: Cast(registry), onExpired: OnCastExpired(registry));

        private static SkillPart Cast(TemplateActionRegistrySO registry)
        {
            // +200% of his own attack speed - a self-referential ratio, resolved once when it lands
            ICustomModifier modifiers = BundleRefresh(
                BuffDuration,
                Buff(ModifierEnum.AS, (StatEnum.AS, AttackSpeedBuff, ScaleFromEnum.Base)),
                // FIXLATER: I notice that there's not anything to prevent the Modifier.ManaBlocked to be use with Buff or Debuff. 
                // Eventhough it should olonly be used by Status().
                Debuff(ModifierEnum.ManaBlocked)
            );

            // cast buff
            SkillPart cast = Part(registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Cast,
                target: AimTargetEnum.Self,
                Apply(EffectRecipientEnum.Self, modifiers));

            return cast;
        }

        private SkillPart OnCastExpired(TemplateActionRegistrySO registry)
        {
            // stun
            ICustomModifier stun = BundleRefresh(() => CurrentStun, Status(ModifierEnum.Stun));

            // aoe on self
            SkillPart AOE = Part(registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.CircleAOE,
                target: AimTargetEnum.Self,
                Apply(EffectRecipientEnum.EnemiesInArea, stun));

            return AOE;
        }

        // ============================== passive ==============================
        // at combat start, the count starts over and his AD is halved
        public override bool OnCombatStart()
        {
            _attackCount = 0;

            Caster.AddModifier(
                BundleStack(
                    RestOfFight,
                    Debuff(
                        ModifierEnum.ATK,
                        (StatEnum.ATK, AttackCut, ScaleFromEnum.Base))
                ),
                Caster as IHeroStats
            );

            return base.OnCombatStart();
        }

        // on attack, increase attackCount
        // attackCount increase stun duration
        public override bool OnAutoAttack(ICombatant target)
        {
            _attackCount++;

            return base.OnAutoAttack(target);
        }

        // on attack, heal himself
        protected override SkillFlow BuildAutoAttackFlow(TemplateActionRegistrySO registry)
        {
            // cast
            SkillPart cast = Part(registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Cast,
                target: AimTargetEnum.Self,
                // sheet: 30% AP
                Heal(EffectRecipientEnum.Self, (StatEnum.AP, HealOnAA)));

            return Flow(onStart: cast);
        }
    }
}
```

## Centaur: two parts `Together` in `onStart`

Centaur's skill is a flow with 2 parts that start at the same time:

- **`Move()`**: charge up to 4 hexes through the enemy line.
- **`AOE()`**: a hitbox that rides along with the charge, damaging and stunning everyone he ploughs into.

`Together(Move, AOE)` plays both parts at once. The first part leads, so the hitbox knows which charge to
ride on.

<div class="example">

<span class="label">Move()</span>

- slot ⇒ When is the part played? **`onStart`**, leading (mana is capped)
- `templateAction` ⇒ What action hero do? **`Move`** (Centaur himself charges)
- `source` ⇒ Where the `Move` was spawned? **`Self`** (Centaur)
- `target` ⇒ Where the `Move` was travel to? **`ClusteredLaser`** (the line that hits the most enemies)

</div>

<div class="example">

<span class="label">AOE()</span>

- slot ⇒ When is the part played? **`onStart`**, together with `Move()`
- `templateAction` ⇒ What action hero do? **`HalfCircleAOESticky`** (sticks to Centaur while he moves)
- `source` ⇒ Where the `HalfCircleAOESticky` was spawned? **`Self`** (Centaur)
- `target` ⇒ Where the `HalfCircleAOESticky` was aimed? **`Self`** (Centaur)

</div>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/CentaurSkill.cs">CentaurSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class CentaurSkill : SkillDefinition
    {
        private static int ChargeRange => Tuned(4);              // hexes he can cross
        private static float HitboxHalfWidth => Tuned(1.25f);
        private static float KnockedUpDuration => Tuned(2f);
        private static float CollideDamage => Tuned(140f);

        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new CentaurSkill(registry);

        private CentaurSkill(TemplateActionRegistrySO registry) : base(registry) { }

        public override string SkillName => "Trample";

        public override string Description
            => $"Charges up to {ChargeRange} hexes straight through the enemy line, dealing "
             + $"{CollideDamage}% AP to everyone he ploughs into on the way and stunning them.";

        // ============================== active ==============================
        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
            => Flow(onStart: Together(Move(registry), AOE(registry)));

        private static SkillPart Move(TemplateActionRegistrySO registry)
        {
            SkillPart move = Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Move,
                target: AimTargetEnum.ClusteredLaser,
                tuning: TuneMove(range: ChargeRange, spread: HitboxHalfWidth)
            );

            return move;
        }

        private static SkillPart AOE(TemplateActionRegistrySO registry)
        {
            ICustomModifier knockup = BundleRefresh(
                duration: KnockedUpDuration,
                modifiers: (
                    Status(ModifierEnum.Stun)
                )
            );

            // Make sure the AOE's lifetime is long enough until Move dies
            SkillPart charge = Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.HalfCircleAOESticky,
                target: AimTargetEnum.Self,
                tuning: TuneAOE(sticky: true),

                Damage(
                    recipient: EffectRecipientEnum.EnemiesInPath,
                    ratios: (StatEnum.AP, CollideDamage)
                ),
                Apply(
                    recipient: EffectRecipientEnum.EnemiesInPath,
                    modifier: knockup
                )
            );

            return charge;
        }
    }
}
```

## Werewolf: `OnAutoAttack`

Werewolf's skill is a flow with 1 part, and a hook that replaces his auto attack:

- **`Transform()`**: in `onStart` (mana is capped), transform for 10 seconds.
- **`OnAutoAttack()`**: while transformed, each auto attack plays the next beat of a three-beat combo: box, then triangle, then circle.

The combo is two fields: the three beats, and `_currentBeat`, which moves to the next beat every auto attack.

<div class="example">

<span class="label">Transform()</span>

- slot ⇒ When is the part played? **`onStart`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`Cast`** (applies its effects to himself)
- `source` ⇒ Where the `Cast` was spawned? **`Self`** (Werewolf)
- `target` ⇒ Where the `Cast` was aimed? **`Self`** (Werewolf)

</div>

<div class="example">

<span class="label">OnAutoAttack()</span>

- hook ⇒ When does it run? **every auto attack**
- What does it do? If he is transformed, play `_beats[_currentBeat]`: a `BoxAOE`, then a `TriangleAOE`, then a `CircleAOE`, aimed at his current target.

</div>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/WerewolfSkill.cs">WerewolfSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class WerewolfSkill : SkillDefinition
    {
        // werewolf skill play 3 different attack
        // box, triangle, circle - in the order 
        private readonly SkillPart[] _beats;
        private int _currentBeat;

        // each beat (attack) have different damage amount
        private static float BoxDamage => Tuned(200f);
        private static float TriangleDamage => Tuned(300f);
        private static float CircleDamage => Tuned(400f);

        private static float OmnivampFromAP => Tuned(10f);
        // FLAGGING: sheet: 80% of bonus AS, converted to AD 
        private static float AttackFromAS => Tuned(500f);
        private static float TransformDuration => Tuned(10f);


        // FIXLATER: turn every hero into skilldefinition. and move Build inside the skilldefinition.
        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new WerewolfSkill(registry);

        private WerewolfSkill(TemplateActionRegistrySO registry) : base(registry)
        {
            _beats = new[]
            {
                Beat(registry, TemplateActionEnum.BoxAOE,      BoxDamage),
                Beat(registry, TemplateActionEnum.TriangleAOE, TriangleDamage),
                Beat(registry, TemplateActionEnum.CircleAOE,   CircleDamage),
            };
        }

        public override string SkillName => "Moonrage";

        public override string Description
            => $"Transforms for {TransformDuration} seconds, draining {OmnivampFromAP}% AP of the damage "
             + "he deals back as life and turning his bonus attack speed into raw attack damage.";

        public override string PassiveDescription
            => "While transformed his auto attack becomes a three beat combo - box, then triangle, "
             + $"then circle - landing for {BoxDamage}% / {TriangleDamage}% / {CircleDamage}% AD "
             + "in turn.";

        // ============================== init ==============================

        public override void Init(ICombatant caster)
        {
            base.Init(caster);

            foreach (SkillPart beat in _beats) beat.Init(caster);
        }

        // ============================== passive ==============================
        public override bool HasAutoAttackPassive => true;

        // at combat start, reset the beat
        public override bool OnCombatStart()
        {
            _currentBeat = 0;
            return base.OnCombatStart();
        }

        // if transform, auto-attack play the current beat
        public override bool OnAutoAttack(ICombatant target)
        {
            if (!Caster.HasStatus(ModifierEnum.Transformed)) return false;

            if (!PlayOnePart(_beats[_currentBeat])) return false;

            _currentBeat = (_currentBeat + 1) % _beats.Length;
            return true;
        }

        // ============================== active ==============================
        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
        {
            return Transform(registry);
        }

        private static SkillFlow Transform(TemplateActionRegistrySO registry)
        {
            // one group, one timer - the whole transform ends on the same tick
            ICustomModifier WorldEnderBuff = BundleRefresh(
                duration: TransformDuration,

                Buff(
                    modifier: ModifierEnum.Omnivamp,
                    ratios: (StatEnum.AP, OmnivampFromAP, ScaleFromEnum.Base)),

                Buff(
                    modifier: ModifierEnum.ATK,
                    ratios: (StatEnum.AS, AttackFromAS, ScaleFromEnum.Base)),

                Status(ModifierEnum.Transformed),

                // no mana while transformed, and the combo below stands in for the auto attack
                Status(ModifierEnum.ManaBlocked),

                Status(ModifierEnum.AutoAttackWasReplaced)
            );

            SkillPart cast = Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Cast,
                target: AimTargetEnum.Self,
                Apply(
                    recipient: EffectRecipientEnum.Self,
                    modifier: WorldEnderBuff)
            );

            return Flow(onStart: cast);
        }

        private static SkillPart Beat(TemplateActionRegistrySO registry, TemplateActionEnum action, float damage)
            => Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: action,
                target: AimTargetEnum.Current,
                tuning: TuneAOE(offset: AOEOffsetEnum.Tip),
                Damage(
                    recipient: EffectRecipientEnum.EnemiesInArea,
                    ratios: (StatEnum.ATK, damage))
            );
    }
}
```

## Troll: `OnHeroDied`

Troll's skill is a flow with 1 part, and a hook:

- **`slam`**: in `onStart` (mana is capped), slam the ground around himself and wound every enemy hit.
- **`OnHeroDied()`**: whenever an enemy dies, gain bonus health for the rest of the fight and heal for as much.

<div class="example">

<span class="label">slam</span>

- slot ⇒ When is the part played? **`onStart`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`CircleAOE`**
- `source` ⇒ Where the `CircleAOE` was spawned? **`Self`** (Troll)
- `target` ⇒ Where the `CircleAOE` was aimed? **`Self`** (around Troll)

</div>

<div class="example">

<span class="label">OnHeroDied()</span>

- hook ⇒ When does it run? **any hero dies**
- What does it do? If the dead hero is an enemy, add a stacking `BonusHP` buff and heal for the same amount.

</div>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Skills/Library/Build/TrollSkill.cs">TrollSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class TrollSkill : SkillDefinition
    {
        // slam
        private static float DamageRatio => Tuned(150f);
        private static float WoundDuration => Tuned(6f);

        // area - the centre hex plus that many rings around it (hexes are ~1 apart)
        private static int AreaHexes => Tuned(1);
        private static float AreaDiameter => AreaHexes * 2f + 0.5f;

        // passive
        private static float BonusHPPerDeath => Tuned(300f);
        private static float RestOfFight => Tuned(-1f);

        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new TrollSkill(registry);

        private TrollSkill(TemplateActionRegistrySO registry) : base(registry) { }

        public override string SkillName => "Rotting Slam";

        public override string Description
            => $"Slams the ground for {DamageRatio}% AD to enemies around him and wounds them for "
             + $"{WoundDuration} seconds (reduced healing).";

        public override string PassiveDescription
            => $"Whenever an enemy dies, he gains {BonusHPPerDeath} bonus health for the rest of the fight and heals for as much.";

        // ============================== passive ==============================
        public override bool HasAutoAttackPassive => true;

        // an enemy died - gain bonus health, and the HP to fill it.
        // A fresh bundle every time, so the deaths stack
        public override void OnHeroDied(ICombatant dead)
        {
            if (dead.Team == Caster.Team) return;

            Caster.AddModifier(
                BundleStack(RestOfFight, Buff(ModifierEnum.BonusHP, BonusHPPerDeath)),
                Caster as IHeroStats);

            Caster.Heal(BonusHPPerDeath, Caster);
        }

        // ============================== active ==============================
        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
        {
            ICustomModifier wound = BundleRefresh(WoundDuration, Status(ModifierEnum.Wound));

            // a circle around himself
            SkillPart slam = Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.CircleAOE,
                target: AimTargetEnum.Self,
                tuning: TuneAOE(length: AreaDiameter, width: AreaDiameter),

                Damage(EffectRecipientEnum.EnemiesInArea, (StatEnum.ATK, DamageRatio)),
                Apply(EffectRecipientEnum.EnemiesInArea, wound)
            );

            return Flow(onStart: slam);
        }
    }
}
```

## HeroSkill.cs

The hero calls `HeroSkill` when something happens in the fight, and `HeroSkill` calls the matching hook on the skill.

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-4/blob/bf8234d/Assets/Scripts/Combat/Heroes/HeroSkill.cs">HeroSkill.cs</a></small>

```csharp
using MagicSchool.Contracts;
using MagicSchool.Skills;

namespace MagicSchool.Combat.Heroes
{

    /// <summary>
    /// Work with SkillDefinition
    /// HeroSkill decide when to play each type of skill.
    /// e.g.    OnCast skill    =   played when mana is full
    ///         OnAutoAttack skill  =   played when hero auto-attack
    /// </summary>
    internal class HeroSkill
    {
        private readonly SkillDefinition _skill;

        // ============================================== getter ==============================================
        public float GetCastTime() => _skill?.CastTime ?? 0f;
        public bool CanWalkWhileCasting() => _skill != null && _skill.CanWalkWhileCasting;
        public bool IsSkillRepeating() => _skill != null && _skill.IsRepeating;

        // Some heroes (e.g. generic dummy/tank archetypes) have no skill at all.
        public bool HasSkill => _skill != null && _skill.HasActive;
        public bool HasAutoAttackPassive => _skill != null && _skill.HasAutoAttackPassive;

        // information to hero inspector panel
        public string SkillName => _skill != null ? _skill.SkillName : string.Empty;
        public string Description => _skill != null ? _skill.Description : string.Empty;
        public string PassiveDescription => _skill != null ? _skill.PassiveDescription : string.Empty;

        public HeroSkill(ICombatant me, SkillDefinition skill)
        {
            _skill = skill;
            _skill?.Init(me);
        }

        // ============================================== active & passive skill ==============================================
        // if mana is full, play OnCast type of skill
        public bool TriggerOnCastSkill(bool isManaCapped)
        {
            if (!isManaCapped || !HasSkill) return false;

            return _skill.OnCast();
        }

        // if auto-attack, play OnAutoAttack type of skill
        public bool TriggerOnAutoAttack(ICombatant target)
        {
            if (!HasAutoAttackPassive) return false;

            return _skill.OnAutoAttack(target);
        }

        // before an auto-attack lands, the skill may pick another target 
        // e.g. Goblin Archer shoots a random enemy
        public ICombatant PickAutoAttackTarget(ICombatant target)
        {
            if (_skill == null) return target;

            return _skill.OnPickAutoAttackTarget(target) ?? target;
        }

        // at start of the combat, play OnCombat type of skill
        public bool TriggerOnCombatStart()
        {
            if (_skill == null) return false;

            return _skill.OnCombatStart();
        }

        // if hero dies, play OnHeroDied type of skill
        public void TriggerOnHeroDied(ICombatant dead)
        {
            _skill?.OnHeroDied(dead);
        }

        // if I die myself, play OnDeath type of skill
        public void TriggerOnDeath()
        {
            _skill?.OnDeath();
        }

        // if hero takes a burn tick, play OnHeroBurned type of skill
        public void TriggerOnHeroBurned(ICombatant burned)
        {
            _skill?.OnHeroBurned(burned);
        }

        // if an ally on one of my special marks deals damage, play OnMarkedAllyDealtDamage type of skill
        public void TriggerOnMarkedAllyDealtDamage(string mark, ICombatant ally, DamageEvent hit)
        {
            _skill?.OnMarkedAllyDealtDamage(mark, ally, hit);
        }
    }
}
```
