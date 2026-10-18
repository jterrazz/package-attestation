import { privateKeyToAccount } from 'viem/accounts';

// outside: Hardhat's default account 0 (mnemonic `test test ... junk`), the most public private key there is: it signs for the specs and must never hold value.
export const hardhatAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
