// SPDX-License-Identifier: BSL-1.0
pragma solidity ^0.8.27;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract PaymaticPayments is Ownable2Step, Pausable {
    enum PaymentStatus {
        Default,
        Created,
        Settled,
        Canceled
    }

    struct Payment {
        uint256 id;
        address from;
        address to;
        address token;
        uint256 amount;
        PaymentStatus status;
        uint256 unlockTime;
    }

    event EventPaymentStatusChangeCreated(
        uint256 id,
        address from,
        address to,
        address token,
        uint256 amount,
        uint256 unlockTime
    );
    event EventPaymentStatusChangeSettled(uint256 id);
    event EventPaymentStatusChangeCanceled(uint256 id);
    event EventPaymentStatusChangeCanceledEmergency(uint256 id);
    event FeeRecipientChanged(address newRecipient);
    event FeeValueChanged(uint256 newFeeValue);

    error PaymentNotFound();
    error AmountShouldBeGreaterThanZero();
    error InvalidAddress();
    error PaymentShouldBeInCreatedState();
    error PaymentTimelocked();
    error NotPaymentSender();
    error NotPaymentRecipient();
    error NotEnoughProtocolFees();
    error ProtocolFeeDistributionError();
    error NotEnoughTokenBalance();
    error NotEnoughTokenAllowance();

    modifier paymentExists(uint256 paymentId) {
        if (payments[paymentId].status == PaymentStatus.Default) {
            revert PaymentNotFound();
        }
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) {
            revert AmountShouldBeGreaterThanZero();
        }
        _;
    }

    modifier validAddress(address adr) {
        if (adr == address(0)) {
            revert InvalidAddress();
        }
        _;
    }

    modifier paymentCreatedStatus(uint256 paymentId) {
        if (payments[paymentId].status != PaymentStatus.Created) {
            revert PaymentShouldBeInCreatedState();
        }
        _;
    }

    modifier paymentUnlocked(uint256 paymentId) {
        if (payments[paymentId].unlockTime > block.timestamp) {
            revert PaymentTimelocked();
        }
        _;
    }

    modifier paymentSender(uint256 paymentId) {
        if (payments[paymentId].from != msg.sender) {
            revert NotPaymentSender();
        }
        _;
    }

    modifier paymentReceiver(uint256 paymentId) {
        if (payments[paymentId].to != msg.sender) {
            revert NotPaymentRecipient();
        }
        _;
    }

    address private feeRecipient;
    uint256 private feeValue;
    uint256 private idCounter = 0;
    mapping(uint256 => Payment) private payments;

    uint256 public constant DEFAULT_TIMELOCK = 120; // 2 minutes

    constructor(address initialOwner) Ownable(initialOwner) {
        feeRecipient = initialOwner;
        feeValue = 300;

        emit FeeRecipientChanged(initialOwner);
        emit FeeValueChanged(feeValue);
    }

    function getFeeValue() external view returns (uint256) {
        return feeValue;
    }

    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }

    function getPaymentDetails(uint256 id) external view returns (Payment memory) {
        return payments[id];
    }

    function _processFee(uint256 amount) internal returns (uint256 feeAmount, uint256 paymentAmount) {
        feeAmount = amount * feeValue / 100000;
        paymentAmount = amount - feeAmount;
    }

    function createERC20Payment(
        address to,
        address tokenAddress,
        uint256 amount
    ) external whenNotPaused validAmount(amount) validAddress(to) {
        _createERC20Payment(to, tokenAddress, amount, DEFAULT_TIMELOCK);
    }

    function createERC20PaymentWithTimeLock(
        address to,
        address tokenAddress,
        uint256 amount,
        uint256 timelockPeriod
    ) external whenNotPaused validAmount(amount) validAddress(to) {
        _createERC20Payment(to, tokenAddress, amount, timelockPeriod);
    }

    function _createERC20Payment(
        address to,
        address tokenAddress,
        uint256 amount,
        uint256 timelockPeriod
    ) internal {
        ERC20 token = ERC20(tokenAddress);

        uint256 balance = token.balanceOf(msg.sender);

        if (amount > balance) {
            revert NotEnoughTokenBalance();
        }

        uint256 allowance = token.allowance(msg.sender, address(this));

        if (amount > allowance) {
            revert NotEnoughTokenAllowance();
        }

        (uint256 feeAmount, uint256 paymentAmount) = _processFee(amount);

        idCounter++;

        payments[idCounter].id = idCounter;
        payments[idCounter].from = msg.sender;
        payments[idCounter].to = to;
        payments[idCounter].token = tokenAddress;
        payments[idCounter].amount = paymentAmount;
        payments[idCounter].status = PaymentStatus.Created;
        payments[idCounter].unlockTime = block.timestamp + timelockPeriod;

        SafeERC20.safeTransferFrom(token, msg.sender, address(this), amount);

        SafeERC20.safeTransfer(token, feeRecipient, feeAmount);

        emit EventPaymentStatusChangeCreated(
            idCounter,
            msg.sender,
            to,
            tokenAddress,
            paymentAmount,
            payments[idCounter].unlockTime
        );
    }

    function _cancelPayment(uint256 id) internal paymentExists(id) paymentCreatedStatus(id) {
        Payment memory payment = payments[id];

        payments[id].status = PaymentStatus.Canceled;

        ERC20 token = ERC20(payment.token);
        SafeERC20.safeTransfer(token, payment.from, payment.amount);

        emit EventPaymentStatusChangeCanceled(id);
    }

    function cancelPayment(uint256 id) external paymentExists(id) paymentSender(id) {
        _cancelPayment(id);
    }

    function settlePayment(
        uint256 id
    ) external paymentExists(id) paymentReceiver(id) paymentCreatedStatus(id) paymentUnlocked(id) {
        Payment memory payment = payments[id];

        payments[id].status = PaymentStatus.Settled;

        ERC20 token = ERC20(payment.token);
        SafeERC20.safeTransfer(token, payment.to, payment.amount);

        emit EventPaymentStatusChangeSettled(id);
    }

    // OWNER API

    function pause() external onlyOwner {
        _pause();
    }

    function unPause() external onlyOwner {
        _unpause();
    }

    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        feeRecipient = newFeeRecipient;
        emit FeeRecipientChanged(newFeeRecipient);
    }

    function setFeeValue(uint256 newFeeValue) external onlyOwner {
        feeValue = newFeeValue;
        emit FeeValueChanged(newFeeValue);
    }

    function emergencyCancelPayment(uint256 id) external onlyOwner {
        _cancelPayment(id);

        emit EventPaymentStatusChangeCanceledEmergency(id);
    }
}
