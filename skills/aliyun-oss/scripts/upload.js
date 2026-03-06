#!/usr/bin/env node
"use strict";

const OSS = require("ali-oss");
const fs = require("fs");
const path = require("path");

const REQUIRED_ENV = ["OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET", "OSS_BUCKET"];

function ensureEnv(name) {
  if (!process.env[name]) {
    console.error(`环境变量 ${name} 未设置`);
    process.exit(1);
  }
}

function checkEnv() {
  REQUIRED_ENV.forEach(ensureEnv);
}

function walkFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkFiles(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let localDir = "";
  let ossPrefix = "";
  let force = false;
  let retries = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") {
      force = true;
    } else if (args[i] === "--retries" && args[i + 1] != null) {
      retries = parseInt(args[i + 1], 10);
      i += 1;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Usage: node upload.js <LOCAL_DIR> <OSS_PREFIX> [--force] [--retries N]

LOCAL_DIR    Local directory to upload (recursive).
OSS_PREFIX   OSS key prefix (e.g. assets/static/policy/).
--force      Overwrite existing keys (default: skip).
--retries N  Max retries per file (default: 3).

Env: OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET
      `);
      process.exit(0);
    } else if (!localDir) {
      localDir = args[i];
    } else if (!ossPrefix) {
      ossPrefix = args[i];
    }
  }

  if (!localDir || !ossPrefix) {
    console.error("Usage: node upload.js <LOCAL_DIR> <OSS_PREFIX> [--force] [--retries N]");
    process.exit(1);
  }

  ossPrefix = ossPrefix.replace(/\\/g, "/");
  if (ossPrefix.length && !ossPrefix.endsWith("/")) {
    ossPrefix += "/";
  }

  return { localDir, ossPrefix, force, retries };
}

async function uploadWithRetry(client, ossKey, filePath, maxRetries) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await client.put(ossKey, filePath, {
        timeout: 10 * 60 * 1000,
      });
      console.log(`✅ Uploaded: ${path.relative(process.cwd(), filePath)} → ${ossKey}`);
      return;
    } catch (err) {
      attempt += 1;
      console.warn(
        `❌ Failed to upload ${ossKey}, attempt ${attempt} / ${maxRetries}`,
        err && (err.name || err.message),
      );
      if (attempt >= maxRetries) throw err;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}

async function main() {
  checkEnv();
  const { localDir, ossPrefix, force, retries } = parseArgs();

  const resolvedDir = path.resolve(localDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`本地目录不存在：${resolvedDir}`);
    process.exit(1);
  }
  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    console.error(`不是目录：${resolvedDir}`);
    process.exit(1);
  }

  console.log(`本地目录: ${resolvedDir}`);
  console.log(`OSS 前缀: ${ossPrefix}`);

  const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    secure: true,
  });

  const files = walkFiles(resolvedDir);
  if (!files.length) {
    console.log("本地目录下没有文件可上传，退出。");
    return;
  }

  for (const absFilePath of files) {
    const relativePath = path.relative(resolvedDir, absFilePath).replace(/\\/g, "/");
    const ossKey = `${ossPrefix}${relativePath}`;

    try {
      if (!force) {
        await client.head(ossKey);
        console.log(`⏩ Skip (already exists): ${ossKey}`);
        continue;
      }
    } catch (err) {
      if (err && err.name !== "NoSuchKey" && err.status !== 404) {
        throw err;
      }
    }

    await uploadWithRetry(client, ossKey, absFilePath, retries);
  }

  console.log("✅ 所有文件处理完成");
}

main().catch((err) => {
  console.error("上传过程中出错：", err);
  process.exit(1);
});
