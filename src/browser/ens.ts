import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// outside: viem's default transport (cloudflare-eth.com) intermittently answers null to a reverse lookup of an address that has a primary name; publicnode.com is a CORS-friendly RPC that resolves it.
const client = createPublicClient({
    chain: mainnet,
    transport: http('https://ethereum-rpc.publicnode.com'),
});

/** The primary ENS name of an address, for display only and never part of an attestation, or null when the lookup fails or none is set. */
export async function resolveEnsName(address: `0x${string}`): Promise<null | string> {
    try {
        return await client.getEnsName({ address });
    } catch {
        return null;
    }
}
