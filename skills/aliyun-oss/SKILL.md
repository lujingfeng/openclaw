---
name: aliyun-oss
description: Upload files and directories to Alibaba Cloud OSS (Object Storage Service). Use when the user needs to upload local files to OSS, sync directories, or manage OSS uploads with retry logic and optional force overwrite.
---

# Aliyun OSS Upload

Upload local directories to Alibaba Cloud OSS recursively.

## Prerequisites

Ensure `ali-oss` npm package is installed:

```bash
npm install ali-oss
```

Required environment variables:

| Variable                | Description                          |
| ----------------------- | ------------------------------------ |
| `OSS_REGION`            | OSS region (e.g., `oss-cn-hangzhou`) |
| `OSS_ACCESS_KEY_ID`     | Alibaba Cloud Access Key ID          |
| `OSS_ACCESS_KEY_SECRET` | Alibaba Cloud Access Key Secret      |
| `OSS_BUCKET`            | Target bucket name                   |

## Usage

Run the upload script:

```bash
node scripts/upload.js <LOCAL_DIR> <OSS_PREFIX> [--force] [--retries N]
```

### Arguments

| Argument      | Description                                                                                |
| ------------- | ------------------------------------------------------------------------------------------ |
| `LOCAL_DIR`   | Local directory to upload (recursive)                                                      |
| `OSS_PREFIX`  | OSS key prefix (e.g., `assets/static/`), 如果没有指定，都放 `assets/static/alayanew`目录下 |
| `--force`     | Overwrite existing files (default: skip)                                                   |
| `--retries N` | Max retries per file (default: 3)                                                          |

### Examples

Upload a directory to OSS:

```bash
export OSS_REGION=xxx
export OSS_ACCESS_KEY_ID=xxxx
export OSS_ACCESS_KEY_SECRET=xxxx
export OSS_BUCKET=xxxx

node scripts/upload.js ./dist assets/static/
```

Force overwrite existing files:

```bash
node scripts/upload.js ./dist assets/static/ --force
```

Increase retry attempts:

```bash
node scripts/upload.js ./dist assets/static/ --retries 5
```

## Features

- Recursive directory upload
- Automatic retry with exponential backoff
- Skip existing files (unless `--force`)
- Cross-platform path handling
- 10-minute timeout per file
