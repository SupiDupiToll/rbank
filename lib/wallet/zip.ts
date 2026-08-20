import { deflateRawSync } from "node:zlib";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  name: string;
  data: Buffer;
  crc: number;
  compressed: Buffer;
  compressedSize: number;
  uncompressedSize: number;
  offset: number;
};

export function buildZip(files: Array<{ name: string; data: Buffer }>) {
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const compressed = deflateRawSync(file.data);
    const entry: ZipEntry = {
      name: file.name,
      data: file.data,
      crc: crc32(file.data),
      compressed,
      compressedSize: compressed.length,
      uncompressedSize: file.data.length,
      offset,
    };
    entries.push(entry);
    offset += localHeaderSize(entry) + compressed.length;
  }

  const chunks: Buffer[] = [];
  for (const entry of entries) {
    chunks.push(localHeader(entry));
    chunks.push(entry.compressed);
  }

  const centralDirectoryOffset = offset;
  const centralDirectoryChunks = entries.map((entry) =>
    centralDirectoryHeader(entry),
  );
  chunks.push(...centralDirectoryChunks);
  const centralDirectorySize = centralDirectoryChunks.reduce(
    (sum, chunk) => sum + chunk.length,
    0,
  );
  chunks.push(endOfCentralDirectory(entries.length, centralDirectorySize, centralDirectoryOffset));

  return Buffer.concat(chunks);
}

function localHeaderSize(entry: ZipEntry) {
  return 30 + Buffer.byteLength(entry.name);
}

function localHeader(entry: ZipEntry) {
  const buffer = Buffer.alloc(30);
  buffer.writeUInt32LE(0x04034b50, 0);
  buffer.writeUInt16LE(20, 4);
  buffer.writeUInt16LE(0x0800, 6);
  buffer.writeUInt16LE(8, 8);
  buffer.writeUInt16LE(0, 10);
  buffer.writeUInt32LE(entry.crc, 14);
  buffer.writeUInt32LE(entry.compressedSize, 18);
  buffer.writeUInt32LE(entry.uncompressedSize, 22);
  buffer.writeUInt16LE(Buffer.byteLength(entry.name), 26);
  buffer.writeUInt16LE(0, 28);
  return Buffer.concat([buffer, Buffer.from(entry.name, "utf8")]);
}

function centralDirectoryHeader(entry: ZipEntry) {
  const nameBuffer = Buffer.from(entry.name, "utf8");
  const buffer = Buffer.alloc(46);
  buffer.writeUInt32LE(0x02014b50, 0);
  buffer.writeUInt16LE(20, 4);
  buffer.writeUInt16LE(20, 6);
  buffer.writeUInt16LE(0x0800, 8);
  buffer.writeUInt16LE(8, 10);
  buffer.writeUInt16LE(0, 12);
  buffer.writeUInt32LE(entry.crc, 16);
  buffer.writeUInt32LE(entry.compressedSize, 20);
  buffer.writeUInt32LE(entry.uncompressedSize, 24);
  buffer.writeUInt16LE(nameBuffer.length, 28);
  buffer.writeUInt16LE(0, 30);
  buffer.writeUInt16LE(0, 32);
  buffer.writeUInt16LE(0, 34);
  buffer.writeUInt16LE(0, 36);
  buffer.writeUInt32LE(0, 38);
  buffer.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([buffer, nameBuffer]);
}

function endOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const buffer = Buffer.alloc(22);
  buffer.writeUInt32LE(0x06054b50, 0);
  buffer.writeUInt16LE(0, 4);
  buffer.writeUInt16LE(0, 6);
  buffer.writeUInt16LE(entryCount, 8);
  buffer.writeUInt16LE(entryCount, 10);
  buffer.writeUInt32LE(centralDirectorySize, 12);
  buffer.writeUInt32LE(centralDirectoryOffset, 16);
  buffer.writeUInt16LE(0, 20);
  return buffer;
}
