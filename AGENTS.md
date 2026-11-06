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
- The Atlas Composer routes money through `detectFinance` with a confirmation card that writes only via the existing Finance APIs; transfers, withdrawals and investments are explained and never recorded until the data model supports them, so reports never count them as income/expense.
- Collection readers use the shared exhaustive range reader with existing filters and a unique final sort key; keep arrays complete so cached lists and calculations never silently inherit the Data API row cap.
