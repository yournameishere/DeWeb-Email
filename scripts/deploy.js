const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy IdentityRegistry
  console.log("\nDeploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry deployed to:", identityRegistryAddress);

  // Deploy MailRegistry
  console.log("\nDeploying MailRegistry...");
  const MailRegistry = await ethers.getContractFactory("MailRegistry");
  const mailRegistry = await MailRegistry.deploy(identityRegistryAddress);
  await mailRegistry.waitForDeployment();
  const mailRegistryAddress = await mailRegistry.getAddress();
  console.log("MailRegistry deployed to:", mailRegistryAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      IdentityRegistry: {
        address: identityRegistryAddress,
        deploymentHash: identityRegistry.deploymentTransaction()?.hash,
      },
      MailRegistry: {
        address: mailRegistryAddress,
        deploymentHash: mailRegistry.deploymentTransaction()?.hash,
      },
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\nDeployment info saved to: ${deploymentFile}`);
  
  // Verify contracts on Etherscan (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await identityRegistry.deploymentTransaction()?.wait(5);
    await mailRegistry.deploymentTransaction()?.wait(5);

    console.log("Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: identityRegistryAddress,
        constructorArguments: [],
      });
      console.log("IdentityRegistry verified!");
    } catch (error) {
      console.log("IdentityRegistry verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: mailRegistryAddress,
        constructorArguments: [identityRegistryAddress],
      });
      console.log("MailRegistry verified!");
    } catch (error) {
      console.log("MailRegistry verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
