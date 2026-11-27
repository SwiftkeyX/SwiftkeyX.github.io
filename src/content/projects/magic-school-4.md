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

## How is it improve from MagicSchool3

Magic School 4 keeps Magic School 3’s idea: a skill is built from small reusable parts. What changed is
how those parts are held together. [Magic School 3](/projects/magic-school-3/) ended with three problems
in its skill system, and Magic School 4 answers each one.

| Topic | Magic School 3 | Magic School 4 |
| --- | --- | --- |
| 1. Skill class now is more extensible. | A skill is a static builder that runs once. A hero that needs its own state needs a new helper class. | Each skill is its own class that can hold its own field and can run mid battle. Technically, it inherit from the `SkillDefinition`. |
| 2. Order of the skill is easier to understand. | Set by position in a list. Nothing checks or enforce it. | Now it was a virtual method in `SkillDefinition` that each skill inherit from it can override. e.g. `onStart`, `onHit`, `onExpired`. |

### 1. A skill is no longer static and can run mid-battle

Magic School 3’s skills were static, so it couldn’t keep its own field and skill is only run once in Build() so it never run mid-battle.

In Magic School 4 the skill is an object, so the counter is just a field. e.g. Dwarf’s blast grows every cast: 1 hex, then 2, then 3, then back to 1. That needs a counter that lives between casts and a skill that rebuild itself mid-battle.

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

<span class="label">Magic School 4 · <code>DwarfSkill.cs</code></span>

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

</div>
</div>

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

<div class="compare">
<div>

<span class="label">Magic School 3 · <code>HeroSkill.cs</code></span>

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
                // FLAGGING: Beside OnExpired, OnHit, there'll be more of it. 
                // We'll need to group them and send them in 1 go via list.
                // So the parameter didn't get clustered. 
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

</div>
<div>

<span class="label">Magic School 4 · <code>HeroSkill.cs</code></span>

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

</div>
</div>

<div class="compare">
<div>

<span class="label">Magic School 3 · <code>SkillDefinition.cs</code></span>

```csharp
using System;
using System.Collections.Generic;
using MagicSchool.Contracts;

namespace MagicSchool.Skills
{
    /// <summary>
    /// A whole container for 1 skill.
    /// SkillDefinition contain list of SkillStep for both passive & active skill.
    /// skill are separated into step, those step are working together in order, to create a actual skill.
    /// </summary>
    public class SkillDefinition
    {
        public string SkillName { get; }
        public string Description { get; }
        public string PassiveDescription { get; }

        // triggered by OnCast once mana caps
        public IReadOnlyList<SkillStep> ActiveSteps { get; }

        // triggered by whatever the hero does (attack, combat start, ...)
        public IReadOnlyList<SkillStep> PassiveSteps { get; }

        // event to control skill behaviour e.g. combo counter, (no more usage yet) ...
        public event Action<TriggerEnum> Triggered;

        public SkillDefinition(string skillName, List<SkillStep> activeSteps = null, List<SkillStep> passiveSteps = null,
            string description = "", string passiveDescription = "")
        {
            SkillName = skillName;
            ActiveSteps = activeSteps ?? new List<SkillStep>();
            PassiveSteps = passiveSteps ?? new List<SkillStep>();
            Description = description;
            PassiveDescription = passiveDescription;
        }

        // inject caster into class that need it.
        // E.g. SkillCondition
        public void Init(IEffectable caster)
        {
            foreach (SkillStep step in ActiveSteps) step.Init(caster);

            foreach (SkillStep step in PassiveSteps) step.Init(caster);
        }

        // FLAGGING: I don't like using this function, it don't tell anything about the event that was fired.
        // it too generic.
        // invoke the event, listener read if the trigger type match their's
        public void InvokeTrigger(TriggerEnum trigger) => Triggered?.Invoke(trigger);
    }
}
```

</div>
<div>

<span class="label">Magic School 4 · <code>SkillDefinition.cs</code></span>

