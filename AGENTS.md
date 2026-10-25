<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Interpret temporal input with the shared browser-safe temporal parser; keep ambiguous text until the user chooses a category to prevent silent misclassification.
- Objective progress uses persisted steps or manual progress when no steps exist; synchronize step-driven status in the data API only when the previous status matches automatic progress, preserving explicit choices.
- Financial suggestions reuse GoalDialog and the authenticated createGoal/updateObjective APIs with the Finance goal query key; retain a newly created goal for link retries to avoid duplicate creation.
