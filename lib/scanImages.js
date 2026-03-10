const fs = require("fs");
const path = require("path");

const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];

function normalizeUrlPath(p) {
  return p.split(path.sep).join("/");
}

function scanImageGroups(dir, baseUrl = "") {
  const groups = new Map();
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = entry.name;

    if (entry.isDirectory()) {
      const subGroups = scanImageGroups(fullPath, `${baseUrl}/${entry.name}`);
      for (const group of subGroups) {
        groups.set(group.key, group);
      }
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!imageExtensions.includes(ext)) continue;

    const baseName = path.basename(entry.name, ext);
    const match = baseName.match(/(.+?)-(\d+)$/);
    const groupBase = match ? match[1] : baseName;

    // Normalize name for grouping (case-insensitive)
    const normalizedBase = groupBase.toLowerCase();
    const groupKey = normalizeUrlPath(path.join(baseUrl, normalizedBase));

    const displayName = normalizedBase
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const url = `${baseUrl}/${normalizeUrlPath(relativePath)}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        name: displayName,
        thumbUrl: url,
        urls: [url],
      });
    } else {
      groups.get(groupKey).urls.push(url);
    }
  }

  const numbered = (url) => {
    const match = url.match(/-(\d+)(?=\.[^.]+$)/);
    return match ? parseInt(match[1], 10) : null;
  };

  for (const group of groups.values()) {
    group.urls.sort((a, b) => {
      const aNum = numbered(a);
      const bNum = numbered(b);
      if (aNum !== null && bNum !== null) return aNum - bNum;
      if (aNum !== null) return -1;
      if (bNum !== null) return 1;
      return a.localeCompare(b);
    });

    group.thumbUrl = group.urls[0];
  }

  return Array.from(groups.values());
}

module.exports = {
  scanImageGroups,
};
