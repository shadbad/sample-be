import { ApiClient } from './api-client';

type ResourceType = 'user';

interface TrackedResource {
  type: ResourceType;
  id: string;
}

/**
 * Tracks resources created during a test suite so they can be cleaned-up
 * in reverse order after the tests finish.
 *
 * Usage:
 * ```ts
 * const tracker = new ResourceTracker(apiClient);
 * tracker.track('user', userId);
 * // ... run tests ...
 * await tracker.cleanupAll(); // deletes in reverse creation order
 * ```
 */
export class ResourceTracker {
  private readonly _resources: TrackedResource[] = [];

  constructor(private readonly _api: ApiClient) {}

  /** Register a resource for later cleanup. */
  track(type: ResourceType, id: string): void {
    this._resources.push({ type, id });
  }

  /**
   * Delete every tracked resource in reverse order (LIFO).
   * Failures are logged but do not throw — cleanup should be best-effort
   * so a single failure does not block remaining deletions.
   */
  async cleanupAll(): Promise<void> {
    const reversed = [...this._resources].reverse();
    for (const resource of reversed) {
      try {
        await this._deleteResource(resource);
      } catch (error) {
        console.warn(
          `[ResourceTracker] Failed to clean up ${resource.type} ${resource.id}:`,
          error,
        );
      }
    }
    this._resources.length = 0;
  }

  private async _deleteResource(resource: TrackedResource): Promise<void> {
    switch (resource.type) {
      case 'user':
        await this._api.delete(`/users/${resource.id}`);
        break;
      default:
        console.warn(`[ResourceTracker] Unknown resource type: ${String(resource.type)}`);
    }
  }
}
