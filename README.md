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

You can test the pipeline task against <https://cqse.visualstudio.com/CSharpWithTests> which is also hosted on
[our demo instance](https://demo.teamscale.com).

# Publishing

To publish to our Azure DevOps space for testing:

Create a file called `token` containing an access token with Marketplace publishing rights for our space.

```bash
npm run test-publish
```

