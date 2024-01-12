import { exec, execSync } from "child_process";
import { createReadStream, unlink, statSync } from "fs";
import { filesize } from "filesize";
import path from "path";
import os from "os";

import { env } from "./env";

import cloudinary from 'cloudinary'

cloudinary.v2.config({
  cloud_name: env.cloud_name,
  api_key: env.api_key,
  api_secret: env.api_secret,
  secure: true,
});

export const uploadCloudinary = async (path: string, filename?: string) => {
  return await cloudinary.v2.uploader.upload(path, {
    folder: env.folder || 'backups',
    public_id: filename
  })
}

const uploadToS3 = async ({ name, path }: { name: string, path: string }) => {
  console.log("Uploading backup to cloudinary...");

  const res = await uploadCloudinary(path, name)

  console.log("Backup uploaded to cloudinary...", res);
}

const dumpToFile = async (filePath: string) => {
  console.log("Dumping DB to file...");

  await new Promise((resolve, reject) => {
    exec(`pg_dump --dbname=${env.BACKUP_DATABASE_URL} --format=tar | gzip > ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error: error, stderr: stderr.trimEnd() });
        return;
      }

      // check if archive is valid and contains data
      const isValidArchive = (execSync(`gzip -cd ${filePath} | head -c1`).length == 1) ? true : false;
      if (isValidArchive == false) {
        reject({ error: "Backup archive file is invalid or empty; check for errors above" });
        return;
      }

      // not all text in stderr will be a critical error, print the error / warning
      if (stderr != "") {
        console.log({ stderr: stderr.trimEnd() });
      }

      console.log("Backup archive file is valid");
      console.log("Backup filesize:", filesize(statSync(filePath).size));

      // if stderr contains text, let the user know that it was potently just a warning message
      if (stderr != "") {
        console.log(`Potential warnings detected; Please ensure the backup file "${path.basename(filePath)}" contains all needed data`);
      }

      resolve(undefined);
    });
  });

  console.log("DB dumped to file...");
}

const deleteFile = async (path: string) => {
  console.log("Deleting file...");
  await new Promise((resolve, reject) => {
    unlink(path, (err) => {
      reject({ error: err });
      return;
    });
    resolve(undefined);
  });
}

export const backup = async () => {
  console.log("Initiating DB backup...");

  const date = new Date().toISOString();
  const timestamp = date.replace(/[:.]+/g, '-');
  const filename = `backup-${timestamp}.tar.gz`;
  const filepath = path.join(os.tmpdir(), filename);

  await dumpToFile(filepath);
  await uploadToS3({ name: filename, path: filepath });
  await deleteFile(filepath);

  console.log("DB backup complete...");
}
