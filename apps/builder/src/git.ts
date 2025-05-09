import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

type CloneRepoArgs = {
  url: string;
  dest: string;
  ref?: string;
  commitSha: string;
};

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
