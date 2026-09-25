/**
 * Mock Admin upload flow for the local mockup / e2e session.
 *
 * Mirrors the story_video sequence:
 * 1. stagedUploadsCreate → stagedTargets { url, resourceUrl, parameters }
 * 2. Browser POST/PUT of the file to stagedTargets.url (mock-bridge)
 * 3. fileCreate(originalSource: resourceUrl)
 * 4. node(id) until Video status is READY, or MediaImage fileStatus is READY
 * 5. fileDelete for cleanup
 *
 * https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/stagedUploadsCreate
 * https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/fileCreate
 */

import { randomBytes } from 'crypto';
import {
  findMockVideo,
  hideMockFile,
  mockReadyVideo,
  rememberUploadedVideo,
  resetMockFileCatalog,
} from './files-query';

const CDN = 'https://cdn.shopify.com';

type StagedUpload = {
  filename: string;
  mimeType: string;
  fileSize: number;
  resource: string;
  resourceUrl: string;
};

type MockImageNode = {
  id: string;
  fileStatus: 'READY';
  image: { url: string };
  mediaErrors: [];
};

type GraphqlVariables = Record<string, unknown>;

const stagedByResourceUrl = new Map<string, StagedUpload>();
const images = new Map<string, MockImageNode>();
let nextNumericId = 1072274000;

export function resetMockUploads() {
  nextNumericId = 1072274000;
  stagedByResourceUrl.clear();
  images.clear();
  resetMockFileCatalog();
}

