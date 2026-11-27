<ul class="toc">
<li><a href="#lyra-1-step-oncast">Lyra</a></li>
<li><a href="#spark-1-step-oncast">Spark</a></li>
<li><a href="#lumen-2-steps-oncast--onhit">Lumen</a></li>
<li><a href="#grimm-2-steps-oncast--oncaststart">Grimm</a></li>
<li><a href="#bulwark-2-steps-oncast--onexpired">Bulwark</a></li>
<li><a href="#heroskillcs">HeroSkill.cs</a></li>
</ul>

## Lyra: 1 step, `OnCast`

Lyra’s skill has only 1 step:

- **`Wave()`**: When `OnCast`(mana is capped), shoot a `PiercingProjectile` to the clustered of enemy.

<div class="example">

<span class="label">Wave()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCast`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`PiercingProjectile`** (goes through every enemy in its path)
- `source` ⇒ Where the `PiercingProjectile` was spawned? **`Self`** (Lyra)
- `target` ⇒ Where the `PiercingProjectile` was travel to? **`ClusteredLaser`** (the line that hits the most enemy)

</div>

<figure>
<img src="/media/ms3-skill-lyra.gif" alt="Lyra casting their skill" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/LyraSkill.cs">LyraSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal static class LyraSkill
    {
        private const float DamageRatio = 170f;   
        private const float ASbuff = 25f;
        private const float WaveSize = 2f;       

        public static SkillDefinition Build(TemplateActionRegistrySO registry)
        {
            return new SkillDefinition(
                skillName: "Skill",
                activeSteps: new List<SkillStep> { Wave(registry) },
                description: "Sends a wave through the thickest part of the enemy line. Enemies it passes through "
                           + $"take {DamageRatio}% AP; allies it passes through are left {ASbuff}% faster for the "
                           + "rest of the fight.");
        }

        private static SkillStep Wave(TemplateActionRegistrySO registry)
        {
            IModifier ASBuff = Bundle(
                duration: -1f,
                Buff(
                    modifier: ModifierEnum.AS,
                    source: ScalingSourceEnum.Recipient,
                    ratios: (StatEnum.AS, ASbuff, ScaleFromEnum.Base))
            );

            SkillActionGroup wave = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.PiercingProjectile,
                target: AimTargetEnum.ClusteredLaser,
                tuning: TuneProjectile(size: WaveSize),

                // deal dmg to enemy & give buff to ally 
                Damage(
                    recipient: EffectRecipientEnum.EnemiesInPath,
                    ratios: (StatEnum.AP, DamageRatio)),
                Apply(
                    recipient: EffectRecipientEnum.AlliesInPath,
                    modifier: ASBuff
                )
            );

            return Step(trigger: TriggerEnum.OnCast, groups: wave);
        }
    }
}
```

## Spark: 1 step, `OnCast`

Spark’s skill has only 1 step:

- **`Shoot()`**: When `OnCast` (mana is capped), shoot a projectile but with helper to repeat shooting the projectile.

<div class="example">

