import math

def nCr(n, r):
    if r < 0 or r > n:
        return 0
    return math.comb(n, r)

def calculate_ev_factor(total_cards, target_count):
    # Denominator for Total Outcomes
    total_combinations = nCr(total_cards, target_count)

    # Reward Denominator (Total - Target)
    reward_denom = total_cards - target_count

    total_weighted_sum = 0

    # Iterate through all possible finish positions k
    # k is the number of cards revealed to find all targets.
    # Min k = target_count (Perfect game)
    # Max k = total_cards (Worst game, actually gives 0 reward usually)
    # Actually max k is total_cards. But if k=total_cards, reward is 0.

    # Formula for P(X=k): The probability that the T-th target is found on the k-th draw.
    # We choose T-1 targets from the first k-1 positions.
    # The k-th position IS a target.
    # We choose (k-1) - (T-1) = k - T duds from the (Total - Target) available duds.
    # Denominator: nCr(Total, Target) is wrong for permutations?
    # No, Combinations works if we consider the set of indices.
    # Total ways to place T targets in N slots is nCr(N, T).
    # Ways to have T-th target at index k:
    # 1. Place T-th target at k. (1 way)
    # 2. Place remaining T-1 targets in first k-1 slots. (nCr(k-1, T-1) ways)
    # 3. The duds naturally fill the rest.

    # So P(k) = nCr(k-1, target_count-1) / nCr(total_cards, target_count)

    print(f"\nMode: {target_count}/{total_cards}")
    print(f"Total Combinations: {total_combinations}")

    sum_prob = 0

    for k in range(target_count, total_cards + 1):
        # Probability
        ways = nCr(k - 1, target_count - 1)
        prob = ways / total_combinations
        sum_prob += prob

        # Reward Factor
        # Formula: ((N - k) / (N - T))^2
        # But wait, logic says clampedFactor = min(1, factor).
        # N-k / N-T.
        # If k=T, factor=1.
        # If k=T+1, factor < 1.
        # So it's always <= 1.

        factor = (total_cards - k) / reward_denom if reward_denom > 0 else 0
        factor = max(0, factor) # Should not be negative but just in case

        decayed_factor = factor ** 2

        contribution = prob * decayed_factor
        total_weighted_sum += contribution

        # print(f"k={k}: P={prob:.5f}, Factor={decayed_factor:.5f}, Contrib={contribution:.5f}")

    print(f"Sum Prob: {sum_prob:.5f}")
    print(f"EV Factor: {total_weighted_sum:.5f}")
    return total_weighted_sum

def solve_for_max_prize(cost, target_rtp, ev_factor):
    # EV = MaxPrize * EV_Factor
    # Target EV = Cost * RTP
    # MaxPrize = (Cost * RTP) / EV_Factor
    return (cost * target_rtp) / ev_factor

def main():
    modes = [
        {"name": "2/4", "total": 4, "target": 2, "cost": 50},
        {"name": "4/10", "total": 10, "target": 4, "cost": 100},
        {"name": "6/20", "total": 20, "target": 6, "cost": 500},
    ]

    results = []

    for mode in modes:
        factor = calculate_ev_factor(mode['total'], mode['target'])
        new_max = solve_for_max_prize(mode['cost'], 0.99, factor)
        print(f"-> Calculated Max Prize for {mode['name']}: {new_max:.2f}")
        results.append(int(new_max))

    print("\nFinal Recommended Prizes:")
    for i, mode in enumerate(modes):
        print(f"{mode['name']}: {results[i]}")

if __name__ == "__main__":
    main()
