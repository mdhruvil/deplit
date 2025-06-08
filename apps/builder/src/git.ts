import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

type CloneRepoArgs = {
  url: string;
  dest: string;
  ref?: string;
  commitSha: string;
  githubAccessToken?: string | null;
};

/**
 * Clones a Git repository into a local directory and checks out a specific commit.
 *
 * Initializes a new repository at the destination, adds the remote origin, fetches the specified ref (if provided), and checks out the given commit SHA.
 *
 * @param url - The URL of the Git repository to clone.
 * @param dest - The local directory path where the repository will be cloned.
 * @param ref - An optional Git reference to fetch from the remote.
 * @param commitSha - The commit SHA to check out after fetching.
 */
export async function cloneRepo({
  url,
  dest,
  ref,
  commitSha,
  githubAccessToken,
}: CloneRepoArgs) {
  await git.init({
    fs,
    dir: dest,
  });

  await git.addRemote({
    fs,
    dir: dest,
    remote: "origin",
    url,
  });

  await git.fetch({
    fs,
    http,
    dir: dest,
    remote: "origin",
    url,
    ref,
    onAuth: () => {
      if (!githubAccessToken) {
        console.warn(
          "No GitHub access token provided. Authentication will not be performed.",
        );
        return undefined;
      }
      return {
        username: "x-access-token",
        password: githubAccessToken,
      };
    },
  });

  await git.checkout({
    fs,
    dir: dest,
    ref: commitSha,
  });
}