<span class="label">Shoot()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCast`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`FireTimingRunnerHomingProjectile`** (fire homing projectile again and again)
- `source` ⇒ Where the projectile was spawned? **`Self`** (Spark)
- `target` ⇒ Where the projectile was travel to? **`Random`** (a random enemy each shot)

</div>

<figure>
<img src="/media/ms3-skill-sparks.gif" alt="Spark casting their skill" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/SparksSkill.cs">SparksSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using MagicSchool.StatScaling;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    /// <summary>
    /// Sparks: fires 5 rockets in sequence, each at a random enemy within 2 hexes of her current
    /// target - no repeat until every enemy in that pool has been hit once.
    ///
    /// Sheet (Hero set 9): "Fire 5 rockets at random enemies within 2 hexes of the current target.
    /// Each rocket deals 150/155/160% Attack Damage + 15/20/35% Ability Power physical damage."
    /// Star-level scaling (the /155/160 and /20/35 tiers) isn't implemented yet - same as Lyra's
    /// DamageRatio, this takes the 1-star baseline only.
    /// </summary>
    internal class SparksSkill
    {
        private const float ADDamagePerShot = 150f;   // sheet: 150/155/160% AD
        private const float APDamagePerShot = 15f;    // sheet: 15/20/35% AP
        private const int ShotCount = 5;
        private const float IntervalBetweenShot = 0.1f;
        private const int RandomPoolRadius = 2;        // sheet: "random enemies within 2 hexes of the current target"
        private const float TotalCastTime = IntervalBetweenShot * (ShotCount - 1);

        public static SkillDefinition Build(TemplateActionRegistrySO registry)
        {
            return new SkillDefinition(
                skillName: "Skill",
                activeSteps: new List<SkillStep> { Shoot(registry) },
                description: $"Fires {ShotCount} rockets one after another at random enemies within {RandomPoolRadius} "
                           + $"hexes of the current target, each landing for {ADDamagePerShot}% AD + "
                           + $"{APDamagePerShot}% AP, never hitting the same one twice until everyone in range has "
                           + "been caught once.");
        }

        private static SkillStep Shoot(TemplateActionRegistrySO registry)
        {
            ProjectileTuning tune = TuneProjectile(castTime: 0f);

            SkillActionGroup shoot = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.FireTimingRunnerHomingProjectile,
                target: AimTargetEnum.Random,
                tuning: TuneFireTimingRunnerProjectile(ShotCount, FireTimingModeEnum.Sequence, IntervalBetweenShot, tune,
                                                       randomPoolRadius: RandomPoolRadius, castTime: TotalCastTime),

                Damage(
                    recipient: EffectRecipientEnum.SameToAimTarget,
                    (StatEnum.ATK, ADDamagePerShot), (StatEnum.AP, APDamagePerShot)
                )
            );

            return Step(trigger: TriggerEnum.OnCast, groups: shoot);
        }
    }
}
```

## Lumen: 2 steps, `OnCast` → `OnHit`

Lumen’s skill has 2 steps:

- **`Shoot()`**: When `OnCast` mana is capped, shoot a small projectile
- **`Explode()`**: When `OnHit` (a previous step hit enemy), spawn a projectile where the projectile was hit.

<div class="example">

<span class="label">Step1: Shoot()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCast`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`HomingProjectile`**
- `source` ⇒ Where the `HomingProjectile` was spawned? **`Self`** (Lumen)
- `target` ⇒ Where the `HomingProjectile` was travel to? **`ClusteredCircle`** (the clustered of enemy)

<span class="label">Step2: Explode()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnHit`** (previous step hit enemy)
- `templateAction` ⇒ What action hero do? **`CircleAOE`**
- `source` ⇒ Where the `CircleAOE` was spawned at? **`WhereProjectileHit`**
- `target` ⇒ Where the `CircleAOE` was pointed to? **`WhereProjectileHit`**

</div>

<figure>
<img src="/media/ms3-skill-lumen.gif" alt="Lumen casting their skill" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/LumenSkill.cs">LumenSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal class LumenSkill
    {
        private const float ExplodeDmg = 240f;
        private const float BlastSize = 4.5f;
        private static readonly float BlastRadius = Reach(BlastSize);

        public static SkillDefinition Build(TemplateActionRegistrySO registry)
        {
            return new SkillDefinition(
                skillName: "Skill",
                activeSteps: new List<SkillStep> { Shoot(registry), Explode(registry) },
                description: "Fires a homing shot into the densest cluster of enemies. "
                           + $"it bursts where it lands, dealing {ExplodeDmg}% AD to everyone inside the blast.");
        }

        private static SkillStep Shoot(TemplateActionRegistrySO registry)
        {
            SkillActionGroup shoot = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.HomingProjectile,
                target: AimTargetEnum.ClusteredCircle,
                tuning: TuneProjectile(spread: BlastRadius)
            );

            return Step(trigger: TriggerEnum.OnCast, groups: shoot);
        }

        private static SkillStep Explode(TemplateActionRegistrySO registry)
        {
            SkillActionGroup explode = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.WhereProjectileHit,
                action: TemplateActionEnum.CircleAOE,
                target: AimTargetEnum.WhereProjectileHit,
                tuning: TuneAOE(size: BlastSize),

                Damage(
                    recipient: EffectRecipientEnum.EnemiesInArea,
                    ratios: (StatEnum.ATK, ExplodeDmg)
                )
            );

            return Step(trigger: TriggerEnum.OnHit, groups: explode);
        }
    }
}
```

## Grimm: 2 steps, `OnCast` + `OnCastStart`

Grimm’s skill has 2 steps:

- **`Move()`**: when `OnCast` (mana is capped), move to the clustered of enemy in 4 hex.
- **`AOE()`**: when `OnCastStart` (play 1 frame after `OnCast`), spawn a sticky AOE on top of himself.

<div class="example">

<span class="label">Step1: Move()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCast`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`Move`**
- `source` ⇒ Which hero is using this `Move`? **`Self`** (Grimm)
- `target` ⇒ Where Grimm move to? **`ClusteredLaser`** (the clustered of enemy in 4 hex)

