# Commit and Branching Guide

This repo keeps a clean, linear history. Every change lands on main as a single, well-described commit.

## Policy (TL;DR)

- Use short-lived story branches for each feature/fix.
- Commit freely while you work.
- Before merging: squash to one commit, rebase onto the latest main, then fast-forward main. No merge commits.

## Workflow

1) Create a story branch

- Name: `feature/<slug>` or `fix/<slug>`
- Base: latest `main`

Optional commands:

```bash
# start from up-to-date main
git checkout main
git pull --ff-only

# create your branch
git checkout -b feature/<slug>
```

2) Work and push

- Make small, logical commits.
- Push to remote and open a PR when ready.

```bash
git add -A
git commit -m "feat(<area>): short message"
git push -u origin feature/<slug>
```

3) Squash to a single commit

- Interactively squash your branch commits down to one. Keep a clear message (title + bullet summary).

```bash
git checkout origin feature/slug
# pick first, squash/fixup the rest
git rebase -i HEAD~amountOfCommitsToSquash
# Needed to ensure remote matches your new locally squashed commit trail
git push --force
```

4) Rebase on latest main

- Ensure your squashed commit sits on top of the current main.

```bash
git fetch origin
git rebase origin/main
# resolve conflicts if any
git add -A && git rebase --continue
```

5) Fast-forward main

- Move main forward to include your rebased, squashed commit (no merge commit).

```bash
git checkout main
git pull --ff-only
# fast-forward only merge
git merge --ff-only feature/<slug>

git push origin main
```

## Commit message convention

- Title: imperative, concise.
- Optional scope in parentheses.
- Body: bullets for intent, key changes, any breaking changes.

Examples:

- feat(boards): add task effort estimate field
- fix(auth): handle stale token for GET /users/*
- chore(ci): adjust unittest discovery path

## Do’s and Don’ts

- Do keep PRs focused (one story per branch).
- Do rebase frequently to reduce conflicts.
- Don’t merge main into your branch right before merge; rebase instead.
- Don’t use `--no-ff` merges into main.

## Maintainers

- Protect main to allow fast-forward only and require PR review.
- Prefer CI green + one review before fast-forwarding.

Following this flow keeps history readable and makes each feature/fix easy to trace and revert if needed.
