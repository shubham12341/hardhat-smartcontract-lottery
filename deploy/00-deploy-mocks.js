const { network } = require("hardhat")
const { developmentChains, BASE_FEE, GASPRICELINK } = require("../helper-hardhat-config")
const { ethers, deployments } = require("hardhat")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    //const chainId = network.config.chainId
    const args = [BASE_FEE, GASPRICELINK]
    if (developmentChains.includes(network.name)) {
        console.log("Local network detected! Deploying mocks...")
        // deploy a mock vrfcoordinator
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args: args,
        })
        console.log("Mocks Deployed!")
        console.log(
            "---------------------------------------------------------------------------------------------------------------",
        )
    }
}
module.exports.tags = ["all", "mocks"]