<span class="label">Step2: AOE()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCastStart`** (play 1 frame after `OnCast`)
- `templateAction` ⇒ What action hero do? **`HalfCircleAOESticky`** (an AOE that stick to its source)
- `source` ⇒ Where the `HalfCircleAOESticky` was spawned at? **`Self`** (on top of Grimm)
- `target` ⇒ Where the `HalfCircleAOESticky` was pointed to? **`Self`** (ride along with Grimm)

</div>

<figure>
<img src="/media/ms3-skill-grimm.gif" alt="Grimm casting their skill" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/GrimmSkill.cs">GrimmSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal static class GrimmSkill
    {
        private const int ChargeRange = 4;              // hexes he can cross
        private const float HitboxHalfWidth = 1.25f;
        private const float KnockedUpDuration = 2f;
        private const float CollideDamage = 200f;

        public static SkillDefinition Build(TemplateActionRegistrySO registry)
        {
            return new SkillDefinition(
                skillName: "Skill",
                activeSteps: new List<SkillStep> { Move(registry), AOE(registry) },
                description: $"Charges up to {ChargeRange} hexes straight through the enemy line, dealing "
                           + $"{CollideDamage}% AP to everyone he ploughs into on the way and stunning them.");
        }

        private static SkillStep Move(TemplateActionRegistrySO registry)
        {
            SkillActionGroup move = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Move,
                target: AimTargetEnum.ClusteredLaser,
                tuning: TuneMove(range: ChargeRange, spread: HitboxHalfWidth)
            );

            return Step(trigger: TriggerEnum.OnCast, groups: move);
        }

        private static SkillStep AOE(TemplateActionRegistrySO registry)
        {
            IModifier knockup = Bundle(
                duration: KnockedUpDuration,
                pieces: (
                    Status(ModifierEnum.Stun)
                )
            );

            // Make sure the AOE's lifetime is long enough until Move dies
            SkillActionGroup charge = ActionGroup(
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

            // FLAGGING: new trigger, start immediately at OnCast
            return Step(TriggerEnum.OnCastStart, charge);
        }
    }
}
```

## Bulwark: 2 steps, `OnCast` → `OnExpired`

Bulwark’s skill has 2 steps:

- **`Brace()`**: When `OnCast` (mana is capped), take 25% less damage, heal 200 health for 2 sec.
- **`Slam()`**: When `OnExpired` (previous step is end), spawn AOE at self deal damage.

<div class="example">

