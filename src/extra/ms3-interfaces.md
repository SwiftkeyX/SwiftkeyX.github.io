Most of these interfaces exist so one assembly can talk to another. Some are justified and some are not.

## Combat assembly:

<table class="iface">
<thead>
<tr><th>Interface</th><th>Implementer</th><th>What it does</th><th>Notes</th></tr>
</thead>
<tbody>
<tr>
<td><code>ICombatant</code></td>
<td><code>Hero</code></td>
<td>A unit that can fight on the board.</td>
<td><span class="ok">Justified:</span> the Skills assembly needs an interface to talk to <code>Hero</code>. <br><br>It's used 173 times across 35 files.</td>
</tr>
<tr>
<td><code>IEffectable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>A unit that can be affected by attacks, heals, buffs and debuffs.</td>
<td><span class="ok">Justified:</span> it's also used on its own, not only through <code>ICombatant</code>. <code>SkillCondition</code> and the combat recorder both hold an <code>IEffectable</code> directly. <br><br>It's used 51 times across 18 files.</td>
</tr>
<tr>
<td><code>ITargeter</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>Finds an enemy to target based on a specific condition.</td>
<td><span class="ok">Justified:</span> the Skills assembly uses <code>ITargeter</code> through <code>ICombatant</code>.<br><br>Its methods are used a lot by other files, especially in the Skills assembly. <br>This interface also simplifies the targeting logic by grouping it in one place, which improves readability.</td>
</tr>
<tr>
<td><code>IHexPlaceable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code>)</td>
<td>To place <code>ICombatant</code> on a hex tile.</td>
<td><span class="bad">Not justified:</span> This interface is the hero's side of the hex, not the hex itself. It holds <code>ReservedHex</code> and <code>SetReservedHex</code>, which are used for walking on the hex. <br><br>It exists because those members can't go into <code>IPlaceable</code>. <code>IPlaceable</code> lives in Contracts assembly, and Contracts assembly isn't allowed to see <code>Hex</code>, so they had to be split out into <code>IHexPlaceable</code>. <br><br>Worth mentioning: <code>IHexPlaceable</code> is in the same assembly as <code>Hero</code>, and <code>Hero</code> is its only implementer. So this hex code could use <code>Hero</code> directly and drop this ugly interface.</td>
</tr>
<tr>
<td><code>IPlaceable</code></td>
<td><code>Hero</code> (via <code>ICombatant</code> and <code>IHexPlaceable</code>)</td>
<td>Puts a unit onto a placement (a hex or a bench slot).</td>
<td><span class="ok">Justified:</span> not related to the assembly split.<br><br>I want a placement to hold a hero without knowing it's a hero.</td>
</tr>
<tr>
<td><code>IHeroStats</code></td>
<td><code>Hero</code></td>
<td>Reads a hero's stats.</td>
<td><span class="ok">Justified:</span> the Skills, StatScaling and Modifiers assemblies need a hero's stats to calculate damage. <br><br>It's used 23 times across 14 files.</td>
</tr>
<tr>
<td><code>IInspectableHero</code></td>
<td><code>Hero</code></td>
<td>Shows a hero's details in the inspector panel.</td>
<td><span class="bad">Not justified:</span> the UI assembly already references Combat, so the inspector could read <code>Hero</code> directly. <br><br>The interface is only needed because <code>PlayerController</code> sends the selected hero through <code>IInspectorPanel</code>. That lives in the Contracts assembly, which can't see <code>Hero</code> or <code>Item</code>. So it's a knock-on effect of the panel interfaces below. <br><br>If <code>IInspectorPanel</code> goes, <code>IInspectableHero</code> and <code>IInspectableItem</code> can go with it.</td>
</tr>
</tbody>
</table>

## UI assembly:

<table class="iface">
<thead>
<tr><th>Interface</th><th>Implementer</th><th>What it does</th><th>Notes</th></tr>
</thead>
<tbody>
<tr>
<td><code>IBannerPanel</code></td>
<td><code>ResultBannerController</code></td>
<td><code>IBannerPanel</code> mirrors the public methods of <code>ResultBannerController</code>; it adds nothing of its own.</td>
<td><span class="bad">Not justified:</span> it only exists so <code>GameManager</code> can call down into the UI assembly.</td>
</tr>
<tr>
<td><code>IHintPanel</code></td>
<td><code>PhaseHintController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> same as <code>IBannerPanel</code>.</td>
</tr>
<tr>
<td><code>IScoreboardPanel</code></td>
<td><code>ScoreboardController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> same as <code>IBannerPanel</code>.</td>
</tr>
<tr>
<td><code>IRewardPanel</code></td>
<td><code>RewardPanelController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>GameManager</code> and <code>PlayerController</code> can call down into UI.</td>
</tr>
<tr>
<td><code>IHeroCountPanel</code></td>
<td><code>HeroCountController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>PlayerController</code> can call down into UI.</td>
</tr>
<tr>
<td><code>IInspectorPanel</code></td>
<td><code>InspectorController</code></td>
<td>Same as above.</td>
<td><span class="bad">Not justified:</span> it exists so <code>PlayerController</code> can call down into UI.</td>
</tr>
</tbody>
</table>

<div class="takeaway">

There are more of them, but these are enough to make the point. This project has too many interfaces, and they complicate it for no good reason.

This is especially true in the UI assembly. It doesn't need this many interfaces, because the data can flow another way, for example by subscribing to events.

</div>