```csharp
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using MagicSchool.Contracts;
using UnityEngine;

namespace MagicSchool.Skills
{
    /// <summary>
    /// A whole container for 1 skill.
    /// A skill is a combination of:
    /// 1) the SkillFlow: to create active skill, auto-attck skill, and more if added. (read SKillFlow.cs for more info)
    /// 2) the hook: to create a passive skill, and helper for active skill (read virtual hooks section in here)
    /// </summary>
    public abstract class SkillDefinition
    {
        private TemplateActionRegistrySO _registry;

        private SkillFlow _active;          // played when mana is full
        private SkillFlow _onAutoAttack;        // played on every auto attack. (most skills have none)

        protected ICombatant Caster { get; private set; }   // owner of this skill
        public float CastTime { get; private set; } // the animation's duration to play this specific skill
        public bool CanWalkWhileCasting { get; private set; }   // a part just played lets the caster walk during CastTime

        public bool IsRepeating { get; private set; }

        protected SkillDefinition(TemplateActionRegistrySO registry)
        {
            _registry = registry;
        }

        // ============================================== init ==============================================
        /// The flows of the hero's skill. Built once from Init.
        /// BuildActiveFlow    the flow played when mana is full
        /// BuildAutoAttackFlow    the flow played on every auto attack, if the skill has one
        protected abstract SkillFlow BuildActiveFlow(TemplateActionRegistrySO registry);
        protected virtual SkillFlow BuildAutoAttackFlow(TemplateActionRegistrySO registry) => null;

        public virtual void Init(ICombatant caster)
        {
            Caster = caster;

            if (_registry != null)
            {
                _active = BuildActiveFlow(_registry);
                _onAutoAttack = BuildAutoAttackFlow(_registry);

                // prevent second init from rebuilt the skill
                _registry = null;
            }

            _active?.Init(caster);
            _onAutoAttack?.Init(caster);
        }

        // ============================================== tuning ==============================================
        /// A skill number that Magic School 4 > Skill Tuner can change while the game runs (read SkillTuning.cs).
        /// e.g.     private static float DamageRatio => Tuned(200f);
        protected static float Tuned(float value, [CallerMemberName] string name = "", [CallerFilePath] string file = "")
            => SkillTuning.Get(file, name, value, isInt: false);

        protected static int Tuned(int value, [CallerMemberName] string name = "", [CallerFilePath] string file = "")
            => Mathf.RoundToInt(SkillTuning.Get(file, name, value, isInt: true));

        // ============================================== virtual ==============================================
        public abstract string SkillName { get; }
        public abstract string Description { get; }
        public virtual string PassiveDescription => "";

        // The special marks this skill reads, by name (See AlignMark). The Align Editor puts each one in every pattern of the hero.
        // e.g.     Rock Golem => { "Ward" }
        public virtual IReadOnlyList<string> SpecialMarks => NoSpecialMarks;
        private static readonly string[] NoSpecialMarks = new string[0];
        public virtual bool HasActive => _active != null;
        public virtual bool HasAutoAttackPassive => _onAutoAttack != null;

        // ============================================== virtual hooks ==============================================
        // If mana is full, subclass do [x], and play the active flow.
        public virtual bool OnCast() => PlayFlow(_active);

        // If auto attack, subclass do [x], and play the onAutoAttack flow.
        public virtual bool OnAutoAttack(ICombatant target) => PlayFlow(_onAutoAttack);

        // Normally a auto attack always default to current target.
        // But some skill may pick different target through this method. 
        // e.g. Goblin Archer auto attack a random enemy
        public virtual ICombatant OnPickAutoAttackTarget(ICombatant target) => target;

        // At combat start, play OnCombatStart.
        public virtual bool OnCombatStart() => false;

        // If any hero dies, play OnHeroDied.
        // e.g. Troll gains health whenever an enemy dies
        public virtual void OnHeroDied(ICombatant dead) { }

        // If the caster himself dies, play OnDeath.
        // e.g. Big Slime splits into Small Slimes
        public virtual void OnDeath() { }

        // If any hero takes a burn tick, play OnHeroBurned.
        // e.g. Imp gains attack speed whenever an enemy burns
        public virtual void OnHeroBurned(ICombatant burned) { }

        // If an ally standing on one of this skill's special marks deals damage, play OnMarkedAllyDealtDamage.
        // Wired by AlignBonuses.Refresh, so like every aligning bonus it follows where everyone stood when the fight started.
        // e.g. Shield Knight heals off the damage the allies on his Guard mark deal
        public virtual void OnMarkedAllyDealtDamage(string mark, ICombatant ally, DamageEvent hit) { }

        // add other hook
        // ...

        // ============================================== play ==============================================
        /// Play a specify flow.
        /// The flow will play each skill part which consist of OnStart, OnHit, and OnExpired in order. 
        /// OnStart, then follow by optional OnHit, and optional OnExpired.
        /// Vocab:
        ///     onStart     the parts that skill starts with.
        ///     onHit       the parts to play when `onStart` hits something. Optional.
        ///     onExpired   the parts to play when `onStart` expires. Optional.
        protected bool PlayFlow(SkillFlow flow)
        {
            if (flow == null) return false;

            // if the flow played is active and repeat, set the FLAG.
            if (flow == _active && flow.Times > 1) IsRepeating = true;

            if (PlayRound(flow)) return true;

            FlowFinished(flow);

            return false;
        }

        // Play a single part without depending on a flow.
        // no flow played after this.
        protected bool PlayOnePart(SkillPart part, ICombatant assignedTarget = null)
        {
            if (Play(part, new TemplateActionCallbacks { OnSkillHit = part.OnSkillHit }, null, assignedTarget) == null) return false;

            CastTime = CastTimeOf(part);
            CanWalkWhileCasting = WalksWhileCasting(part);
            return true;
        }

        // ============================================== private ==============================================
        // Play the flow once, start to finish. That is one round.
        // If 'round' is more than 1, repeat the flow for the 'round'.
        private bool PlayRound(SkillFlow flow, int round = 1)
        {
            // action to repeat the round
            Action finished = () => RoundFinished(flow, round);

            // play the flow, hand 'finished' to it too 
            return PlayParts(flow.OnStart, Follow(flow.OnHit), FollowLast(flow.OnExpired, finished), previousPosition: null);
        }

        // A round is finished, if the flow request repeat, play the next round. (read Repeat() in SkillFactory.cs)
        // if no repeat request, the flow'll end here.
        private void RoundFinished(SkillFlow flow, int round)
        {
            if (HasNextRound(flow, round) && PlayRound(flow, round + 1)) return;

            FlowFinished(flow);
        }

        private bool HasNextRound(SkillFlow flow, int round)
        {
            if (!Caster.IsAlive) return false;

            // the repeat count is all gone
            if (round >= flow.Times) return false;

            // guard
            if (Caster is UnityEngine.Object hero && hero == null) return false;

            return true;
        }

        // The flow has nothing left to play
        // e.g.     out of rounds to play, the caster died.
        private void FlowFinished(SkillFlow flow)
        {
            if (flow == _active) IsRepeating = false;
        }

        // read PlayFlow()
        private bool PlayParts(IReadOnlyList<SkillPart> parts,
        Action<Vector3> onHit,
        Action<Vector3> onExpired,
        Vector3? previousPosition)
        {
            float longestCast = 0f;
            bool canWalk = false;
            TemplateAction leader = null;

            for (int i = 0; i < parts.Count; i++)
            {
                SkillPart part = parts[i];
                bool isLeading = i == 0;

                // each skill part can be played by using this callback
                var callbacks = new TemplateActionCallbacks
                {
                    OnHit = isLeading ? onHit : null,
                    OnExpired = isLeading ? onExpired : null,
                    OnSkillHit = part.OnSkillHit,
                };

                TemplateAction played = null;
                if (SkillCondition.Ask(part.Conditions, Caster) != ConditionResultEnum.ConditionIsNotMet)
                {
                    // give the callback to template action
                    // let the template action decide when to use the callback to play each skill part
                    // e.g.     projectile (a template action) hit a hero, so it call OnHit.
                    played = Play(part, callbacks, previousPosition, host: leader);
                }

                if (isLeading && played == null) return false;
                if (isLeading) leader = played;
                if (played != null) longestCast = Mathf.Max(longestCast, CastTimeOf(part));
                if (played != null) canWalk |= WalksWhileCasting(part);
            }

            CastTime = longestCast;
            CanWalkWhileCasting = canWalk;
            return true;
        }

        // Consume only the optional part of the SkillPart.cs (e.g. OnHit, OnExpired)
        // return the callback that can be used to play the specify SkillPart.
        // Currently, this project force the skill to only have 2 flow depth. 
        // So the Follow() won't play anything after itself.
        // e.g.     OnStart => OnHit        => None
        //                  => OnExpired    => None
        private Action<Vector3> Follow(IReadOnlyList<SkillPart> parts)
        {
            if (parts.Count == 0) return null;

            return position => PlayParts(parts, onHit: null, onExpired: null, previousPosition: position);
        }

        // Same to Follow(), but for the parts a round ends with. It is to tell when this flow end:
        // Example, 
        //      there are no parts to play            => finished when `onStart` expired
        //      there are parts to play               => finished when their leading part expired
        //      the leading part could not be played  => finished right away, nothing is left to wait for
        // NOTE,
        //      onHit never finishes a round: a skill can miss, and then it would never finish.
        private Action<Vector3> FollowLast(IReadOnlyList<SkillPart> parts, Action finished)
        {
            if (parts.Count == 0) return _ => finished();

            return position =>
            {
                bool played = PlayParts(parts, onHit: null, onExpired: _ => finished(), previousPosition: position);

                if (!played) finished();
            };
        }

        // spawn the part's template action (read TemplateAction.cs for more info)
        private TemplateAction Play(SkillPart part, TemplateActionCallbacks callbacks, Vector3? previousPosition,
                                    ICombatant assignedTarget = null, TemplateAction host = null)
        {
            // guard
            if (Caster is UnityEngine.Object hero && hero == null) return null;

            return TemplateAction.Spawn(part, Caster, callbacks, previousPosition, assignedTarget, host);
        }

        // get the cast time of the specify skill part
        // cast time = duration before the skill part is played
        // e.g.     0.5 sec before shooting a projectile
        private static float CastTimeOf(SkillPart part)
            => part.Tuning?.CastTime ?? part.TemplateAction.CastTime;

        // does the skill part let the caster walk during its cast time?
        private static bool WalksWhileCasting(SkillPart part) => part.Tuning?.WalkWhileCasting ?? false;
    }
}
```

</div>
</div>
