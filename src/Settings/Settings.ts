import {ExtensionDataService} from 'VSS/SDK/Services/ExtensionData';
import {Scope} from './Scope';

/**
 * Class that facilitates saving settings to VSS.
 * Settings can either be saved on Project or Organization level.
 */
export class Settings {
    public static readonly TEAMSCALE_URL = 'teamscale-url';
    public static readonly TEAMSCALE_PROJECT = 'teamscale-project';
    public static readonly EMAIL_CONTACT = 'email-contact';

    private readonly scope: Scope;

    constructor(scope: Scope) {
        this.scope = scope;
    }

    save(key: string, value: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            if (!value) {
                value = undefined;
            }
            return dataService.setValue(key, value, {scopeType: this.scope});
        });
    }

    get(key: string): PromiseLike<string> {
        return VSS.getService(VSS.ServiceIds.ExtensionData).then((dataService: ExtensionDataService) => {
            return dataService.getValue(key, {scopeType: this.scope});
        });
    }
}