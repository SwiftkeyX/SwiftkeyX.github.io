In the end, this project will get ditched and turn into MagicSchool4. The reason mainly come from the code don’t have good enough readability that I satisfied with. After the codebase get bigger, I found myself getting confused several time of how the `steps` work. So I look into what wrong with the skill system:

## 1. `SkillDefinition` is static and only run once when the battle begin through `Build(registry)`

- **static:** the class can’t hold the variable specific to different hero. So when we need that hero skill to do something that break the template, it’s structurally hard because the hero skill can’t hold its own variable.
- **run once:** it mean the class can’t run mid battle.

`Rider.cs & ComboTracker.cs` is the product of bad structure. When I want the hero skill to hold some variable, I need to create a new helper class and attach it somewhere to the existing system.

<div class="example">

<span class="label"><code>Rider.cs</code></span>

`Rider.cs` was to make the `templateAction` ride another `templateAction` .

For example, when Grimm charge forward, technically it was spawning a `AOE` that was riding on himself.

This class is put in `TemplateAction.cs` which is really weird at the beginning too because Grimm was the only hero that use `Rider.cs` at that time. But now we have 2 hero that use `Rider.cs`, so I think it was general enough to put in `TemplateAction` .

</div>

<div class="example">

<span class="label"><code>ComboTracker.cs</code></span>

`ComboTracker.cs` was to count the combo Vharn was doing when he use skill. This class have `Count()` method which wire to the skill system by making this method a callback function in `SkillDefinition.cs` which look really ugly.

At this point, I remember there’s no helper class before too so I have tolerance for it since I think I can polish it later once I understand the pattern more.

The callback function was never use in skill system at this point, so it kinda break the pattern of the skill system, and that look really out of place to me.

</div>

<div class="takeaway">

This problem indicate that everytime we have to add something new, the new helper class will be born, and will be somewhat put in somewhere really random in the project that feel like it doesn’t belong to. This show that skill system have structure problem.

</div>

## 2. The order of the skill depend on array position but nothing enforce it properly

In code, if there’s something not written into this, thing will break.

1. `OnCast` must be `step[0]`
2. `OnCastStart` must be `step[1]`
3. passive must be `step[0]` too but with different boolean flag compared to `OnCast`

This wasn’t hard to fix but the main problem is

## 3. Beside no enforcement, the skill trigger order was too complicated in code

Even though the idea for skill trigger order is really simple, it just `OnCast` ⇒ `OnCastStart` ⇒ `OnHit` / `OnExpired` / `Onkill` / etc…

But in code, the trigger order code just look so random and hard to read. I think the main reason is the order of the skill was made in `HeroSkill.cs` which isn’t intuitive to read because each trigger order was tied to array number:

- `OnCast`/Passive ⇒ only trigger on `step[0]`
- `OnCastStart` ⇒ only trigger on `step[1]`
- Other ⇒ check if the number matched the specify trigger.

It wasn’t intuitive to understand that each trigger was tied to each number. When read in code, it feel like magic number that reader don’t understand.

<a class="btn" href="/projects/magic-school-3/skills/#heroskillcs">See <code>HeroSkill.cs</code> →</a>
