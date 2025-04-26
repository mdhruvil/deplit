import { Webhooks } from "@octokit/webhooks";
import { env } from "../env.js";
import { DBProjects } from "../db/queries/projects.js";
import { DBDeployments } from "../db/queries/deployments.js";

/**
 * Extracts the branch name from a Git ref string.
 *
 * @param ref - The Git ref string, typically in the format "refs/heads/branch-name".
 * @returns The branch name if {@link ref} represents a branch; otherwise, `null`.
 */
function getBranchNameFromRef(ref: string) {
  if (typeof ref !== "string") return null;

  const prefix = "refs/heads/";
  if (ref.startsWith(prefix)) {
    return ref.slice(prefix.length);
  }

  return null; // Not a branch ref
}

const webhook = new Webhooks({
  secret: env.GITHUB_WEBHOOK_SECRET,
});

webhook.on("push", async (event) => {
  const { payload } = event;
  // find all the projects that are linked to the repository
  const projects = await DBProjects.findByFullName(
    payload.repository.full_name,
  );
  console.log("Projects", projects);

  if (!projects || projects.length === 0) {
    console.log("No projects found for this repository");
    return;
  }

  const pushedBranchName = getBranchNameFromRef(payload.ref);
  if (!pushedBranchName) {
    console.log("Not a branch ref, ignoring");
    return;
  }

  const isProduction = pushedBranchName === payload.repository.default_branch;
  const lastCommitSha = payload.after;

  const lastCommit = payload.commits.find(
    (commit) => commit.id === lastCommitSha,
  );

  if (!lastCommit) {
    console.log("Last commit not found, ignoring");
    return;
  }

  const deploymentPromises = projects.map(async (project) => {
    const deployment = await DBDeployments.create(project.id, {
      gitCommitHash: lastCommitSha,
      gitRef: pushedBranchName,
      gitCommitMessage: lastCommit.message,
      gitCommitAuthorName: lastCommit.author.name,
      alias: isProduction
        ? `${project.slug}.deplit.tech`
        : `${project.slug}-${lastCommitSha.slice(0, 7)}.deplit.tech`,
      target: isProduction ? "PRODUCTION" : "PREVIEW",
      activeState: isProduction ? "INACTIVE" : "NA",
    });

    // TODO: add the deployment to the queue for building
    console.log("Scheduled deployment", deployment);
  });

  await Promise.all(deploymentPromises);

  console.log("OK");
});

export { webhook };
