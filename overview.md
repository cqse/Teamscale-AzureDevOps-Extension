The Teamscale DevOps Extension was designed to integrate results of Source Code Analyses and Test Analyses of a [Teamscale](https://www.teamscale.com/) Instance to Azure DevOps and provides a build step that uploads coverage recorded during test execution or other reports in the build to a Teamscale server.

This Extension works with Azure DevOps Service as well as with Azure DevOps Server (on premise installation).

# Integration of Teamscale Analyses in Azure DevOps

Analyses results are integrated into
* Azure DevOps Work Items as Test Gap- and Findings Churn Badges
* Azure DevOps Dashboards as Dashboard Widget

## Work Item Integration
If development in the project is done Work Item (Ticket) based, you can get an overview over how many Teamscale Findings are introduced with a Work Item and if testing information is available. Additionally you can see how thoroughly changes are tested.

![Teamscale Azure DevOps Work Item Integration](images/overview/ados-ts-work-item-integration.png)

## Dashboard Widget
The Dashboard Widget can be configured to display a Findings Churn Badge and a Test Gap Badge for the corresponding Azure DevOps project.
Integration into the dashboard gives a quick overview over how the project evolved since a specfic baseline or for the last days or months.

![Teamscale Azure DevOps Dashboard Integration](images/overview/dashboard-integration.png)

# Upload coverage or other reports to Teamscale
Coverage or other reports that are created during the build can be uploaded to Teamscale for further analysis.
Add the Task "Teamscale Report Uploader" to the build and fill in the configuration form. Be sure the Teamscale server is reachable from your Build Agent.

![Report Upload Build Pipeline Task](images/overview/report-upload-build-pipeline-task.png)

# Setup
After installing this extension it can be configured on the Organization as well as the Project level.

The configuration page can be reached from the lower left corner of Azure DevOps, showing either "Organization Settings" or "Project Settings". Choose "Extensions" -> "Teamscale" in the middle bar.

## Organization settings
You can define a "Contact e-mail address" here, which will appear to users in case of connectivity issues or other problems regarding the Teamscale Extension.

## Project settings
Add the address of your Teamscale server here. For the integration in Work Items, specify the name of the Teamscale project for the current Azure DevOps project.

In some development environments a separate Teamscale server is operated for the Test Gap Analysis (TGA) in addition to a Teamscale server for the static source code analysis. Then you can specify the second Teamscale server for TGA here.

More than one project can be specified in the "Project" field, in case an Azure DevOps projects matches to more than one Teamscale project. Information is then gathered, starting from the first project in the list to the other ones and retrieved from the first Teamscale project which contains relevant information. 

![Project Settings](images/overview/project-settings.png)
