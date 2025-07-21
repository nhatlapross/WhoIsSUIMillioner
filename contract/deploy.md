# Contract Deployment Instructions

## Step 1: Build and Deploy the Contract

```bash
# Navigate to contract directory
cd contract

# Build the contract
sui move build

# Deploy to testnet (replace with your network)
sui client publish --gas-budget 200000000

# Or deploy to devnet
sui client publish --gas-budget 200000000 --skip-fetch-latest-git-deps
```

## Step 2: Update Frontend Configuration

After deployment, you'll get output like:
```
Package ID: 0x1234567890abcdef...
Created Objects:
  - ID: 0xabcdef1234567890... (GamePlatform)
```

Update the frontend configuration in `src/services/gameContract.ts`:

```typescript
const getContractConfig = (): GameContractConfig => {
  const packageId = '0x1234567890abcdef...'; // Your new package ID
  const gameObjectId = '0xabcdef1234567890...'; // Your new GamePlatform object ID
  
  return {
    packageId,
    gameObjectId,
    network: 'testnet' // or 'devnet'
  };
};
```

## Step 3: Test the New Functions

1. Connect your admin wallet
2. Navigate to `/manager` 
3. Try adding pool funds
4. Check console logs for transaction success

## New Contract Functions Available:

✅ `add_pool_funds(platform, funds, ctx)` - Add SUI to prize pool  
✅ `set_platform_fee(platform, fee_percent, ctx)` - Set platform fee  
✅ `withdraw_platform_earnings(platform, amount, ctx)` - Withdraw earnings  
✅ Events: `PoolFundsAdded`, `PlatformEarningsWithdrawn`

## Verification

After deployment, the following should work:
- Manager page shows real platform statistics
- Add pool funds button creates actual blockchain transactions
- Withdraw earnings works for admin wallets
- Solo games pay real rewards from the pool

## Troubleshooting

If transactions fail:
1. Check wallet has enough SUI for gas + amount
2. Verify wallet address is in ADMIN_ADDRESSES
3. Ensure contract package ID and object ID are correct
4. Check network matches (testnet/devnet/mainnet)