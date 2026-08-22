function parseSemver(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function compareSemver(left, right) {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

function incrementPatch(version) {
  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
  };
}

function resolveNextAppVersion(baseVersion, previousVersion) {
  const base = parseSemver(baseVersion) || { major: 0, minor: 1, patch: 0 };
  const previous = parseSemver(previousVersion);
  if (!previous) {
    return formatSemver(base);
  }
  if (compareSemver(previous, base) < 0) {
    return formatSemver(base);
  }
  return formatSemver(incrementPatch(previous));
}

module.exports = {
  parseSemver,
  formatSemver,
  compareSemver,
  incrementPatch,
  resolveNextAppVersion,
};
