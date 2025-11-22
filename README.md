# Private Personality Test

Unlock the power of privacy-preserving analytics with the Private Personality Test, a groundbreaking application that leverages Zama's Fully Homomorphic Encryption (FHE) technology. Our platform allows users to take personality tests securely, generating confidential reports without compromising their personal data.

## The Problem

In today's digital world, personal data is routinely collected and analyzed, leading to significant privacy concerns. Traditional personality tests often require users to share sensitive information, risking exposure of their personal characteristics and preferences. This cleartext data can be easily intercepted or misused, leading to a loss of privacy and trust.

## The Zama FHE Solution

Our solution offers a robust framework that addresses these privacy challenges. By utilizing Fully Homomorphic Encryption, we ensure that all test answers are encrypted during processing, enabling data analysis without ever exposing the underlying information. Using fhevm to process encrypted inputs, we can generate personality reports and social match recommendations while keeping all personal data secure and confidential.

## Key Features

- 🔒 **Privacy-Centric**: All user responses are encrypted, maintaining the confidentiality of personal data.
- 🤝 **Secure Social Matching**: Find compatible friends and networks based on encrypted personality traits without revealing any identities.
- 📊 **Homomorphic Analysis**: Perform personality analysis while the data remains encrypted, utilizing the power of Zama's FHE.
- 🧩 **Interactive Testing**: Engage with interactive questions designed to deliver insightful personality reports.
- 🔑 **Data Security**: Employ state-of-the-art encryption techniques to protect user responses and ensure safe data handling.

## Technical Architecture & Stack

This application utilizes a robust technical stack centered around Zama's privacy technology:

- **Core Technology**: Zama's FHE technology (fhevm)
- **Frontend**: React (for designing a user-friendly interface)
- **Backend**: Node.js with Express (to handle server logic)
- **Database**: Encrypted storage mechanisms
- **Testing**: Automated testing frameworks

All of these components work together to create a secure and efficient solution for personality testing.

## Smart Contract / Core Logic

Here is a simplified code snippet illustrating how the application processes encrypted data:solidity
// Solidity snippet demonstrating encrypted data handling
pragma solidity ^0.8.0;

import "./PrivatePersonalityTest.sol"; // Importing the contract

contract PersonalityTest {
    // Function to submit encrypted answers
    function submitAnswers(encryptedAnswers) public {
        // Process encrypted inputs using Zama's FHE library
        uint64 result = TFHE.add(encryptedAnswers);
        emit TestProcessed(result); // Emit event with processed result
    }
}

This snippet demonstrates the secure submission and processing of encrypted responses using Zama's FHE library, ensuring that no cleartext data is ever exposed during the analysis.

## Directory Structure

Here’s a proposed directory structure for the Private Personality Test project:
Private-Personality-Test/
├── contracts/
│   └── PersonalityTest.sol
├── src/
│   ├── App.js
│   ├── TestForm.js
│   └── ResultReport.js
├── tests/
│   └── PersonalityTest.test.js
├── .env
├── package.json
└── README.md

This structure keeps the project organized, separating smart contract files, frontend components, and testing scripts for clarity.

## Installation & Setup

### Prerequisites

- Node.js
- npm (Node package manager for JavaScript)
- Zama's FHE library

### Instructions

1. **Install Node.js and npm**: Ensure you have Node.js and npm installed on your system. You can download and install them from the official site or your package manager.
   
2. **Install Dependencies**: Navigate to the project root directory and run the following command to install necessary packages:
   npm install

3. **Install Zama's FHE Library**: Add Zama's FHE library to your project by executing:
   npm install fhevm

This will set up all the required libraries and dependencies for your project.

## Build & Run

To compile your smart contracts and run the application, follow these steps:

1. **Compile Smart Contracts**: Use Hardhat to compile your smart contracts:
   npx hardhat compile

2. **Run the Application**: Start the development server to interact with your application:
   npm start

The application should now be running locally, allowing users to take personality tests securely.

## Acknowledgements

We extend our deepest gratitude to Zama for providing the open-source FHE primitives that make this project possible. Their innovative technology allows us to deliver a truly privacy-preserving personality testing experience to users worldwide. 

Embark on your journey to explore the depth of personality without sacrificing your privacy with the Private Personality Test!

