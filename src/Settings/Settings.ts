import { ExtensionDataService } from 'VSS/SDK/Services/ExtensionData';
import { Scope } from './Scope';

/**
 * Class that facilitates saving settings to VSS.
 * Settings can either be saved on Project or Organization level.
 */
export class Settings {
    /** Key that is used to store the Teamscale Server url. */
    public static readonly TEAMSCALE_URL_KEY = 'teamscale-url';

    /** Key that is used to store the Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TEAMSCALE_PROJECTS_KEY = 'teamscale-project';

    /**
     *  Key that is used to store whether a separate Teamscale Server should be used for retrieving information
     *  of Test Gap Analysis.
     */
    public static readonly USE_SEPARATE_TEST_GAP_SERVER = 'use-separate-test-gap-sever';

    /** Key that is used to store the separate TGA Teamscale Server url. */
    public static readonly TGA_TEAMSCALE_URL_KEY = 'tga-teamscale-url';

    /** Key that is used to store the separate Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TGA_TEAMSCALE_PROJECTS_KEY = 'tga-teamscale-project';

    /**
     *  Key that is used to store whether a separate Teamscale Server should be used for retrieving information
     *  of Test Smell Analysis.
     */
    public static readonly USE_SEPARATE_TEST_SMELL_SERVER = 'use-separate-test-smell-sever';

    /** Key that is used to store the separate TSA Teamscale Server url. */
    public static readonly TSA_TEAMSCALE_URL_KEY = 'tsa-teamscale-url';

    /** Key that is used to store the separate Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TSA_TEAMSCALE_PROJECTS_KEY = 'tsa-teamscale-project';

    /** Key that is used to store whether a Findings Badge should be shown in the Work Item View. */
    public static readonly SHOW_FINDINGS_BADGE_KEY = 'show-findings-badge-for-work-item';

    /** Key that is used to store whether the configuration warning in the work items are displayed */
    public static readonly MINIMIZE_WARNINGS_KEY = 'minimize-warnings';

    /** Key that is used to store whether a Test Gap Badge should be shown in the Work Item View. */
    public static readonly SHOW_TEST_GAP_BADGE_KEY = 'show-test-gap-badge-for-work-item';

     /** Key that is used to store whether a Test Smell Badge should be shown in the Work Item View. */
     public static readonly SHOW_TEST_SMELL_BADGE_KEY = 'show-test-smell-badge-for-work-item';

    /** Key that is used to store the contact email for the TS responsible person. */
    public static readonly EMAIL_CONTACT_KEY = 'email-contact';

    /**  The scope in which the settings are stored. **/
    protected readonly scope: Scope;

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
