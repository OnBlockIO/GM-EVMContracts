// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice OnBlock Vesting Contract
contract OnBlockVesting is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice seconds per day
    uint256 private constant SECONDS_PER_DAY = 86400;
    /// @notice ten years in days
    uint256 private constant TEN_YRS_DAYS = 3650;
    /// @notice ten years in seconds
    uint256 private constant TEN_YRS_SECONDS = TEN_YRS_DAYS * SECONDS_PER_DAY;
    /// @notice max vault fee
    uint256 private constant MAX_VAULT_FEE = 1000000000000000000; // max 1 unit native currency

    /// @notice contract name
    string public constant name = "OnBlockVesting";
    /// @notice contract version
    string public constant version = "v1.0";

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
        // The address to vote on, either a withdraw address or a new voter to be added or existing voter to be removed
        address onVote;
        uint256 newFee;
        // A mapping of all vote results, at least 3/4 of all voters have to vote for the same address
        mapping(address => bytes32) results;
    }

    /// @notice address to votes mapping
    mapping(address => Vote) public votes;

    /// @notice token to vaults mapping
    mapping(IERC20 => Vault) private vaults;

    /// @notice active voters
    address[] public voters;

    /// @notice address to activeVoters mapping
    mapping(address => bool) public activeVoters;

    /// @notice active vaults
    IERC20[] private activeVaults;

    /// @notice id counter
    uint256 private idCounter;

    /// @notice vault fee
    uint256 private vaultFee;

    /// @notice fee sum
    uint256 private feeSum;

    /// @notice min votes for approval
    uint256 private minVotesForApproval;

    // Events
    /// @notice This event is emitted when a vault is created
    /// @param vaultId vault id
    /// @param token token for the vault
    /// @param fee fee for the vault
    event VaultCreated(uint256 vaultId, IERC20 token, uint256 fee);

    /// @notice This event is emitted when a user release some of its tokens
    /// @param vaultId vault id
    /// @param account address that triggered it
    /// @param amount amount of tokens left to release
    /// @param released amount of tokens released
    event Release(uint256 indexed vaultId, address indexed account, uint256 amount, uint256 released);

    /// @notice This event is emitted when a user release all its tokens
    /// @param vaultId vault id
    /// @param account address that triggered it
    /// @param amount amount of tokens left to release
    /// @param released amount of tokens released
    event Fulfilled(uint256 indexed vaultId, address indexed account, uint256 amount, uint256 released);

    /// @notice This event is emitted when vault fee is withdraw
    /// @param initiator user that triggered it
    /// @param receiver address that received fee
    /// @param amount amount of fees withdrawn
    event FeeWithdraw(address initiator, address receiver, uint256 amount);

    /// @notice This event is emitted when vault fee is updated
    /// @param updater user that triggered it
    /// @param newFee new fee
    event FeeUpdated(address updater, uint256 newFee);

    /// @notice This event is emitted when a vote is requested
    /// @param requester user that triggered it
    /// @param onVote address to vote on
    /// @param newFee new fee
    /// @param action action
    event VoteRequested(address requester, address onVote, uint256 newFee, VoteAction action);

    /// @notice This event is emitted when a voter has voted
    /// @param sender user that triggered it
    /// @param onVote address to vote on
    /// @param voteAddress vote address
    /// @param voteFee vote fee
    /// @param action action
    event Voted(address sender, address onVote, address voteAddress, uint256 voteFee, VoteAction action);

    /// @notice This event is emitted when a vote is complete
    /// @param sender user that triggered it
    /// @param voteAddress vote address
    /// @param voteFee vote fee
    /// @param voteCount current vote count
    /// @param minVotes min. vote count
    /// @param action action
    event VoteState(
        address sender,
        address voteAddress,
        uint256 voteFee,
        uint256 voteCount,
        uint256 minVotes,
        VoteAction action
    );

    /// @notice This event is emitted when a beneficiary is added
    /// @param vaultId user that triggered it
    /// @param account amount deposited
    /// @param amount amount of tokens deposited
    /// @param startTime start time
    /// @param duration duration
    /// @param lockType lock type
    event AddedBeneficiary(
        uint256 vaultId,
        address account,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        LockType lockType
    );

    /// @notice Modifier for voting functions
    modifier onlyVoter() {
        require(activeVoters[msg.sender], "Sender is not an active voter");
        _;
    }

    /// @notice Constructor for the contract
    /// @param vaultFee_ vault fee for the contract
    /// @param voters_ voters for the contract
    constructor(uint256 vaultFee_, address[] memory voters_) {
        require(vaultFee_ <= MAX_VAULT_FEE, "Vault fee is too high");
        require(voters_.length >= 4, "Contract needs at least four signers");
        vaultFee = vaultFee_;
        idCounter = 0;
        feeSum = 0;
        voters = voters_;
        uint length = voters.length;
        for (uint i; i < length; ++i) {
            activeVoters[voters[i]] = true;
        }

        // 3/4 need to approve
        minVotesForApproval = (voters.length / 4) * 3;
    }

    /// @notice Fallback
    /// @dev disabled
    fallback() external payable {
        revert("Fallback not supported!");
    }

    /// @notice Receive
    /// @dev disabled
    receive() external payable {
        revert("Receive not supported!");
    }

    /// @notice Return active vaults in the contract
    /// @return active vaults
    function getActiveVaults() external view returns (IERC20[] memory) {
        return activeVaults;
    }

    /// @notice Return vault fee in the contract
    /// @return vault fee
    function getVaultFee() external view returns (uint256) {
        return vaultFee;
    }

    /// @notice Return voter status of an address
    /// @return voter status
    function isVoter(address address_) external view returns (bool) {
        return activeVoters[address_];
    }

    /// @notice Finalize a vote after voting period
    /// @param action action of vote
    /// @param voteAddress address of vote
    /// @param fee fee of vote
    /// @return vote status
    function finalizeVote(VoteAction action, address voteAddress, uint256 fee) private onlyVoter returns (bool) {
        if (action == VoteAction.WITHDRAW || action == VoteAction.ADDVOTER || action == VoteAction.REMOVEVOTER) {
            Vote storage activeVote;
            uint length = voters.length;
            for (uint i; i < length; ++i) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.onVote == voteAddress) {
                    delete votes[voters[i]];
                }
            }
            return true;
        } else if (action == VoteAction.FEEUPDATE) {
            Vote storage activeVote;
            uint length = voters.length;
            for (uint i; i < length; ++i) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.newFee == fee) {
                    delete votes[voters[i]];
                }
            }
            return true;
        }

        return false;
    }

    /// @notice Return vote status of a vote
    /// @param action action of vote
    /// @param voteAddress address of vote
    /// @param fee fee of vote
    /// @return vote status
    function isVoteDone(VoteAction action, address voteAddress, uint256 fee) public onlyVoter returns (bool) {
        uint256 voteResult = 0;
        if (action == VoteAction.WITHDRAW || action == VoteAction.ADDVOTER || action == VoteAction.REMOVEVOTER) {
            bytes memory addressBytes = abi.encode(voteAddress);
            Vote storage activeVote;
            uint length = voters.length;
            for (uint i; i < length; ++i) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.onVote == voteAddress) {
                    for (uint j = 0; j < voters.length; ++j) {
                        if (activeVote.results[voters[j]] == keccak256(addressBytes)) {
                            voteResult += 1;
                        }
                    }
                }
            }

            emit VoteState(msg.sender, voteAddress, 0, voteResult, minVotesForApproval, action);
            return voteResult >= minVotesForApproval;
        } else if (action == VoteAction.FEEUPDATE) {
            bytes memory feeBytes = abi.encode(fee);
            Vote storage activeVote;
            uint length = voters.length;
            for (uint i; i < length; ++i) {
                activeVote = votes[voters[i]];
                if (activeVote.voteType == action && activeVote.newFee == fee) {
                    for (uint j = 0; j < voters.length; ++j) {
                        if (activeVote.results[voters[j]] == keccak256(feeBytes)) {
                            voteResult += 1;
                        }
                    }
                }
            }

            emit VoteState(msg.sender, address(0), fee, voteResult, minVotesForApproval, action);
            return voteResult >= minVotesForApproval;
        }

        return false;
    }

    /// @notice Request a new vote
    /// @param action_ action of vote
    /// @param address_ address of vote
    /// @param newFee_ fee of vote
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

    /// @notice Vote on an existing new vote
    /// @param action_ action of vote
    /// @param creator_ creator of vote
    /// @param address_ address of vote
    /// @param newFee_ fee of vote
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

    /// @notice Set vault fee
    /// @param newFee_ new vault fee to use
    function setVaultFee(uint256 newFee_) external onlyVoter {
        require(newFee_ > 0, "New vault fee has to be > 0");
        require(newFee_ <= MAX_VAULT_FEE, "Vault fee is too high");

        require(isVoteDone(VoteAction.FEEUPDATE, address(0), newFee_), "Vote was not successful yet");

        vaultFee = newFee_;
        emit FeeUpdated(msg.sender, vaultFee);
        finalizeVote(VoteAction.FEEUPDATE, address(0), newFee_);
    }

    /// @notice Withdraw vault fee
    /// @param receiver_ address to receive fees
    function withdrawVaultFee(address payable receiver_) external onlyVoter nonReentrant {
        require(isVoteDone(VoteAction.WITHDRAW, receiver_, 0), "Vote was not successful yet");
        uint256 amount = feeSum;
        feeSum = 0;
        receiver_.transfer(amount);
        emit FeeWithdraw(msg.sender, receiver_, amount);
        finalizeVote(VoteAction.WITHDRAW, receiver_, 0);
    }

    /// @notice Return fee balance
    /// @return fee balance
    function feeBalance() external view returns (uint256) {
        return feeSum;
    }

    /// @notice Create a new vault
    /// @param token_ token to create a vault for
    /// @return vault id
    function createVault(IERC20 token_) external payable returns (uint256) {
        require(vaults[token_].id == 0, "Vault exists already");
        require(msg.value >= vaultFee, "Not enough fee attached");

        feeSum += msg.value;

        // Create new Vault
        Vault storage entity = vaults[token_];
        entity.id = getID();
        entity.token = token_;

        activeVaults.push(token_);

        emit VaultCreated(entity.id, token_, msg.value);
        return entity.id;
    }

    /// @notice Add a beneficiary to a vault
    /// @param token_ token
    /// @param account_ address
    /// @param amount_ amount
    /// @param startTime_ start time
    /// @param duration_ duration
    /// @param cliff_ cliff
    /// @param lockType_ lock type
    function addBeneficiary(
        IERC20 token_,
        address account_,
        uint256 amount_,
        uint256 startTime_,
        uint256 duration_,
        uint256 cliff_,
        LockType lockType_
    ) external {
        addBeneficiary(token_, account_, amount_, startTime_, duration_, cliff_, lockType_, true);
    }

    /// @notice Add a beneficiary to a vault
    /// @param token_ token
    /// @param account_ address
    /// @param amount_ amount
    /// @param startTime_ start time
    /// @param duration_ duration
    /// @param cliff_ cliff
    /// @param lockType_ lock type
    /// @param sanity sanity check
    function addBeneficiary(
        IERC20 token_,
        address account_,
        uint256 amount_,
        uint256 startTime_,
        uint256 duration_,
        uint256 cliff_,
        LockType lockType_,
        bool sanity
    ) public nonReentrant {
        require(vaults[token_].id > 0, "Vault does not exist");
        require(vaults[token_].beneficiaries[account_].account == address(0), "Beneficiary already exists");
        require(startTime_ > block.timestamp, "StartTime has to be in the future ");
        require(amount_ > 0, "Amount has to be > 0");

        // Check the duration for a simple sanity check, if the vesting schedule is > 10 years, make sure the sanity flag is passed.
        if (sanity && duration_ > TEN_YRS_SECONDS) {
            require(duration_ < 3650 days, "Use the overloaded function for lock time greater than 10 years");
        }

        uint256 allowance = token_.allowance(msg.sender, address(this));
        require(allowance >= amount_, "Token allowance check failed");

        uint256 balanceBefore = token_.balanceOf(address(this));

        token_.safeTransferFrom(msg.sender, address(this), amount_);

        uint256 balanceAfter = token_.balanceOf(address(this));

        if (balanceAfter - balanceBefore != amount_) {
            // the token is deflationary, we don't support that.
            revert("Deflationary tokens are not supported!");
        }

        Beneficiary storage beneficiary = getBeneficiary(token_, account_);

        beneficiary.account = account_;
        beneficiary.amount = amount_;
        beneficiary.startTime = startTime_;
        beneficiary.endTime = startTime_ + duration_;
        beneficiary.duration = duration_;
        beneficiary.cliff = startTime_ + cliff_;
        beneficiary.released = 0;
        beneficiary.lockType = lockType_;

        vaults[token_].beneficiaries[account_] = beneficiary;

        emit AddedBeneficiary(
            vaults[token_].id,
            beneficiary.account,
            beneficiary.amount,
            beneficiary.startTime,
            beneficiary.duration,
            beneficiary.lockType
        );
    }

    /// @notice Return beneficiary details
    /// @param token_ token to query
    /// @param account_ address to query
    /// @return beneficiary details
    function getBeneficiary(IERC20 token_, address account_) private view returns (Beneficiary storage) {
        Vault storage entity = vaults[token_];
        Beneficiary storage beneficiary = entity.beneficiaries[account_];
        return beneficiary;
    }

    /// @notice Return current ID
    /// @return current ID
    function getID() private returns (uint256) {
        return ++idCounter;
    }

    /// @notice Return beneficiary details
    /// @param token_ token to query
    /// @param account_ address to query
    /// @return beneficiary details
    function readBeneficiary(IERC20 token_, address account_) external view returns (Beneficiary memory) {
        Vault storage vault = vaults[token_];
        return vault.beneficiaries[account_];
    }

    /// @notice Release token for an account
    /// @param token_ token to release
    /// @param account_ address to use
    function release(IERC20 token_, address account_) external nonReentrant {
        Vault storage vault = vaults[token_];
        Beneficiary storage beneficiary = vault.beneficiaries[account_];

        if (beneficiary.lockType == LockType.FIXED) {
            require(block.timestamp >= beneficiary.endTime, "EndTime not reached yet, try again later");
        }

        uint256 amountToRelease = releasableAmount(token_, account_);

        require(amountToRelease > 0, "Nothing to release");

        token_.safeTransfer(beneficiary.account, amountToRelease);

        beneficiary.released += amountToRelease;

        if (beneficiary.released == beneficiary.amount) {
            emit Fulfilled(vault.id, account_, amountToRelease, beneficiary.released);
            delete vault.beneficiaries[account_];
        } else {
            emit Release(vault.id, account_, amountToRelease, beneficiary.released);
        }
    }

    /// @notice Return releaseable token for an account
    /// @param token_ token to release
    /// @param account_ address to use
    function releasableAmount(IERC20 token_, address account_) public view returns (uint256) {
        Beneficiary storage beneficiary = getBeneficiary(token_, account_);
        return vestedAmount(beneficiary) - beneficiary.released;
    }

    /// @notice Return vested amount for an account
    /// @param beneficiary beneficiary to use
    /// @return vested amount
    function vestedAmount(Beneficiary memory beneficiary) private view returns (uint256) {
        if (block.timestamp < beneficiary.cliff || block.timestamp < beneficiary.startTime) {
            return 0;
        }

        if (block.timestamp >= beneficiary.endTime) {
            return beneficiary.amount;
        }

        if (beneficiary.lockType == LockType.LINEAR) {
            return (beneficiary.amount * (block.timestamp - beneficiary.startTime)) / (beneficiary.duration);
        }

        return 0;
    }
}
