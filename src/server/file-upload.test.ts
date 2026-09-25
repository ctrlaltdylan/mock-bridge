import assert from 'assert';
import test from 'node:test';
import { mockFileUploadGraphql, resetMockUploads } from './file-upload';
import { mockFilesConnection } from './files-query';

const ORIGIN = 'http://127.0.0.1:3080';

const STAGED_QUERY = `mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const FILE_CREATE_QUERY = `mutation FileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus ... on MediaImage { image { url } } }
    userErrors { field message }
  }
}`;

const NODE_QUERY = `query GetFile($id: ID!) {
  node(id: $id) {
    id
    ... on Video { status duration originalSource { url } sources { url format height } preview { image { url } } mediaErrors { code message } }
  }
}`;

test('stages a video upload against the mock server and registers a READY file', () => {
  resetMockUploads();
  const staged = mockFileUploadGraphql(STAGED_QUERY, {
    input: [{
      filename: 'launch-reel.mp4',
      mimeType: 'video/mp4',
      resource: 'VIDEO',
      httpMethod: 'POST',
      fileSize: '2048000',
    }],
  }, ORIGIN) as any;

  const target = staged.data.stagedUploadsCreate.stagedTargets[0];
  assert.equal(staged.data.stagedUploadsCreate.userErrors.length, 0);
  assert.equal(target.url, `${ORIGIN}/mock-staged-uploads`);
  assert.match(target.resourceUrl, /^https:\/\/shopify-video-production-core-originals\.storage\.googleapis\.com\/tmp\//);
  assert.ok(target.parameters.some((parameter: { name: string }) => parameter.name === 'key'));

  const created = mockFileUploadGraphql(FILE_CREATE_QUERY, {
    files: [{ contentType: 'VIDEO', originalSource: target.resourceUrl }],
  }, ORIGIN) as any;
  const file = created.data.fileCreate.files[0];
  assert.equal(created.data.fileCreate.userErrors.length, 0);
  assert.match(file.id, /^gid:\/\/shopify\/Video\//);
  assert.equal(file.fileStatus, 'READY');

  const node = mockFileUploadGraphql(NODE_QUERY, { id: file.id }, ORIGIN) as any;
  assert.equal(node.data.node.status, 'READY');
  assert.equal(typeof node.data.node.duration, 'number');
  assert.ok(node.data.node.sources.some((source: { format: string; height: number }) => source.format === 'mp4' && source.height >= 720));
  assert.ok(node.data.node.preview.image.url);

  const listed = mockFilesConnection({
    first: 10,
    query: 'media_type:VIDEO AND status:READY AND filename:"launch-reel"',
    sortKey: 'CREATED_AT',
    reverse: true,
  });
  assert.deepEqual(listed.nodes.map((entry) => entry.filename), ['launch-reel.mp4']);
});

test('rejects fileCreate when the source was not staged', () => {
  resetMockUploads();
  const created = mockFileUploadGraphql(FILE_CREATE_QUERY, {
    files: [{ contentType: 'VIDEO', originalSource: 'https://example.com/not-staged.mp4' }],
  }, ORIGIN) as any;

  assert.equal(created.data.fileCreate.files.length, 0);
  assert.equal(created.data.fileCreate.userErrors[0].message, 'Invalid video url');
});

test('creates a READY image and deletes it', () => {
  resetMockUploads();
  const staged = mockFileUploadGraphql(STAGED_QUERY, {
    input: [{
      filename: 'thumb.jpg',
      mimeType: 'image/jpeg',
      resource: 'FILE',
      httpMethod: 'POST',
      fileSize: '12000',
    }],
  }, ORIGIN) as any;
  const target = staged.data.stagedUploadsCreate.stagedTargets[0];
  assert.equal(target.url, `${ORIGIN}/mock-staged-uploads`);
  assert.ok(target.parameters.some((parameter: { name: string; value: string }) => parameter.name === 'success_action_status' && parameter.value === '201'));

  const created = mockFileUploadGraphql(FILE_CREATE_QUERY, {
    files: [{ contentType: 'IMAGE', originalSource: target.resourceUrl }],
  }, ORIGIN) as any;
  const file = created.data.fileCreate.files[0];
  assert.match(file.id, /^gid:\/\/shopify\/MediaImage\//);
  assert.equal(file.fileStatus, 'READY');
  assert.match(file.image.url, /^https:\/\/cdn\.shopify\.com\//);

  const deleted = mockFileUploadGraphql(
    'mutation FileDelete($fileIds: [ID!]!) { fileDelete(fileIds: $fileIds) { deletedFileIds userErrors { field message } } }',
    { fileIds: [file.id] },
    ORIGIN,
  ) as any;
  assert.deepEqual(deleted.data.fileDelete.deletedFileIds, [file.id]);
  assert.equal(deleted.data.fileDelete.userErrors.length, 0);

  const node = mockFileUploadGraphql(NODE_QUERY, { id: file.id }, ORIGIN) as any;
  assert.equal(node.data.node, null);
});
