import { env } from "cloudflare:workers";
import { App, Octokit } from "octokit";

/**
 * Retrieves all GitHub repositories accessible to the authenticated user via their GitHub App installations.
 *
 * @param accessToken - The GitHub user access token used for authentication.
 * @returns An array of repository objects, each containing selected metadata such as ID, name, owner details, visibility, URLs, description, timestamps, and default branch.
 */
export async function getCurrentUserRepos(accessToken: string) {
  try {
    // Create authenticated Octokit instance with user's access token
    const octokit = new Octokit({ auth: accessToken });

    console.log("Access token:", accessToken);

    // Get the user's GitHub App installations
    const installationsResponse = await octokit.rest.apps
      .listInstallationsForAuthenticatedUser()
      .catch((error) => {
        console.error("Failed to list GitHub installations:", error);
        throw new Error(`GitHub API error: ${error.message}`);
      });

    const { installations } = installationsResponse.data;
    console.log("Installations response:", installations);

    if (!installations || installations.length === 0) {
      // Return empty array if no installations found
      return [];
    }

    // Create promises for fetching repositories from each installation
    const repoPromises = installations.map(async (installation) => {
      try {
        // Use the user's access token to fetch repositories for this installation
        const repos = await octokit.paginate(
          octokit.rest.apps.listInstallationReposForAuthenticatedUser,
          {
            installation_id: installation.id,
            per_page: 100,
          },
        );

        console.log(
          `Fetched ${repos.length} repositories for installation ${installation.id}.`,
        );

        return repos;
      } catch (error) {
        console.error(
          `Error fetching repos for installation ${installation.id}:`,
          error,
        );
        // Return empty array for this installation if there was an error
        // This prevents one bad installation from breaking the entire request
        return [];
      }
    });

    // Wait for all repository fetching to complete, with a timeout
    const reposArrays = await Promise.all(repoPromises);

    // Flatten the array of arrays into a single array of repositories
    const repos = reposArrays.flat();

    console.log(`Total repositories fetched: ${repos.length}`);
    // Sort repositories by updated_at date (most recent first)
    repos.sort((a, b) => {
      return (
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime()
      );
    });
    // Return only the necessary repository information
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
  } catch (error) {
    console.error("Error in getCurrentUserRepos:", error);
    // Rethrow so that the calling code can handle it appropriately
    throw error;
  }
}

export async function getLastCommitForRepo({
  owner,
  repo,
  ref,
  accessToken,
}: {
  owner: string;
  repo: string;
  ref: string;
  accessToken: string;
}) {
  const octokit = new Octokit({ auth: accessToken });

  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref,
  });

  return data;
}
