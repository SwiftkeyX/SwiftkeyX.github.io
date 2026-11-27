Every hero's skill is made from the same few parts. The easiest way to see them is to follow one skill
from start to finish, so here is **Lumen**: *fire a homing shot into the densest group of enemies, and
where it lands, it explodes.*

<figure>
<img src="/media/ms3-skill-lumen.gif" alt="Lumen firing a homing shot that explodes on impact" loading="lazy" style="border-radius:10px;border:1px solid var(--line)">
</figure>

## The whole skill in code

Lumen's skill is two **steps**: `Shoot` and `Explode`.

```csharp
public static SkillDefinition Build(TemplateActionRegistrySO registry)
{
    return new SkillDefinition(
        skillName: "Skill",
        activeSteps: new List<SkillStep> { Shoot(registry), Explode(registry) });
}

// Step 0: fire a homing projectile from Lumen at the densest group of enemies
private static SkillStep Shoot(TemplateActionRegistrySO registry)
{
    SkillActionGroup shoot = ActionGroup(
        registry: registry,
        source: ActionSourceEnum.Self,
        action: TemplateActionEnum.HomingProjectile,
        target: AimTargetEnum.ClusteredCircle);

    return Step(trigger: TriggerEnum.OnCast, groups: shoot);
}

// Step 1: where that projectile hit, explode and damage every enemy inside
private static SkillStep Explode(TemplateActionRegistrySO registry)
{
    SkillActionGroup explode = ActionGroup(
        registry: registry,
        source: ActionSourceEnum.WhereProjectileHit,
        action: TemplateActionEnum.CircleAOE,
        target: AimTargetEnum.WhereProjectileHit,
        Damage(recipient: EffectRecipientEnum.EnemiesInArea,
               ratios: (StatEnum.ATK, ExplodeDmg)));   // 240% ATK

    return Step(trigger: TriggerEnum.OnHit, groups: explode);
}
```

<small class="source">From <a href="https://github.com/SwiftkeyX/Magic-School-3/blob/7c8f5b5/Assets/Scripts/Skills/Library/Build/LumenSkill.cs">LumenSkill.cs</a>, with the description and tuning lines removed</small>

## The parts

- **`SkillDefinition`** is the whole skill. Lumen's holds its two steps in `activeSteps`, which run when
  mana is full. A hero can also have `passiveSteps`, which run on their own trigger instead.
  <span class="soft">e.g. this hero gain +5 atk every auto-attack.</span>
- **`SkillStep`** is one part of the skill that works on its own. It is a **trigger** (when it fires)
  plus an **action group** (what it does).
- **`SkillActionGroup`** answers four questions about what the step does:

| | Question | Step 0 · `Shoot` | Step 1 · `Explode` |
| --- | --- | --- | --- |
| `trigger` | When does it fire? | `OnCast`: mana is full | `OnHit`: step 0 hit something |
| `action` | What does it spawn? | `HomingProjectile` | `CircleAOE` |
| `source` | Where does it start? | `Self`: Lumen | `WhereProjectileHit` |
| `target` | Where does it aim? | `ClusteredCircle`: the densest group | `WhereProjectileHit` |
| effects | What happens to who it touches? | nothing, it only carries the shot | `Damage` 240% ATK to `EnemiesInArea` |

The **trigger** comes from a small enum. `OnCast` starts the skill, and the others react to the step
before them:

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

## What happens when Lumen casts

<figure class="diagram">
<svg viewBox="0 0 760 336" role="img" aria-labelledby="ms3-d-title">
<title id="ms3-d-title">Lumen's cast: mana fills, step 0 (Shoot, trigger OnCast) fires a homing projectile; when it hits, OnHit passes the hit position to step 1 (Explode, trigger OnHit), which spawns a circle AOE there and damages enemies inside.</title>
<defs><marker id="ms3a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker><marker id="ms3h" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow hl" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box soft" x="20" y="16" width="380" height="56" rx="8"/>
<text class="t" x="36" y="40">Lumen's mana is full</text>
<text class="s" x="36" y="60">HeroSkill fires step 0, because its trigger is OnCast</text>
<path class="edge" d="M120 72 V102" marker-end="url(#ms3a)"/>
<rect class="box" x="20" y="106" width="720" height="70" rx="8"/>
<text class="t" x="36" y="132">Step 0 · Shoot</text>
<text class="s" x="36" y="156">trigger OnCast · spawn HomingProjectile · from Self (Lumen) · aim at ClusteredCircle</text>
<path class="edge hl" d="M120 176 V246" marker-end="url(#ms3h)"/>
<text class="s" x="140" y="206">The projectile hits → it raises OnHit with a context holding the hit position</text>
<text class="s" x="140" y="226">The next step's trigger is OnHit, so HeroSkill fires it and passes the context along</text>
<rect class="box hl" x="20" y="250" width="720" height="70" rx="8"/>
<text class="t" x="36" y="276">Step 1 · Explode</text>
<text class="s" x="36" y="300">trigger OnHit · spawn CircleAOE at WhereProjectileHit · Damage 240% ATK to EnemiesInArea</text>
</svg>
</figure>

1. Lumen's mana fills. `HeroSkill` fires step 0, because its trigger is `OnCast`.
2. `Shoot` spawns a `HomingProjectile` at Lumen and sends it at the densest group of enemies.
3. When the projectile hits, it raises `OnHit` and hands over a `SkillStepContext` holding the hit
   position.
4. `HeroSkill` looks at the next step in the list. Its trigger is `OnHit`, so it fires it with that
   context.
5. `Explode` reads the hit position for `WhereProjectileHit`, spawns a `CircleAOE` there, and deals 240%
   ATK to every enemy inside.

<div class="takeaway">

The two steps never reference each other. They are linked only by their **order in the list** and their
**trigger**, and the **context** carries data from one to the next. Every other hero is a different
combination of the same parts.

</div>

<a class="btn" href="/projects/magic-school-3/skills/">See Lyra, Spark, Lumen, Grimm and Bulwark in code →</a>
