// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PactPayEscrow.sol";
import "./MockERC20.sol";
import "./FeeOnTransferERC20.sol";

contract PactPayEscrowTest is Test {
    PactPayEscrow internal escrow;
    MockERC20 internal token;

    address internal coordinator = address(0xA11CE);
    address internal contributor = address(0xB0B);
    address internal resolver = address(0xCAFE);

    bytes32 internal constant CONTRIBUTION_ID = keccak256("contribution-1");
    bytes32 internal constant OUTCOME_ID = keccak256("outcome-1");
    bytes32 internal constant TERMS_HASH = keccak256("terms-v1");
    bytes32 internal constant EVIDENCE_HASH = keccak256("evidence-v1");

    uint256 internal constant AMOUNT = 1_000e6;
    uint32 internal constant REVIEW_PERIOD = 48 hours;

    function setUp() public {
        escrow = new PactPayEscrow();
        token = new MockERC20();

        token.mint(coordinator, 10_000e6);
        vm.prank(coordinator);
        token.approve(address(escrow), type(uint256).max);
    }

    function _params(address tokenAddress) internal view returns (PactPayEscrow.CreateContributionParams memory) {
        return PactPayEscrow.CreateContributionParams({
            contributionId: CONTRIBUTION_ID,
            outcomeId: OUTCOME_ID,
            termsHash: TERMS_HASH,
            contributor: contributor,
            resolver: resolver,
            token: tokenAddress,
            amount: AMOUNT,
            deliveryDeadline: uint64(block.timestamp + 7 days),
            reviewPeriod: REVIEW_PERIOD
        });
    }

    function _fund() internal {
        vm.prank(coordinator);
        escrow.createAndFundContribution(_params(address(token)));
    }

    function _acceptAndSubmit() internal {
        vm.prank(contributor);
        escrow.acceptContribution(CONTRIBUTION_ID, TERMS_HASH);

        vm.prank(contributor);
        escrow.submitEvidence(CONTRIBUTION_ID, EVIDENCE_HASH);
    }

    function testFundingIsAtomicAndRecorded() public {
        _fund();

        PactPayEscrow.Contribution memory contribution = escrow.getContribution(CONTRIBUTION_ID);
        assertEq(uint8(contribution.status), uint8(PactPayEscrow.Status.Funded));
        assertEq(contribution.amount, AMOUNT);
        assertEq(token.balanceOf(address(escrow)), AMOUNT);
        assertEq(token.balanceOf(coordinator), 9_000e6);
    }

    function testFeeOnTransferTokenCannotUnderfundEscrow() public {
        FeeOnTransferERC20 feeToken = new FeeOnTransferERC20();
        feeToken.mint(coordinator, AMOUNT);

        vm.prank(coordinator);
        feeToken.approve(address(escrow), type(uint256).max);

        vm.prank(coordinator);
        vm.expectRevert(PactPayEscrow.FundingAmountMismatch.selector);
        escrow.createAndFundContribution(_params(address(feeToken)));

        assertEq(feeToken.balanceOf(coordinator), AMOUNT);
        assertEq(feeToken.balanceOf(address(escrow)), 0);
    }

    function testContributorMustAcceptExactFrozenTerms() public {
        _fund();

        vm.prank(contributor);
        vm.expectRevert(PactPayEscrow.InvalidEvidence.selector);
        escrow.acceptContribution(CONTRIBUTION_ID, keccak256("different-terms"));

        vm.prank(contributor);
        escrow.acceptContribution(CONTRIBUTION_ID, TERMS_HASH);

        PactPayEscrow.Contribution memory contribution = escrow.getContribution(CONTRIBUTION_ID);
        assertEq(uint8(contribution.status), uint8(PactPayEscrow.Status.Accepted));
    }

    function testCoordinatorCannotWithdrawAfterAcceptance() public {
        _fund();

        vm.prank(contributor);
        escrow.acceptContribution(CONTRIBUTION_ID, TERMS_HASH);

        vm.warp(block.timestamp + 8 days);
        vm.prank(coordinator);
        vm.expectRevert(
            abi.encodeWithSelector(
                PactPayEscrow.InvalidStatus.selector,
                PactPayEscrow.Status.Funded,
                PactPayEscrow.Status.Accepted
            )
        );
        escrow.refundUnaccepted(CONTRIBUTION_ID);
    }

    function testApprovalReleasesExactFundedAmount() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.approveAndRelease(CONTRIBUTION_ID);

        PactPayEscrow.Contribution memory contribution = escrow.getContribution(CONTRIBUTION_ID);
        assertEq(uint8(contribution.status), uint8(PactPayEscrow.Status.Settled));
        assertEq(token.balanceOf(contributor), AMOUNT);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testContributorCannotClaimBeforeReviewDeadline() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(contributor);
        vm.expectRevert(PactPayEscrow.ReviewStillOpen.selector);
        escrow.claimAfterReviewTimeout(CONTRIBUTION_ID);
    }

    function testContributorCanClaimAfterOwnerSilence() public {
        _fund();
        _acceptAndSubmit();

        vm.warp(block.timestamp + REVIEW_PERIOD + 1);
        vm.prank(contributor);
        escrow.claimAfterReviewTimeout(CONTRIBUTION_ID);

        assertEq(token.balanceOf(contributor), AMOUNT);
        assertEq(uint8(escrow.getContribution(CONTRIBUTION_ID).status), uint8(PactPayEscrow.Status.Settled));
    }

    function testOnlyOneRevisionCanBeRequested() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.requestRevision(CONTRIBUTION_ID);

        vm.prank(contributor);
        escrow.submitEvidence(CONTRIBUTION_ID, keccak256("evidence-v2"));

        vm.prank(coordinator);
        vm.expectRevert(PactPayEscrow.RevisionLimitReached.selector);
        escrow.requestRevision(CONTRIBUTION_ID);
    }

    function testRevisionClearsOldEvidenceAndProvidesNewDeadline() public {
        _fund();
        _acceptAndSubmit();

        vm.warp(block.timestamp + 6 days);
        uint256 requestedAt = block.timestamp;

        vm.prank(coordinator);
        escrow.requestRevision(CONTRIBUTION_ID);

        PactPayEscrow.Contribution memory contribution = escrow.getContribution(CONTRIBUTION_ID);
        assertEq(contribution.evidenceHash, bytes32(0));
        assertEq(contribution.submittedAt, 0);
        assertGe(contribution.deliveryDeadline, requestedAt + REVIEW_PERIOD);
        assertEq(uint8(contribution.status), uint8(PactPayEscrow.Status.RevisionRequested));
    }

    function testCoordinatorCanRefundWhenRevisionIsNeverResubmitted() public {
        _fund();
        _acceptAndSubmit();

        vm.warp(block.timestamp + 6 days);
        vm.prank(coordinator);
        escrow.requestRevision(CONTRIBUTION_ID);

        PactPayEscrow.Contribution memory contribution = escrow.getContribution(CONTRIBUTION_ID);
        vm.warp(uint256(contribution.deliveryDeadline) + 1);

        vm.prank(coordinator);
        escrow.refundNoSubmission(CONTRIBUTION_ID);

        assertEq(token.balanceOf(coordinator), 10_000e6);
        assertEq(uint8(escrow.getContribution(CONTRIBUTION_ID).status), uint8(PactPayEscrow.Status.Refunded));
    }

    function testDisputeLocksFundsUntilResolverActs() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.raiseDispute(CONTRIBUTION_ID);

        vm.prank(contributor);
        vm.expectRevert(
            abi.encodeWithSelector(
                PactPayEscrow.InvalidStatus.selector,
                PactPayEscrow.Status.Submitted,
                PactPayEscrow.Status.Disputed
            )
        );
        escrow.claimAfterReviewTimeout(CONTRIBUTION_ID);

        assertEq(token.balanceOf(address(escrow)), AMOUNT);
    }

    function testResolverCanReleaseOnlyToContributor() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.raiseDispute(CONTRIBUTION_ID);

        vm.prank(resolver);
        escrow.resolveDispute(CONTRIBUTION_ID, true);

        assertEq(token.balanceOf(contributor), AMOUNT);
        assertEq(token.balanceOf(resolver), 0);
    }

    function testResolverCanRefundOnlyToCoordinator() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.raiseDispute(CONTRIBUTION_ID);

        vm.prank(resolver);
        escrow.resolveDispute(CONTRIBUTION_ID, false);

        assertEq(token.balanceOf(coordinator), 10_000e6);
        assertEq(token.balanceOf(resolver), 0);
    }

    function testNonResolverCannotResolveDispute() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.raiseDispute(CONTRIBUTION_ID);

        vm.prank(coordinator);
        vm.expectRevert(PactPayEscrow.Unauthorized.selector);
        escrow.resolveDispute(CONTRIBUTION_ID, true);
    }

    function testCoordinatorCanRefundWhenAcceptedWorkIsNeverSubmitted() public {
        _fund();

        vm.prank(contributor);
        escrow.acceptContribution(CONTRIBUTION_ID, TERMS_HASH);

        vm.warp(block.timestamp + 8 days);
        vm.prank(coordinator);
        escrow.refundNoSubmission(CONTRIBUTION_ID);

        assertEq(token.balanceOf(coordinator), 10_000e6);
        assertEq(uint8(escrow.getContribution(CONTRIBUTION_ID).status), uint8(PactPayEscrow.Status.Refunded));
    }

    function testSettledContributionCannotReleaseTwice() public {
        _fund();
        _acceptAndSubmit();

        vm.prank(coordinator);
        escrow.approveAndRelease(CONTRIBUTION_ID);

        vm.prank(coordinator);
        vm.expectRevert(
            abi.encodeWithSelector(
                PactPayEscrow.InvalidStatus.selector,
                PactPayEscrow.Status.Submitted,
                PactPayEscrow.Status.Settled
            )
        );
        escrow.approveAndRelease(CONTRIBUTION_ID);
    }
}
