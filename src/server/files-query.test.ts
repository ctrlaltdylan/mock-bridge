import assert from 'assert';
import test from 'node:test';
import { isFilesListQuery, mockFilesConnection } from './files-query';

const FILES_LIST_QUERY = `#graphql
  query files($first: Int!, $query: String!, $sortKey: FileSortKeys!, $reverse: Boolean!, $cursor: String) {
    files(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse, after: $cursor) {
      nodes { ... on Video { id filename } }
      pageInfo { endCursor hasNextPage hasPreviousPage }
    }
  }
`;

test('detects the files list query and ignores file mutations', () => {
  assert.equal(isFilesListQuery(FILES_LIST_QUERY), true);
  assert.equal(
    isFilesListQuery('mutation FileCreate($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } } }'),
    false,
  );
});

test('returns a Shopify files connection page for READY videos', () => {
  const connection = mockFilesConnection({
    first: 10,
    query: 'media_type:VIDEO AND status:READY',
    sortKey: 'CREATED_AT',
    reverse: true,
    cursor: null,
  });

  assert.equal(connection.nodes.length, 10);
  assert.equal(connection.pageInfo.hasNextPage, true);
  assert.equal(connection.pageInfo.hasPreviousPage, false);
  assert.equal(connection.nodes[0].filename, 'summer-lookbook.mp4');
  assert.equal(connection.nodes[0].id, 'gid://shopify/Video/1072273801');
  assert.equal(connection.nodes[0].duration, 16510);
  assert.ok(connection.nodes[0].preview.image.url.includes('thumbnail'));
  assert.ok(connection.nodes[0].sources.some((source) => source.format === 'mp4' && source.height >= 720));
  assert.ok(connection.nodes[0].sources.some((source) => source.format === 'm3u8'));
  assert.equal(typeof connection.nodes[0].originalSource.url, 'string');
});

test('paginates with the opaque endCursor', () => {
  const firstPage = mockFilesConnection({
    first: 10,
    query: 'media_type:VIDEO AND status:READY',
    sortKey: 'CREATED_AT',
    reverse: true,
  });
  const secondPage = mockFilesConnection({
    first: 10,
    query: 'media_type:VIDEO AND status:READY',
    sortKey: 'CREATED_AT',
    reverse: true,
    cursor: firstPage.pageInfo.endCursor,
  });

  assert.equal(secondPage.nodes.length, 2);
  assert.equal(secondPage.pageInfo.hasNextPage, false);
  assert.equal(secondPage.pageInfo.hasPreviousPage, true);
  assert.equal(secondPage.nodes[0].filename, 'size-guide.mp4');
});

test('filters by the filename search clause the app sends', () => {
  const connection = mockFilesConnection({
    first: 10,
    query: 'media_type:VIDEO AND status:READY AND filename:"campaign-intro"',
    sortKey: 'CREATED_AT',
    reverse: true,
  });

  assert.deepEqual(connection.nodes.map((node) => node.filename), ['campaign-intro.mp4']);
  assert.equal(connection.pageInfo.hasNextPage, false);
});

test('returns an empty connection for a non-video media type', () => {
  const connection = mockFilesConnection({
    first: 10,
    query: 'media_type:IMAGE',
  });

  assert.deepEqual(connection.nodes, []);
  assert.equal(connection.pageInfo.endCursor, null);
  assert.equal(connection.pageInfo.hasNextPage, false);
});