<span class="label">Step1: Brace()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnCast`** (mana is capped)
- `templateAction` ⇒ What action hero do? **`Cast`** heal for 2 sec
- `source` ⇒ Which hero is using this `Cast`? **`Self`** (Bulwark)
- `target` ⇒ Which hero the `Cast` was target to? **`Self`** (heal Bulwark)

<span class="label">Step2: Slam()</span>

- `TriggerEnum` ⇒ When the action is fired? **`OnExpired`** (previous step is end)
- `templateAction` ⇒ What action hero do? **`CircleAOE`**
- `source` ⇒ Where the `CircleAOE` was spawned at? **`Self`**
- `target` ⇒ Where the `CircleAOE` was pointed to? **`Self`**

</div>

<figure>
<img src="/media/ms3-skill-bulwark.gif" alt="Bulwark casting their skill" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/BulwarkSkill.cs">BulwarkSkill.cs</a></small>

```csharp
using System.Collections.Generic;
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    internal static class BulwarkSkill
    {
        // he is braced and locked out of attacking for the same stretch, so it is said once
        private const float BraceDuration = 2f;
        private const float TickInterval = 0.5f;

        // percentages of the caster's stat, the way the sheet writes them
        private const float HealAmount = 200f;
        private const float SlamDamage = 120f;
        private const float DamageReductionPercent = 25f;   // sheet: 25/25/35%

        public static SkillDefinition Build(TemplateActionRegistrySO registry)
        {
            return new SkillDefinition(
                skillName: "Guardian's Roar",
                activeSteps: new List<SkillStep> { Brace(registry), Slam(registry) },
                description: $"Braces for {BraceDuration} seconds, healing steadily for {HealAmount} and taking "
                             + $"{DamageReductionPercent}% less damage. The moment the brace ends he slams the ground "
                             + $"for {SlamDamage}% AP to every enemy around him.");
        }

        // the cast itself - everything here lands on Bulwark
        private static SkillStep Brace(TemplateActionRegistrySO registry)
        {
            SkillActionGroup brace = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.Cast,
                target: AimTargetEnum.Self,
                tuning: Tune(castTime: BraceDuration),

                // sheet: Bulwark heals off AP
                HealOverTime(
                    recipient: EffectRecipientEnum.Self,
                    duration: BraceDuration,
                    interval: TickInterval,
                    ratios: (StatEnum.AP, HealAmount)),

                Apply(
                    recipient: EffectRecipientEnum.Self,
                    modifier: Bundle(
                        duration: BraceDuration,
                        pieces: Buff(
                            modifier: ModifierEnum.DamageReduction,
                            ratios: DamageReductionPercent))
                )
            );

            return Step(trigger: TriggerEnum.OnCast, groups: brace);
        }

        // fired when the brace above expires
        private static SkillStep Slam(TemplateActionRegistrySO registry)
        {
            SkillActionGroup slam = ActionGroup(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.CircleAOE,
                target: AimTargetEnum.Self,

                Damage(
                    recipient: EffectRecipientEnum.EnemiesInArea,
                    ratios: (StatEnum.AP, SlamDamage))
            );

            return Step(trigger: TriggerEnum.OnExpired, groups: slam);
        }
    }
}
```

## HeroSkill.cs

The code from point 3 of *The problem*: where each trigger is tied to an array number.

<small class="source"><b>Source:</b> <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Combat/Heroes/HeroSkill.cs">HeroSkill.cs</a></small>

```csharp
using System;
using System.Collections.Generic;
using MagicSchool.Contracts;
using MagicSchool.Skills;

namespace MagicSchool.Combat.Heroes
{

    /// <summary>
    /// HeroSkill contain trigger condition for each hero skill.
    /// </summary>
    internal class HeroSkill
    {
        private readonly ICombatant _me;
        private readonly SkillDefinition _skill;
        private float _castTime;

        // ============================================== getter ==============================================
        public float GetCastTime() => _castTime;

        // Some heroes (e.g. generic dummy/tank archetypes) have no skill at all.
        public bool HasSkill => _skill != null && _skill.ActiveSteps.Count > 0;
        public bool HasPassive => _skill != null && _skill.PassiveSteps.Count > 0;

        // information to hero inspector panel
        public string SkillName => _skill != null ? _skill.SkillName : string.Empty;
        public string Description => _skill != null ? _skill.Description : string.Empty;
        public string PassiveDescription => _skill != null ? _skill.PassiveDescription : string.Empty;

        public HeroSkill(ICombatant me, SkillDefinition skill)
        {
            _me = me;
            _skill = skill;
            _skill?.Init(_me);
        }

        // ============================================== active & passive skill ==============================================
        // mana is full, OnCast skill is trigger. 
        // p.s. OnCast & OnCastStart are different, OnCast => active skill, OnCastStart => another skill that activate right after OnCast
        // p.s.2. OnCast's order is always = 0 in steps list
        public bool TriggerOnCastSkill(bool isManaCapped)
        {
            if (!isManaCapped || !HasSkill) return false;

            IReadOnlyList<SkillStep> steps = _skill.ActiveSteps;

            // OnCast skill is always step 0
            if (steps[0].Trigger != TriggerEnum.OnCast) return false;

            // fire OnCast skill first
            if (!FireStep(steps, 0)) return false;

            // then fire OnCastStart second
            TriggerOnCastStart(steps);

            return true;
        }

