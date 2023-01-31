import { Gitlab } from '@gitbeaker/node';
import { Octokit } from '@octokit/rest';
import {execSync} from 'child_process';

const gitlab = new Gitlab({
  host: 'https://gitlab.com',
  token: '<GITLAB ACCESS TOKEN>'
});

const octokit = new Octokit({
  auth: '<GITHUB ACCESS TOKEN>'
});

async function listAndMoveGroups() {
  try {
    const groups = await gitlab.Groups.all();
    await processGroups(groups);
  } catch (e) {
    console.log('ERROR in listAndMoveGroups:', e);
  }
}

async function processGroups(groups) {
  for (const group of groups) {
    try {
      console.log(`Group: ${group.full_name}`);
      const subgroups = await gitlab.Groups.subgroups(group.id);
      await processSubgroups(subgroups);
    } catch (e) {
      console.log(`ERROR in processGroups for group ${group.full_name}:`, e);
    }
  }
}

async function processSubgroups(subgroups) {
  for (const subgroup of subgroups) {
    try {
      console.log(`\tSubgroup: ${subgroup.full_name}`);
      const projects = await gitlab.Groups.projects(subgroup.id);
      await processProjects(projects);
    } catch (e) {
      console.log(`ERROR in processSubgroups for subgroup ${subgroup.full_name}:`, e);
    }
  }
}

async function processProjects(projects) {
  for (const project of projects) {
    try {
      console.log(`\t\tProject: ${project.name}`);
      const gitlabUrl = project.http_url_to_repo;

      const newRepo = await octokit.repos.createForAuthenticatedUser({
        name: `${project.path_with_namespace}`,
        description: project.description,
        private: true
      });
      const githubUrl = `https://github.com/${newRepo.data.owner.login}/${newRepo.data.name}.git`;

      execSync(`git clone ${gitlabUrl}`);
      process.chdir(`${project.name}`);
      execSync(`git remote add github ${githubUrl}`);
      execSync(`git push --mirror github`);
      execSync(`git remote remove github`);
      process.chdir('..');

      console.log(`\t\tProject ${project.name} mirrored to GitHub.`);
    } catch (e) {
      console.log(`ERROR in processProjects for project ${project.name}:`, e);
    }
  }
}

await listAndMoveGroups();
