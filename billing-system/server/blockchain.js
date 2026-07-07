// ========================================================================
// BLOCKCHAIN VERIFICATION MODULE - PIEZ Token Validation
// Task 3.1: Validate blockchain transactions before crediting
// ========================================================================

/**
 * Verifies a blockchain transaction hash exists and PIEZ was transferred
 * Supports: Ethereum, Polygon, Arbitrum
 */

const BLOCKCHAIN_RPC_URLS = {
  ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.publicnode.com",
  polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
};

const PIEZ_CONTRACT_ADDRESSES = {
  ethereum: process.env.PIEZ_ETHEREUM_ADDRESS || "0x...",
  polygon: process.env.PIEZ_POLYGON_ADDRESS || "0x...",
  arbitrum: process.env.PIEZ_ARBITRUM_ADDRESS || "0x..."
};

/**
 * Verify a blockchain transaction
 * @param {string} txHash - Transaction hash (0x-prefixed)
 * @param {string} chain - "ethereum" | "polygon" | "arbitrum"
 * @param {string} fromAddress - Expected sender address
 * @param {string} toAddress - Expected recipient address (UUON contract)
 * @param {number} minAmount - Minimum PIEZ amount to transfer
 * @returns {Promise<{valid: boolean, amount: number, timestamp: number}>}
 */
export async function verifyBlockchainTransaction(
  txHash,
  chain,
  fromAddress,
  toAddress,
  minAmount = 1
) {
  try {
    // Validate inputs
    if (!txHash || !chain || !fromAddress || !toAddress) {
      return {
        valid: false,
        error: "Missing required parameters",
        code: "BLOCKCHAIN_MISSING_PARAMS"
      };
    }

    if (!["ethereum", "polygon", "arbitrum"].includes(chain)) {
      return {
        valid: false,
        error: "Unsupported blockchain",
        code: "BLOCKCHAIN_UNSUPPORTED"
      };
    }

    if (!txHash.startsWith("0x")) {
      return {
        valid: false,
        error: "Invalid transaction hash format",
        code: "BLOCKCHAIN_INVALID_HASH"
      };
    }

    const rpcUrl = BLOCKCHAIN_RPC_URLS[chain];
    const piezAddress = PIEZ_CONTRACT_ADDRESSES[chain];

    // Fetch transaction receipt
    const receipt = await fetchTransactionReceipt(rpcUrl, txHash);

    if (!receipt) {
      return {
        valid: false,
        error: "Transaction not found or not confirmed",
        code: "BLOCKCHAIN_TX_NOT_FOUND"
      };
    }

    // Check transaction status
    if (receipt.status === "0x0") {
      return {
        valid: false,
        error: "Transaction failed on blockchain",
        code: "BLOCKCHAIN_TX_FAILED"
      };
    }

    // Parse transaction logs for token transfer events
    const transferEvent = parseTransferEvent(
      receipt.logs,
      piezAddress,
      fromAddress,
      toAddress
    );

    if (!transferEvent) {
      return {
        valid: false,
        error: "No PIEZ transfer detected in transaction",
        code: "BLOCKCHAIN_NO_TRANSFER"
      };
    }

    const amount = parseInt(transferEvent.value, 16) / 10 ** 18; // Convert from wei

    if (amount < minAmount) {
      return {
        valid: false,
        error: `Transfer amount (${amount} PIEZ) below minimum (${minAmount})`,
        code: "BLOCKCHAIN_INSUFFICIENT_AMOUNT"
      };
    }

    return {
      valid: true,
      amount,
      timestamp: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed
    };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return {
      valid: false,
      error: "Blockchain verification failed",
      code: "BLOCKCHAIN_VERIFICATION_ERROR",
      details: error.message
    };
  }
}

/**
 * Fetch transaction receipt from blockchain RPC
 */
async function fetchTransactionReceipt(rpcUrl, txHash) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txHash],
      id: 1
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Parse ERC-20 Transfer event from transaction logs
 * Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
 * keccak256("Transfer(address,address,uint256)") = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
 */
function parseTransferEvent(logs, tokenAddress, fromAddress, toAddress) {
  const TRANSFER_EVENT_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  for (const log of logs) {
    if (
      log.address.toLowerCase() === tokenAddress.toLowerCase() &&
      log.topics[0] === TRANSFER_EVENT_SIGNATURE &&
      log.topics[1].includes(fromAddress.replace("0x", "")) &&
      log.topics[2].includes(toAddress.replace("0x", ""))
    ) {
      return {
        from: log.topics[1],
        to: log.topics[2],
        value: log.data
      };
    }
  }

  return null;
}

/**
 * Mock verification for testing (use only in development)
 */
export function mockBlockchainVerification(txHash, chain) {
  // For testing: accept any valid-format txHash
  if (txHash.startsWith("0x") && txHash.length === 66) {
    return {
      valid: true,
      amount: Math.random() * 1000,
      timestamp: Date.now(),
      blockHash: "0x" + "a".repeat(64),
      mode: "MOCK_VERIFICATION"
    };
  }

  return {
    valid: false,
    error: "Invalid mock transaction hash",
    code: "BLOCKCHAIN_INVALID_HASH"
  };
}
