<div class="compare">
<div>

<span class="label">Magic School 3 · <code>LumenSkill.cs</code></span>

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

</div>
<div>

<span class="label">Magic School 4 · <code>LumenSkill.cs</code></span>

```csharp
using MagicSchool.Contracts;
using static MagicSchool.Skills.SkillFactory;

namespace MagicSchool.Skills
{
    /// <summary>
    /// Magic School 3's Lumen, rewritten for Magic School 4's skill system.
    /// The same skill Dwarf started from, without Dwarf's growing blast.
    /// </summary>
    internal class LumenSkill : SkillDefinition
    {
        private static float ExplodeDmg => Tuned(240f);
        private const float BlastDiameter = 4.5f;
        private const float BlastRadius = BlastDiameter / 2f;

        public static SkillDefinition Build(TemplateActionRegistrySO registry) => new LumenSkill(registry);

        private LumenSkill(TemplateActionRegistrySO registry) : base(registry) { }

        public override string SkillName => "Skill";

        public override string Description
            => "Fires a homing shot into the densest cluster of enemies. "
             + $"It bursts where it lands, dealing {ExplodeDmg}% AD to everyone inside the blast.";

        // ============================== active ==============================
        // on start, shoot; on hit, explode
        protected override SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry)
            => Flow(
                    onStart: Shoot(registry),
                    onHit: Explode(registry)
                );

        private SkillPart Shoot(TemplateActionRegistrySO registry)
        {
            SkillPart shoot = Part(
                registry: registry,
                source: ActionSourceEnum.Self,
                action: TemplateActionEnum.HomingProjectile,
                target: AimTargetEnum.ClusteredCircle,
                tuning: TuneProjectile(spread: BlastRadius)
            );

            return shoot;
        }

        private SkillPart Explode(TemplateActionRegistrySO registry)
        {
            SkillPart explode = Part(
                registry: registry,
                source: ActionSourceEnum.WhereProjectileHit,
                action: TemplateActionEnum.CircleAOE,
                target: AimTargetEnum.WhereProjectileHit,
                tuning: TuneAOE(length: BlastDiameter, width: BlastDiameter),

                Damage(
                    recipient: EffectRecipientEnum.EnemiesInArea,
                    ratios: (StatEnum.ATK, ExplodeDmg)
                )
            );

            return explode;
        }
    }
}
```

</div>
</div>
