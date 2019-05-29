Plugin for Azure DevOps that provides

- Extension for the WorkItems pages to show a TestGap badge
- Pipeline Task to upload coverage, findings, and other reports to Teamscale

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

To run the unit tests:

```bash
npm test
```

You can test the pipeline task against <https://cqse.visualstudio.com/AzureDevOps-Plugin-Test> which is also hosted on
[our demo instance](https://demo.teamscale.com). This project also contains a pipeline with our build task.

- Publish the extension as described below
- Go to <https://cqse.visualstudio.com>
- Go to _Organization Settings > Extensions_
- Uninstall the extension and then reinstall it

# Publishing

To publish to our Azure DevOps space for testing:

Create a file called `token` containing an access token with Marketplace publishing rights for our space.

```bash
npm run test-publish
```

