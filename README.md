# gitLab2GitHubMigration
Script to migrate Gitlab projects to GitHub

## Requirements

* Nodejs
* @gitbeaker/node
* @octokit/rest
* child_process
* Proper Gitlab and Github permissions
* Gitlab and github access tokens

## Notes

This code moves projects from groups and sub groups only. If you have projects that aren't inside a group you will have to add more logic to handle that. Also, if you have projects with same names in different groups you will get error since you won't be able to clone two projects with same names.
It's best if your groups and projects on gitlab don't have spaces in their names since this might cause some issues when code exec tries to move to folders. 