/***
 * Static curated practice sets used by the Suggestions tab.
 *
 * Nothing here is user data - it is a bundled reference list that gets matched
 * against chrome.storage.local 'history' by problem slug.
 *
 * Each entry is a compact tuple to keep this file readable:
 *   [slug, title, difficulty, group, premium?]
 *     slug       - the LeetCode URL slug, i.e. leetcode.com/problems/<slug>/
 *     difficulty - "Easy" | "Medium" | "Hard" (matches the values we record)
 *     group      - topic for Blind 75, week for Grind 75
 *     premium    - true when the problem is behind LeetCode Premium
 */

const PRACTICE_SET_TUPLES = {
    blind75: [
        // Array
        ["two-sum", "Two Sum", "Easy", "Array"],
        ["best-time-to-buy-and-sell-stock", "Best Time to Buy and Sell Stock", "Easy", "Array"],
        ["contains-duplicate", "Contains Duplicate", "Easy", "Array"],
        ["product-of-array-except-self", "Product of Array Except Self", "Medium", "Array"],
        ["maximum-subarray", "Maximum Subarray", "Medium", "Array"],
        ["maximum-product-subarray", "Maximum Product Subarray", "Medium", "Array"],
        ["find-minimum-in-rotated-sorted-array", "Find Minimum in Rotated Sorted Array", "Medium", "Array"],
        ["search-in-rotated-sorted-array", "Search in Rotated Sorted Array", "Medium", "Array"],
        ["3sum", "3Sum", "Medium", "Array"],
        ["container-with-most-water", "Container With Most Water", "Medium", "Array"],

        // Binary
        ["sum-of-two-integers", "Sum of Two Integers", "Medium", "Binary"],
        ["number-of-1-bits", "Number of 1 Bits", "Easy", "Binary"],
        ["counting-bits", "Counting Bits", "Easy", "Binary"],
        ["missing-number", "Missing Number", "Easy", "Binary"],
        ["reverse-bits", "Reverse Bits", "Easy", "Binary"],

        // Dynamic Programming
        ["climbing-stairs", "Climbing Stairs", "Easy", "Dynamic Programming"],
        ["coin-change", "Coin Change", "Medium", "Dynamic Programming"],
        ["longest-increasing-subsequence", "Longest Increasing Subsequence", "Medium", "Dynamic Programming"],
        ["longest-common-subsequence", "Longest Common Subsequence", "Medium", "Dynamic Programming"],
        ["word-break", "Word Break", "Medium", "Dynamic Programming"],
        ["combination-sum-iv", "Combination Sum IV", "Medium", "Dynamic Programming"],
        ["house-robber", "House Robber", "Medium", "Dynamic Programming"],
        ["house-robber-ii", "House Robber II", "Medium", "Dynamic Programming"],
        ["decode-ways", "Decode Ways", "Medium", "Dynamic Programming"],
        ["unique-paths", "Unique Paths", "Medium", "Dynamic Programming"],
        ["jump-game", "Jump Game", "Medium", "Dynamic Programming"],

        // Graph
        ["clone-graph", "Clone Graph", "Medium", "Graph"],
        ["course-schedule", "Course Schedule", "Medium", "Graph"],
        ["pacific-atlantic-water-flow", "Pacific Atlantic Water Flow", "Medium", "Graph"],
        ["number-of-islands", "Number of Islands", "Medium", "Graph"],
        ["longest-consecutive-sequence", "Longest Consecutive Sequence", "Medium", "Graph"],
        ["alien-dictionary", "Alien Dictionary", "Hard", "Graph", true],
        ["graph-valid-tree", "Graph Valid Tree", "Medium", "Graph", true],
        ["number-of-connected-components-in-an-undirected-graph", "Number of Connected Components in an Undirected Graph", "Medium", "Graph", true],

        // Interval
        ["insert-interval", "Insert Interval", "Medium", "Interval"],
        ["merge-intervals", "Merge Intervals", "Medium", "Interval"],
        ["non-overlapping-intervals", "Non-overlapping Intervals", "Medium", "Interval"],
        ["meeting-rooms", "Meeting Rooms", "Easy", "Interval", true],
        ["meeting-rooms-ii", "Meeting Rooms II", "Medium", "Interval", true],

        // Linked List
        ["reverse-linked-list", "Reverse a Linked List", "Easy", "Linked List"],
        ["linked-list-cycle", "Detect Cycle in a Linked List", "Easy", "Linked List"],
        ["merge-two-sorted-lists", "Merge Two Sorted Lists", "Easy", "Linked List"],
        ["merge-k-sorted-lists", "Merge K Sorted Lists", "Hard", "Linked List"],
        ["remove-nth-node-from-end-of-list", "Remove Nth Node From End Of List", "Medium", "Linked List"],
        ["reorder-list", "Reorder List", "Medium", "Linked List"],

        // Matrix
        ["set-matrix-zeroes", "Set Matrix Zeroes", "Medium", "Matrix"],
        ["spiral-matrix", "Spiral Matrix", "Medium", "Matrix"],
        ["rotate-image", "Rotate Image", "Medium", "Matrix"],
        ["word-search", "Word Search", "Medium", "Matrix"],

        // String
        ["longest-substring-without-repeating-characters", "Longest Substring Without Repeating Characters", "Medium", "String"],
        ["longest-repeating-character-replacement", "Longest Repeating Character Replacement", "Medium", "String"],
        ["minimum-window-substring", "Minimum Window Substring", "Hard", "String"],
        ["valid-anagram", "Valid Anagram", "Easy", "String"],
        ["group-anagrams", "Group Anagrams", "Medium", "String"],
        ["valid-parentheses", "Valid Parentheses", "Easy", "String"],
        ["valid-palindrome", "Valid Palindrome", "Easy", "String"],
        ["longest-palindromic-substring", "Longest Palindromic Substring", "Medium", "String"],
        ["palindromic-substrings", "Palindromic Substrings", "Medium", "String"],
        ["encode-and-decode-strings", "Encode and Decode Strings", "Medium", "String", true],

        // Tree
        ["maximum-depth-of-binary-tree", "Maximum Depth of Binary Tree", "Easy", "Tree"],
        ["same-tree", "Same Tree", "Easy", "Tree"],
        ["invert-binary-tree", "Invert / Flip Binary Tree", "Easy", "Tree"],
        ["binary-tree-maximum-path-sum", "Binary Tree Maximum Path Sum", "Hard", "Tree"],
        ["binary-tree-level-order-traversal", "Binary Tree Level Order Traversal", "Medium", "Tree"],
        ["serialize-and-deserialize-binary-tree", "Serialize and Deserialize Binary Tree", "Hard", "Tree"],
        ["subtree-of-another-tree", "Subtree of Another Tree", "Easy", "Tree"],
        ["construct-binary-tree-from-preorder-and-inorder-traversal", "Construct Binary Tree from Preorder and Inorder Traversal", "Medium", "Tree"],
        ["validate-binary-search-tree", "Validate Binary Search Tree", "Medium", "Tree"],
        ["kth-smallest-element-in-a-bst", "Kth Smallest Element in a BST", "Medium", "Tree"],
        ["lowest-common-ancestor-of-a-binary-search-tree", "Lowest Common Ancestor of BST", "Medium", "Tree"],
        ["implement-trie-prefix-tree", "Implement Trie (Prefix Tree)", "Medium", "Tree"],
        ["design-add-and-search-words-data-structure", "Add and Search Word", "Medium", "Tree"],
        ["word-search-ii", "Word Search II", "Hard", "Tree"],

        // Heap
        ["top-k-frequent-elements", "Top K Frequent Elements", "Medium", "Heap"],
        ["find-median-from-data-stream", "Find Median from Data Stream", "Hard", "Heap"]
    ],

    grind75: [
        // Week 1
        ["two-sum", "Two Sum", "Easy", "Week 1"],
        ["valid-parentheses", "Valid Parentheses", "Easy", "Week 1"],
        ["merge-two-sorted-lists", "Merge Two Sorted Lists", "Easy", "Week 1"],
        ["best-time-to-buy-and-sell-stock", "Best Time to Buy and Sell Stock", "Easy", "Week 1"],
        ["valid-palindrome", "Valid Palindrome", "Easy", "Week 1"],
        ["invert-binary-tree", "Invert Binary Tree", "Easy", "Week 1"],
        ["valid-anagram", "Valid Anagram", "Easy", "Week 1"],
        ["binary-search", "Binary Search", "Easy", "Week 1"],
        ["flood-fill", "Flood Fill", "Easy", "Week 1"],
        ["lowest-common-ancestor-of-a-binary-search-tree", "Lowest Common Ancestor of a Binary Search Tree", "Easy", "Week 1"],
        ["balanced-binary-tree", "Balanced Binary Tree", "Easy", "Week 1"],
        ["linked-list-cycle", "Linked List Cycle", "Easy", "Week 1"],
        ["implement-queue-using-stacks", "Implement Queue using Stacks", "Easy", "Week 1"],

        // Week 2
        ["first-bad-version", "First Bad Version", "Easy", "Week 2"],
        ["ransom-note", "Ransom Note", "Easy", "Week 2"],
        ["climbing-stairs", "Climbing Stairs", "Easy", "Week 2"],
        ["longest-palindrome", "Longest Palindrome", "Easy", "Week 2"],
        ["reverse-linked-list", "Reverse Linked List", "Easy", "Week 2"],
        ["majority-element", "Majority Element", "Easy", "Week 2"],
        ["add-binary", "Add Binary", "Easy", "Week 2"],
        ["diameter-of-binary-tree", "Diameter of Binary Tree", "Easy", "Week 2"],
        ["middle-of-the-linked-list", "Middle of the Linked List", "Easy", "Week 2"],
        ["maximum-depth-of-binary-tree", "Maximum Depth of Binary Tree", "Easy", "Week 2"],
        ["contains-duplicate", "Contains Duplicate", "Easy", "Week 2"],

        // Week 3
        ["maximum-subarray", "Maximum Subarray", "Medium", "Week 3"],
        ["insert-interval", "Insert Interval", "Medium", "Week 3"],
        ["01-matrix", "01 Matrix", "Medium", "Week 3"],
        ["k-closest-points-to-origin", "K Closest Points to Origin", "Medium", "Week 3"],
        ["longest-substring-without-repeating-characters", "Longest Substring Without Repeating Characters", "Medium", "Week 3"],
        ["3sum", "3Sum", "Medium", "Week 3"],
        ["binary-tree-level-order-traversal", "Binary Tree Level Order Traversal", "Medium", "Week 3"],
        ["clone-graph", "Clone Graph", "Medium", "Week 3"],
        ["evaluate-reverse-polish-notation", "Evaluate Reverse Polish Notation", "Medium", "Week 3"],

        // Week 4
        ["course-schedule", "Course Schedule", "Medium", "Week 4"],
        ["implement-trie-prefix-tree", "Implement Trie (Prefix Tree)", "Medium", "Week 4"],
        ["coin-change", "Coin Change", "Medium", "Week 4"],
        ["product-of-array-except-self", "Product of Array Except Self", "Medium", "Week 4"],
        ["min-stack", "Min Stack", "Medium", "Week 4"],
        ["validate-binary-search-tree", "Validate Binary Search Tree", "Medium", "Week 4"],
        ["number-of-islands", "Number of Islands", "Medium", "Week 4"],
        ["rotting-oranges", "Rotting Oranges", "Medium", "Week 4"],

        // Week 5
        ["search-in-rotated-sorted-array", "Search in Rotated Sorted Array", "Medium", "Week 5"],
        ["combination-sum", "Combination Sum", "Medium", "Week 5"],
        ["permutations", "Permutations", "Medium", "Week 5"],
        ["merge-intervals", "Merge Intervals", "Medium", "Week 5"],
        ["lowest-common-ancestor-of-a-binary-tree", "Lowest Common Ancestor of a Binary Tree", "Medium", "Week 5"],
        ["time-based-key-value-store", "Time Based Key-Value Store", "Medium", "Week 5"],
        ["accounts-merge", "Accounts Merge", "Medium", "Week 5"],
        ["sort-colors", "Sort Colors", "Medium", "Week 5"],

        // Week 6
        ["word-break", "Word Break", "Medium", "Week 6"],
        ["partition-equal-subset-sum", "Partition Equal Subset Sum", "Medium", "Week 6"],
        ["string-to-integer-atoi", "String to Integer (atoi)", "Medium", "Week 6"],
        ["spiral-matrix", "Spiral Matrix", "Medium", "Week 6"],
        ["subsets", "Subsets", "Medium", "Week 6"],
        ["binary-tree-right-side-view", "Binary Tree Right Side View", "Medium", "Week 6"],
        ["longest-palindromic-substring", "Longest Palindromic Substring", "Medium", "Week 6"],
        ["unique-paths", "Unique Paths", "Medium", "Week 6"],
        ["construct-binary-tree-from-preorder-and-inorder-traversal", "Construct Binary Tree from Preorder and Inorder Traversal", "Medium", "Week 6"],

        // Week 7
        ["container-with-most-water", "Container With Most Water", "Medium", "Week 7"],
        ["letter-combinations-of-a-phone-number", "Letter Combinations of a Phone Number", "Medium", "Week 7"],
        ["word-search", "Word Search", "Medium", "Week 7"],
        ["find-all-anagrams-in-a-string", "Find All Anagrams in a String", "Medium", "Week 7"],
        ["minimum-height-trees", "Minimum Height Trees", "Medium", "Week 7"],
        ["task-scheduler", "Task Scheduler", "Medium", "Week 7"],
        ["lru-cache", "LRU Cache", "Medium", "Week 7"],

        // Week 8
        ["kth-smallest-element-in-a-bst", "Kth Smallest Element in a BST", "Medium", "Week 8"],
        ["minimum-window-substring", "Minimum Window Substring", "Hard", "Week 8"],
        ["serialize-and-deserialize-binary-tree", "Serialize and Deserialize Binary Tree", "Hard", "Week 8"],
        ["trapping-rain-water", "Trapping Rain Water", "Hard", "Week 8"],
        ["find-median-from-data-stream", "Find Median from Data Stream", "Hard", "Week 8"],
        ["word-ladder", "Word Ladder", "Hard", "Week 8"],
        ["basic-calculator", "Basic Calculator", "Hard", "Week 8"],
        ["maximum-profit-in-job-scheduling", "Maximum Profit in Job Scheduling", "Hard", "Week 8"],
        ["merge-k-sorted-lists", "Merge k Sorted Lists", "Hard", "Week 8"],
        ["largest-rectangle-in-histogram", "Largest Rectangle in Histogram", "Hard", "Week 8"]
    ]
};

function expandPracticeSet(tuples) {
    return tuples.map(t => ({
        slug: t[0],
        title: t[1],
        difficulty: t[2],
        group: t[3],
        premium: t[4] === true,
        url: "https://leetcode.com/problems/" + t[0] + "/"
    }));
}

const PRACTICE_SETS = {
    blind75: {
        key: "blind75",
        name: "Blind 75",
        blurb: "The original curated 75 from the Blind forum. Grouped by topic - good for shoring up a weak pattern.",
        groupLabel: "Topic",
        problems: expandPracticeSet(PRACTICE_SET_TUPLES.blind75)
    },
    grind75: {
        key: "grind75",
        name: "Grind 75",
        blurb: "Tech Interview Handbook's 8-week ordered plan. Grouped by week - good for working straight through.",
        groupLabel: "Week",
        problems: expandPracticeSet(PRACTICE_SET_TUPLES.grind75)
    }
};
