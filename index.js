import { Gitlab } from '@gitbeaker/node';
import { Octokit } from '@octokit/rest';
import {execSync} from 'child_process';

const gitlab = new Gitlab({
  host: 'https://gitlab.com',
  token: '<GITLAB ACCESS TOKEN>'
});

const octokit = new Octokit({
  auth: 'GITHUB ACCESS TOKEN'
});

async function mirrorProjects(group) {
  console.log(`Processing Group: ${group.full_name}`);

  const projects = await gitlab.Groups.projects(group.id);

  for (const project of projects) {
    console.log(`Processing Project: ${project.name}`);
    const gitlabUrl = project.http_url_to_repo;

    try {
      const newRepo = await octokit.repos.createForAuthenticatedUser({
        name: `${project.path_with_namespace}`,
        description: project.description,
        private: true
      });
  
      await migrateIssues(project, newRepo);
      const githubUrl = `https://github.com/${newRepo.data.owner.login}/${newRepo.data.name}.git`;
      
      execSync(`git clone ${gitlabUrl}`);
      process.chdir(`${project.name}`);
      execSync(`git remote add github ${githubUrl}`);
      execSync(`git push --mirror github`);
      execSync(`git remote remove github`);
      process.chdir('..');
  
      console.log(`Project ${project.name} mirrored to GitHub.`);
    } catch (error) {
      console.log(`Error mirroring project ${project.name}: ${error.message}. Skipping...`);
    }
  }
}

async function listAndMoveGroups() {
  const groups = await gitlab.Groups.all();
  try {
    for (const group of groups) {
      await mirrorProjects(group);

      const subgroups = await gitlab.Groups.subgroups(group.id);
      for (const subgroup of subgroups) {
        await mirrorProjects(subgroup);
      }
    }
  } catch (error) {
    console.log(`Error processing groups: ${error.message}. Skipping...`);
  }
}

async function migrateIssues(project, newRepo) {
    const issues = await gitlab.Issues.all(project.id);
  
    for (const issue of issues) {
      try {
        const newIssue = await octokit.issues.create({
          owner: newRepo.data.owner.login,
          repo: newRepo.data.name,
          title: issue.title,
          body: issue.description
        });
        console.log(`\t\t\tIssue ${issue.title} migrated to GitHub.`);
      } catch (error) {
        console.error(`\t\t\tError migrating issue ${issue.title}: ${error}.`);
      }
    }
  }

await listAndMoveGroups();
