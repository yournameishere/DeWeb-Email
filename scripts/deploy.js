const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting DeMailX deployment to Polygon Mumbai Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You might need more MATIC for deployment.");
    console.log("Get free MATIC from: https://faucet.polygon.technology/");
  }

  // Deploy IdentityRegistry
  console.log("\n📝 Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log("✅ IdentityRegistry deployed to:", identityRegistryAddress);

  // Deploy MailRegistry
  console.log("\n📧 Deploying MailRegistry...");
  const MailRegistry = await ethers.getContractFactory("MailRegistry");
  const mailRegistry = await MailRegistry.deploy(identityRegistryAddress);
  await mailRegistry.waitForDeployment();
  const mailRegistryAddress = await mailRegistry.getAddress();
  console.log("✅ MailRegistry deployed to:", mailRegistryAddress);

  // Get deployment transaction details
  const identityTx = identityRegistry.deploymentTransaction();
  const mailTx = mailRegistry.deploymentTransaction();

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      IdentityRegistry: {
        address: identityRegistryAddress,
        deploymentHash: identityTx?.hash,
        gasUsed: identityTx ? (await identityTx.wait()).gasUsed.toString() : "unknown",
      },
      MailRegistry: {
        address: mailRegistryAddress,
        deploymentHash: mailTx?.hash,
        gasUsed: mailTx ? (await mailTx.wait()).gasUsed.toString() : "unknown",
      },
    },
    timestamp: new Date().toISOString(),
    explorerUrls: {
      IdentityRegistry: `https://mumbai.polygonscan.com/address/${identityRegistryAddress}`,
      MailRegistry: `https://mumbai.polygonscan.com/address/${mailRegistryAddress}`,
    }
  };

  console.log("\n=== 🎉 Deployment Summary ===");
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
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);
  
  // Create .env update instructions
  console.log("\n📋 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_IDENTITY_CONTRACT=${identityRegistryAddress}`);
  console.log(`NEXT_PUBLIC_MAIL_CONTRACT=${mailRegistryAddress}`);
  console.log(`NEXT_PUBLIC_NETWORK=mumbai`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=80001`);

  console.log("\n🔗 View contracts on PolygonScan:");
  console.log(`IdentityRegistry: https://mumbai.polygonscan.com/address/${identityRegistryAddress}`);
  console.log(`MailRegistry: https://mumbai.polygonscan.com/address/${mailRegistryAddress}`);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("Your DeMailX contracts are now live on Polygon Mumbai Testnet!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
