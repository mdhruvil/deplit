import { App, Octokit } from "octokit";
import { env } from "../env.js";

export const app = new App({
  appId: env.GITHUB_CLIENT_ID,
  privateKey: env.GITHUB_PRIVATE_KEY,
});

export async function getCurrentUserRepos(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });

  const {
    data: { installations },
  } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();

  const repoPromises = installations.map(async (installation) => {
    const installationOctokit = await app.getInstallationOctokit(
      installation.id,
    );

    const {
      data: { repositories },
    } = await installationOctokit.rest.apps.listReposAccessibleToInstallation();

    return repositories;
  });

  const repos = (await Promise.all(repoPromises)).flat();

  repos.sort((a, b) => {
    return (
      new Date(b.updated_at ?? 0).getTime() -
      new Date(a.updated_at ?? 0).getTime()
    );
  });

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: {
      login: repo.owner.login,
      id: repo.owner.id,
      avatar_url: repo.owner.avatar_url,
      html_url: repo.owner.html_url,
    },
    visibility: repo.visibility,
    html_url: repo.html_url,
    description: repo.description,
    updated_at: repo.updated_at,
    created_at: repo.created_at,
    pushed_at: repo.pushed_at,
    default_branch: repo.default_branch,
  }));
}
