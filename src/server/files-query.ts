/**
 * Mock Admin API `files` connection for the local mockup / e2e flow.
 *
 * Shape follows the Shopify Admin GraphQL `files` query (FileConnection + Video),
 * including the selection used by story_video to list READY videos:
 * nodes { ... on Video { id filename createdAt duration preview sources originalSource } }
 * pageInfo { endCursor hasNextPage hasPreviousPage }
 *
 * Video.duration is milliseconds. VideoSource.fileSize is bytes.
 * https://shopify.dev/docs/api/admin-graphql/2025-10/queries/files
 * https://shopify.dev/docs/api/admin-graphql/2025-10/objects/Video
 */

export type MockVideoSource = {
  url: string;
  mimeType: string;
  fileSize: number;
  height: number;
  width: number;
  format: string;
};

export type MockVideoFileNode = {
  id: string;
  filename: string;
  createdAt: string;
  /** Milliseconds. Null unless status is READY. */
  duration: number;
  status: 'READY';
  fileStatus: 'READY';
  mediaErrors: [];
  preview: { image: { url: string } };
  sources: MockVideoSource[];
  originalSource: {
    url: string;
    height: number;
    width: number;
    mimeType: string;
    format: string;
  };
};

export type MockFilesConnection = {
  nodes: MockVideoFileNode[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type FilesQueryVariables = {
  first?: number | string | null;
  query?: string | null;
  sortKey?: string | null;
  reverse?: boolean | string | null;
  cursor?: string | null;
  after?: string | null;
};

const CDN = 'https://cdn.shopify.com';

type VideoSeed = {
  id: number;
  filename: string;
  createdAt: string;
  durationMs: number;
  width: number;
  height: number;
};

const VIDEO_SEEDS: VideoSeed[] = [
  { id: 1072273801, filename: 'summer-lookbook.mp4', createdAt: '2026-09-20T09:00:00Z', durationMs: 16510, width: 1920, height: 1080 },
  { id: 1072273802, filename: 'campaign-intro.mp4', createdAt: '2026-09-18T14:30:00Z', durationMs: 8200, width: 1280, height: 720 },
  { id: 1072273803, filename: 'product-demo-sneakers.mp4', createdAt: '2026-09-15T11:12:00Z', durationMs: 24100, width: 1920, height: 1080 },
  { id: 1072273804, filename: 'unboxing-reel.mp4', createdAt: '2026-09-12T08:05:00Z', durationMs: 12340, width: 1080, height: 1920 },
  { id: 1072273805, filename: 'storefront-tour.mov', createdAt: '2026-09-08T16:40:00Z', durationMs: 30200, width: 1920, height: 1080 },
  { id: 1072273806, filename: 'holiday-teaser.mp4', createdAt: '2026-08-30T10:00:00Z', durationMs: 6400, width: 1280, height: 720 },
  { id: 1072273807, filename: 'how-to-style.mp4', createdAt: '2026-08-22T13:20:00Z', durationMs: 45500, width: 1920, height: 1080 },
  { id: 1072273808, filename: 'ugc-review-01.mp4', createdAt: '2026-08-14T07:45:00Z', durationMs: 9800, width: 1080, height: 1920 },
  { id: 1072273809, filename: 'ugc-review-02.mp4', createdAt: '2026-08-02T18:10:00Z', durationMs: 11250, width: 1080, height: 1920 },
  { id: 1072273810, filename: 'brand-story.mp4', createdAt: '2026-07-19T12:00:00Z', durationMs: 52000, width: 1920, height: 1080 },
  { id: 1072273811, filename: 'size-guide.mp4', createdAt: '2026-07-04T09:30:00Z', durationMs: 18700, width: 1280, height: 720 },
  { id: 1072273812, filename: 'archive-drop.mp4', createdAt: '2026-06-21T05:00:58Z', durationMs: 15000, width: 854, height: 480 },
];

const CATALOG: MockVideoFileNode[] = VIDEO_SEEDS.map(toVideoNode);
const uploadedVideos: MockVideoFileNode[] = [];
const hiddenFileIds = new Set<string>();

export function resetMockFileCatalog() {
  uploadedVideos.length = 0;
  hiddenFileIds.clear();
}

export function rememberUploadedVideo(node: MockVideoFileNode) {
  uploadedVideos.unshift(node);
}

export function hideMockFile(id: string) {
  hiddenFileIds.add(id);
  const index = uploadedVideos.findIndex((node) => node.id === id);
  if (index >= 0) uploadedVideos.splice(index, 1);
}

export function findMockVideo(id: string): MockVideoFileNode | null {
  if (hiddenFileIds.has(id)) return null;
  return (
    uploadedVideos.find((node) => node.id === id) ??
    CATALOG.find((node) => node.id === id) ??
    null
  );
}

export function mockReadyVideo(input: {
  id: number;
  filename: string;
  createdAt?: string;
  durationMs?: number;
  width?: number;
  height?: number;
  fileSize?: number;
}): MockVideoFileNode {
  const node = toVideoNode({
    id: input.id,
    filename: input.filename,
    createdAt: input.createdAt ?? new Date().toISOString(),
    durationMs: input.durationMs ?? 8000,
    width: input.width ?? 1280,
    height: input.height ?? 720,
  });
  const uploadedSize = input.fileSize;
  if (typeof uploadedSize === 'number' && uploadedSize > 0) {
    const hd = node.sources.find((source) => source.format === 'mp4' && source.height >= 720);
    if (hd) hd.fileSize = uploadedSize;
  }
  return node;
}

function allVisibleVideos(): MockVideoFileNode[] {
  return [...uploadedVideos, ...CATALOG].filter((node) => !hiddenFileIds.has(node.id));
}

/** True only for the Admin `files` connection query, not fileCreate/fileDelete. */
export function isFilesListQuery(query: string): boolean {
  if (/\b(fileCreate|fileDelete|stagedUploadsCreate)\s*\(/.test(query)) return false;
  return /\bfiles\s*\(/.test(query);
}

export function mockFilesConnection(variables: FilesQueryVariables = {}): MockFilesConnection {
  const search = variables.query ?? '';
  const mediaType = readFilter(search, 'media_type');
  const status = readFilter(search, 'status');
  const filename = readFilenameFilter(search);

  if ((mediaType && mediaType !== 'VIDEO') || (status && status !== 'READY')) {
    return emptyConnection();
  }

  const matched = allVisibleVideos().filter((node) => {
    if (!filename) return true;
    return node.filename.toLowerCase().includes(filename);
  });

  const sorted = sortFiles(matched, variables.sortKey, isReverse(variables.reverse));
  const first = clampFirst(variables.first);
  const start = cursorOffset(variables.cursor ?? variables.after);
  const page = sorted.slice(start, start + first);
  const last = page[page.length - 1];

  return {
    nodes: page,
    pageInfo: {
      endCursor: last ? encodeCursor(sorted.indexOf(last)) : null,
      hasNextPage: start + page.length < sorted.length,
      hasPreviousPage: start > 0,
    },
  };
}

function emptyConnection(): MockFilesConnection {
  return {
    nodes: [],
    pageInfo: { endCursor: null, hasNextPage: false, hasPreviousPage: false },
  };
}

function toVideoNode(seed: VideoSeed): MockVideoFileNode {
  const hash = seed.id.toString(16);
  const poster = `${CDN}/s/files/1/2637/1970/files/preview_images/${hash}.thumbnail.0000000.jpg?v=1750482058`;
  const originalUrl = `${CDN}/videos/c/o/v/${hash}.${extensionOf(seed.filename)}`;
  const playlistUrl = `${CDN}/videos/c/vp/${hash}/${hash}.m3u8`;
  const hdHeight = seed.height >= 720 ? seed.height : 720;
  const hdWidth = seed.height >= 720 ? seed.width : 1280;
  const hdUrl = `${CDN}/videos/c/vp/${hash}/${hash}.HD-${hdHeight}p.mp4`;
  const sdUrl = `${CDN}/videos/c/vp/${hash}/${hash}.SD-480p.mp4`;

  return {
    id: `gid://shopify/Video/${seed.id}`,
    filename: seed.filename,
    createdAt: seed.createdAt,
    duration: seed.durationMs,
    status: 'READY',
    fileStatus: 'READY',
    mediaErrors: [],
    preview: { image: { url: poster } },
    sources: [
      {
        url: playlistUrl,
        mimeType: 'application/x-mpegURL',
        fileSize: 2048,
        height: hdHeight,
        width: hdWidth,
        format: 'm3u8',
      },
      {
        url: hdUrl,
        mimeType: 'video/mp4',
        fileSize: 4_500_000,
        height: hdHeight,
        width: hdWidth,
        format: 'mp4',
      },
      {
        url: sdUrl,
        mimeType: 'video/mp4',
        fileSize: 1_500_000,
        height: 480,
        width: 854,
        format: 'mp4',
      },
    ],
    originalSource: {
      url: originalUrl,
      height: seed.height,
      width: seed.width,
      mimeType: seed.filename.endsWith('.mov') ? 'video/quicktime' : 'video/mp4',
      format: extensionOf(seed.filename),
    },
  };
}

function extensionOf(filename: string): string {
  const ext = filename.split('.').pop();
  return ext && ext !== filename ? ext : 'mp4';
}

function readFilter(query: string, key: string): string | null {
  const match = new RegExp(`\\b${key}:([A-Za-z0-9_]+)`, 'i').exec(query);
  return match ? match[1].toUpperCase() : null;
}

function readFilenameFilter(query: string): string | null {
  const match = /filename:(?:"([^"]*)"|(\S+))/i.exec(query);
  const raw = (match?.[1] ?? match?.[2] ?? '').replace(/\*/g, '').trim().toLowerCase();
  return raw.length > 0 ? raw : null;
}

function isReverse(reverse: FilesQueryVariables['reverse']): boolean {
  return reverse === true || reverse === 'true';
}

function clampFirst(first: FilesQueryVariables['first']): number {
  const parsed = typeof first === 'string' ? Number(first) : first;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) return 10;
  return Math.min(Math.floor(parsed), 250);
}

function sortFiles(nodes: MockVideoFileNode[], sortKey: string | null | undefined, reverse: boolean): MockVideoFileNode[] {
  const key = (sortKey || 'ID').toUpperCase();
  const sorted = [...nodes].sort((left, right) => {
    if (key === 'CREATED_AT') return left.createdAt.localeCompare(right.createdAt);
    if (key === 'FILENAME') return left.filename.localeCompare(right.filename);
    return left.id.localeCompare(right.id);
  });
  return reverse ? sorted.reverse() : sorted;
}

function encodeCursor(index: number): string {
  return Buffer.from(`files:${index}`, 'utf8').toString('base64');
}

function cursorOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const match = /^files:(\d+)$/.exec(decoded);
    if (!match) return 0;
    const index = Number(match[1]);
    return Number.isInteger(index) && index >= 0 ? index + 1 : 0;
  } catch {
    return 0;
  }
}
