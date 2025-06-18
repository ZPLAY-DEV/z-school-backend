import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { IAwsConfig, IRdbConfig } from 'src/common/interfaces';

export const getAwsDatabaseConfig = async (
  awsConfig: IAwsConfig,
): Promise<IRdbConfig> => {
  console.log("✅✅✅✅✅ this shouldn't be called");
  const client = new SecretsManagerClient({
    region: awsConfig.defaultRegion,
    endpoint: awsConfig.secretsManagerEndpoint,
  });
  const getSecretValues = new GetSecretValueCommand({
    SecretId: awsConfig.secretsDbArn,
  });
  const { SecretString } = await client.send(getSecretValues);
  if (!SecretString) throw new Error('Secret string is undefined');

  return JSON.parse(SecretString) as IRdbConfig;
};
