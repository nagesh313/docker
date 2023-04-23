const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set OpenShift connection parameters
const openshiftHost = 'your.openshift.cluster.url';
const openshiftToken = 'your.openshift.token';
const openshiftNamespace = 'your-project-name';
const openshiftImageStream = 'my-image';

// Set Docker build parameters
const dockerfile = 'Dockerfile';
const contextPath = '.';
const imageName = 'your-image-registry-host/your-image-repository/my-image';
const dockerBuildArgs = [
  `IMAGE_NAME=${imageName}`
];

async function buildDockerImage() {
  try {
    // Read Dockerfile content
    const dockerfileContent = fs.readFileSync(path.join(contextPath, dockerfile), 'utf-8');

    // Create OpenShift build request
    const buildRequest = {
      kind: 'BinaryBuildRequest',
      apiVersion: 'build.openshift.io/v1',
      metadata: {
        name: openshiftImageStream
      },
      spec: {
        source: {
          binary: {
            asFile: true
          }
        },
        output: {
          to: {
            kind: 'ImageStreamTag',
            name: `${openshiftImageStream}:latest`
          }
        },
        resources: {},
        strategy: {
          type: 'Docker',
          dockerStrategy: {
            dockerfilePath: dockerfile,
            buildArgs: dockerBuildArgs
          }
        }
      }
    };

    // Create OpenShift build
    const buildResponse = await axios.post(`https://${openshiftHost}/apis/build.openshift.io/v1/namespaces/${openshiftNamespace}/buildconfigs/${openshiftImageStream}/instantiatebinary`, buildRequest, {
      headers: {
        'Authorization': `Bearer ${openshiftToken}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    // Stream Docker build output to OpenShift build
    const buildName = buildResponse.data.metadata.name;
    console.log(`Build started: ${buildName}`);
    const buildOutput = fs.createReadStream(path.join(contextPath, 'build.log'));
    buildOutput.pipe(await axios.post(`https://${openshiftHost}/apis/build.openshift.io/v1/namespaces/${openshiftNamespace}/builds/${buildName}/log`, buildOutput, {
      headers: {
        'Authorization': `Bearer ${openshiftToken}`,
        'Content-Type': 'text/plain'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    }));
    console.log('Docker build output streaming started');
  } catch (error) {
    console.error(`Error starting build: ${error}`);
  }
}

buildDockerImage();
