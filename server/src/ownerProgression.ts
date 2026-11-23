import { loadProgressionArchive, type ArchivedProgressionVersion } from './progressionArchive.js';

// The owner approved the ten artifacts in issue #196, comment 7086277307. This pinned
// manifest maps those reviewed hashes and versions; the archive loader checks every byte.
// For each new manifest, record the applicable existing authorization and independent
// evidence review. Work outside that grant needs a further owner decision. Parent review
// remains separate from this content authorization.
const APPROVED_SQUAT_MANIFEST = '99393bef0050657f254aa04538c65dc24af793e5ebe6f6182f624f83d43d95bf';

export function ownerApprovedSquatVersions(contentRoot: string): ArchivedProgressionVersion[] {
  return loadProgressionArchive(contentRoot, 'squat', APPROVED_SQUAT_MANIFEST);
}
