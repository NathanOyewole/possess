// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Possess
/// @notice The Chog Genesis token id is the save file.
/// Scars and the run clock live on this contract, keyed by token id.
/// Transfer the NFT and the next owner inherits the same run.
interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract Possess {
    IERC721 public immutable chog;
    uint256 public constant RUN = 1 days;

    struct RunState {
        uint64 startedAt;
        uint16 heat;
        bool alive;
    }

    struct Scar {
        address by;
        uint64 at;
        string note;
    }

    mapping(uint256 => RunState) public runs;
    mapping(uint256 => Scar[]) public scars;

    event Possessed(uint256 indexed tokenId, address indexed by);
    event Challenged(uint256 indexed tokenId, address indexed by, bool hit, uint16 heat);

    constructor(address chog_) {
        chog = IERC721(chog_);
    }

    modifier onlyOwner(uint256 tokenId) {
        require(chog.ownerOf(tokenId) == msg.sender, "not the body");
        _;
    }

    function possess(uint256 tokenId) external onlyOwner(tokenId) {
        RunState storage r = runs[tokenId];
        require(!r.alive || block.timestamp >= r.startedAt + RUN, "already live");
        r.startedAt = uint64(block.timestamp);
        r.heat = 50;
        r.alive = true;
        scars[tokenId].push(Scar(msg.sender, uint64(block.timestamp), "possessed"));
        emit Possessed(tokenId, msg.sender);
    }

    function challenge(uint256 tokenId, bool hit) external {
        RunState storage r = runs[tokenId];
        require(r.alive && block.timestamp < r.startedAt + RUN, "no live run");
        if (hit) {
            r.heat = uint16(bound(int256(r.heat) + 8));
        } else {
            r.heat = uint16(bound(int256(r.heat) - 6));
            if (r.heat < 30) r.alive = false;
        }
        scars[tokenId].push(Scar(msg.sender, uint64(block.timestamp), hit ? "hit" : "slip"));
        emit Challenged(tokenId, msg.sender, hit, r.heat);
    }

    function revive(uint256 tokenId) external onlyOwner(tokenId) {
        RunState storage r = runs[tokenId];
        require(!r.alive, "still alive");
        r.startedAt = uint64(block.timestamp);
        r.heat = 30;
        r.alive = true;
        scars[tokenId].push(Scar(msg.sender, uint64(block.timestamp), "revived"));
        emit Possessed(tokenId, msg.sender);
    }
    function scarCount(uint256 tokenId) external view returns (uint256) {
        return scars[tokenId].length;
    }

    function bound(int256 n) internal pure returns (uint256) {
        if (n < 0) return 0;
        if (n > 100) return 100;
        return uint256(n);
    }
}
