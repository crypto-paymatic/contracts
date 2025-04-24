import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import PaymaticModule from "../ignition/modules/PaymaticPayments";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { PaymaticPayments, PaymaticToken } from "../typechain-types";

type SetupResponse = {
  account1: HardhatEthersSigner,
  account2: HardhatEthersSigner,
  account3: HardhatEthersSigner,
  paymaticOwner: HardhatEthersSigner,
  paymaticPayments: PaymaticPayments,
  token: PaymaticToken
};

describe("PaymaticPayments", function () {

  async function setup(): Promise<SetupResponse> {
    const [account1, account2, account3] = await hre.ethers.getSigners();
    const paymaticOwner = await hre.ethers.getImpersonatedSigner("0x992cb39afb1f08695da091Fa639c6dE883195c3B");
    await setBalance(paymaticOwner.address, BigInt("1000000000000000000"))
    const token = await hre.ethers.deployContract("PaymaticToken");
    const { paymaticPayments } = (await hre.ignition.deploy(PaymaticModule)) as unknown as { paymaticPayments: PaymaticPayments };
    return { account1, account2, account3, paymaticOwner, paymaticPayments, token };
  }

  it('should revert create payment if amount is 0', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    await expect(paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), 0)).to.revertedWithCustomError(paymaticPayments, "AmountShouldBeGreaterThanZero");
  });

  it('should reject payment if sends to zero address', async () => {
    const { account1, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    await expect(paymaticPayments.connect(account1).createERC20Payment(ethers.ZeroAddress, await token.getAddress(), transferValue)).to.be.revertedWithCustomError(paymaticPayments, "InvalidAddress");
  });

  it('should revert create payment with custom timelock if amount is 0', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    await expect(paymaticPayments.connect(account1).createERC20PaymentWithTimeLock(account2, await token.getAddress(), 0, 500)).to.revertedWithCustomError(paymaticPayments, "AmountShouldBeGreaterThanZero");
  });

  it('should reject payment with custom timelock if sends to zero address', async () => {
    const { account1, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    await expect(paymaticPayments.connect(account1).createERC20PaymentWithTimeLock(ethers.ZeroAddress, await token.getAddress(), transferValue, 500)).to.be.revertedWithCustomError(paymaticPayments, "InvalidAddress");
  });

  it('should revert if sending more than balance', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const accountTokenBalance = await token.balanceOf(account1.address);
    await expect(paymaticPayments.connect(account1).createERC20Payment(account2.address, await token.getAddress(), accountTokenBalance+BigInt(100))).to.be.revertedWithCustomError(paymaticPayments, "NotEnoughTokenBalance");
  });

  it('should revert if sending more than allowed', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    await expect(paymaticPayments.connect(account1).createERC20Payment(account2.address, await token.getAddress(), transferValue+BigInt(100))).to.be.revertedWithCustomError(paymaticPayments, "NotEnoughTokenAllowance");
  });

  it("happy path e2e", async function () {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const account1Balance = await token.balanceOf(await account1.getAddress());
    expect(account1Balance).to.be.eq(ethers.toBigInt("500000000000000000000000000"));
    const account2Balance = await token.balanceOf(await account2.getAddress());
    expect(account2Balance).to.be.eq(ethers.toBigInt("0"));
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    const settleTx = await paymaticPayments.connect(account2).settlePayment(1);
    await settleTx.wait();
    const account1BalanceAfterSettlement = await token.balanceOf(await account1.getAddress());
    expect(account1BalanceAfterSettlement).to.be.eq(ethers.toBigInt("500000000000000000000000000"));
    const account2BalanceAfterSettlement = await token.balanceOf(await account2.getAddress());
    expect(account2BalanceAfterSettlement).to.be.eq(ethers.toBigInt("500000000000000000000000000") - feeAmount);
  });

  it("happy path e2e with custom timelock", async function () {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000")
    const customTimeLock = ethers.toBigInt("500")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20PaymentWithTimeLock(account2, await token.getAddress(), transferValue, customTimeLock);
    await result.wait();
    const account1Balance = await token.balanceOf(await account1.getAddress());
    expect(account1Balance).to.be.eq(ethers.toBigInt("500000000000000000000000000"));
    const account2Balance = await token.balanceOf(await account2.getAddress());
    expect(account2Balance).to.be.eq(ethers.toBigInt("0"));
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    await expect(paymaticPayments.connect(account2).settlePayment(1)).to.be.revertedWithCustomError(paymaticPayments, "PaymentTimelocked");
    await hre.network.provider.send("evm_increaseTime", [500-121]);
    await hre.network.provider.send("evm_mine");
    const settleTx = await paymaticPayments.connect(account2).settlePayment(1);
    await settleTx.wait();
    const account1BalanceAfterSettlement = await token.balanceOf(await account1.getAddress());
    expect(account1BalanceAfterSettlement).to.be.eq(transferValue);
    const account2BalanceAfterSettlement = await token.balanceOf(await account2.getAddress());
    expect(account2BalanceAfterSettlement).to.be.eq(transferValue - feeAmount);
  });

  it("should revert if not enough time passed", async function () {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const account1Balance = await token.balanceOf(await account1.getAddress());
    expect(account1Balance).to.be.eq(ethers.toBigInt("500000000000000000000000000"));
    const account2Balance = await token.balanceOf(await account2.getAddress());
    expect(account2Balance).to.be.eq(ethers.toBigInt("0"));
    await hre.network.provider.send("evm_increaseTime", [80]);
    await hre.network.provider.send("evm_mine");
    await expect(paymaticPayments.connect(account2).settlePayment(1)).to.be.revertedWithCustomError(paymaticPayments, "PaymentTimelocked");
  });

  it('should reject attempt to stole money', async () => {
    const { account1, account2, account3, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    await expect(paymaticPayments.connect(account3).settlePayment(1)).to.be.revertedWithCustomError(paymaticPayments, "NotPaymentRecipient");
  });

  it('should reject attempt to cancel payment if not sender', async () => {
    const { account1, account2, account3, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    await expect(paymaticPayments.connect(account3).cancelPayment(1)).to.be.revertedWithCustomError(paymaticPayments, "NotPaymentSender");
  });

  it('should cancel payment', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const cancelResult = await paymaticPayments.connect(account1).cancelPayment(1);
    await cancelResult.wait();
    const payment = await paymaticPayments.getPaymentDetails(1);
    expect(payment[5]).to.eq(3);
  });

  it('should revert canceling  if payment not existed', async () => {
    const { account1, paymaticPayments } = await setup();
    await expect(paymaticPayments.connect(account1).cancelPayment(10)).to.revertedWithCustomError(paymaticPayments, "PaymentNotFound");
  });

  it('should revert settle if payment not existed', async () => {
    const { account1, paymaticPayments } = await setup();
    await expect(paymaticPayments.connect(account1).settlePayment(10)).to.revertedWithCustomError(paymaticPayments, "PaymentNotFound");
  });
  
  it('should revert cancel if payment satteled', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    const settleResult = await paymaticPayments.connect(account2).settlePayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(account1).cancelPayment(1)).to.revertedWithCustomError(paymaticPayments, 'PaymentShouldBeInCreatedState');
  });

  it('should revert cancel if payment canceled', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const settleResult = await paymaticPayments.connect(account1).cancelPayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(account1).cancelPayment(1)).to.revertedWithCustomError(paymaticPayments, 'PaymentShouldBeInCreatedState');
  });

  it('should revert settle if payment satteled', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    const settleResult = await paymaticPayments.connect(account2).settlePayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(account2).settlePayment(1)).to.revertedWithCustomError(paymaticPayments, 'PaymentShouldBeInCreatedState');
  });

  it('should revert settle if payment canceled', async () => {
    const { account1, account2, paymaticPayments, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const settleResult = await paymaticPayments.connect(account1).cancelPayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(account2).settlePayment(1)).to.revertedWithCustomError(paymaticPayments, 'PaymentShouldBeInCreatedState');
  });

  it('owner should set fee value', async () => {
    const { paymaticPayments, paymaticOwner } = await setup();
    const currentFee = await paymaticPayments.getFeeValue();
    expect(currentFee).to.not.eq(100);
    const result = await paymaticPayments.connect(paymaticOwner).setFeeValue(100);
    await result.wait();
    const newFee = await paymaticPayments.getFeeValue();
    expect(newFee).to.eq(100);
  });

  it('non owner should not set fee value', async () => {
    const { paymaticPayments, account1 } = await setup();
    await expect(paymaticPayments.connect(account1).setFeeValue(100)).to.revertedWithCustomError(paymaticPayments, "OwnableUnauthorizedAccount");
  });

  it('should create free payment if feeValue is zero', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    const result = await paymaticPayments.connect(paymaticOwner).setFeeValue(0);
    await result.wait();
    const newFee = await paymaticPayments.getFeeValue();
    expect(newFee).to.eq(0);
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const res1 = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await res1.wait();
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const res2 = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await res2.wait();
  });

  it('owner should set fee recipient', async () => {
    const { token, account1, account2, account3, paymaticPayments, paymaticOwner } = await setup();
    const feeValue = await paymaticPayments.getFeeValue();
    expect(feeValue).to.be.gt(0);
    const setRecipientTx = await paymaticPayments.connect(paymaticOwner).setFeeRecipient(account3.address);
    await setRecipientTx.wait();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000");
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const res1 = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await res1.wait();
    expect(await token.balanceOf(account3.address)).to.be.eq(feeAmount);
  });

  it('non owner should not set fee recipient', async () => {
    const { paymaticPayments, account1 } = await setup();
    await expect(paymaticPayments.connect(account1).setFeeRecipient(account1.address)).to.revertedWithCustomError(paymaticPayments, "OwnableUnauthorizedAccount");
  });

  it('owner should be able to pause and unpause', async () => {
    const { paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    const tx = await paymaticPayments.connect(paymaticOwner).unPause();
    await tx.wait();
    expect(await paymaticPayments.paused()).to.not.be.true;
  });

  it('non owner should not be able to pause', async () => {
    const { paymaticPayments, account1 } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    await expect(paymaticPayments.connect(account1).pause()).to.revertedWithCustomError(paymaticPayments, "OwnableUnauthorizedAccount");
    expect(await paymaticPayments.paused()).to.not.be.true;
  });

  it('non owner should not be able to unpause', async () => {
    const { paymaticPayments, paymaticOwner, account1 } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    await expect(paymaticPayments.connect(account1).unPause()).to.revertedWithCustomError(paymaticPayments, "OwnableUnauthorizedAccount");
    expect(await paymaticPayments.paused()).to.be.true;
  });

  it('should not create payment when paused', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    await expect(paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue)).to.revertedWithCustomError(paymaticPayments, "EnforcedPause");
  });

  it('should not create payment with custom timelock when paused', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    await expect(paymaticPayments.connect(account1).createERC20PaymentWithTimeLock(account2, await token.getAddress(), transferValue, 500)).to.revertedWithCustomError(paymaticPayments, "EnforcedPause");
  });

  it('should settle payment even if paused', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000");
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const createPaymentTx = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await createPaymentTx.wait();
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    const account2Balance = await token.balanceOf(account2.address);
    const expectedBalanceAfterSettle = account2Balance+transferValue-feeAmount;
    expect(account2Balance).to.not.eq(expectedBalanceAfterSettle);
    expect(account2Balance).to.be.lt(expectedBalanceAfterSettle);
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    const settleTx = await paymaticPayments.connect(account2).settlePayment(1);
    await settleTx.wait();
    expect(await token.balanceOf(account2.address)).to.be.eq(expectedBalanceAfterSettle);
  });

  it('should cancel payment even if paused', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000");
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const createPaymentTx = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await createPaymentTx.wait();
    const result = await paymaticPayments.connect(paymaticOwner).pause();
    await result.wait();
    expect(await paymaticPayments.paused()).to.be.true;
    const account1Balance = await token.balanceOf(account1.address);
    const expectedBalanceAfterCancel = account1Balance+transferValue-feeAmount;
    expect(account1Balance).to.not.eq(expectedBalanceAfterCancel);
    expect(account1Balance).to.be.lt(expectedBalanceAfterCancel);
    const settleTx = await paymaticPayments.connect(account1).cancelPayment(1);
    await settleTx.wait();
    expect(await token.balanceOf(account1.address)).to.be.eq(expectedBalanceAfterCancel);
  });

  it('owner should be able cancel any payments', async () => {
    const { token, account1, account2, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    const feeAmount = transferValue * ethers.toBigInt("300") / ethers.toBigInt("1000");
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const createPaymentTx = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await createPaymentTx.wait();
    const account1Balance = await token.balanceOf(account1.address);
    const expectedBalanceAfterCancel = account1Balance+transferValue-feeAmount;
    expect(account1Balance).to.not.eq(expectedBalanceAfterCancel);
    expect(account1Balance).to.be.lt(expectedBalanceAfterCancel);
    const cancelTx = await paymaticPayments.connect(paymaticOwner).emergencyCancelPayment(1);
    await cancelTx.wait();
    expect(await token.balanceOf(account1.address)).to.be.eq(expectedBalanceAfterCancel);
  });

  it('non owner should not be able cancel any payments', async () => {
    const { token, account1, account2, account3, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const createPaymentTx = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await createPaymentTx.wait();
    const account1Balance = await token.balanceOf(account1.address);
    const notExpectedBalanceAfterCancel = account1Balance+transferValue;
    expect(account1Balance).to.not.eq(notExpectedBalanceAfterCancel);
    expect(account1Balance).to.be.lt(notExpectedBalanceAfterCancel);
    await expect(paymaticPayments.connect(account3).emergencyCancelPayment(1)).to.revertedWithCustomError(paymaticPayments, "OwnableUnauthorizedAccount");
    expect(await token.balanceOf(account1.address)).to.not.be.eq(notExpectedBalanceAfterCancel);
    expect(await token.balanceOf(account1.address)).to.be.eq(account1Balance);
  });

  it('owner should be able cancel non existed payments', async () => {
    const { paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.paused()).to.not.be.true;
    await expect(paymaticPayments.connect(paymaticOwner).emergencyCancelPayment(1)).to.revertedWithCustomError(paymaticPayments, "PaymentNotFound");
  });

  it('should revert emergency cancel if payment satteled', async () => {
    const { account1, account2, paymaticPayments, paymaticOwner, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    await hre.network.provider.send("evm_increaseTime", [121]);
    await hre.network.provider.send("evm_mine");
    const settleResult = await paymaticPayments.connect(account2).settlePayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(paymaticOwner).emergencyCancelPayment(1)).to.revertedWithCustomError(paymaticPayments, "PaymentShouldBeInCreatedState");
  });

  it('should revert emergency cancel if payment canceled', async () => {
    const { account1, account2, paymaticPayments, paymaticOwner, token } = await setup();
    const transferValue = ethers.toBigInt("500000000000000000000000000")
    await token.approve(paymaticPayments.getAddress(), transferValue)
    const result = await paymaticPayments.connect(account1).createERC20Payment(account2, await token.getAddress(), transferValue);
    await result.wait();
    const settleResult = await paymaticPayments.connect(account1).cancelPayment(1);
    await settleResult.wait();
    await expect(paymaticPayments.connect(paymaticOwner).emergencyCancelPayment(1)).to.revertedWithCustomError(paymaticPayments, "PaymentShouldBeInCreatedState");
  });

  it('should return proper fee recipient', async () => {
    const { account1, paymaticPayments, paymaticOwner } = await setup();
    expect(await paymaticPayments.getFeeRecipient()).to.be.eq(paymaticOwner.address);
    const changeRecipientTx = await paymaticPayments.connect(paymaticOwner).setFeeRecipient(account1.address);
    await changeRecipientTx.wait();
    expect(await paymaticPayments.getFeeRecipient()).to.be.eq(account1.address);
  });
});
