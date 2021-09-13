// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";                                             
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";                                             


/**
 *
 * @dev A generic vesting contract.
 *
 */
contract OnBlockVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    uint256 constant SECONDS_PER_DAY = 86400;
    uint256 constant TEN_YRS_DAYS = 3650; // CKP-12
    uint256 constant TEN_YRS_SECONDS = TEN_YRS_DAYS * SECONDS_PER_DAY;
    uint256 constant MAX_VAULT_FEE = 90000000; // TODO change to a realistic number


    string constant public name = "OnBlockVesting"; // CKP-07
    string constant public version = "v0.1"; // CKP-07

    enum LockType {
        FIXED,
        LINEAR
    }

    enum VoteAction {
        WITHDRAW,
        ADDVOTER,
        REMOVEVOTER,
        FEEUPDATE
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

    struct Vote {

        VoteAction voteType;

        // The address to vote on, either a withdraw address or a new voter to be added or exisiting voter to be removed
        address onVote;

        uint256 newFee;

        // A mapping of all vote results, at least 3/4 of all voters have to vote for the same address 
        mapping(address => bytes32) results;
    }

    // votes 
    mapping(address => Vote) public votes;

    // Mapping to hold all vaults
    mapping(IERC20 => Vault) private vaults;

    // active voters
    address[] public voters;
    mapping(address => bool) activeVoters;

    // Array to track all active token vaults
    IERC20[] private activeVaults;

    // Globals
    uint256 private ID_COUNTER;
    uint256 private VAULT_FEE;
    uint256 private FEE_SUM;

    uint256 private MIN_VOTES_FOR_APPROVAL;

    // Events
    event Debug(string arg1);
    event Debug2(string arg1, bytes32 arg2, bytes32 arg3);
    event Debug3(uint256 arg1, uint256 arg2);
    event VaultCreated(uint256 vaultId, IERC20 token, uint256 fee);
    event Release(uint256 vaultId, address account, uint256 amount, uint256 released);
    event FeeWithdraw(address initiator, address receiver, uint256 amount);
    event FeeUpdated(address updater, uint256 newFee);
    event VoteRequested(address requester, address onVote, uint256 newFee, VoteAction action);
    event Voted(address sender, address onVote, address voteAddress, uint256 voteFee, VoteAction action);
    event VoteState(address sender, address voteAddress, uint256 voteFee, uint256 voteCount, uint256 minVotes, VoteAction action);
    event AddedBeneficiary(uint256 vaultId, address account, uint256 amount, uint256 startTime, uint256 duration,
                           LockType lockType);

    modifier onlyVoter() {
        require(activeVoters[msg.sender], "Sender is not an active voter");
        _;
    }

    constructor(uint256 vaultFee_, address[] memory voters_) {
        require(VAULT_FEE <= MAX_VAULT_FEE, 'Vault fee is too high'); // CKP-01
        require(voters_.length >= 4, 'Contract needs at least four signers');
        VAULT_FEE = vaultFee_;
        ID_COUNTER = 0;
        FEE_SUM = 0;
        voters = voters_;
        for (uint i = 0; i < voters.length; i++) {
            activeVoters[voters[i]] = true;
        }

        // 3/4 need to approve
        MIN_VOTES_FOR_APPROVAL = voters.length / 4 * 3;
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

    function getActiveVaults() external view returns (IERC20[] memory) { // CKP-06
        return activeVaults;
    }

    function getVaultFee() external view returns (uint256) { // CKP-06
        return VAULT_FEE;
    }

    function isVoter(address address_) external view returns (bool) {
        return activeVoters[address_];
    }

    function finalizeVote(VoteAction action, address voteAddress, uint256 fee) private onlyVoter returns (bool) {
        if (action == VoteAction.WITHDRAW || action == VoteAction.ADDVOTER || action == VoteAction.REMOVEVOTER) {
            Vote storage activeVote;
            for (uint i = 0; i < voters.length; i++) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.onVote == voteAddress) {
                    delete votes[voters[i]];
                }
            }
            return true;

        } else if (action == VoteAction.FEEUPDATE) {
            Vote storage activeVote;
            for (uint i = 0; i < voters.length; i++) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.newFee == fee) {
                    delete votes[voters[i]];
                }
            }
            return true;
        }

        return false;
    }

    function isVoteDone(VoteAction action, address voteAddress, uint256 fee) public onlyVoter returns (bool) {
        uint256 voteResult = 0;
        if (action == VoteAction.WITHDRAW || action == VoteAction.ADDVOTER || action == VoteAction.REMOVEVOTER) {
            bytes memory addressBytes = abi.encode(voteAddress);
            Vote storage activeVote;
            for (uint i = 0; i < voters.length; i++) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.onVote == voteAddress) {
                    for (uint j = 0; j < voters.length; j++) {
                        emit Debug2("good", activeVote.results[voters[j]], keccak256(addressBytes));
                        if (activeVote.results[voters[j]] == keccak256(addressBytes)) {
                            voteResult += 1;
                        }
                    }
                }
            }

            emit VoteState(msg.sender, voteAddress, 0, voteResult, MIN_VOTES_FOR_APPROVAL, action);
            return voteResult >= MIN_VOTES_FOR_APPROVAL;

        } else if (action == VoteAction.FEEUPDATE) {
            bytes memory feeBytes = abi.encode(fee);
            Vote storage activeVote;
            for (uint i = 0; i < voters.length; i++) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.newFee == fee) {
                    for (uint j = 0; j < voters.length; j++) {
                        if (activeVote.results[voters[j]] == keccak256(feeBytes)) {
                            voteResult += 1;
                        }
                    }
                }
            }

            emit VoteState(msg.sender, address(0), fee, voteResult, MIN_VOTES_FOR_APPROVAL, action);
            return voteResult >= MIN_VOTES_FOR_APPROVAL;
        }

        return false;
    }

    function requestVote(VoteAction action_, address address_, uint256 newFee_) external onlyVoter {
        // Setup the vote
        Vote storage entity = votes[msg.sender];
        entity.onVote = address_;
        entity.newFee = newFee_;
        entity.voteType = action_;

        if (entity.voteType == VoteAction.FEEUPDATE) {
            bytes memory feeBytes = abi.encode(newFee_);
            entity.results[msg.sender] = keccak256(feeBytes);
        } else {
            // Vote creator is the first voter
            bytes memory addressBytes = abi.encode(address_);
            entity.results[msg.sender] = keccak256(addressBytes);
        }

        emit VoteRequested(msg.sender, entity.onVote, entity.newFee, entity.voteType);
    }

    function vote(VoteAction action_, address creator_, address address_, uint256 newFee_) external onlyVoter {

        // Get the vote, key is the vote creators address
        Vote storage entity = votes[creator_];

        if (entity.voteType == action_) {

            if (entity.voteType == VoteAction.FEEUPDATE) {
                bytes memory feeBytes = abi.encode(newFee_);
                entity.results[msg.sender] = keccak256(feeBytes);
            } else {
                // Vote creator is the first voter
                bytes memory addressBytes = abi.encode(address_);
                entity.results[msg.sender] = keccak256(addressBytes);
            }
        }

        emit Voted(msg.sender, entity.onVote, address_, newFee_, entity.voteType);
    }

    function setVaultFee(uint256 newFee_) public onlyVoter { // CKP-06
        require(newFee_ > 0, 'New vault fee has to be > 0');
        require(newFee_ <= MAX_VAULT_FEE, ' Vault fee is too high'); // CKP-01

        require(isVoteDone(VoteAction.FEEUPDATE, address(0), newFee_), "Vote was not successful yet");

        VAULT_FEE = newFee_;
        emit FeeUpdated(msg.sender, VAULT_FEE); // CKP-09
        finalizeVote(VoteAction.FEEUPDATE, address(0), newFee_);
    }

    function withdrawVaultFee(address payable receiver_) external onlyVoter nonReentrant { // CKP-06 // CKP-16
        require(isVoteDone(VoteAction.WITHDRAW, receiver_, 0), "Vote was not successful yet");
        receiver_.transfer(FEE_SUM);
        emit FeeWithdraw(msg.sender, receiver_, FEE_SUM);
        FEE_SUM = 0;
        finalizeVote(VoteAction.WITHDRAW, receiver_, 0);
    }

    function feeBalance() external view returns (uint256) { // CKP-06
        return FEE_SUM;
    }

    function createVault(IERC20 token_) external payable returns (uint256) { // CKP-06
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
                           uint256 cliff_, LockType lockType_) external { // CKP-06
        addBeneficiary(token_, account_, amount_, startTime_, duration_, cliff_, lockType_, true); // CKP-11
    }

    function addBeneficiary(IERC20 token_, address account_, uint256 amount_, uint256 startTime_, uint256 duration_, 
                           uint256 cliff_, LockType lockType_, bool sanity) public nonReentrant { // CKP-03
        require(vaults[token_].id > 0, "Vault does not exist"); // CKP-05
        require(startTime_ > block.timestamp, "StartTime has to be in the future ");
        require(amount_ > 0, "Amount has to be > 0");

        uint256 allowance = token_.allowance(msg.sender, address(this));
        require(allowance >= amount_, "Token allowance check failed");

        token_.safeTransferFrom(msg.sender, address(this), amount_);

        uint256 endTime = startTime_ .add(duration_);

        // Calculate the duration for a simple sanity check, if the vesting schedule is > 10 years, make sure the sanity flag is passed.
        uint256 vestingDuration_ = endTime - startTime_; // CKP-10
        if (sanity && vestingDuration_ > TEN_YRS_SECONDS) {
            require(vestingDuration_ < 3650 days, "If you are sure to have a lock time greater than  10 years use the overloaded function");
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

    function readBeneficiary(IERC20 token_, address account_) external view returns (Beneficiary memory) { // CKP-06
        Vault storage vault = vaults[token_];
        return vault.beneficiaries[account_];
    }

    /**
     * @notice Transfers tokens held by the vault to the beneficiary.
     */
    function release(IERC20 token_, address account_) external nonReentrant { // CKP-06 // CKP-08 //CKP-13
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
