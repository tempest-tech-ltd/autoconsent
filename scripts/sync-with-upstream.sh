git branch -D upstream-sync
git checkout new-main && git checkout -b upstream-sync && git reset --hard upstream/main && git pull upstream main && git rebase new-main && git push --set-upstream origin upstream-sync