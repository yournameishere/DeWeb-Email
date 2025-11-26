// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IdentityRegistry {
    struct User {
        string username;
        string email;
        bytes publicKeyEncrypt;
        address walletAddress;
        uint256 registrationTime;
        bool isActive;
        bool isVerified;
    }

    mapping(address => User) public users;
    mapping(string => address) public usernameToAddress;
    mapping(string => address) public emailToAddress;
    
    address[] public userAddresses;
    
    event UserRegistered(
        address indexed userAddress,
        string username,
        string email,
        uint256 timestamp
    );
    
    event UserUpdated(
        address indexed userAddress,
        string username,
        string email
    );
    
    event UserVerified(address indexed userAddress, bool verified);

    modifier onlyActiveUser() {
        require(users[msg.sender].isActive, "User not registered or inactive");
        _;
    }

    modifier usernameAvailable(string memory _username) {
        require(usernameToAddress[_username] == address(0), "Username already taken");
        _;
    }

    modifier emailAvailable(string memory _email) {
        require(emailToAddress[_email] == address(0), "Email already taken");
        _;
    }

    function registerUser(
        string memory _username,
        string memory _email,
        bytes memory _publicKeyEncrypt
    ) external usernameAvailable(_username) emailAvailable(_email) {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_email).length > 0, "Email cannot be empty");
        require(_publicKeyEncrypt.length > 0, "Public key cannot be empty");
        require(!users[msg.sender].isActive, "User already registered");

        User memory newUser = User({
            username: _username,
            email: _email,
            publicKeyEncrypt: _publicKeyEncrypt,
            walletAddress: msg.sender,
            registrationTime: block.timestamp,
            isActive: true,
            isVerified: false
        });

        users[msg.sender] = newUser;
        usernameToAddress[_username] = msg.sender;
        emailToAddress[_email] = msg.sender;
        userAddresses.push(msg.sender);

        emit UserRegistered(msg.sender, _username, _email, block.timestamp);
    }

    function updateUser(
        string memory _username,
        string memory _email,
        bytes memory _publicKeyEncrypt
    ) external onlyActiveUser {
        User storage user = users[msg.sender];
        
        // Clear old mappings
        delete usernameToAddress[user.username];
        delete emailToAddress[user.email];
        
        // Check if new username/email are available
        if (keccak256(bytes(_username)) != keccak256(bytes(user.username))) {
            require(usernameToAddress[_username] == address(0), "Username already taken");
        }
        if (keccak256(bytes(_email)) != keccak256(bytes(user.email))) {
            require(emailToAddress[_email] == address(0), "Email already taken");
        }

        // Update user data
        user.username = _username;
        user.email = _email;
        user.publicKeyEncrypt = _publicKeyEncrypt;

        // Set new mappings
        usernameToAddress[_username] = msg.sender;
        emailToAddress[_email] = msg.sender;

        emit UserUpdated(msg.sender, _username, _email);
    }

    function getUser(address _userAddress) external view returns (User memory) {
        return users[_userAddress];
    }

    function getUserByUsername(string memory _username) external view returns (User memory) {
        address userAddress = usernameToAddress[_username];
        require(userAddress != address(0), "User not found");
        return users[userAddress];
    }

    function getUserByEmail(string memory _email) external view returns (User memory) {
        address userAddress = emailToAddress[_email];
        require(userAddress != address(0), "User not found");
        return users[userAddress];
    }

    function getAddressByUsername(string memory _username) external view returns (address) {
        return usernameToAddress[_username];
    }

    function getAddressByEmail(string memory _email) external view returns (address) {
        return emailToAddress[_email];
    }

    function isUserRegistered(address _userAddress) external view returns (bool) {
        return users[_userAddress].isActive;
    }

    function isUsernameAvailable(string memory _username) external view returns (bool) {
        return usernameToAddress[_username] == address(0);
    }

    function isEmailAvailable(string memory _email) external view returns (bool) {
        return emailToAddress[_email] == address(0);
    }

    function getTotalUsers() external view returns (uint256) {
        return userAddresses.length;
    }

    function getAllUsers() external view returns (address[] memory) {
        return userAddresses;
    }

    // Admin function to verify users (can be extended with proper access control)
    function verifyUser(address _userAddress, bool _verified) external {
        require(users[_userAddress].isActive, "User not found");
        users[_userAddress].isVerified = _verified;
        emit UserVerified(_userAddress, _verified);
    }

    function deactivateUser() external onlyActiveUser {
        users[msg.sender].isActive = false;
        delete usernameToAddress[users[msg.sender].username];
        delete emailToAddress[users[msg.sender].email];
    }
}
