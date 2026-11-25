# Authenticated goal-contribution checks

These Python Playwright scripts exercise the running app at localhost:8080 with a temporary account obtained using `lovable auth-session --json --create-test-user`. They require the sandbox's Playwright and `lovable_playwright_defaults`, not extra app dependencies.

Run `python3 tests/browser/atlas_contribution_reload.py` and `python3 tests/browser/atlas_contribution_conflict.py` during that test session. Screenshots and logs belong under `/tmp/browser/atlas-131`, not in the repository. Never print the session file, tokens, cookies or browser storage containing authentication.

The reload script creates one temporary goal, commits a real Cloud contribution while aborting the response, reloads, retries with the same key, reads history and balance through the authenticated app API, verifies a subsequent contribution and an edit, checks 360px layout, and deletes its test goal.

The conflict script uses two temporary goals to verify actual RPC conflict feedback, blocked repeat/deletion and clearing only the successful goal's pending attempt. It intentionally modifies only the temporary account's pending contribution payload (not authentication), and deletes its test goals afterwards.

If a script fails before cleanup, inspect and remove only its named test goals in the temporary account. Never substitute a real user's account or clear another user's financial records. Both scripts are end-to-end automation, not manual human testing or database concurrency proofs; the isolated PostgreSQL suite supplies the latter.