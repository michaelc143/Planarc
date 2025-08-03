#!/bin/bash

# Get list of local branches
branches=$(git for-each-ref --format='%(refname:short)' refs/heads/)

# Save current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

for branch in $branches; do
    echo "-----"
    echo "Switching to branch: $branch"

    # Checkout branch
    git checkout "$branch"

    echo "Pulling latest changes..."
    # Try pulling and detect conflict
    if ! git pull --no-edit; then
        echo "❌ Merge conflict detected on $branch — aborting merge."
        git merge --abort 2>/dev/null
    else
        echo "✅ Pull successful on $branch"
    fi
done

# Switch back to original branch
git checkout "$current_branch"
echo "✅ Done. Returned to original branch: $current_branch"
