const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { ethers, deployments } = require("hardhat")
const { verify } = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("3")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Mock, raffle, vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        // await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.getAddress())
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress()
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        //console.log(transactionReceipt)
        //console.log(transactionReceipt.logs[0].args.subId)
        subscriptionId = transactionReceipt.logs[0].args.subId
        // Fund the Subcription
        // You would need the Link token on a real Network
        // On  development chain we will just provide manually
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]
    console.log("Deploying on Sepolia Testnet...")
    raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (developmentChains.includes(network.name)) {
        //console.log("Adding raffle contract as consumer")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
        //console.log(`Consumer ${vrfCoordinatorV2Mock.address} added!`)
    }
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying...")
        await verify(raffle.address, args)
        console.log("Successfully verified Contract!...")
    }
    console.log(
        "---------------------------------------------------------------------------------------------------------------"
    )
}

module.exports.tags = ["all", "raffle"]
