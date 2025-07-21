// Add these functions to your whoissuimillionar.move contract
// Insert them in the ADMIN FUNCTIONS section (around line 633)

    /// Add funds to platform pool (admin only)  
    public entry fun add_pool_funds(
        platform: &mut GamePlatform,
        funds: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        
        // Add funds to platform balance
        balance::join(&mut platform.platform_balance, coin::into_balance(funds));
    }

    /// Set platform fee percentage (admin only)
    public entry fun set_platform_fee(
        platform: &mut GamePlatform, 
        new_fee_percent: u64,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        assert!(new_fee_percent <= 50, EInvalidEntryFee); // Max 50% fee
        
        // Note: This requires adding platform_fee_percent to GamePlatform struct
        // For now, the fee is hardcoded at 10% in the contract
        // You would need to modify the struct and update fee calculations
    }

    /// Alternative: Get platform fee percentage (for future use)
    public fun get_platform_fee_percentage(_platform: &GamePlatform): u64 {
        PLATFORM_FEE_PERCENT
    }

    /// Rename existing withdraw function for consistency
    public entry fun withdraw_platform_earnings(
        platform: &mut GamePlatform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        
        let withdraw_balance = balance::split(&mut platform.platform_balance, amount);
        let withdraw_coin = coin::from_balance(withdraw_balance, ctx);
        sui::transfer::public_transfer(withdraw_coin, admin);
    }