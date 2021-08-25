// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";                                             


/**
 *
 * @dev A generic vesting contract.
 *
 */
contract OnBlockVestingOrig is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    uint256 constant SECONDS_PER_DAY = 86400;
    uint256 constant TEN_YRS_DAYS = 3560;
    uint256 constant TEN_YRS_SECONDS = TEN_YRS_DAYS * SECONDS_PER_DAY;

    string public name = "OnBlockVesting";
    string public version = "v0.1";

    enum LockType {
        FIXED,
        LINEAR
    }

    struct Beneficiary {
        // the receiving address of the beneficiary
        address account;

        // the amount to receive
        uint256 amount;

        // released amount
        uint256 released;

        // start timestamp
        uint256 startTime;

        // end timestamp
        uint256 endTime;

        // duration in days
        uint256 duration;

        // cliff timestamp
        uint256 cliff;
        
        // lock type
        LockType lockType;
    }

    struct Vault {
        // the vault id
        uint256 id;

        // The token to be locked
        IERC20 token;

        // A mapping of all beneficiaries
        mapping(address => Beneficiary) beneficiaries;
    }

    // Mapping to hold all vaults
    mapping(IERC20 => Vault) private vaults;

    // Array to track all active token vaults
    IERC20[] private activeVaults;

    // Globals
    uint256 private ID_COUNTER;
    uint256 private VAULT_FEE;
    uint256 private FEE_SUM;

    // Events
    event VaultCreated(uint256 vaultId, IERC20 token, uint256 fee);
    event Release(uint256 vaultId, address account, uint256 amount, uint256 released);
    event FeeWithdraw(address initiator, address receiver, uint256 amount);
    event AddedBeneficiary(uint256 vaultId, address account, uint256 amount, uint256 startTime, uint256 duration,
                           LockType lockType);

    constructor(uint256 vaultFee_) {
        VAULT_FEE = vaultFee_;
        ID_COUNTER = 0;
        FEE_SUM = 0;
    }

    /*
     * fallback and receive functions to disable
     * direct transfers to the contract
    */

    fallback () external payable {
        revert();
    }

    receive() external payable {
        revert();
    }

    function getActiveVaults() public view returns (IERC20[] memory) {
        return activeVaults;
    }

    function getVaultFee() public view returns (uint256) {
        return VAULT_FEE;
    }

    function setVaultFee(uint256 newFee_) public onlyOwner {
        require(newFee_ > 0, 'New vault fee has to be > 0');
        VAULT_FEE = newFee_;
    }

    function withdrawVaultFee(address payable receiver_) public onlyOwner {
        receiver_.transfer(FEE_SUM);
        emit FeeWithdraw(msg.sender, receiver_, FEE_SUM);
        FEE_SUM = 0;
    }

    function feeBalance() public view returns (uint256) {
        return FEE_SUM;
    }

    function createVault(IERC20 token_) public payable returns (uint256) {
        require(vaults[token_].id == 0, "Vault exists already");
        require(msg.value >= VAULT_FEE, "No fee attached");

        FEE_SUM += msg.value;

        // Create new Vault
        Vault storage entity = vaults[token_];
        entity.id = getID();
        entity.token = token_;

        activeVaults.push(token_);

        emit VaultCreated(entity.id, token_, msg.value);
        return entity.id;
    }

    function addBeneficiary(IERC20 token_, address account_, uint256 amount_, uint256 startTime_, uint256 duration_, 
                           uint256 cliff_, LockType lockType_) public {
        addBeneficiary(token_, account_, amount_, startTime_, duration_, cliff_, lockType_, false);
    }

    function addBeneficiary(IERC20 token_, address account_, uint256 amount_, uint256 startTime_, uint256 duration_, 
                           uint256 cliff_, LockType lockType_, bool sanity) public {
        require(vaults[token_].id > 0, "Vault exists already!");
        require(startTime_ > block.timestamp, "StartTime has to be in the future");
        require(amount_ > 0, "Amount has to be > 0");

        uint256 allowance = token_.allowance(msg.sender, address(this));
        require(allowance >= amount_, "Token allowance check failed");

        token_.safeTransferFrom(msg.sender, address(this), amount_);

        uint256 endTime = startTime_ .add(duration_);

        // Calculate the diff for a simple sanity check, if the vesting schedule is > 10 years, make sure the sanity flag is passed.
        uint256 diff = endTime - startTime_;
        if (sanity && diff > TEN_YRS_SECONDS) {
            require(diff < 3650 days, "If you are sure to have a lock time greater than  10 years use the overloaded function");
        }

        Beneficiary storage beneficiary = getBeneficiary(token_, account_);

        beneficiary.account = account_;
        beneficiary.amount = amount_;
        beneficiary.startTime = startTime_;
        beneficiary.endTime = endTime;
        beneficiary.duration = duration_;
        beneficiary.cliff = startTime_.add(cliff_);
        beneficiary.released = 0;
        beneficiary.lockType = lockType_;

        vaults[token_].beneficiaries[account_] = beneficiary;

        emit AddedBeneficiary(vaults[token_].id, beneficiary.account, beneficiary.amount, beneficiary.startTime,
                              beneficiary.duration, beneficiary.lockType);
    }

    function getBeneficiary(IERC20 token_, address account_) private view returns (Beneficiary storage) {
        Vault storage entity = vaults[token_];
        Beneficiary storage beneficiary = entity.beneficiaries[account_];
        return beneficiary;
    }

    function getID() private returns(uint256) {
        return ++ID_COUNTER;
    }

    function readBeneficiary(IERC20 token_, address account_) public view returns (Beneficiary memory) {
        Vault storage vault = vaults[token_];
        return vault.beneficiaries[account_];
    }

    /**
     * @notice Transfers tokens held by the vault to the beneficiary.
     */
    function release(IERC20 token_, address account_) public virtual {
        Vault storage vault = vaults[token_];
        Beneficiary storage beneficiary = vault.beneficiaries[account_];

        if (beneficiary.lockType == LockType.FIXED) {
            require(block.timestamp >= beneficiary.endTime, "EndTime not reached yet, try again later");
        }

        uint256 amountToRelease = releasableAmount(token_, account_);

        require(amountToRelease > 0, "Nothing to release");

        token_.safeTransfer(beneficiary.account, amountToRelease);

        beneficiary.released += amountToRelease;

        emit Release(vault.id, account_, amountToRelease, beneficiary.released);
    }

    /**
     * @notice Returns the releaseable amount per vault/address.
     */
    function releasableAmount(IERC20 token_, address account_) public view returns (uint256) {
        Beneficiary storage beneficiary = getBeneficiary(token_, account_);
        return vestedAmount(beneficiary).sub(beneficiary.released);
    }

    /**
     * @notice Calculates the vested amount based on the beneficiaries parameters..
     */
    function vestedAmount(Beneficiary memory beneficiary) private view returns (uint256) {
        if (block.timestamp < beneficiary.cliff || block.timestamp < beneficiary.startTime) {
            return 0;
        } 

        if (block.timestamp >= beneficiary.endTime) {
            return beneficiary.amount;
        }

        if (beneficiary.lockType == LockType.LINEAR) {
            return beneficiary.amount.mul(block.timestamp.sub(beneficiary.startTime)).div(beneficiary.duration);
        }

        return 0;
    }
}
