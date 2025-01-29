import { ExtensionDataService } from 'VSS/SDK/Services/ExtensionData';
import { Scope } from './Scope';
import {ExtensionSetting} from "./ExtensionSetting";

/**
 * Class that facilitates saving settings to VSS.
 * Settings can either be saved on Project or Organization level.
 */
export class Settings {

    /** @see Scope.**/
    protected readonly scope: Scope;

    /** The already configured settings saved in Azure DevOps. */
    private configuredVssSettings: Map<string, string>;

    constructor(scope: Scope) {
        this.scope = scope;
    }

    /** Saves a key value pair in Azure DevOps. */
    public save(key: string, value: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            if (!value) {
                value = undefined;
            }
            return dataService.setValue(key, value, {scopeType: this.scope});
        });
    }

    /**
     *  Gets the stored value for the given extension setting from Azure DevOps. If no value is stored,
     *  the setting's default value is returned.
     */
    public async get(setting: ExtensionSetting): Promise<string> {
        await this.loadConfiguredSettingsIfNeeded();
        if(this.configuredVssSettings.has(setting.key)){
            return this.configuredVssSettings.get(setting.key);
        }
        return setting.defaultValue;
    }

    /** Loads all the configured settings saved in VSS, unless they have been already loaded. */
    private async loadConfiguredSettingsIfNeeded(): Promise<void> {
        if(!this.configuredVssSettings) {
            this.configuredVssSettings = new Map();
            const dataService: ExtensionDataService = await VSS.getService(VSS.ServiceIds.ExtensionData);
            const allSettings = await dataService.getDocuments('$settings', {scopeType: this.scope});
            allSettings.map(doc => {
                this.configuredVssSettings.set(doc.id, doc.value)
            });
        }
    }
}
