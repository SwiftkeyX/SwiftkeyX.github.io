---
title: Farming-Combat Sidescroller
order: 3
kind: Timed game developer test · 3 days · 2D · Unity
tagline: A 2D farming side-scroller with a day cycle, inventory, crafting and slime combat, built from a studio's spec in 3 days. I kept the code modular and logged every decision as I went.
tech: [Unity, C#, Assembly definitions, Interfaces, ScriptableObjects, State machine, Input System]
highlights:
  - Four gameplay systems from a written spec in 3 days — time hop, inventory with hotbar, crafting, wand combat.
  - 13 modules behind assembly definitions, with circular dependencies removed through interfaces.
  - A timestamped work log in the README recording plans, estimates, decisions and problems solved.
  - Player and slime AI each run on a small state machine with explicit transitions.
itch: https://switftkeyx.itch.io/farming-combat-sidescroller
github: https://github.com/SwiftkeyX/2D-sidescrolling-test
itchUploadId: "19444435"
accent: "#3f6b3a"
---

<!-- REVIEW (Pasit): first draft written from the repo. Correct anything wrong. If the test's terms allow, say which studio or what kind of studio set it. Delete these comments when done. -->

## The brief

The test spec asked for a 2D side-scroller in three days:

- **Time hop.** Walk into a trigger to skip time. Morning → Afternoon → Evening, weekdays, and a day
  counter that never stops.
- **Inventory.** Collect, use, remove and drag-to-organize items. A hotbar, categories (resources, tools,
  seeds, crafted), and stacks of up to 10.
- **Crafting.** From the backpack and from a crafting station. For example, a Storage Chest from
  10× Lumber, which holds 30 items once placed.
- **Combat.** A wand that shoots, and slimes that patrol, chase and attack.

All four systems are in the build, which you can play below.

<!-- REVIEW (Pasit): the README still has some unchecked boxes. If any spec item didn't make it, say so here plainly; reviewers respect it. -->



## Planning in public

Before writing code I broke the spec into checklists with estimates, then logged each block of work
as I did it: *"Implement FSM for player (2hr)"*, *"Implement slime part 1 (4hr)"*, *"Item can stack
inside inventory (3hr)"*. The [README](https://github.com/SwiftkeyX/2D-sidescrolling-test#readme) is that
log, day by day. It also records design notes, such as why items are ScriptableObjects instead of prefabs
(most items are the same object with a different sprite, and only items with behaviour, like the wand,
need a prefab).

## 13 modules, dependencies one way

Each feature has its own assembly definition. Unity then enforces the dependency direction at compile
time, so a cycle stops the build instead of quietly growing.

<figure class="diagram">
<svg viewBox="0 0 760 400" role="img" aria-labelledby="fc-d-title">
<title id="fc-d-title">Module layers: Items, Interactions and Input at the bottom; Inventories and Combat above; feature modules; Characters; Enemies and TimeHop; UI at the top. Dependencies only point downward. Player implements IItemCollector defined in Inventories.</title>
<defs><marker id="fch" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow hl" d="M0 0L10 5L0 10z"/></marker><marker id="fca" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0L10 5L0 10z"/></marker></defs>
<path class="edge" d="M24 20 V376" marker-end="url(#fca)"/>
<text class="s" x="34" y="390">depends on ↓ (never up)</text>
<rect class="band" x="44" y="12" width="500" height="50" rx="8"/>
<rect class="box" x="60" y="22" width="110" height="30" rx="6"/><text class="t" x="94" y="42">UI</text>
<rect class="band" x="44" y="70" width="500" height="50" rx="8"/>
<rect class="box" x="60" y="80" width="110" height="30" rx="6"/><text class="t" x="80" y="100">Enemies</text>
<rect class="box" x="184" y="80" width="110" height="30" rx="6"/><text class="t" x="204" y="100">TimeHop</text>
<rect class="band" x="44" y="128" width="500" height="50" rx="8"/>
<rect class="box hl" x="60" y="138" width="234" height="30" rx="6"/><text class="t" x="74" y="158">Characters (Player)</text>
<rect class="band" x="44" y="186" width="500" height="50" rx="8"/>
<rect class="box" x="60" y="196" width="110" height="30" rx="6"/><text class="t" x="74" y="216">Crafting</text>
<rect class="box" x="184" y="196" width="110" height="30" rx="6"/><text class="t" x="200" y="216">Farming</text>
<rect class="box" x="308" y="196" width="110" height="30" rx="6"/><text class="t" x="326" y="216">Storage</text>
<rect class="box" x="432" y="196" width="104" height="30" rx="6"/><text class="t" x="440" y="216">Woodcut</text>
<rect class="band" x="44" y="244" width="500" height="50" rx="8"/>
<rect class="box hl" x="60" y="254" width="234" height="30" rx="6"/><text class="t" x="74" y="274">Inventories · IItemCollector</text>
<rect class="box" x="308" y="254" width="110" height="30" rx="6"/><text class="t" x="324" y="274">Combat</text>
<rect class="band" x="44" y="302" width="500" height="50" rx="8"/>
<rect class="box" x="60" y="312" width="110" height="30" rx="6"/><text class="t" x="90" y="332">Items</text>
<rect class="box" x="184" y="312" width="110" height="30" rx="6"/><text class="t" x="190" y="332">Interactions</text>
<rect class="box" x="308" y="312" width="110" height="30" rx="6"/><text class="t" x="340" y="332">Input</text>
<path class="edge hl" d="M177 168 V250" marker-end="url(#fch)"/>
<text class="t" x="566" y="132">The cycle that</text>
<text class="t" x="566" y="150">isn't there</text>
<text class="s" x="566" y="176">Player must hold items, so</text>
<text class="s" x="566" y="194">Characters → Inventories.</text>
<text class="s" x="566" y="220">An ItemPickup must hand itself</text>
<text class="s" x="566" y="238">to the player, but can't</text>
<text class="s" x="566" y="256">reference Characters.</text>
<text class="s" x="566" y="282">So Inventories defines</text>
<text class="s" x="566" y="300">IItemCollector and Player</text>
<text class="s" x="566" y="318">implements it.</text>
</svg>
<figcaption>Six layers, and dependencies only point down. Interfaces such as IItemCollector and IInteractable live in the lower layer, so higher modules implement them instead of being referenced.</figcaption>
</figure>

```csharp
// Inventories — defines what it needs, knows nothing about the player
public interface IItemCollector
{
    bool TryCollect(IInventoryable item);
}

// Inventories/ItemPickup.cs — any collider whose parent can collect
private void TryGiveTo(Collider2D other)
{
    if (Time.time < _pickableAt) return;          // just-dropped items wait a moment

    IItemCollector collector = other.GetComponentInParent<IItemCollector>();
    if (collector == null) return;

    if (collector.TryCollect(Item)) Destroy(gameObject);
}

// Characters/Player.Inventory.cs — the Player opts in
public bool TryCollect(IInventoryable item) => Backpack.TryAdd(item);
```

<small>From <a href="https://github.com/SwiftkeyX/2D-sidescrolling-test/blob/main/Assets/Scripts/Inventories/ItemPickup.cs"><code>Inventories/ItemPickup.cs</code></a> and <code>Characters/Player.Inventory.cs</code></small>

The same pattern handles chests, plants and crafting stations: each implements `IInteractable` from
the dependency-free **Interactions** module, so the player can press E on any of them without
knowing their types.

## Time hop

`GameClock` advances Morning → Afternoon → Evening and rolls over to a new day and weekday. It raises
`PeriodChanged` and `DayChanged` events, so the HUD clock and the new-day banner listen for changes
instead of polling.

## What I'd do differently

<!-- REVIEW (Pasit): your call. These are suggestions. -->

- **UI depends on 8 modules.** It's the top layer, so that's allowed, but the panels reach into
  gameplay types directly. With more time I'd put a thin view-model or events layer between them.
- **Characters → Crafting / Farming.** The player references these feature modules directly for its
  tools. Routing tool use through an interface (as `IItemCollector` does) would make Characters fully
  independent of features.
