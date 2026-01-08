// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title APPDistribution
 * @notice Appreciation/Exit event distribution contract for SSF RWA project
 * @dev Treasury deposits USDC on exit/refinancing events, APP-PREF holders claim pro-rata
 * 
 * IMMUTABLE CONTRACT - No proxy upgradeability.
 * Future iterations via versioned deployments (V1/V2/...).
 * Old versions remain readable/claimable but disabled for new events.
 */
contract APPDistribution is Ownable {
    using SafeERC20 for IERC20;

    // ============ VERSION ============
    string public constant VERSION = "APPDistribution@1.0.0";
    
    // ============ IMMUTABLES ============
    IERC20 public immutable usdc;
    IERC20 public immutable appToken; // APP-PREF token
    
    // ============ STATE ============
    address public treasury;
    bool public acceptingDeposits = true;  // Retire mechanism
    
    enum EventType { EXIT, REFINANCE, DISPOSITION, OTHER }
    
    struct ExitEvent {
        EventType eventType;
        string description;        // e.g., "Property Sale Q2 2026"
        uint256 totalAmount;       // Total USDC to distribute
        uint256 totalClaimed;      // Amount already claimed
        uint256 snapshotSupply;    // APP-PREF total supply at event time
        uint64 timestamp;
        bool finalized;
    }
    
    uint256 public currentEventId;
    mapping(uint256 => ExitEvent) public exitEvents;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // ============ EVENTS ============
    event Deployed(string version, uint256 chainId, address deployer, uint256 deployedAt);
    event Retired(uint256 timestamp);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event EventCreated(uint256 indexed eventId, EventType eventType, string description);
    event EventFinalized(uint256 indexed eventId, uint256 totalAmount);
    event Deposited(uint256 indexed eventId, uint256 amount);
    event Claimed(uint256 indexed eventId, address indexed holder, uint256 amount);
    
    // ============ ERRORS ============
    error ZeroAddress();
    error EventNotFinalized();
    error AlreadyClaimed();
    error NoClaimable();
    error OnlyTreasury();
    error EventAlreadyFinalized();
    error ContractRetired();
    
    // ============ CONSTRUCTOR ============
    constructor(
        address _usdc, 
        address _appToken, 
        address _treasury, 
        address _owner
    ) Ownable(_owner) {
        if (_usdc == address(0) || _appToken == address(0) || _treasury == address(0)) {
            revert ZeroAddress();
        }
        usdc = IERC20(_usdc);
        appToken = IERC20(_appToken);
        treasury = _treasury;
        
        emit Deployed(VERSION, block.chainid, msg.sender, block.timestamp);
    }
    
    // ============ MODIFIERS ============
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }
    
    modifier notRetired() {
        if (!acceptingDeposits) revert ContractRetired();
        _;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Retire this contract version - no new events/deposits allowed
     * @dev Call this before migrating to a new version
     */
    function retire() external onlyOwner {
        acceptingDeposits = false;
        emit Retired(block.timestamp);
    }
    
    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }
    
    // ============ TREASURY FUNCTIONS ============
    
    /**
     * @notice Create a new exit/appreciation event
     * @dev Only callable when contract is not retired
     * @param eventType Type of event (EXIT, REFINANCE, DISPOSITION, OTHER)
     * @param description Human-readable description of the event
     */
    function createEvent(EventType eventType, string calldata description) external onlyTreasury notRetired {
        currentEventId++;
        ExitEvent storage evt = exitEvents[currentEventId];
        evt.eventType = eventType;
        evt.description = description;
        evt.timestamp = uint64(block.timestamp);
        
        emit EventCreated(currentEventId, eventType, description);
    }
    
    /**
     * @notice Deposit USDC for the current event
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external onlyTreasury notRetired {
        ExitEvent storage evt = exitEvents[currentEventId];
        if (evt.finalized) revert EventAlreadyFinalized();
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        evt.totalAmount += amount;
        
        emit Deposited(currentEventId, amount);
    }
    
    /**
     * @notice Finalize the current event, snapshot token supply
     * @dev Can be called even after retire (to finalize last event)
     */
    function finalizeEvent() external onlyTreasury {
        ExitEvent storage evt = exitEvents[currentEventId];
        if (evt.finalized) revert EventAlreadyFinalized();
        
        evt.snapshotSupply = appToken.totalSupply();
        evt.finalized = true;
        
        emit EventFinalized(currentEventId, evt.totalAmount);
    }
    
    // ============ USER FUNCTIONS ============
    
    /**
     * @notice Claim USDC from a finalized event
     * @dev Always available (even after retire) for historical events
     * @param eventId The event ID to claim from
     */
    function claim(uint256 eventId) external {
        ExitEvent storage evt = exitEvents[eventId];
        if (!evt.finalized) revert EventNotFinalized();
        if (hasClaimed[eventId][msg.sender]) revert AlreadyClaimed();
        
        uint256 claimable = getClaimable(msg.sender, eventId);
        if (claimable == 0) revert NoClaimable();
        
        hasClaimed[eventId][msg.sender] = true;
        evt.totalClaimed += claimable;
        usdc.safeTransfer(msg.sender, claimable);
        
        emit Claimed(eventId, msg.sender, claimable);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Calculate claimable amount for a holder
     * @param holder Address of the APP-PREF holder
     * @param eventId The event ID to check
     * @return Amount of USDC claimable (6 decimals)
     */
    function getClaimable(address holder, uint256 eventId) public view returns (uint256) {
        ExitEvent storage evt = exitEvents[eventId];
        if (!evt.finalized || evt.snapshotSupply == 0) return 0;
        if (hasClaimed[eventId][holder]) return 0;
        
        // Pro-rata based on APP-PREF balance
        return (evt.totalAmount * appToken.balanceOf(holder)) / evt.snapshotSupply;
    }
    
    /**
     * @notice Get event details
     * @param eventId The event ID to query
     */
    function getEvent(uint256 eventId) external view returns (
        EventType eventType,
        string memory description,
        uint256 totalAmount,
        uint256 totalClaimed,
        uint256 snapshotSupply,
        uint64 timestamp,
        bool finalized
    ) {
        ExitEvent storage evt = exitEvents[eventId];
        return (
            evt.eventType,
            evt.description,
            evt.totalAmount,
            evt.totalClaimed,
            evt.snapshotSupply,
            evt.timestamp,
            evt.finalized
        );
    }
}