/** Returns a GraphQL body for upload mutations and node polls, or null for other operations. */
export function mockFileUploadGraphql(
  query: string,
  variables: unknown,
  origin: string,
): Record<string, unknown> | null {
  const vars = normalizeVariables(variables);
  if (/\bstagedUploadsCreate\s*\(/.test(query)) return mockStagedUploadsCreate(vars, origin);
  if (/\bfileCreate\s*\(/.test(query)) return mockFileCreate(vars);
  if (/\bfileDelete\s*\(/.test(query)) return mockFileDelete(vars);
  if (/\bnode\s*\(/.test(query)) return mockNode(vars);
  return null;
}

function mockStagedUploadsCreate(variables: GraphqlVariables, origin: string) {
  const inputs = Array.isArray(variables.input) ? variables.input : [];
  if (inputs.length === 0) {
    return {
      data: {
        stagedUploadsCreate: {
          stagedTargets: [],
          userErrors: [{ field: ['input'], message: 'Input is required' }],
        },
      },
    };
  }

  const stagedTargets = inputs.map((raw) => {
    const input = asRecord(raw);
    const filename = stringField(input.filename, 'upload.bin');
    const mimeType = stringField(input.mimeType, 'application/octet-stream');
    const resource = stringField(input.resource, 'FILE').toUpperCase();
    const httpMethod = stringField(input.httpMethod, 'POST').toUpperCase();
    const fileSize = Number(input.fileSize) || 0;
    const key = `tmp/${randomBytes(8).toString('hex')}/${sanitizeFilename(filename)}`;
    const resourceUrl = resource === 'VIDEO'
      ? `https://shopify-video-production-core-originals.storage.googleapis.com/${key}`
      : `https://shopify-staged-uploads.storage.googleapis.com/${key}`;

    stagedByResourceUrl.set(resourceUrl, {
      filename,
      mimeType,
      fileSize,
      resource,
      resourceUrl,
    });

    const uploadUrl = httpMethod === 'PUT'
      ? `${origin}/mock-staged-uploads/${encodeURIComponent(key)}`
      : `${origin}/mock-staged-uploads`;

    return {
      url: uploadUrl,
      resourceUrl,
      parameters: httpMethod === 'PUT' ? [] : stagedParameters(resource, mimeType, key),
    };
  });

  return {
    data: {
      stagedUploadsCreate: {
        stagedTargets,
        userErrors: [],
      },
    },
  };
}

function mockFileCreate(variables: GraphqlVariables) {
  const files = Array.isArray(variables.files) ? variables.files : [];
  const created: Array<Record<string, unknown>> = [];
  const userErrors: Array<{ field: string[]; message: string }> = [];

  files.forEach((raw, index) => {
    const input = asRecord(raw);
    const originalSource = stringField(input.originalSource, '');
    const contentType = stringField(input.contentType, 'FILE').toUpperCase();
    const staged = stagedByResourceUrl.get(originalSource);
    if (!staged) {
      userErrors.push({
        field: ['files', String(index), 'originalSource'],
        message: contentType === 'VIDEO' ? 'Invalid video url' : 'Invalid file url',
      });
      return;
    }

    const numericId = nextNumericId++;
    if (contentType === 'VIDEO' || (contentType !== 'IMAGE' && staged.resource === 'VIDEO')) {
      const node = mockReadyVideo({
        id: numericId,
        filename: staged.filename,
        fileSize: staged.fileSize,
      });
      rememberUploadedVideo(node);
      created.push({ id: node.id, fileStatus: 'READY' });
      return;
    }

    const image: MockImageNode = {
      id: `gid://shopify/MediaImage/${numericId}`,
      fileStatus: 'READY',
      image: {
        url: `${CDN}/s/files/1/2637/1970/files/${numericId}-${sanitizeFilename(staged.filename)}`,
      },
      mediaErrors: [],
    };
    images.set(image.id, image);
    created.push({
      id: image.id,
      fileStatus: image.fileStatus,
      image: image.image,
    });
  });

  return {
    data: {
      fileCreate: {
        files: created,
        userErrors,
      },
    },
  };
}

function mockFileDelete(variables: GraphqlVariables) {
  const ids = Array.isArray(variables.fileIds) ? variables.fileIds.map((id) => String(id)) : [];
  const deletedFileIds: string[] = [];
  const userErrors: Array<{ field: string[]; message: string }> = [];

  ids.forEach((id, index) => {
    const known = Boolean(findMockVideo(id) || images.has(id));
    if (!known) {
      userErrors.push({
        field: ['fileIds', String(index)],
        message: 'File not found',
      });
      return;
    }
    hideMockFile(id);
    images.delete(id);
    deletedFileIds.push(id);
  });

  return {
    data: {
      fileDelete: {
        deletedFileIds,
        userErrors,
      },
    },
  };
}

function mockNode(variables: GraphqlVariables) {
  const id = stringField(variables.id, '');
  const video = findMockVideo(id);
  if (video) {
    return {
      data: {
        node: {
          id: video.id,
          status: video.status,
          duration: video.duration,
          originalSource: video.originalSource,
          sources: video.sources.map((source) => ({
            url: source.url,
            height: source.height,
            width: source.width,
            mimeType: source.mimeType,
            format: source.format,
          })),
          preview: video.preview,
          mediaErrors: video.mediaErrors,
        },
      },
    };
  }

  const image = images.get(id);
  if (image) return { data: { node: image } };
  return { data: { node: null } };
}

function stagedParameters(resource: string, mimeType: string, key: string) {
  if (resource === 'VIDEO') {
    return [
      { name: 'GoogleAccessId', value: 'video-production@shopify-mock.iam.gserviceaccount.com' },
      { name: 'key', value: key },
      { name: 'policy', value: 'mock-policy' },
      { name: 'signature', value: 'mock-signature' },
    ];
  }

  return [
    { name: 'Content-Type', value: mimeType },
    { name: 'success_action_status', value: '201' },
    { name: 'acl', value: 'private' },
    { name: 'key', value: key },
    { name: 'x-goog-algorithm', value: 'GOOG4-RSA-SHA256' },
    { name: 'x-goog-credential', value: 'mock-credential' },
    { name: 'x-goog-date', value: '20260923T000000Z' },
    { name: 'x-goog-signature', value: 'mock-signature' },
    { name: 'policy', value: 'mock-policy' },
  ];
}

function normalizeVariables(variables: unknown): GraphqlVariables {
  if (typeof variables === 'string') {
    try {
      return asRecord(JSON.parse(variables));
    } catch {
      return {};
    }
  }
  return asRecord(variables);
}

function asRecord(value: unknown): GraphqlVariables {
  return value && typeof value === 'object' ? (value as GraphqlVariables) : {};
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]+/g, '_');
}
