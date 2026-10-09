// invariant: the Node-only surface — OpenTimestamps, the wallet's loopback server — kept out of the browser entry, so a bundler resolving `@jterrazz/attestation/browser` never reaches it.
export { stampDigest, upgradeProof } from './ots/stamp.js';
export {
    type OtsVerifyFail,
    type OtsVerifyOk,
    type OtsVerifyOptions,
    type OtsVerifyResult,
    verifyOts,
} from './ots/verify.js';
export {
    type BatchSignature,
    type BatchSignEntry,
    type BatchSignFlowOptions,
    type BatchSignFlowResult,
    signBatchViaBrowser,
} from './eth/sign-batch-flow.js';
export { type SignFlowOptions, type SignFlowResult, signViaBrowser } from './eth/sign-flow.js';
