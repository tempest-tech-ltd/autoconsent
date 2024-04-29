git checkout main
git checkout -b upstream-sync
git reset --hard upstream/main
git pull upstream main
git rebase main
git push --set-upstream origin upstream-sync