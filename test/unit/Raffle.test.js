const { network, ethers, getNamedAccounts, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", () => {
          let deployer, raffle, vrfCoordinatorV2Mock, raffleEntranceFee, interval
          const chainId = network.config.chainId

          beforeEach(async () => {
              //Deploy our Raffle contract and vrfCoordinatorV2Mock contract using Hardhat Deploy
              deployer = (await getNamedAccounts()).deployer
              //console.log(deployer)
              //console.log(`${deployer} is the Deployer`)
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })
          describe("constructor", () => {
              it("Initializes the raffle correclty", async () => {
                  //Ideally we want our tests to have only assert per "it"
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
                  assert.equal(interval, networkConfig[chainId]["interval"])
              })
          })
          describe("enterRaffle", () => {
              it("reverts when you don't send enough ETH", async () => {
                  //   await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                  //       raffle,
                  //       "Raffle__NotEnoughETHEntered"
                  //   )

                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("records the player when enters into raffle", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerFromContract = await raffle.getPlayer(0)
                  assert.equal(playerFromContract, deployer)
              })
              it("emits an event after entering into raffle", async () => {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("doesn't allow to enter into raffle while calculating", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  // We pretend to be a Chainlink Automation now
                  await raffle.performUpkeep("0x")
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })
          describe("checkUpkeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns false if raffle isn't open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep("0x")
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("returns false if enough time hasn't passed", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) - 2])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(!upkeepNeeded)
              })
              it("returns true if enough time hasn't passed, has players, eth, and is open", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
                  assert(upkeepNeeded)
              })
          })
          describe("performUpkeep", () => {
              it("it can only run if checkUpkeep is true", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const tx = await raffle.performUpkeep("0x")
                  assert(tx)
              })
              it("reverts when checkUpkeep is false", async () => {
                  await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle_UpkeepNotNeed"
                  )
              })
              it("updates the raffle state, emits and event and calls the vrf coordinator", async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
                  const transactionResponse = await raffle.performUpkeep("0x")
                  const transactionReceipt = await transactionResponse.wait(1)
                  const requestId = transactionReceipt.logs[1].args.requestId
                  const raffleState = await raffle.getRaffleState()
                  assert(requestId > 0)
                  assert(raffleState.toString(), "1")
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [Number(interval) + 1])
                  await network.provider.send("evm_mine", [])
              })
              it("can only be called after performUpkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.getAddress())
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.getAddress())
                  ).to.be.revertedWith("nonexistent request")
              })
              // Will be a very big test
              it("picks the winner, resets the lottery and also sends the money to the winner", async () => {
                  const addtionalEntrants = 3
                  const startingAccountIndex = 1 // deployer = 0
                  const accounts = await ethers.getSigners()
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + addtionalEntrants;
                      i++
                  ) {
                      // 1 < 1 + 3
                      // connect the accounts created to raffle contract
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }
                  const startingTimeStamp = await raffle.getLatestTimeStamp()

                  // performUpkeep (mock being chainlink Automation)
                  // fulfillRandomWords (mock being Chainlink VRF)
                  await new Promise(async (resolve, reject) => {
                      raffle.once("WinnerPicked", async () => {
                          //console.log("Found the event!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              //console.log(`Recent Winner is ${recentWinner}`)
                              //   console.log(accounts[0].getAddress())
                              //   console.log(accounts[1].getAddress())
                              //   console.log(accounts[2].getAddress())
                              //   console.log(accounts[3].getAddress())
                              const raffleState = await raffle.getRaffleState()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerEndingBalance = await ethers.provider.getBalance(
                                  accounts[1]
                              )
                              //console.log(`Winner Ending Balance: ${typeof winnerEndingBalance}`)

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimeStamp > startingTimeStamp)
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance +
                                      (raffleEntranceFee * BigInt(addtionalEntrants) +
                                          BigInt(raffleEntranceFee))
                              )
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                          resolve()
                      })

                      //Setting up the listener
                      // below, we will fire the event and listener will pick it up and will resolve()
                      const transactionResponse = await raffle.performUpkeep("0x")
                      const transactionReceipt = await transactionResponse.wait(1)
                      const winnerStartingBalance = await ethers.provider.getBalance(accounts[1])

                      // console.log(`Winner Starting Balance: ${typeof winnerStartingBalance}`)
                      //console.log(`Raffle entranceFee : ${typeof raffleEntranceFee}`)
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          transactionReceipt.logs[1].args.requestId,
                          raffle.getAddress()
                      )
                  })
              })
          })
      })
