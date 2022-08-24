
/**
 * Incomplete project configuration.
 */
export interface ITeamscaleProjectConfiguration {
    connectors: ITeamscaleConnectorConfiguration[];
}

/**
 * interface for the configuration of a single connector.
 */
interface ITeamscaleConnectorConfiguration {
    type: string,
    connectorIdentifierOptionName: string,
    options: any
}
