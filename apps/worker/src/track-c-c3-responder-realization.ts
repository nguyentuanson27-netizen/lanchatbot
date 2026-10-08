export const TRACK_C_RESPONDER_SEGMENT_ROLES = Object.freeze([
  "ANSWER",
  "NEXT_MOVE",
  "CANONICAL_ACTION",
] as const);

export type TrackCResponderSegmentRole =
  typeof TRACK_C_RESPONDER_SEGMENT_ROLES[number];

/** Metadata consumed by the C3 guard must not widen the legacy output contract. */
export function stripTrackCResponderRealizationMetadata(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const output = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(output.segments)) return value;
  return Object.freeze({
    ...output,
    segments: Object.freeze(output.segments.map((segment) => {
      if (segment === null || typeof segment !== "object" || Array.isArray(segment)) {
        return segment;
      }
      const { role: _role, decisionInput: _decisionInput, ...rest } =
        segment as Readonly<Record<string, unknown>>;
      const {
        protectedProposition: _protectedProposition,
        protectedResolution: _protectedResolution,
        supportedProposition: _supportedProposition,
        ...customerOutput
      } = rest;
      return Object.freeze(customerOutput);
    })),
  });
}
