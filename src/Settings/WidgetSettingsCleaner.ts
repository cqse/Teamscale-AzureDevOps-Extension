/**
 * Cleans stored widget settings from artifacts of earlier extension versions.
 */
import {ITeamscaleWidgetSettings} from './ITeamscaleWidgetSettings';

/**
 * Placeholder texts that earlier versions of the configuration dialog displayed inside a dropdown and thereby stored
 * as the dropdown's value (see TS-46229). Only the constant prefix is listed, since the baseline placeholder
 * contained the project name.
 */
const LEGACY_PLACEHOLDER_PREFIXES: { [settingsKey in keyof ITeamscaleWidgetSettings]?: string } = {
    tgaTeamscaleProject: 'Error: No TGA server configured',
    tsBaseline: 'No baseline configured',
};

/**
 * Removes legacy placeholder texts from the given stored widget settings, so that they are treated like a missing
 * value instead of masquerading as a Teamscale project or baseline name. Returns the (possibly modified) settings.
 */
export function removeLegacyPlaceholders(settings: ITeamscaleWidgetSettings): ITeamscaleWidgetSettings {
    if (!settings) {
        return settings;
    }
    for (const settingsKey of Object.keys(LEGACY_PLACEHOLDER_PREFIXES)) {
        const value = settings[settingsKey];
        if (typeof value === 'string' && value.startsWith(LEGACY_PLACEHOLDER_PREFIXES[settingsKey])) {
            settings[settingsKey] = '';
        }
    }
    return settings;
}
