/**
 * Object to store settings of the Teamscale Dashboard Widget.
 */

export interface ITeamscaleWidgetSettings {
    teamscaleProject: string;
    tgaTeamscaleProject: string;
    tsaTeamscaleProject: string;
    useSeparateTgaServer: boolean;
    useSeparateTsaServer: boolean;
    activeTimeChooser: string;
    startFixedDate: number;
    baselineDays: number;
    tsBaseline: string;
    showTestGapBadge: boolean;
    showTestSmellBadge: boolean;
}
