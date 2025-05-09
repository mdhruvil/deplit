import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

type CloneRepoArgs = {
  url: string;
  dest: string;
  ref?: string;
  commitSha: string;
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
export async function cloneRepo({ url, dest, ref, commitSha }: CloneRepoArgs) {
  console.log("Cloning repo", { url, dest, ref, commitSha });

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

    onMessage: (msg) => {
      console.log("Git fetch message:", msg);
    },
  });

  await git.checkout({
    fs,
    dir: dest,
    ref: commitSha,
  });
}
