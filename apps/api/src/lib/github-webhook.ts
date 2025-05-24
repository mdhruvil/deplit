import { EmitterWebhookEvent } from "@octokit/webhooks";
import { DBProjects } from "../db/queries/projects";
import { createDeploymentAndScheduleIt } from "./schedule-build";
import { posthog } from "./posthog";

/**
 * Extracts the branch name from a Git ref string if it represents a branch.
 *
 * @param ref - The Git ref string to parse.
 * @returns The branch name if {@link ref} starts with "refs/heads/", or null otherwise.
 */
function getBranchNameFromRef(ref: string) {
  if (typeof ref !== "string") return null;

  const prefix = "refs/heads/";
  if (ref.startsWith(prefix)) {
    return ref.slice(prefix.length);
  }

  return null; // Not a branch ref
}

/**
 * Handles a GitHub push webhook event by scheduling deployments for all projects linked to the pushed repository.
 *
 * For each linked project, creates a deployment record based on the pushed branch and commit details. Deployments are marked as "PRODUCTION" if the push is to the repository's default branch, otherwise as "PREVIEW".
 *
 * @param event - The GitHub push event to process.
 */
export async function handleGithubPushEvent(
  event: EmitterWebhookEvent<"push">,
) {
  const { payload } = event;
  // find all the projects that are linked to the repository
  const projects = await DBProjects.findByFullName(
    payload.repository.full_name,
  );

  posthog.capture({
    distinctId: "github-webhook",
    event: "github push event",
    properties: {
      repositoryFullName: payload.repository.full_name,
      projects: projects.map((p) => p.name),
      projectsCount: projects.length,
      branch: getBranchNameFromRef(payload.ref),
      gitCommitSha: payload.after,
    },
  });

  if (!projects || projects.length === 0) {
    console.log("No projects found for this repository");
    return;
  }

  console.log("Projects", projects);
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
    const scheduleStatus = await createDeploymentAndScheduleIt({
      projectId: project.id,
      githubUrl: payload.repository.clone_url,
      gitCommitHash: lastCommitSha,
      gitRef: pushedBranchName,
      gitCommitMessage: lastCommit.message,
      gitCommitAuthorName: lastCommit.author.username ?? lastCommit.author.name,
      gitCommitTimestamp: new Date(lastCommit.timestamp),
      alias: isProduction
        ? `${project.slug}.deplit.tech`
        : `${project.slug}-${lastCommitSha.slice(0, 7)}.deplit.tech`,
      target: isProduction ? "PRODUCTION" : "PREVIEW",
    });

    posthog.capture({
      distinctId: "github-webhook",
      event: "deployment scheduled",
      properties: {
        projectId: project.id,
        gitRef: pushedBranchName,
        gitCommitHash: lastCommitSha,
        target: isProduction ? "PRODUCTION" : "PREVIEW",
        alias: isProduction
          ? `${project.slug}.deplit.tech`
          : `${project.slug}-${lastCommitSha.slice(0, 7)}.deplit.tech`,
      },
    });

    console.log("Scheduled deployment", scheduleStatus);
  });

  await Promise.all(deploymentPromises);

  console.log("OK");
}