        // passive skill could always be triggered if the condition is true  
        public bool TriggerPassiveSkill(TriggerEnum trigger)
        {
            if (!HasPassive) return false;

            IReadOnlyList<SkillStep> steps = _skill.PassiveSteps;

            // if any trigger is matched to parameter, fired that passive skill
            if (steps[0].Trigger != trigger) return false;

            bool played = FireStep(steps, 0);

            // after fire passive skill, invoke [trigger = OnAttack] => to activate Vharn's combo counter
            // FLAGGING: Don't sure if it should stay here. Let's look at it again when the pattern is more clear. 
            if (played) _skill.InvokeTrigger(trigger);

            return played;
        }

        // ============================================== Trigger condition ==============================================
        // on kill enemy, OnKill step is trigger
        private void TriggerOnKillStep(int hp, SkillStep step)
        {
            // bool isTargetDead = hp <= 0;

            // if (isTargetDead) FireAction(IndexOfStep(step));
        }

        // This function create a event that was handed to TemplateAction.
        // on event invoke, next TemplateAction is played (if available), and related context is sent to be used for next TemplateAction.
        // e.g. Projectile invoke "OnHit" event => Send projectile hit position to next TemplateAction
        private Action<SkillStepContext> TriggerNextStep(IReadOnlyList<SkillStep> steps, int nextIndex, TriggerEnum trigger)
        {
            // guard
            if (nextIndex >= steps.Count) return null;

            // if trigger type match with this step, fire next step
            if (steps[nextIndex].Trigger != trigger) return null;

            return context => FireStep(steps, nextIndex, context);
        }

        // if OnCastStart available, it always start right after OnCast do
        // p.s. OnCastStart's order is always = 1 in steps list
        private void TriggerOnCastStart(IReadOnlyList<SkillStep> steps)
        {
            // guard
            if (steps.Count <= 1) return;

            if (steps[1].Trigger != TriggerEnum.OnCastStart) return;

            FireStep(steps, 1);
        }

        // ============================================== helper ==============================================
        // Fire skill in "step" order. Returns whether this step actually played anything.
        private bool FireStep(IReadOnlyList<SkillStep> steps, int stepIndex, SkillStepContext contextFromPreviousStep = null)
        {
            if (stepIndex < 0 || stepIndex >= steps.Count) return false;

            // step can have several template action, only template action was choose base on condition
            return PlayAction(steps, stepIndex, contextFromPreviousStep);
        }

        // Play a ActionGroup
        private bool PlayAction(IReadOnlyList<SkillStep> steps, int stepIndex, SkillStepContext contextFromPreviousStep)
        {
            // initial event - this is handed to template action that's going to be played
            Action<SkillStepContext> onExpired = TriggerNextStep(steps, stepIndex + 1, TriggerEnum.OnExpired);
            Action<SkillStepContext> onHit = TriggerNextStep(steps, stepIndex + 1, TriggerEnum.OnHit);

            // Choose 1 TemplateAction from ActionGroup
            IReadOnlyList<SkillActionGroup> actionGroups = steps[stepIndex].ActionGroups;
            foreach (SkillActionGroup actionGroup in actionGroups)
            {
                // check condition for current TemplateAction. 
                // if condition is not met, skip this one, and go check the next template action.
                if (SkillCondition.Ask(actionGroup.Conditions, _me) == ConditionResultEnum.ConditionIsNotMet) continue;

                // try play the template action
                bool played = TemplateAction.TryPlay(actionGroup, _me, onExpired, onHit, contextFromPreviousStep);

                // if one of the template action is played, stop
                if (played)
                {
                    _castTime = actionGroup.Tuning?.CastTime ?? actionGroup.TemplateAction.CastTime;
                    return true;
                }
            }

            return false;
        }
    }
}
```
