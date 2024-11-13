/**
 * Object to store settings of the Teamscale Dashboard Widget.
 */

export interface ITeamscaleWidgetSettings {
    teamscaleProject: string;
    tgaTeamscaleProject: string;
    useSeparateTgaServer: boolean;
    activeTimeChooser: string;
    startFixedDate: number;
    baselineDays: number;
    tsBaseline: string;
    showTestGapBadge: boolean;
}
