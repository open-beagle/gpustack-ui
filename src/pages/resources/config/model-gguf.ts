export interface GgufFile {
  path: string;
  size: number;
}

export function clearOwnedGgufPatterns(
  current: string[] | undefined,
  selectorWritten: string[] | undefined
) {
  if (
    selectorWritten &&
    current?.length === selectorWritten.length &&
    current.every((pattern, index) => pattern === selectorWritten[index])
  ) {
    return [];
  }
  return current || [];
}

const shardPattern = /^(.*)-(\d+)-of-(\d+)\.gguf$/i;
const quantizationPattern =
  /(?:^|[-_.])(IQ\d+(?:_[A-Z0-9]+)*|Q\d+(?:_[A-Z0-9]+)*|BF16|F16|F32)(?:[-_.]|$)/i;

export function groupGgufFiles(files: GgufFile[]) {
  const groups = new Map<string, GgufFile[]>();
  files.forEach((file) => {
    const match = file.path.match(shardPattern);
    const pattern = match ? `${match[1]}-*.gguf` : file.path;
    groups.set(pattern, [...(groups.get(pattern) || []), file]);
  });
  return Array.from(groups.entries()).map(([pattern, parts]) => ({
    pattern,
    size: parts.reduce((total, part) => total + (part.size || 0), 0),
    quantization:
      parts[0]?.path.match(quantizationPattern)?.[1]?.toUpperCase() || 'GGUF'
  }));
}
