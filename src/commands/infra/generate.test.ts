import fs, { chmod } from "fs";
import path from "path";
import { loadConfigurationFromLocalEnv, readYaml } from "../../config";
import {
  disableVerboseLogging,
  enableVerboseLogging,
  logger
} from "../../logger";
import { IInfraConfigYaml } from "../../types";
import {
  checkTfvars,
  dirIteration,
  generateTfvars,
  validateDefinition,
  validateRemoteSource,
  validateTemplateSources
} from "./generate";

beforeAll(() => {
  enableVerboseLogging();
  jest.setTimeout(10000);
});

afterAll(() => {
  disableVerboseLogging();
  jest.setTimeout(5000);
});

describe("Validate sources in definition.yaml files", () => {
  test("Validating that a provided project folder contains definition.yaml files with valid source, version, and template", async () => {
    const mockParentPath = "src/commands/infra/mocks/discovery-service";
    let mockProjectPath = "src/commands/infra/mocks/discovery-service/west";
    const expectedArrayWest = [
      "A",
      "https://github.com/Microsoft/bedrock",
      "cluster/environments/azure-single-keyvault",
      "v0.12.0"
    ];
    let sourceConfiguration = await validateDefinition(
      mockParentPath,
      mockProjectPath
    );
    let returnArray = await validateTemplateSources(
      sourceConfiguration,
      path.join(mockParentPath, `definition.yaml`),
      path.join(mockProjectPath, `definition.yaml`)
    );
    expect(returnArray).toEqual(expectedArrayWest);

    mockProjectPath = "src/commands/infra/mocks/discovery-service/east";
    const expectedArrayEast = [
      "B",
      "https://github.com/Microsoft/bedrock",
      "cluster/environments/azure-single-keyvault",
      "v0.12.0"
    ];
    sourceConfiguration = await validateDefinition(
      mockParentPath,
      mockProjectPath
    );
    returnArray = await validateTemplateSources(
      sourceConfiguration,
      path.join(mockParentPath, `definition.yaml`),
      path.join(mockProjectPath, `definition.yaml`)
    );

    expect(returnArray).toEqual(expectedArrayEast);
  });
});

describe("Validate replacement of variables between parent and leaf definitions", () => {
  test("Validating that leaf definitions take precedence when generating multi-cluster definitions", async () => {
    const mockParentPath = "src/commands/infra/mocks/discovery-service";
    const mockProjectPath = "src/commands/infra/mocks/discovery-service/west";
    const finalArray = [
      'acr_enabled = "true"',
      'address_space = "<insert value>"',
      'agent_vm_count = "<insert value>"',
      'agent_vm_size = "<insert value>"',
      'cluster_name = "discovery-service-west"',
      'dns_prefix = "<insert value>"',
      'flux_recreate = "<insert value>"',
      'kubeconfig_recreate = "<insert value>"',
      'gc_enabled = "true"',
      'gitops_poll_interval = "5m"',
      'gitops_ssh_url = "<insert value>"',
      'gitops_url_branch = "master"',
      'gitops_ssh_key = "<insert value>"',
      'gitops_path = "<insert value>"',
      'keyvault_name = "<insert value>"',
      'keyvault_resource_group = "<insert value>"',
      'resource_group_name = "<insert value>"',
      'ssh_public_key = "<insert value>"',
      'service_principal_id = "<insert value>"',
      'service_principal_secret = "<insert value>"',
      'subnet_prefixes = "<insert value>"',
      'vnet_name = "<insert value>"',
      'subnet_name = "<insert value>"',
      'network_plugin = "azure"',
      'network_policy = "azure"',
      'oms_agent_enabled = "false"',
      'enable_acr = "false"',
      'acr_name = "<insert value>"'
    ];
    const parentData = readYaml<IInfraConfigYaml>(
      path.join(mockParentPath, "definition.yaml")
    );
    const parentInfraConfig: any = loadConfigurationFromLocalEnv(
      parentData || {}
    );
    const leafData = readYaml<IInfraConfigYaml>(
      path.join(mockProjectPath, "definition.yaml")
    );
    const leafInfraConfig: any = loadConfigurationFromLocalEnv(leafData || {});
    const finalDefinition = await dirIteration(
      parentInfraConfig.variables,
      leafInfraConfig.variables
    );
    const combinedSpkTfvarsObject = await generateTfvars(finalDefinition);
    expect(combinedSpkTfvarsObject).toStrictEqual(finalArray);
  });
});

describe("Validate spk.tfvars file", () => {
  test("Validating that a spk.tfvars is generated and has appropriate format", async () => {
    const mockProjectPath = "src/commands/infra/mocks/discovery-service";
    const data = readYaml<IInfraConfigYaml>(
      path.join(mockProjectPath, `definition.yaml`)
    );
    const infraConfig = loadConfigurationFromLocalEnv(data);
    const spkTfvarsObject = await generateTfvars(infraConfig.variables);
    expect(spkTfvarsObject).toContain('gitops_poll_interval = "5m"');
  });
});

describe("Validate backend.tfvars file", () => {
  test("Validating that a backend.tfvars is generated and has appropriate format", async () => {
    const mockProjectPath = "src/commands/infra/mocks/discovery-service";
    const data = readYaml<IInfraConfigYaml>(
      path.join(mockProjectPath, `definition.yaml`)
    );
    const infraConfig = loadConfigurationFromLocalEnv(data);
    const backendTfvarsObject = await generateTfvars(infraConfig.backend);
    expect(backendTfvarsObject).toContain(
      'storage_account_name = "storage-account-name"'
    );
  });
});
