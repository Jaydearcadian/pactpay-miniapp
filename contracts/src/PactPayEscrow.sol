// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract PactPayEscrow {
    enum Status {
        None,
        Funded,
        Accepted,
        Submitted,
        RevisionRequested,
        Disputed,
        Settled,
        Refunded
    }

    struct CreateContributionParams {
        bytes32 contributionId;
        bytes32 outcomeId;
        bytes32 termsHash;
        address contributor;
        address resolver;
        address token;
        uint256 amount;
        uint64 deliveryDeadline;
        uint32 reviewPeriod;
    }

    struct Contribution {
        bytes32 outcomeId;
        bytes32 termsHash;
        bytes32 evidenceHash;
        address coordinator;
        address contributor;
        address resolver;
        address token;
        uint256 amount;
        uint64 deliveryDeadline;
        uint64 submittedAt;
        uint32 reviewPeriod;
        uint8 revisionCount;
        Status status;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidReviewPeriod();
    error ContributionExists();
    error ContributionNotFound();
    error InvalidStatus(Status expected, Status actual);
    error Unauthorized();
    error DeadlinePassed();
    error DeadlineNotReached();
    error ReviewStillOpen();
    error ReviewExpired();
    error RevisionLimitReached();
    error InvalidEvidence();
    error TokenTransferFailed();
    error Reentrancy();

    event ContributionFunded(
        bytes32 indexed contributionId,
        bytes32 indexed outcomeId,
        address indexed coordinator,
        address contributor,
        address token,
        uint256 amount
    );
    event ContributionPolicyCommitted(
        bytes32 indexed contributionId,
        bytes32 indexed termsHash,
        address indexed resolver,
        uint64 deliveryDeadline,
        uint32 reviewPeriod
    );
    event ContributionAccepted(bytes32 indexed contributionId, address indexed contributor);
    event EvidenceSubmitted(bytes32 indexed contributionId, bytes32 indexed evidenceHash, uint64 submittedAt, uint8 revisionCount);
    event RevisionRequested(bytes32 indexed contributionId, uint8 revisionCount);
    event ContributionDisputed(bytes32 indexed contributionId, address indexed raisedBy);
    event ContributionSettled(bytes32 indexed contributionId, address indexed contributor, uint256 amount);
    event ContributionRefunded(bytes32 indexed contributionId, address indexed coordinator, uint256 amount);

    mapping(bytes32 => Contribution) private _contributions;
    uint256 private _locked = 1;

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    function createAndFundContribution(CreateContributionParams calldata params) external nonReentrant {
        if (
            params.contributionId == bytes32(0) ||
            params.outcomeId == bytes32(0) ||
            params.termsHash == bytes32(0)
        ) revert InvalidEvidence();

        if (
            params.contributor == address(0) ||
            params.resolver == address(0) ||
            params.token == address(0)
        ) revert InvalidAddress();

        if (
            params.contributor == msg.sender ||
            params.resolver == msg.sender ||
            params.resolver == params.contributor
        ) revert InvalidAddress();

        if (params.amount == 0) revert InvalidAmount();
        if (params.deliveryDeadline <= block.timestamp) revert InvalidDeadline();
        if (params.reviewPeriod < 1 hours || params.reviewPeriod > 30 days) revert InvalidReviewPeriod();
        if (_contributions[params.contributionId].status != Status.None) revert ContributionExists();

        _contributions[params.contributionId] = Contribution({
            outcomeId: params.outcomeId,
            termsHash: params.termsHash,
            evidenceHash: bytes32(0),
            coordinator: msg.sender,
            contributor: params.contributor,
            resolver: params.resolver,
            token: params.token,
            amount: params.amount,
            deliveryDeadline: params.deliveryDeadline,
            submittedAt: 0,
            reviewPeriod: params.reviewPeriod,
            revisionCount: 0,
            status: Status.Funded
        });

        _safeTransferFrom(params.token, msg.sender, address(this), params.amount);

        emit ContributionFunded(
            params.contributionId,
            params.outcomeId,
            msg.sender,
            params.contributor,
            params.token,
            params.amount
        );
        emit ContributionPolicyCommitted(
            params.contributionId,
            params.termsHash,
            params.resolver,
            params.deliveryDeadline,
            params.reviewPeriod
        );
    }

    function acceptContribution(bytes32 contributionId, bytes32 acceptedTermsHash) external {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Funded);
        if (msg.sender != contribution.contributor) revert Unauthorized();
        if (block.timestamp > contribution.deliveryDeadline) revert DeadlinePassed();
        if (acceptedTermsHash != contribution.termsHash) revert InvalidEvidence();

        contribution.status = Status.Accepted;
        emit ContributionAccepted(contributionId, msg.sender);
    }

    function submitEvidence(bytes32 contributionId, bytes32 evidenceHash) external {
        Contribution storage contribution = _get(contributionId);
        if (msg.sender != contribution.contributor) revert Unauthorized();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();
        if (block.timestamp > contribution.deliveryDeadline) revert DeadlinePassed();

        Status current = contribution.status;
        if (current != Status.Accepted && current != Status.RevisionRequested) {
            revert InvalidStatus(Status.Accepted, current);
        }

        contribution.evidenceHash = evidenceHash;
        contribution.submittedAt = uint64(block.timestamp);
        contribution.status = Status.Submitted;

        emit EvidenceSubmitted(contributionId, evidenceHash, contribution.submittedAt, contribution.revisionCount);
    }

    function requestRevision(bytes32 contributionId) external {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Submitted);
        if (msg.sender != contribution.coordinator) revert Unauthorized();
        if (_reviewExpired(contribution)) revert ReviewExpired();
        if (contribution.revisionCount >= 1) revert RevisionLimitReached();

        contribution.revisionCount = 1;
        contribution.status = Status.RevisionRequested;
        emit RevisionRequested(contributionId, contribution.revisionCount);
    }

    function approveAndRelease(bytes32 contributionId) external nonReentrant {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Submitted);
        if (msg.sender != contribution.coordinator) revert Unauthorized();
        _settle(contributionId, contribution);
    }

    function claimAfterReviewTimeout(bytes32 contributionId) external nonReentrant {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Submitted);
        if (msg.sender != contribution.contributor) revert Unauthorized();
        if (!_reviewExpired(contribution)) revert ReviewStillOpen();
        _settle(contributionId, contribution);
    }

    function raiseDispute(bytes32 contributionId) external {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Submitted);
        if (msg.sender != contribution.coordinator && msg.sender != contribution.contributor) revert Unauthorized();
        if (_reviewExpired(contribution)) revert ReviewExpired();

        contribution.status = Status.Disputed;
        emit ContributionDisputed(contributionId, msg.sender);
    }

    function resolveDispute(bytes32 contributionId, bool releaseToContributor) external nonReentrant {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Disputed);
        if (msg.sender != contribution.resolver) revert Unauthorized();

        if (releaseToContributor) {
            _settle(contributionId, contribution);
        } else {
            _refund(contributionId, contribution);
        }
    }

    function refundUnaccepted(bytes32 contributionId) external nonReentrant {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Funded);
        if (msg.sender != contribution.coordinator) revert Unauthorized();
        if (block.timestamp <= contribution.deliveryDeadline) revert DeadlineNotReached();
        _refund(contributionId, contribution);
    }

    function refundNoSubmission(bytes32 contributionId) external nonReentrant {
        Contribution storage contribution = _get(contributionId);
        _requireStatus(contribution, Status.Accepted);
        if (msg.sender != contribution.coordinator) revert Unauthorized();
        if (block.timestamp <= contribution.deliveryDeadline) revert DeadlineNotReached();
        _refund(contributionId, contribution);
    }

    function getContribution(bytes32 contributionId) external view returns (Contribution memory) {
        return _get(contributionId);
    }

    function reviewDeadline(bytes32 contributionId) external view returns (uint256) {
        Contribution storage contribution = _get(contributionId);
        if (contribution.submittedAt == 0) return 0;
        return uint256(contribution.submittedAt) + uint256(contribution.reviewPeriod);
    }

    function _settle(bytes32 contributionId, Contribution storage contribution) private {
        uint256 amount = contribution.amount;
        address token = contribution.token;
        address recipient = contribution.contributor;

        contribution.status = Status.Settled;
        _safeTransfer(token, recipient, amount);
        emit ContributionSettled(contributionId, recipient, amount);
    }

    function _refund(bytes32 contributionId, Contribution storage contribution) private {
        uint256 amount = contribution.amount;
        address token = contribution.token;
        address recipient = contribution.coordinator;

        contribution.status = Status.Refunded;
        _safeTransfer(token, recipient, amount);
        emit ContributionRefunded(contributionId, recipient, amount);
    }

    function _reviewExpired(Contribution storage contribution) private view returns (bool) {
        return block.timestamp > uint256(contribution.submittedAt) + uint256(contribution.reviewPeriod);
    }

    function _get(bytes32 contributionId) private view returns (Contribution storage contribution) {
        contribution = _contributions[contributionId];
        if (contribution.status == Status.None) revert ContributionNotFound();
    }

    function _requireStatus(Contribution storage contribution, Status expected) private view {
        if (contribution.status != expected) revert InvalidStatus(expected, contribution.status);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, amount)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }
}
