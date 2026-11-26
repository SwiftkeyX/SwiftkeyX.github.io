---
title: Souls-like Combat Prototype
order: 2
kind: Personal project · 3D action · Unity
tagline: A 3D souls-like boss fight. I built the boss AI as a behaviour tree that decides what to do, layered over a finite state machine that chains attack animations, plus animation-driven hitboxes.
tech: [Unity, C#, Behaviour tree, Finite state machine, ScriptableObjects, Animation events, Input System]
highlights:
  - Boss AI — a hand-written behaviour tree picks tactics (observe, chase, retreat, melee, ranged). A custom FSM plays chained attack combos.
  - Attack combos as data — each attack is a ScriptableObject with its own chain window, rotate window and possible follow-ups.
  - Animation-driven hitboxes — attack clips switch colliders on and off through animation events, with gizmos for debugging.
  - Measured input latency for attack, movement and roll, logged to CSV, to keep controls responsive.
itch: https://switftkeyx.itch.io/souls-like-prototype
github: https://github.com/SwiftkeyX/Game-Project-Elden-Ring-Inspired
itchUploadId: "19072122"
accent: "#5a2e2a"
---

<!-- REVIEW (Pasit): first draft written from the repo. Correct anything wrong and add the "why". Delete these comments when done. -->

## The problem

A souls-like boss has to do two different jobs well:

1. **Decide.** Should it close the distance, hang back and strafe, back off, or commit to an attack?
2. **Commit.** Once it starts a combo, it has to finish it. The player reads the wind-up, dodges, and
   punishes, which only works if the AI can't cancel an attack halfway because a condition changed.

A behaviour tree is good at the first job and bad at the second, because it re-evaluates every tick.
An FSM is good at the second. So I used both, each for the part it's good at.

## Behaviour tree over a finite state machine

The `Brain` ticks the tree every 0.2 s. The tree chooses a **tactic**. When it chooses to attack, it
hands control to an `FSMRunner`, which picks a starting `AttackNode` and plays the chain. While the
chain runs, the tree's `Root` is **locked** and returns `Running` without evaluating anything, so the
boss can't decide something new halfway through a swing. When the chain ends, the FSM raises
`OnFSMEnd` and the tree takes over again.

<figure class="diagram">
<svg viewBox="0 0 760 420" role="img" aria-labelledby="sl-d-title">
<title id="sl-d-title">Boss AI: Brain ticks a behaviour tree; the tree chooses tactics; attack tactics start a custom FSM that chains attack nodes; FSM start and end events lock and unlock the tree's root.</title>
<defs><marker id="sla" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker><marker id="slh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow hl" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="20" y="16" width="190" height="58" rx="8"/>
<text class="t" x="36" y="41">Brain</text>
<text class="s" x="36" y="60">ticks tree every 0.2 s</text>
<path class="edge" d="M210 45 H256" marker-end="url(#sla)"/>
<rect class="box hl" x="260" y="16" width="250" height="58" rx="8"/>
<text class="t" x="276" y="41">Root</text>
<text class="s" x="276" y="60">locked → returns Running</text>
<path class="edge" d="M385 74 V106" marker-end="url(#sla)"/>
<rect class="band" x="20" y="110" width="720" height="118" rx="10"/>
<text class="bandlabel" x="36" y="131">Behaviour tree — decides WHAT to do (Selector, first success wins)</text>
<rect class="box" x="36" y="146" width="124" height="62" rx="8"/>
<text class="t" x="48" y="171">Retreat</text>
<text class="s" x="48" y="190">30% chance / 8 s</text>
<rect class="box" x="174" y="146" width="124" height="62" rx="8"/>
<text class="t" x="186" y="171">Melee</text>
<text class="s" x="186" y="190">in melee range</text>
<rect class="box" x="312" y="146" width="124" height="62" rx="8"/>
<text class="t" x="324" y="171">Ranged</text>
<text class="s" x="324" y="190">17 s cooldown</text>
<rect class="box" x="450" y="146" width="124" height="62" rx="8"/>
<text class="t" x="462" y="171">Chase</text>
<text class="s" x="462" y="190">tactic = Approach</text>
<rect class="box" x="588" y="146" width="136" height="62" rx="8"/>
<text class="t" x="600" y="171">Observe</text>
<text class="s" x="600" y="190">strafe L / R / back</text>
<path class="edge" d="M236 208 V244 H120 V262"/>
<path class="edge" d="M374 208 V244 H236" />
<text class="s" x="384" y="240">ChangeToAttackState(MELEE | RANGE)</text>
<rect class="band" x="20" y="262" width="720" height="140" rx="10"/>
<text class="bandlabel" x="200" y="283">Custom FSM — decides HOW to attack (chained combos)</text>
<path class="edge" d="M120 262 V292" marker-end="url(#sla)"/>
<rect class="box" x="36" y="296" width="170" height="62" rx="8"/>
<text class="t" x="50" y="321">FSMRunner</text>
<text class="s" x="50" y="340">random entry node</text>
<rect class="box" x="246" y="296" width="140" height="62" rx="8"/>
<text class="t" x="260" y="321">AttackNode</text>
<text class="s" x="260" y="340">clip + chain window</text>
<rect class="box" x="426" y="296" width="140" height="62" rx="8"/>
<text class="t" x="440" y="321">AttackNode</text>
<text class="s" x="440" y="340">random Next[ ]</text>
<rect class="box" x="606" y="296" width="118" height="62" rx="8"/>
<text class="t" x="620" y="321">Done</text>
<text class="s" x="620" y="340">raise OnFSMEnd</text>
<path class="edge" d="M206 327 H242" marker-end="url(#sla)"/>
<path class="edge" d="M386 327 H422" marker-end="url(#sla)"/>
<text class="s" x="374" y="372">ChainNext</text>
<path class="edge" d="M566 327 H602" marker-end="url(#sla)"/>
<path class="edge hl" d="M724 327 H750 V45 H514" marker-end="url(#slh)"/>
<text class="s" x="544" y="37">OnFSMStart / End → lock / unlock</text>
<text class="s" x="36" y="394">Each attack clip's animation events call Hitbox.EnableHitbox(damage) / DisableHitbox().</text>
</svg>
<figcaption>The tree decides the tactic; the FSM owns the combo. Events between them keep the tree from interrupting an attack.</figcaption>
</figure>

### The lock that makes it work

```csharp
// Root of the tree — stops the tree from interrupting an attack in progress
public class Root : BTNode
{
    private bool isRootLock;
    private readonly BTNode child;

    public Root(EnemyContext c, BTNode nodes)
    {
        child = nodes;
        c.fsmRunner.OnFSMStart += () => LockTheRoot(true);
        c.fsmRunner.OnFSMEnd   += () => LockTheRoot(false);
    }

    public override BTStatus Tick(float dt)
    {
        if (isRootLock) return BTStatus.Running;   // an attack chain owns the boss
        return child.Tick(dt);
    }

    void LockTheRoot(bool locked) => isRootLock = locked;
}

// The tree itself (Brain.cs), trimmed:
tree = new Root(context, new Selector(
    new Sequence(canDetect,
        new Selector(retreat, meleeAttack, new Cooldown(rangeAttack, 17), chase, goObserve)),
    goIdle));
```

<small>From <a href="https://github.com/SwiftkeyX/Game-Project-Elden-Ring-Inspired/blob/main/Assets/Script/Enemy/AI/Behavior%20Tree/BTNode.cs"><code>Enemy/AI/Behavior Tree/BTNode.cs</code></a> and <code>Brain.cs</code>, trimmed</small>

## Attacks as data

Each attack is an `AttackNode` ScriptableObject. It holds the animation clip, a **chain window** (by
default the follow-up can be queued between 50% and 85% of the clip), a **rotate window** (when the
boss may keep turning to track the player), a landing offset, and an array of possible **next**
attacks. A combo is a small graph of these assets, so adding a new three-hit string doesn't need any
new code. I also started an editor tool to import these values from a spreadsheet (currently disabled in
the repo).

## Hitboxes driven by animation

Weapon colliders start disabled. Animation events on each attack clip call `EnableHitbox(damage)` on
the active frames and `DisableHitbox()` after them. Damage goes through an `IDamageable` interface, so
the same hitbox can hit the player or anything else. A gizmo draws the active collider (box, sphere,
capsule or mesh) in the Scene view, so I could line up active frames with the swing.

## Input latency

Responsiveness matters most in this genre, so I timestamped the input and the moment the animation
actually responded, for attack, movement and roll, and logged each sample to CSV.

<!-- REVIEW (Pasit): add your measured numbers here, e.g. "attack: ~XX ms, roll: ~XX ms", and what you changed because of them. Real numbers make this section. -->

## What I'd do differently

<!-- REVIEW (Pasit): found on a re-read of the code. Keep the ones you agree with. -->

- **Event unsubscription bug.** `Root.Unsubscribe()` removes *new* lambdas, not the ones it added, so
  it doesn't actually unsubscribe. I'd keep the handlers as named methods.
- **Copy-paste bug in setup.** The retreat FSMs are built by looping over `Range.Count` instead of
  `Retreat.Count`. A data-driven setup with one loop per list would remove this kind of slip.
- **Tree built in code.** The tree is wired by hand in `Brain.cs`, with debug nodes inline. For a
  second boss I'd move the tree into data, or at least into a builder, so the structure can be read
  separately from the plumbing.
