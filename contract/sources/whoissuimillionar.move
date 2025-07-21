module whoissuimillionar::game {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::tx_context::TxContext;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::vec_map::{Self, VecMap};
    use std::string::{Self, String};

    // ============ ERRORS ============
    const EInvalidEntryFee: u64 = 1;
    const EGameAlreadyStarted: u64 = 2;
    const ERoomFull: u64 = 3;
    const ENotGameCreator: u64 = 4;
    const EGameNotStarted: u64 = 5;
    const EPlayerNotInGame: u64 = 6;
    const EGameAlreadyFinished: u64 = 8;
    const EContractNotSigned: u64 = 9;
    const EQuestionAlreadyAnswered: u64 = 11;

    // ============ CONSTANTS ============
    const PLATFORM_FEE_PERCENT: u64 = 10; // 10% platform fee
    const MIN_ENTRY_FEE: u64 = 100000000; // 0.1 SUI in MIST
    const MAX_ENTRY_FEE: u64 = 10000000000; // 10 SUI in MIST
    const MAX_PLAYERS_PER_ROOM: u64 = 50;

    // ============ STRUCTS ============

    /// Game Platform - Singleton object
    public struct GamePlatform has key {
        id: sui::object::UID,
        admin: address,
        platform_balance: Balance<SUI>,
        total_games_played: u64,
        total_rewards_distributed: u64,
        active_solo_games: Table<sui::object::ID, SoloGame>,
        active_multiplayer_rooms: Table<sui::object::ID, MultiplayerRoom>,
        player_contracts: Table<address, PlayerContract>,
    }

    /// Player Contract Agreement
    public struct PlayerContract has store, drop {
        player: address,
        signed_at: u64,
        terms_version: String,
        is_active: bool,
    }

    /// Solo Game Session
    public struct SoloGame has key, store {
        id: sui::object::UID,
        player: address,
        entry_fee: u64,
        score: u64,
        questions_answered: u64,
        game_type: String, // "normal" or "ai"
        start_time: u64,
        end_time: std::option::Option<u64>,
        reward_claimed: bool,
        contract_signed: bool,
    }

    /// Multiplayer Room
    public struct MultiplayerRoom has key, store {
        id: sui::object::UID,
        creator: address,
        entry_fee: u64,
        max_players: u64,
        players: vector<address>,
        player_answers: VecMap<address, vector<String>>, // Player -> their answers
        eliminated_players: vector<address>,
        current_question: u64,
        total_questions: u64,
        prize_pool: Balance<SUI>,
        status: String, // "waiting", "playing", "finished"
        start_time: std::option::Option<u64>,
        question_start_time: std::option::Option<u64>,
        winners: vector<address>, // Final survivors
        rewards_distributed: bool,
    }

    // ============ EVENTS ============

    public struct ContractSigned has copy, drop {
        player: address,
        timestamp: u64,
        terms_version: String,
    }

    public struct SoloGameStarted has copy, drop {
        game_id: sui::object::ID,
        player: address,
        entry_fee: u64,
        game_type: String,
    }

    public struct SoloGameFinished has copy, drop {
        game_id: sui::object::ID,
        player: address,
        score: u64,
        reward_amount: u64,
    }

    public struct MultiplayerRoomCreated has copy, drop {
        room_id: sui::object::ID,
        creator: address,
        entry_fee: u64,
        max_players: u64,
    }

    public struct PlayerJoinedRoom has copy, drop {
        room_id: sui::object::ID,
        player: address,
        current_players: u64,
    }

    public struct MultiplayerGameStarted has copy, drop {
        room_id: sui::object::ID,
        players: vector<address>,
        total_questions: u64,
        prize_pool: u64,
    }

    public struct PlayerEliminated has copy, drop {
        room_id: sui::object::ID,
        player: address,
        question_number: u64,
        correct_answer: String,
        player_answer: String,
    }

    public struct MultiplayerGameFinished has copy, drop {
        room_id: sui::object::ID,
        winners: vector<address>,
        prize_per_winner: u64,
        total_prize_distributed: u64,
    }

    public struct PoolFundsAdded has copy, drop {
        admin: address,
        amount: u64,
        new_balance: u64,
    }

    public struct PlatformEarningsWithdrawn has copy, drop {
        admin: address,
        amount: u64,
        remaining_balance: u64,
    }

    // ============ INIT FUNCTION ============

    fun init(ctx: &mut TxContext) {
        let platform = GamePlatform {
            id: sui::object::new(ctx),
            admin: sui::tx_context::sender(ctx),
            platform_balance: balance::zero<SUI>(),
            total_games_played: 0,
            total_rewards_distributed: 0,
            active_solo_games: table::new(ctx),
            active_multiplayer_rooms: table::new(ctx),
            player_contracts: table::new(ctx),
        };
        
        sui::transfer::share_object(platform);
    }

    // ============ CONTRACT MANAGEMENT ============

    /// Sign player contract to agree to terms
    public entry fun sign_player_contract(
        platform: &mut GamePlatform,
        terms_version: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let terms_string = string::utf8(terms_version);
        
        let contract = PlayerContract {
            player,
            signed_at: current_time,
            terms_version: terms_string,
            is_active: true,
        };

        // Store or update contract
        if (table::contains(&platform.player_contracts, player)) {
            let _old_contract = table::remove(&mut platform.player_contracts, player);
        };
        
        table::add(&mut platform.player_contracts, player, contract);

        event::emit(ContractSigned {
            player,
            timestamp: current_time,
            terms_version: terms_string,
        });
    }

    /// Check if player has signed contract
    public fun has_signed_contract(platform: &GamePlatform, player: address): bool {
        table::contains(&platform.player_contracts, player)
    }

    // ============ SOLO GAME FUNCTIONS ============

    /// Start a solo game session
    public entry fun start_solo_game(
        platform: &mut GamePlatform,
        entry_fee: Coin<SUI>,
        game_type: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        
        // Check contract signed
        assert!(has_signed_contract(platform, player), EContractNotSigned);
        
        let fee_amount = coin::value(&entry_fee);
        assert!(fee_amount >= MIN_ENTRY_FEE && fee_amount <= MAX_ENTRY_FEE, EInvalidEntryFee);

        let game_id = sui::object::new(ctx);
        let game_id_copy = sui::object::uid_to_inner(&game_id);
        
        let solo_game = SoloGame {
            id: game_id,
            player,
            entry_fee: fee_amount,
            score: 0,
            questions_answered: 0,
            game_type: string::utf8(game_type),
            start_time: clock::timestamp_ms(clock),
            end_time: std::option::none(),
            reward_claimed: false,
            contract_signed: true,
        };

        // Add entry fee to platform balance
        balance::join(&mut platform.platform_balance, coin::into_balance(entry_fee));
        
        // Store game
        table::add(&mut platform.active_solo_games, game_id_copy, solo_game);
        platform.total_games_played = platform.total_games_played + 1;

        event::emit(SoloGameStarted {
            game_id: game_id_copy,
            player,
            entry_fee: fee_amount,
            game_type: string::utf8(game_type),
        });
    }

    /// Finish solo game and calculate rewards
    public entry fun finish_solo_game(
        platform: &mut GamePlatform,
        game_id: sui::object::ID,
        score: u64,
        total_questions: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        
        assert!(table::contains(&platform.active_solo_games, game_id), EPlayerNotInGame);
        let game = table::borrow_mut(&mut platform.active_solo_games, game_id);
        
        assert!(game.player == player, EPlayerNotInGame);
        assert!(std::option::is_none(&game.end_time), EGameAlreadyFinished);

        // Update game stats
        game.score = score;
        game.questions_answered = total_questions;
        game.end_time = std::option::some(clock::timestamp_ms(clock));

        // Calculate reward (example: 0.1 SUI per correct answer)
        let reward_amount = score * 100000000; // 0.1 SUI per correct answer in MIST
        
        // Pay reward if earned
        if (reward_amount > 0 && balance::value(&platform.platform_balance) >= reward_amount) {
            let reward_balance = balance::split(&mut platform.platform_balance, reward_amount);
            let reward_coin = coin::from_balance(reward_balance, ctx);
            sui::transfer::public_transfer(reward_coin, player);
            
            platform.total_rewards_distributed = platform.total_rewards_distributed + reward_amount;
            game.reward_claimed = true;
        };

        event::emit(SoloGameFinished {
            game_id,
            player,
            score,
            reward_amount,
        });
    }

    // ============ MULTIPLAYER FUNCTIONS ============

    /// Create multiplayer room
    public entry fun create_multiplayer_room(
        platform: &mut GamePlatform,
        entry_fee: Coin<SUI>,
        max_players: u64,
        ctx: &mut TxContext
    ) {
        let creator = sui::tx_context::sender(ctx);
        
        // Check contract signed
        assert!(has_signed_contract(platform, creator), EContractNotSigned);
        
        let fee_amount = coin::value(&entry_fee);
        assert!(fee_amount >= MIN_ENTRY_FEE && fee_amount <= MAX_ENTRY_FEE, EInvalidEntryFee);
        assert!(max_players >= 2 && max_players <= MAX_PLAYERS_PER_ROOM, ERoomFull);

        let room_id = sui::object::new(ctx);
        let room_id_copy = sui::object::uid_to_inner(&room_id);
        
        let mut players = std::vector::empty<address>();
        std::vector::push_back(&mut players, creator);

        let mut room = MultiplayerRoom {
            id: room_id,
            creator,
            entry_fee: fee_amount,
            max_players,
            players,
            player_answers: vec_map::empty(),
            eliminated_players: std::vector::empty(),
            current_question: 0,
            total_questions: 0,
            prize_pool: coin::into_balance(entry_fee),
            status: string::utf8(b"waiting"),
            start_time: std::option::none(),
            question_start_time: std::option::none(),
            winners: std::vector::empty(),
            rewards_distributed: false,
        };

        // Initialize player answers
        vec_map::insert(&mut room.player_answers, creator, std::vector::empty());

        table::add(&mut platform.active_multiplayer_rooms, room_id_copy, room);

        event::emit(MultiplayerRoomCreated {
            room_id: room_id_copy,
            creator,
            entry_fee: fee_amount,
            max_players,
        });
    }

    /// Join multiplayer room
    public entry fun join_multiplayer_room(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
        entry_fee: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        
        // Check contract signed
        assert!(has_signed_contract(platform, player), EContractNotSigned);
        
        assert!(table::contains(&platform.active_multiplayer_rooms, room_id), EPlayerNotInGame);
        let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
        
        let fee_amount = coin::value(&entry_fee);
        assert!(fee_amount == room.entry_fee, EInvalidEntryFee);
        assert!(std::vector::length(&room.players) < room.max_players, ERoomFull);
        assert!(room.status == string::utf8(b"waiting"), EGameAlreadyStarted);

        // Check if player already in room
        assert!(!std::vector::contains(&room.players, &player), EPlayerNotInGame);

        // Add player to room
        std::vector::push_back(&mut room.players, player);
        balance::join(&mut room.prize_pool, coin::into_balance(entry_fee));
        
        // Initialize player answers
        vec_map::insert(&mut room.player_answers, player, std::vector::empty());

        event::emit(PlayerJoinedRoom {
            room_id,
            player,
            current_players: std::vector::length(&room.players),
        });
    }

    /// Start multiplayer game
    public entry fun start_multiplayer_game(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
        total_questions: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let creator = sui::tx_context::sender(ctx);
        
        assert!(table::contains(&platform.active_multiplayer_rooms, room_id), EPlayerNotInGame);
        let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
        
        assert!(room.creator == creator, ENotGameCreator);
        assert!(room.status == string::utf8(b"waiting"), EGameAlreadyStarted);
        assert!(std::vector::length(&room.players) >= 2, EPlayerNotInGame);

        // Start game
        room.status = string::utf8(b"playing");
        room.total_questions = total_questions;
        room.start_time = std::option::some(clock::timestamp_ms(clock));
        room.current_question = 1;

        platform.total_games_played = platform.total_games_played + 1;

        event::emit(MultiplayerGameStarted {
            room_id,
            players: room.players,
            total_questions,
            prize_pool: balance::value(&room.prize_pool),
        });
    }

    /// Submit answer for current question
    public entry fun submit_answer(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
        answer: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        
        assert!(table::contains(&platform.active_multiplayer_rooms, room_id), EPlayerNotInGame);
        let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
        
        assert!(room.status == string::utf8(b"playing"), EGameNotStarted);
        assert!(std::vector::contains(&room.players, &player), EPlayerNotInGame);
        assert!(!std::vector::contains(&room.eliminated_players, &player), EPlayerNotInGame);

        // Get player's current answers
        let player_answers = vec_map::get_mut(&mut room.player_answers, &player);
        let answers_count = std::vector::length(player_answers);
        
        // Check if player can answer current question
        assert!(answers_count < room.current_question, EQuestionAlreadyAnswered);

        // Add answer
        std::vector::push_back(player_answers, string::utf8(answer));
    }

    /// Process question results and eliminate wrong players
    public entry fun process_question_results(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
        correct_answer: vector<u8>,
        ctx: &mut TxContext
    ) {
        let caller = sui::tx_context::sender(ctx);
        
        assert!(table::contains(&platform.active_multiplayer_rooms, room_id), EPlayerNotInGame);
        
        // Separate borrowing and function call to avoid reference transfer issues
        let should_finish_game: bool;
        let should_move_to_next: bool;
        
        {
            let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
            
            assert!(room.creator == caller, ENotGameCreator);
            assert!(room.status == string::utf8(b"playing"), EGameNotStarted);

            let correct_ans = string::utf8(correct_answer);
            let question_idx = room.current_question - 1;

            // Check each player's answer
            let mut i = 0;
            let players_len = std::vector::length(&room.players);
            
            while (i < players_len) {
                let player = *std::vector::borrow(&room.players, i);
                
                // Skip already eliminated players
                if (!std::vector::contains(&room.eliminated_players, &player)) {
                    let player_answers = vec_map::get(&room.player_answers, &player);
                    
                    if (std::vector::length(player_answers) > question_idx) {
                        let player_answer = *std::vector::borrow(player_answers, question_idx);
                        
                        // Eliminate if wrong answer
                        if (player_answer != correct_ans) {
                            std::vector::push_back(&mut room.eliminated_players, player);
                            
                            event::emit(PlayerEliminated {
                                room_id,
                                player,
                                question_number: room.current_question,
                                correct_answer: correct_ans,
                                player_answer,
                            });
                        };
                    };
                };
                
                i = i + 1;
            };

            // Determine next action
            if (room.current_question >= room.total_questions) {
                should_finish_game = true;
                should_move_to_next = false;
            } else {
                let alive_players = get_alive_players_count(room);
                if (alive_players <= 1) {
                    should_finish_game = true;
                    should_move_to_next = false;
                } else {
                    should_finish_game = false;
                    should_move_to_next = true;
                };
            };
        }; // End of room borrow scope

        // Now we can call functions that need mutable access to platform
        if (should_finish_game) {
            finish_multiplayer_game_internal(platform, room_id);
        } else if (should_move_to_next) {
            let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
            room.current_question = room.current_question + 1;
        };
    }

    /// Internal function to finish multiplayer game
    fun finish_multiplayer_game_internal(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
    ) {
        let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
        room.status = string::utf8(b"finished");
        
        // Find survivors (winners)
        let mut i = 0;
        let players_len = std::vector::length(&room.players);
        
        while (i < players_len) {
            let player = *std::vector::borrow(&room.players, i);
            
            if (!std::vector::contains(&room.eliminated_players, &player)) {
                std::vector::push_back(&mut room.winners, player);
            };
            
            i = i + 1;
        };
    }

    /// Distribute rewards to winners
    public entry fun distribute_multiplayer_rewards(
        platform: &mut GamePlatform,
        room_id: sui::object::ID,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&platform.active_multiplayer_rooms, room_id), EPlayerNotInGame);
        let room = table::borrow_mut(&mut platform.active_multiplayer_rooms, room_id);
        
        assert!(room.status == string::utf8(b"finished"), EGameNotStarted);
        assert!(!room.rewards_distributed, EGameAlreadyFinished);

        let total_prize = balance::value(&room.prize_pool);
        let platform_fee = (total_prize * PLATFORM_FEE_PERCENT) / 100;
        let winner_pool = total_prize - platform_fee;
        
        // Take platform fee
        let fee_balance = balance::split(&mut room.prize_pool, platform_fee);
        balance::join(&mut platform.platform_balance, fee_balance);

        let winners_count = std::vector::length(&room.winners);
        
        if (winners_count > 0) {
            let prize_per_winner = winner_pool / winners_count;
            
            // Distribute to each winner
            let mut i = 0;
            while (i < winners_count) {
                let winner = *std::vector::borrow(&room.winners, i);
                let winner_reward = balance::split(&mut room.prize_pool, prize_per_winner);
                let winner_coin = coin::from_balance(winner_reward, ctx);
                sui::transfer::public_transfer(winner_coin, winner);
                
                i = i + 1;
            };
            
            platform.total_rewards_distributed = platform.total_rewards_distributed + winner_pool;
            
            event::emit(MultiplayerGameFinished {
                room_id,
                winners: room.winners,
                prize_per_winner,
                total_prize_distributed: winner_pool,
            });
        };

        room.rewards_distributed = true;
    }

    // ============ HELPER FUNCTIONS ============

    fun get_alive_players_count(room: &MultiplayerRoom): u64 {
        let total_players = std::vector::length(&room.players);
        let eliminated_count = std::vector::length(&room.eliminated_players);
        total_players - eliminated_count
    }

    // ============ VIEW FUNCTIONS ============

    public fun get_platform_stats(platform: &GamePlatform): (u64, u64, u64) {
        (
            platform.total_games_played,
            platform.total_rewards_distributed,
            balance::value(&platform.platform_balance)
        )
    }

    public fun get_room_info(platform: &GamePlatform, room_id: sui::object::ID): (vector<address>, u64, String, u64) {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        (
            room.players,
            balance::value(&room.prize_pool),
            room.status,
            room.current_question
        )
    }

    public fun get_solo_game_info(platform: &GamePlatform, game_id: sui::object::ID): (address, u64, u64, bool) {
        let game = table::borrow(&platform.active_solo_games, game_id);
        (
            game.player,
            game.score,
            game.questions_answered,
            game.reward_claimed
        )
    }

    // ============ ADMIN FUNCTIONS ============

    /// Add funds to platform pool (admin only)
    public entry fun add_pool_funds(
        platform: &mut GamePlatform,
        funds: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        
        let amount = coin::value(&funds);
        // Add funds to platform balance to increase reward pool
        balance::join(&mut platform.platform_balance, coin::into_balance(funds));
        
        event::emit(PoolFundsAdded {
            admin,
            amount,
            new_balance: balance::value(&platform.platform_balance),
        });
    }

    /// Set platform fee percentage (admin only) - Currently returns current fee
    public entry fun set_platform_fee(
        platform: &mut GamePlatform,
        _new_fee_percent: u64,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        // Note: Fee is currently hardcoded to 10%. To make it dynamic,
        // you would need to add platform_fee_percent to the GamePlatform struct
        // For now, this function exists for frontend compatibility
    }

    /// Withdraw platform earnings (admin only) - renamed for consistency
    public entry fun withdraw_platform_earnings(
        platform: &mut GamePlatform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        assert!(admin == platform.admin, ENotGameCreator);
        assert!(balance::value(&platform.platform_balance) >= amount, EInvalidEntryFee);
        
        let withdraw_balance = balance::split(&mut platform.platform_balance, amount);
        let withdraw_coin = coin::from_balance(withdraw_balance, ctx);
        sui::transfer::public_transfer(withdraw_coin, admin);
        
        event::emit(PlatformEarningsWithdrawn {
            admin,
            amount,
            remaining_balance: balance::value(&platform.platform_balance),
        });
    }

    /// Legacy function for backwards compatibility
    public entry fun withdraw_platform_fees(
        platform: &mut GamePlatform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        withdraw_platform_earnings(platform, amount, ctx);
    }

    public entry fun update_admin(
        platform: &mut GamePlatform,
        new_admin: address,
        ctx: &mut TxContext
    ) {
        let current_admin = sui::tx_context::sender(ctx);
        assert!(current_admin == platform.admin, ENotGameCreator);
        platform.admin = new_admin;
    }

    // Additional helper functions for better error handling
    public entry fun transfer_sui_coin(
        coin: Coin<SUI>,
        recipient: address,
        _ctx: &mut TxContext
    ) {
        sui::transfer::public_transfer(coin, recipient);
    }

    // ============ TEST HELPER FUNCTIONS ============

    #[test_only]
    /// Test initializer function
    public fun test_init(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only] 
    /// Get admin address for testing
    public fun get_admin(platform: &GamePlatform): address {
        platform.admin
    }

    #[test_only]
    /// Get total games played for testing
    public fun get_total_games_played(platform: &GamePlatform): u64 {
        platform.total_games_played
    }

    #[test_only]
    /// Get platform balance for testing
    public fun get_platform_balance(platform: &GamePlatform): u64 {
        balance::value(&platform.platform_balance)
    }

    #[test_only]
    /// Get total rewards distributed for testing
    public fun get_total_rewards_distributed(platform: &GamePlatform): u64 {
        platform.total_rewards_distributed
    }

    // ============ CONSTANT GETTERS FOR TESTING ============

    #[test_only]
    /// Get minimum entry fee for testing
    public fun get_min_entry_fee(): u64 {
        MIN_ENTRY_FEE
    }

    #[test_only]
    /// Get maximum entry fee for testing
    public fun get_max_entry_fee(): u64 {
        MAX_ENTRY_FEE
    }

    #[test_only]
    /// Get platform fee percentage for testing
    public fun get_platform_fee_percent(): u64 {
        PLATFORM_FEE_PERCENT
    }

    #[test_only]
    /// Get max players per room for testing
    public fun get_max_players_per_room(): u64 {
        MAX_PLAYERS_PER_ROOM
    }

    // ============ VALIDATION FUNCTIONS FOR TESTING ============

    #[test_only]
    /// Test if entry fee is valid
    public fun is_valid_entry_fee(fee: u64): bool {
        fee >= MIN_ENTRY_FEE && fee <= MAX_ENTRY_FEE
    }

    #[test_only]
    /// Calculate platform fee for testing
    public fun calculate_platform_fee(amount: u64): u64 {
        (amount * PLATFORM_FEE_PERCENT) / 100
    }

    #[test_only]
    /// Calculate solo reward amount for testing
    public fun calculate_solo_reward(correct_answers: u64): u64 {
        correct_answers * 100000000 // 0.1 SUI per correct answer
    }

    #[test_only]
    /// Check if solo game exists for testing
    public fun has_solo_game(platform: &GamePlatform, game_id: sui::object::ID): bool {
        table::contains(&platform.active_solo_games, game_id)
    }

    #[test_only]
    /// Check if multiplayer room exists for testing
    public fun has_multiplayer_room(platform: &GamePlatform, room_id: sui::object::ID): bool {
        table::contains(&platform.active_multiplayer_rooms, room_id)
    }

    #[test_only]
    /// Get solo game player for testing
    public fun get_solo_game_player(platform: &GamePlatform, game_id: sui::object::ID): address {
        let game = table::borrow(&platform.active_solo_games, game_id);
        game.player
    }

    #[test_only]
    /// Get solo game score for testing
    public fun get_solo_game_score(platform: &GamePlatform, game_id: sui::object::ID): u64 {
        let game = table::borrow(&platform.active_solo_games, game_id);
        game.score
    }

    #[test_only]
    /// Get solo game entry fee for testing
    public fun get_solo_game_entry_fee(platform: &GamePlatform, game_id: sui::object::ID): u64 {
        let game = table::borrow(&platform.active_solo_games, game_id);
        game.entry_fee
    }

    #[test_only]
    /// Get solo game type for testing
    public fun get_solo_game_type(platform: &GamePlatform, game_id: sui::object::ID): String {
        let game = table::borrow(&platform.active_solo_games, game_id);
        game.game_type
    }

    #[test_only]
    /// Check if solo game reward is claimed
    public fun is_solo_game_reward_claimed(platform: &GamePlatform, game_id: sui::object::ID): bool {
        let game = table::borrow(&platform.active_solo_games, game_id);
        game.reward_claimed
    }

    #[test_only]
    /// Get multiplayer room creator for testing
    public fun get_room_creator(platform: &GamePlatform, room_id: sui::object::ID): address {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.creator
    }

    #[test_only]
    /// Get multiplayer room status for testing
    public fun get_room_status(platform: &GamePlatform, room_id: sui::object::ID): String {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.status
    }

    #[test_only]
    /// Get room players count for testing
    public fun get_room_players_count(platform: &GamePlatform, room_id: sui::object::ID): u64 {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        std::vector::length(&room.players)
    }

    #[test_only]
    /// Get room entry fee for testing
    public fun get_room_entry_fee(platform: &GamePlatform, room_id: sui::object::ID): u64 {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.entry_fee
    }

    #[test_only]
    /// Get room max players for testing
    public fun get_room_max_players(platform: &GamePlatform, room_id: sui::object::ID): u64 {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.max_players
    }

    #[test_only]
    /// Check if player is in room
    public fun is_player_in_room(platform: &GamePlatform, room_id: sui::object::ID, player: address): bool {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        std::vector::contains(&room.players, &player)
    }

    #[test_only]
    /// Check if player is eliminated
    public fun is_player_eliminated(platform: &GamePlatform, room_id: sui::object::ID, player: address): bool {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        std::vector::contains(&room.eliminated_players, &player)
    }

    #[test_only]
    /// Get room current question number
    public fun get_room_current_question(platform: &GamePlatform, room_id: sui::object::ID): u64 {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.current_question
    }

    #[test_only]
    /// Get room total questions
    public fun get_room_total_questions(platform: &GamePlatform, room_id: sui::object::ID): u64 {
        let room = table::borrow(&platform.active_multiplayer_rooms, room_id);
        room.total_questions
    }
}