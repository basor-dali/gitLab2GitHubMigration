import { Gitlab } from '@gitbeaker/node';
import { Octokit } from '@octokit/rest';
import {execSync} from 'node:child_process';
// const exec = require("child_process").exec;

const gitlab = new Gitlab({
  host: 'https://gitlab.com',
  token: '<GITLAB_ACCESS_TOKEN>'
});

const octokit = new Octokit({
  auth: '<GITHUB_ACCESS_TOKEN>'
});

async function listAndMoveGroups() {
  const groups = await gitlab.Groups.all();
  await loopAndProcess(groups);
}

async function loopAndProcess(groups) {
  for (const group of groups) {
    console.log(`Group: ${group.full_name}`);
    const subgroups = await gitlab.Groups.subgroups(group.id);

    for (const subgroup of subgroups) {
      console.log(`\tSubgroup: ${subgroup.full_name}`);
      const projects = await gitlab.Groups.projects(subgroup.id);

      for (const project of projects) {
        console.log(`\t\tProject: ${project.name}`);
        const gitlabUrl = project.ssh_url_to_repo;
        console.log("Gitlab url", gitlabUrl);

        const newRepo = await octokit.repos.createForAuthenticatedUser({
          name: `${group.full_name}-${subgroup.full_name}-${project.name}`,
          description: project.description,
          private: true
        });
        const githubUrl = `https://github.com/${newRepo.data.owner.login}/${newRepo.data.name}.git`;

        execSync(`git clone ${gitlabUrl}`);
        execSync(`cd ${project.name}`);
        execSync(`git remote add github ${githubUrl}`);
        execSync(`git push --mirror github`);
        execSync(`git remote remove origin`);
        execSync(`cd ..`);

        console.log(`\t\tProject ${project.name} mirrored to GitHub.`);
      }
    }
  }
}

await listAndMoveGroups();


