How a hero moves across the hex board during a fight: pick a target, ask A\* for one step, decide whether to take it, then reserve and walk.

## How it works

### 0. Pick a target

<figure>
<img class="shot" src="/media/ms3-path-0-target.png" alt="Hex board diagram: Mira picks Solace, one step away, over Enemy X, which looks closer in a straight line but is four steps away." loading="lazy">
</figure>

Each frame, an idle hero asks: **who's my nearest enemy?** Nearest is measured in **steps** (how many hexes it takes to walk there), not straight-line distance.

- If that enemy is already **in attack range**, the hero attacks and doesn't move.
- Otherwise it goes to step 1.

### 1. Ask A\* for the next step

<figure>
<img class="shot" src="/media/ms3-path-1-astar.png" alt="Hex board diagram: A* finds a route from Lyra to a free hex next to Grimm around a reserved hex, and returns only the first step." loading="lazy">
</figure>

The hero asks the A\* pathfinder: *what's the shortest route from my hex to **any free hex next to** that enemy?*

- A\* skips every hex that someone else has reserved.
- It returns **only the first step** of the route, not the whole route. The hero re-plans after every hex, because the board keeps changing.
- If every hex around the enemy is taken, it returns **nothing**, and the hero stays put.

### 2. Should I take that step?

<figure>
<img class="shot" src="/media/ms3-path-2-decide.png" alt="Three hex board panels: wait when an enemy has reserved a hex next to you, take a step that brings you closer, and maybe wait when allies force a detour." loading="lazy">
</figure>

The hero doesn't take the step blindly. It checks three things, in order:

| Check | Answer | Because |
| --- | --- | --- |
| Has an **enemy** reserved a hex next to me? | **Don't move.** | The enemy is coming to me soon anyway, so I'll wait. |
| Does the step bring me **closer** to my enemy? | **Take it.** | That's normal progress. |
| Does the step take me **sideways or backward**? | **Maybe wait.** | A\* only routes sideways or backward when the short way is blocked (usually by an ally). |

The "maybe wait" case depends on what the blocking ally is doing:

- **It's attacking or casting:** take the detour now. It's fighting and won't move.
- **It's doing anything else:** wait, but for **at most one step's worth of time**. If the blocking ally moves, take the short route. If it doesn't, take the original A\* route, so this hero doesn't freeze forever.

### 3. Reserve, then walk

<figure>
<img class="shot" src="/media/ms3-path-3-reserve.png" alt="Three hex board panels: Lyra reserves hex B and frees A, slides to B while Vesper claims A, then stands on B and asks again." loading="lazy">
</figure>

1. **Reserve.** The moment the hero decides to step there, it claims the hex. Nobody else can pick that hex from now on. This happens at decision time, not on arrival, so two heroes can never choose the same free hex in the same frame.
2. **Walk.** The hero slides to the hex over `1 / moveSpeed` seconds along an animation curve. It's a simple lerp with no physics.
3. **Arrive.** The hero officially stands on the new hex.
4. **Repeat.** It immediately asks again: can I attack now? If not, what's my next step?

**When does the old hex get freed?** A hero holds exactly one reservation. When it reserves the next hex, its old hex is released at that moment, so another hero can start moving into it while this one is still walking out. When it arrives, the reservation it already holds simply becomes the hex it stands on.

**One-line version:** pick the nearest enemy by steps → A\* gives one step around anything reserved → take it, unless an enemy is coming to you or it's a detour worth waiting a moment for → reserve the hex → slide there → ask again.
