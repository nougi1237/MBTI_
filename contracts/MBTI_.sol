pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivatePersonalityTest is ZamaEthereumConfig {
    
    struct TestResult {
        address testTaker;
        euint32 encryptedAnswers;
        uint256 publicMetadata;
        uint256 timestamp;
        uint32 decryptedScore;
        bool isVerified;
    }
    
    mapping(string => TestResult) public testResults;
    string[] public testIds;
    
    event TestCreated(string indexed testId, address indexed testTaker);
    event ResultVerified(string indexed testId, uint32 decryptedScore);
    
    constructor() ZamaEthereumConfig() {
    }
    
    function submitTest(
        string calldata testId,
        externalEuint32 encryptedAnswers,
        bytes calldata inputProof,
        uint256 publicMetadata
    ) external {
        require(bytes(testResults[testId].testTaker).length == 0, "Test already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedAnswers, inputProof)), "Invalid encrypted input");
        
        testResults[testId] = TestResult({
            testTaker: msg.sender,
            encryptedAnswers: FHE.fromExternal(encryptedAnswers, inputProof),
            publicMetadata: publicMetadata,
            timestamp: block.timestamp,
            decryptedScore: 0,
            isVerified: false
        });
        
        FHE.allowThis(testResults[testId].encryptedAnswers);
        FHE.makePubliclyDecryptable(testResults[testId].encryptedAnswers);
        
        testIds.push(testId);
        emit TestCreated(testId, msg.sender);
    }
    
    function verifyResult(
        string calldata testId,
        bytes memory abiEncodedClearScore,
        bytes memory decryptionProof
    ) external {
        require(bytes(testResults[testId].testTaker).length > 0, "Test does not exist");
        require(!testResults[testId].isVerified, "Result already verified");
        
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(testResults[testId].encryptedAnswers);
        
        FHE.checkSignatures(cts, abiEncodedClearScore, decryptionProof);
        
        uint32 decodedScore = abi.decode(abiEncodedClearScore, (uint32));
        
        testResults[testId].decryptedScore = decodedScore;
        testResults[testId].isVerified = true;
        
        emit ResultVerified(testId, decodedScore);
    }
    
    function getEncryptedAnswers(string calldata testId) external view returns (euint32) {
        require(bytes(testResults[testId].testTaker).length > 0, "Test does not exist");
        return testResults[testId].encryptedAnswers;
    }
    
    function getTestResult(string calldata testId) external view returns (
        address testTaker,
        uint256 publicMetadata,
        uint256 timestamp,
        bool isVerified,
        uint32 decryptedScore
    ) {
        require(bytes(testResults[testId].testTaker).length > 0, "Test does not exist");
        TestResult storage result = testResults[testId];
        
        return (
            result.testTaker,
            result.publicMetadata,
            result.timestamp,
            result.isVerified,
            result.decryptedScore
        );
    }
    
    function getAllTestIds() external view returns (string[] memory) {
        return testIds;
    }
    
    function compareResults(
        string calldata testId1,
        string calldata testId2
    ) external view returns (bool) {
        require(bytes(testResults[testId1].testTaker).length > 0, "Test 1 does not exist");
        require(bytes(testResults[testId2].testTaker).length > 0, "Test 2 does not exist");
        require(testResults[testId1].isVerified, "Test 1 not verified");
        require(testResults[testId2].isVerified, "Test 2 not verified");
        
        return testResults[testId1].decryptedScore == testResults[testId2].decryptedScore;
    }
    
    function isAvailable() public pure returns (bool) {
        return true;
    }
}

