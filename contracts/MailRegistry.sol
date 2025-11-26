// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IdentityRegistry.sol";

contract MailRegistry {
    struct MailHeader {
        uint256 id;
        address from;
        address to;
        string ipfsCid;
        bytes32 subjectHash;
        uint256 timestamp;
        bool isEncrypted;
        bool isRead;
        bool isDeleted;
        uint256 priority; // 0 = normal, 1 = high, 2 = urgent
    }

    struct MailStats {
        uint256 totalSent;
        uint256 totalReceived;
        uint256 totalUnread;
    }

    IdentityRegistry public identityRegistry;
    
    mapping(uint256 => MailHeader) public mails;
    mapping(address => uint256[]) public sentMails;
    mapping(address => uint256[]) public receivedMails;
    mapping(address => MailStats) public userStats;
    
    uint256 public totalMails;
    uint256 public mailFee = 0.001 ether; // Small fee to prevent spam
    address public owner;
    
    event MailSent(
        uint256 indexed mailId,
        address indexed from,
        address indexed to,
        string ipfsCid,
        uint256 timestamp,
        uint256 priority
    );
    
    event MailRead(uint256 indexed mailId, address indexed reader);
    event MailDeleted(uint256 indexed mailId, address indexed deleter);
    event MailFeeUpdated(uint256 newFee);

    modifier onlyRegisteredUser() {
        require(identityRegistry.isUserRegistered(msg.sender), "User not registered");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validMailId(uint256 _mailId) {
        require(_mailId > 0 && _mailId <= totalMails, "Invalid mail ID");
        _;
    }

    modifier onlyMailParticipant(uint256 _mailId) {
        MailHeader memory mail = mails[_mailId];
        require(
            msg.sender == mail.from || msg.sender == mail.to,
            "Not authorized to access this mail"
        );
        _;
    }

    constructor(address _identityRegistryAddress) {
        identityRegistry = IdentityRegistry(_identityRegistryAddress);
        owner = msg.sender;
    }

    function sendMail(
        address _to,
        string memory _ipfsCid,
        bytes32 _subjectHash,
        uint256 _priority
    ) external payable onlyRegisteredUser {
        require(identityRegistry.isUserRegistered(_to), "Recipient not registered");
        require(bytes(_ipfsCid).length > 0, "IPFS CID cannot be empty");
        require(msg.value >= mailFee, "Insufficient fee");
        require(_priority <= 2, "Invalid priority level");

        totalMails++;
        
        MailHeader memory newMail = MailHeader({
            id: totalMails,
            from: msg.sender,
            to: _to,
            ipfsCid: _ipfsCid,
            subjectHash: _subjectHash,
            timestamp: block.timestamp,
            isEncrypted: true,
            isRead: false,
            isDeleted: false,
            priority: _priority
        });

        mails[totalMails] = newMail;
        sentMails[msg.sender].push(totalMails);
        receivedMails[_to].push(totalMails);

        // Update stats
        userStats[msg.sender].totalSent++;
        userStats[_to].totalReceived++;
        userStats[_to].totalUnread++;

        emit MailSent(totalMails, msg.sender, _to, _ipfsCid, block.timestamp, _priority);

        // Refund excess payment
        if (msg.value > mailFee) {
            payable(msg.sender).transfer(msg.value - mailFee);
        }
    }

    function markAsRead(uint256 _mailId) 
        external 
        validMailId(_mailId) 
        onlyMailParticipant(_mailId) 
    {
        MailHeader storage mail = mails[_mailId];
        require(!mail.isRead, "Mail already marked as read");
        require(msg.sender == mail.to, "Only recipient can mark as read");

        mail.isRead = true;
        userStats[mail.to].totalUnread--;

        emit MailRead(_mailId, msg.sender);
    }

    function deleteMail(uint256 _mailId) 
        external 
        validMailId(_mailId) 
        onlyMailParticipant(_mailId) 
    {
        MailHeader storage mail = mails[_mailId];
        require(!mail.isDeleted, "Mail already deleted");

        mail.isDeleted = true;

        emit MailDeleted(_mailId, msg.sender);
    }

    function getMail(uint256 _mailId) 
        external 
        view 
        validMailId(_mailId) 
        onlyMailParticipant(_mailId) 
        returns (MailHeader memory) 
    {
        return mails[_mailId];
    }

    function getSentMails(address _user) external view returns (uint256[] memory) {
        return sentMails[_user];
    }

    function getReceivedMails(address _user) external view returns (uint256[] memory) {
        return receivedMails[_user];
    }

    function getUnreadMails(address _user) external view returns (uint256[] memory) {
        uint256[] memory received = receivedMails[_user];
        uint256 unreadCount = 0;
        
        // Count unread mails
        for (uint256 i = 0; i < received.length; i++) {
            if (!mails[received[i]].isRead && !mails[received[i]].isDeleted) {
                unreadCount++;
            }
        }
        
        // Create array of unread mail IDs
        uint256[] memory unreadMails = new uint256[](unreadCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < received.length; i++) {
            if (!mails[received[i]].isRead && !mails[received[i]].isDeleted) {
                unreadMails[index] = received[i];
                index++;
            }
        }
        
        return unreadMails;
    }

    function getMailsByPriority(address _user, uint256 _priority) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory received = receivedMails[_user];
        uint256 priorityCount = 0;
        
        // Count mails with specific priority
        for (uint256 i = 0; i < received.length; i++) {
            if (mails[received[i]].priority == _priority && !mails[received[i]].isDeleted) {
                priorityCount++;
            }
        }
        
        // Create array of priority mail IDs
        uint256[] memory priorityMails = new uint256[](priorityCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < received.length; i++) {
            if (mails[received[i]].priority == _priority && !mails[received[i]].isDeleted) {
                priorityMails[index] = received[i];
                index++;
            }
        }
        
        return priorityMails;
    }

    function getUserStats(address _user) external view returns (MailStats memory) {
        return userStats[_user];
    }

    function getMailsInRange(
        address _user,
        uint256 _startTime,
        uint256 _endTime,
        bool _sent
    ) external view returns (uint256[] memory) {
        uint256[] memory userMails = _sent ? sentMails[_user] : receivedMails[_user];
        uint256 rangeCount = 0;
        
        // Count mails in time range
        for (uint256 i = 0; i < userMails.length; i++) {
            MailHeader memory mail = mails[userMails[i]];
            if (mail.timestamp >= _startTime && mail.timestamp <= _endTime && !mail.isDeleted) {
                rangeCount++;
            }
        }
        
        // Create array of mail IDs in range
        uint256[] memory rangeMails = new uint256[](rangeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userMails.length; i++) {
            MailHeader memory mail = mails[userMails[i]];
            if (mail.timestamp >= _startTime && mail.timestamp <= _endTime && !mail.isDeleted) {
                rangeMails[index] = userMails[i];
                index++;
            }
        }
        
        return rangeMails;
    }

    // Admin functions
    function updateMailFee(uint256 _newFee) external onlyOwner {
        mailFee = _newFee;
        emit MailFeeUpdated(_newFee);
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
    }

    function getTotalMails() external view returns (uint256) {
        return totalMails;
    }

    function getMailFee() external view returns (uint256) {
        return mailFee;
    }
}
