/**
 * Scope in which data should be stored.
 *
 * @see https://learn.microsoft.com/en-us/javascript/api/azure-devops-extension-api/idocumentoptions
 */
export enum Scope {
    User = 'User',
    ProjectCollection = 'Default', // Default for VSS
}
