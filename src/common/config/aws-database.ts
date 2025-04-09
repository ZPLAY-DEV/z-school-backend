import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { IAwsConfig, IDatabaseConfig } from 'src/common/interfaces';

export const getAwsDatabaseConfig = async (
  awsConfig: IAwsConfig,
): Promise<IDatabaseConfig> => {
  const client = new SecretsManagerClient({
    region: awsConfig.defaultRegion,
  });
  const command = new GetSecretValueCommand({
    SecretId: awsConfig.dbSecretsArn,
  });
  const { SecretString } = await client.send(command);
  if (!SecretString) throw new Error('Secret string is undefined');
  return JSON.parse(SecretString) as IDatabaseConfig;
};
