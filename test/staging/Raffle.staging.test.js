const { network, ethers, getNamedAccounts, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", () => {
          let deployer, raffle, raffleEntranceFee
          //const chainId = network.config.chainId

          beforeEach(async () => {
              //Deploy our Raffle contract using Hardhat Deploy
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fufillRandomWords", () => {
              it("works with live Chainlink VRF and Chainlink Automation, and we gets a Random winnder", async () => {
                  //Here we only need to enter into Raffle rest all will do Chainlink VRF and Chainlink Automation
                  // get the startingTimeStamp
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          console.log("Winner Picked event is fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              console.log(`Recent Winner is : ${recentWinner}`)
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[0]
                              )
                              console.log(`Winner Ending Balance : ${winnerEndingBalance}`)
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              //add our asserts here
                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance + raffleEntranceFee
                              )

                              // assert.equal(recentWinner.toString(), accounts[0].getAddress())
                              assert.equal(endingTimeStamp > startingTimeStamp)
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                          resolve()
                      })
                      //Then we're entering into the raffle
                      console.log("Entering Raffle...")

                      const transactionResponse = await raffle.enterRaffle({
                          value: raffleEntranceFee,
                      })
                      const transactionReceipt = transactionResponse.wait(2)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[0])
                      console.log(`Winner Starting Balance : ${winnerStartingBalance}`)

                      // This code won't complete until the whole Promise resolves
                  })
              })
          })
      })
