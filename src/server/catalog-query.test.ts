import assert from 'assert';
import test from 'node:test';
import {
  extractConnectionSearchQuery,
  isCollectionsConnectionQuery,
  isProductsConnectionQuery,
  mockCollectionsConnection,
  mockProductsConnection,
  parseSearchNumericIds,
} from './catalog-query';

const GET_PRODUCTS = `#graphql
  query getProducts {
    products (first: 100 , query: "(1001) OR (1003)") {
      nodes {
        id
        title
        totalInventory
        handle
        media(first: 1) {
          nodes {
            preview {
              image {
                originalSrc
              }
            }
          }
        }
        options {
          id
          name
          position
          values
        }
        variants(first: 100) {
          nodes{
            id
            title
            price
            availableForSale
            inventoryQuantity
            selectedOptions {
              value
            }
          }
        }
      }
    }
  }
`;

const GET_COLLECTIONS = `#graphql
  query getCollections {
    collections (first: 100 , query: "(2001) OR (2004)") {
      nodes {
        id
        title
        image {
          originalSrc
        }
      }
    }
  }
`;

test('detects products and collections connection queries', () => {
  assert.equal(isProductsConnectionQuery(GET_PRODUCTS), true);
  assert.equal(isCollectionsConnectionQuery(GET_PRODUCTS), false);
  assert.equal(isCollectionsConnectionQuery(GET_COLLECTIONS), true);
  assert.equal(isProductsConnectionQuery(GET_COLLECTIONS), false);
});

test('extracts inline search query from getProducts / getCollections', () => {
  assert.equal(
    extractConnectionSearchQuery(GET_PRODUCTS, 'products'),
    '(1001) OR (1003)',
  );
  assert.equal(
    extractConnectionSearchQuery(GET_COLLECTIONS, 'collections'),
    '(2001) OR (2004)',
  );
});

test('parses numeric ids from search query', () => {
  assert.deepEqual(parseSearchNumericIds('(1001) OR (1003)'), ['1001', '1003']);
});

test('returns product nodes matching search ids with media and variants', () => {
  const connection = mockProductsConnection(GET_PRODUCTS);
  assert.equal(connection.nodes.length, 2);
  assert.equal(connection.nodes[0].id, 'gid://shopify/Product/1001');
  assert.equal(connection.nodes[0].title, 'Classic Tee');
  assert.ok(connection.nodes[0].media.nodes[0].preview.image.originalSrc);
  assert.equal(connection.nodes[0].variants.nodes[0].price, '29.00');
  assert.equal(connection.nodes[1].id, 'gid://shopify/Product/1003');
});

test('returns collection nodes matching search ids', () => {
  const connection = mockCollectionsConnection(GET_COLLECTIONS);
  assert.equal(connection.nodes.length, 2);
  assert.equal(connection.nodes[0].id, 'gid://shopify/Collection/2001');
  assert.equal(connection.nodes[0].title, 'Summer Essentials');
  assert.ok(connection.nodes[0].image?.originalSrc);
  assert.equal(connection.nodes[1].id, 'gid://shopify/Collection/2004');
});

test('returns all products when search query is empty', () => {
  const query = `query getProducts { products (first: 100 , query: "") { nodes { id } } }`;
  const connection = mockProductsConnection(query);
  assert.equal(connection.nodes.length, 10);
});
