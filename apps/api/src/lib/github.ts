import { env } from "cloudflare:workers";
import { App, Octokit } from "octokit";

/**
 * Retrieves all GitHub repositories accessible to the authenticated user via their GitHub App installations.
 *
 * @param accessToken - The GitHub user access token used for authentication.
 * @returns An array of repository objects, each containing selected metadata such as ID, name, owner details, visibility, URLs, description, timestamps, and default branch.
 */
export async function getCurrentUserRepos(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });

  const {
    data: { installations },
  } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();

  const app = new App({
    appId: env.GITHUB_CLIENT_ID,
    privateKey: env.GITHUB_PRIVATE_KEY,
  });

  const repoPromises = installations.map(async (installation) => {
    const installationOctokit = await app.getInstallationOctokit(
      installation.id,
    );

    const repositories = await installationOctokit.paginate(
      installationOctokit.rest.apps.listReposAccessibleToInstallation,
      {
        per_page: 100,
      },
    );

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
