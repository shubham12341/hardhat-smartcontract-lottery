const { ethers } = require("hardhat")
async function enterRaffle() {
    const raffle = await ethers.getContract("Raffle")
    const entranceFee = await raffle.getEntranceFee()
    const TransactionResponse = await raffle.enterRaffle({ value: entranceFee })
    const transactionReceipt = await TransactionResponse.wait(2)
    console.log(TransactionResponse.hash)
    console.log("Entered into Raffle!")
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
