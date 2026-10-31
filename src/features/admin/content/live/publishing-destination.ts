import type { PublishTarget } from './scheduling-api';

/** A destination must be explicitly selected and still publishable. Never fall back to another account. */
export function selectedPublishingTarget(targets: PublishTarget[], mappingId: string | undefined): PublishTarget | null {
  return targets.find(target => target.resourceMappingId === mappingId && target.publishable) ?? null;
}
