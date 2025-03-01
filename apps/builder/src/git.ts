import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

type CloneRepoArgs = {
  url: string;
  dest: string;
  ref?: string;
};
export async function cloneRepo({ url, dest, ref }: CloneRepoArgs) {
  await git.clone({
    fs,
    http,
    dir: dest,
    url,
    depth: 1,
    ref,
  });
}

type GetLatestCommitObjectIdArgs = {
  dest: string;
  ref: string;
};
export async function getLatestCommitObjectId({
  ref,
  dest,
}: GetLatestCommitObjectIdArgs) {
  const commit = await git.log({
    fs,
    dir: dest,
    depth: 1,
    ref,
  });
  if (commit.length === 0 || !commit[0]?.oid) {
    throw new Error("No commits found");
  }
  return commit[0].oid;
}
