#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NO_COLOR='\033[0m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'

# Adjust column widths for new info
width1=6   # Ahead
width2=7   # Behind
width3=20  # Branch
width4=21  # Last Commit
width5=20  # Author
width6=10  # Status
width7=12  # Changes
width8=35  # Last Message

# Function to count commits
count_commits() {
    local branch="$1"
    local base_branch="$2"
    local ahead_behind

    ahead_behind=$(git rev-list --left-right --count "$base_branch"..."$branch")
    echo "$ahead_behind"
}

# Function to get branch status
get_branch_status() {
    local branch="$1"
    local upstream=$(git rev-parse --abbrev-ref "$branch@{upstream}" 2>/dev/null)
    
    if [ -z "$upstream" ]; then
        echo "NO-REMOTE"
    else
        local local_sha=$(git rev-parse "$branch")
        local remote_sha=$(git rev-parse "$upstream" 2>/dev/null)
        
        if [ "$local_sha" = "$remote_sha" ]; then
            echo "UP-TO-DATE"
        else
            local ahead=$(git rev-list --count "$upstream".."$branch" 2>/dev/null || echo "0")
            local behind=$(git rev-list --count "$branch".."$upstream" 2>/dev/null || echo "0")
            
            if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
                echo "DIVERGED"
            elif [ "$ahead" -gt 0 ]; then
                echo "AHEAD"
            elif [ "$behind" -gt 0 ]; then
                echo "BEHIND"
            else
                echo "SYNCED"
            fi
        fi
    fi
}

# Function to check if branch is merged
is_merged() {
    local branch="$1"
    local main_branch="$2"
    
    local merge_base=$(git merge-base "$main_branch" "$branch")
    local branch_sha=$(git rev-parse "$branch")
    
    if [ "$merge_base" = "$branch_sha" ]; then
        echo "MERGED"
    else
        echo "ACTIVE"
    fi
}

# Function to get file change stats
get_change_stats() {
    local branch="$1"
    local main_branch="$2"
    
    # Get number of changed files and insertions/deletions
    local stats=$(git diff --shortstat "$main_branch"..."$branch" 2>/dev/null)
    if [ -n "$stats" ]; then
        echo "$stats" | sed 's/ files\? changed\|,\| insertions\?\|(\+)\| deletions\?\|(-)\|,//g' | awk '{print $1"f " $2"+" $3"-"}'
    else
        echo "0f 0+ 0-"
    fi
}

# Main script
main_branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD)

echo -e "${CYAN}Enhanced Git Branch Overview${NO_COLOR}"
echo -e "${GRAY}Main branch: ${GREEN}$main_branch${NO_COLOR}"
echo ""

# Header
printf "${GREEN}%-${width1}s ${RED}%-${width2}s ${BLUE}%-${width3}s ${YELLOW}%-${width4}s ${PURPLE}%-${width5}s ${CYAN}%-${width6}s ${GRAY}%-${width7}s${NO_COLOR}\n" \
    "Ahead" "Behind" "Branch" "Last Commit" "Author" "Status" "Last Message"

# Separator line
printf "${GREEN}%-${width1}s ${RED}%-${width2}s ${BLUE}%-${width3}s ${YELLOW}%-${width4}s ${PURPLE}%-${width5}s ${CYAN}%-${width6}s ${GRAY}%-${width7}s${NO_COLOR}\n" \
    "------" "-------" "--------------------" "---------------------" "--------------------" "----------" "---------------------------------------------"

format_string="%(objectname:short)@%(refname:short)@%(committerdate:relative)@%(authorname)"
IFS=$'\n'

declare -a merged_branches=()
declare -a active_branches=()

for branchdata in $(git for-each-ref --sort=-authordate --format="$format_string" refs/heads/); do
    sha=$(echo "$branchdata" | cut -d '@' -f1)
    branch=$(echo "$branchdata" | cut -d '@' -f2)
    time=$(echo "$branchdata" | cut -d '@' -f3)
    author=$(echo "$branchdata" | cut -d '@' -f4)
    
    if [ "$branch" != "$main_branch" ]; then
        # Get most recent commit message
        commit_msg=$(git log -1 --pretty=format:"%s" "$branch" 2>/dev/null | cut -c1-44)
        
        # If commit message is empty, show a placeholder
        if [ -z "$commit_msg" ]; then
            commit_msg="<no commits>"
        fi
        
        # Count commits ahead and behind
        ahead_behind=$(count_commits "$branch" "$main_branch")
        ahead=$(echo "$ahead_behind" | cut -f2)
        behind=$(echo "$ahead_behind" | cut -f1)
        
        # Get branch status
        status=$(get_branch_status "$branch")
        
        # Check if merged
        merge_status=$(is_merged "$branch" "$main_branch")
        
        # Truncate long author names
        short_author=$(echo "$author" | cut -c1-18)
        
        # Color code based on status
        if [ "$merge_status" = "MERGED" ]; then
            merged_branches+=("$branch")
            status_color="${GRAY}"
        else
            active_branches+=("$branch")
            case "$status" in
                "AHEAD"|"UP-TO-DATE") status_color="${GREEN}" ;;
                "BEHIND") status_color="${RED}" ;;
                "DIVERGED") status_color="${YELLOW}" ;;
                "NO-REMOTE") status_color="${PURPLE}" ;;
                *) status_color="${NO_COLOR}" ;;
            esac
        fi
        
        # Display branch info
        printf "${GREEN}%-${width1}s ${RED}%-${width2}s ${BLUE}%-${width3}s ${YELLOW}%-${width4}s ${PURPLE}%-${width5}s ${status_color}%-${width6}s ${GRAY}%-${width7}s${NO_COLOR}\n" \
            "$ahead" "$behind" "$branch" "$time" "$short_author" "$status" "$commit_msg"
    fi
done

# Summary
echo ""
echo -e "${CYAN}Summary:${NO_COLOR}"
echo -e "  ${GREEN}Active branches: ${#active_branches[@]}${NO_COLOR}"
echo -e "  ${GRAY}Merged branches: ${#merged_branches[@]}${NO_COLOR}"

if [ ${#merged_branches[@]} -gt 0 ]; then
    echo ""
    echo -e "${GRAY}Merged branches (safe to delete locally):${NO_COLOR}"
    for branch in "${merged_branches[@]}"; do
        echo -e "  ${GRAY}$branch${NO_COLOR}"
    done
    echo -e "${GRAY}To delete: git branch -d <branch-name>${NO_COLOR}"
fi