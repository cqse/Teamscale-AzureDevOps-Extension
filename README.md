Plugin for Azure DevOps that provides

- Extension for the WorkItems pages to show a TestGap badge (targets JS in the browser)
- Pipeline Task to upload coverage, findings, and other reports to Teamscale (located in [reportUploadTask](./reportUploadTask), targets NodeJS)

# Building

We recommend editing with VS Code.

To compile the code:

```bash
npm run build
```

To package as a .vsix:

```bash
npm run package
```

# Testing

## Unit Tests

To run all unit tests:

```bash
npm test
```

## Manual Tests

You can also manually test the pipeline task by using the Azure DevOps project <https://cqse.visualstudio.com/AzureDevOps-Plugin-Test> which is also included in
[our demo instance](https://demo.teamscale.com).
This project contains a pipeline with our build task.
Configure this task for your manual test and run it.

- Change the name of the extension in ./vss-extension.json to `teamscale-azure-devops-plugin-test`.
- Change the `public` to `false` in ./vss-extension.json.
- Make sure that the version number in ./vss-extension.json is larger than the one used on the Marketplace
- Change the ID of the pipeline task in ./reportUploadTask/task.json to `8e8b64dc-cc55-4bd1-85da-7b5fde8efea2`.
- Run `npm run package` to create a .vsix package.
- Go to <https://marketplace.visualstudio.com/manage/publishers/cqsegmbh>.
- Right-click the **private** version of the Teamscale DevOps extension.
- Select _update_.
- Upload your .vsix package.
- Right-click the private version of the Teamscale DevOps extension and go to the Marketplace and install it.
- **Make sure not to commit the changes you made to ./vss-extension.json and ./reportUploadTask/task.json**

# Publishing

To publish the extension publicly, first obtain an access token for our Azure DevOps space.
Log into <https://cqse.visualstudio.com>, then click _User settings_ (icon in the navigation bar) > _Personal access tokens_.
Create a token with these settings:

- Organization: *All accessible organizations*
- all permissions for Marketplace (you need to click _show all scopes_ for this to show up)

Then, create a file called `token` containing this access token.


Before publishing, please update the CHANGELOG.md file and choose a proper version number based on semantic versioning.
Then, enter that number in both package.json and vss-extension.json in the corresponding `version` fields.

```bash
npm run publish
```

This will make the built package publicly available on the Marketplace.

# Distributed Binaries

We distribute both [teamscale-upload](https://github.com/cqse/teamscale-upload) and CodeCoverage.exe with this extension to make it work "out of the box" without additional dependencies.

Use [fetch_dependencies.sh](./reportUploadTask/fetch_dependencies.sh) to update the CodeCoverage.exe in the repo.

