/**
 * Class representing a specific setting for the Teamscale Azure DevOps extension. Each setting object consists of
 * the setting's key and the default value to be used in case the setting has not been configured.
 */
export class ExtensionSetting {

    /** Key that is used to store the Teamscale Server url. */
    public static readonly TEAMSCALE_URL = new ExtensionSetting('teamscale-url', '');

    /** Key that is used to store the Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TEAMSCALE_PROJECTS = new ExtensionSetting('teamscale-project', '[]');

    /**
     *  Key that is used to store whether a separate Teamscale Server should be used for retrieving information
     *  of Test Gap Analysis.
     */
    public static readonly USE_SEPARATE_TEST_GAP_SERVER = new ExtensionSetting('use-separate-test-gap-sever', 'false');

    /** Key that is used to store the separate TGA Teamscale Server url. */
    public static readonly TGA_TEAMSCALE_URL = new ExtensionSetting('tga-teamscale-url', '');

    /** Key that is used to store the separate Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TGA_TEAMSCALE_PROJECTS = new ExtensionSetting('tga-teamscale-project', '[]');
    /**
     *  Key that is used to store whether a separate Teamscale Server should be used for retrieving information
     *  of Test Smell Analysis.
     */
    public static readonly USE_SEPARATE_TEST_SMELL_SERVER = new ExtensionSetting('use-separate-test-smell-sever', 'false');

    /** Key that is used to store the separate TSA Teamscale Server url. */
    public static readonly TSA_TEAMSCALE_URL = new ExtensionSetting('tsa-teamscale-url', '');

    /** Key that is used to store the separate Teamscale Project list which belongs to the Azure DevOps project. */
    public static readonly TSA_TEAMSCALE_PROJECTS = new ExtensionSetting('tsa-teamscale-project','[]');

    /** Key that is used to store whether a Findings Badge should be shown in the Work Item View. */
    public static readonly SHOW_FINDINGS_BADGE = new ExtensionSetting('show-findings-badge-for-work-item', 'false');

    /** Key that is used to store for which work item types the findings badge should be shown in the Work Item View. */
    public static readonly FINDINGS_BADGE_TYPES = new ExtensionSetting('findings-badge-work-item-types', '[]');

    /** Key that is used to store whether a Test Gap Badge should be shown in the Work Item View. */
    public static readonly SHOW_TEST_GAP_BADGE = new ExtensionSetting('show-test-gap-badge-for-work-item', 'false');

    /** Key that is used to store for which work item types the test gap badge should be shown in the Work Item View. */
    public static readonly TEST_GAP_BADGE_TYPES = new ExtensionSetting('tga-badge-work-item-types', '[]');

    /** Key that is used to store whether a Test Smell Badge should be shown in the Work Item View. */
    public static readonly SHOW_TEST_SMELL_BADGE = new ExtensionSetting('show-test-smell-badge-for-work-item', 'false');

    /** Key that is used to store for which work item types the test smell badge should be shown in the Work Item View. */
    public static readonly TEST_SMELL_BADGE_TYPES = new ExtensionSetting('tsa-badge-work-item-types', '[]');

    /** Key that is used to store whether the configuration warning in the work items are displayed */
    public static readonly MINIMIZE_WARNINGS = new ExtensionSetting('minimize-warnings', 'false');

    /** Key that is used to store the contact email for the TS responsible person. */
    public static readonly EMAIL_CONTACT = new ExtensionSetting('email-contact', '');

    public constructor(public readonly key: string, public readonly defaultValue: string) {
    }


}