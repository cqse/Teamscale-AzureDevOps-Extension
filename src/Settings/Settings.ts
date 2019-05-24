import { ExtensionDataService } from 'VSS/SDK/Services/ExtensionData';
import { Scope } from './Scope';

/**
 * Class that facilitates saving settings to VSS.
 * Settings can either be saved on Project or Organization level.
 */
export class Settings {
    /** Key that is used to store the Teamscale Server url. */
    public static readonly TEAMSCALE_URL_KEY = 'teamscale-url';

    /** Key that is used to store the Teamscale Project which belongs to the Azure DevOps project. */
    public static readonly TEAMSCALE_PROJECT_KEY = 'teamscale-project';

    /** Key that is used to store the contact email for the TS responsible person. */
    public static readonly EMAIL_CONTACT_KEY = 'email-contact';

    private readonly scope: Scope;

    constructor(scope: Scope) {
        this.scope = scope;
    }

    /**
     * Saves a key value pair in Azure DevOps.
     */
    public save(key: string, value: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            if (!value) {
                value = undefined;
            }
            return dataService.setValue(key, value, {scopeType: this.scope});
        });
    }

    /**
     * Gets a value by key from Azure DevOps.
     */
    public get(key: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            return dataService.getValue(key, {scopeType: this.scope});
        });
    }
}
