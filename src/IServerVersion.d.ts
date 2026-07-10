/**
 * Format of the Teamscale server version info returned by /api/version.
 */
export interface IServerVersion {
    maxApiVersion: {
        major: number;
        minor: number;
        patch: number;
    };
}
