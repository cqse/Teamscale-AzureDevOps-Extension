#!/usr/bin/env bash
sed -i 's/"id": "teamscale-azure-devops-plugin",/"id": "teamscale-azure-devops-plugin-test3",/' vss-extension.json
sed -i 's/"public": true,/"public": false,/' vss-extension.json
sed -i 's/"id": "FA6BEEDE-4FE1-11E9-8D71-071835DA2614",/"id": "8e8b64dc-cc55-4bd1-85da-7b5fde8efea3",/' reportUploadTask/task.json
