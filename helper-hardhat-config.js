const { ethers } = require("hardhat")

const networkConfig = {
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        interval: "30",
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "9593",
        callbackGasLimit: "500000",
        interval: "30",
    },
    // 5: {
    //     name: "georli",
    //     ethUsdpriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    // },
}

const developmentChains = ["hardhat", "localhost"]
const BASE_FEE = ethers.parseEther("0.25") // 0.25 is the premium. It cost 0.25 LINK per request
const GASPRICELINK = 1e9 //link per gas. Calculated value based on the gas price of the chain
// Eth price skyrocktes $1,000,000,000
// Chainlink nodes pay the gas fees to give us the randomness & do external execution
// So the price of requests changes bases on the price of the gas
module.exports = {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GASPRICELINK,
}
