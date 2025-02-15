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
