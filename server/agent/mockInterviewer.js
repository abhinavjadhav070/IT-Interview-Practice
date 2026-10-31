const db = require('../db/database');
const AnalyticsEngine = require('../services/analyticsEngine');
const LLMProvider = require('./llmProvider');
const crypto = require('node:crypto');

/**
 * STRATA Rubric-Based Mock Interview Engine
 * 
 * Evaluates candidate responses across 4 scored dimensions:
 *   1. Correctness  — factual accuracy & misconception detection
 *   2. Completeness — coverage of mandatory must-hit concepts
 *   3. Clarity      — communication structure, depth, and terminology
 *   4. Edge-Case Depth — complexity invariants & boundary conditions
 * 
 * Produces:
 *   - Dimension scores (0-100)
 *   - Specific incorrect claims named & corrected
 *   - Missing critical points identified
 *   - Dynamic interviewer follow-up questions tailored to the candidate's actual words
 *   - Model / Gold-Standard answer
 */

class MockInterviewer {

    static INTERVIEW_BANKS = {
        Technical: [
            {
                q: "Can you explain how a HashMap handles collisions internally, and what happens when the load factor threshold is breached?",
                topic: "Data Structures & Hashing",
                difficulty: "Medium",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "chaining", label: "Chaining or Open Addressing collision strategy", keywords: ["separate chaining", "chaining", "linked list bucket", "open addressing", "linear probing", "quadratic probing"] },
                        { id: "loadfactor", label: "Load factor threshold (default 0.75 in Java)", keywords: ["load factor", "0.75", "capacity threshold"] },
                        { id: "rehash", label: "Rehashing triggered when load factor is exceeded — O(n) amortized cost", keywords: ["rehash", "rehashing", "doubles the capacity", "doubles in size", "doubling capacity"] },
                        { id: "treeify", label: "Java 8+ treeification of long chains into Red-Black trees (O(log n) worst case)", keywords: ["treeif", "red-black", "balanced tree", "convert to tree", "rbtree"] },
                    ],
                    shouldHit: [
                        { id: "hash_fn", label: "Role of the hash function in distributing keys uniformly", keywords: ["hash function", "uniform", "distribution", "mod", "modulo"] },
                        { id: "worst_case", label: "Worst-case O(n) collision degradation before treeification", keywords: ["worst case", "o(n)", "all same bucket", "degenerate"] },
                    ],
                    wrongIfSaid: [
                        { claim: "HashMap uses binary search trees by default for every bucket", correction: "Buckets start as linked lists; only treeify when a single bucket exceeds 8 entries (Java 8+)." },
                        { claim: "Load factor is not important or does not resize automatically", correction: "Load factor is critical: it controls when rehashing occurs. Java HashMaps automatically double capacity when the threshold (0.75) is breached." },
                        { claim: "Load factor should always be 1.0 for best performance", correction: "A load factor of 1.0 means the table is full before resizing, maximizing collisions. The default 0.75 balances space and time." },
                        { claim: "HashMap allows only one value per key", correction: "Correct for values, but keys must be unique. Multiple values per key require a Multimap or Map<K, List<V>>." },
                    ],
                    modelAnswer: `A HashMap handles collisions by default using **separate chaining**: each bucket (array slot) holds a linked list of key-value entries that hash to the same index.

**Load Factor & Rehashing:** When the number of entries exceeds (capacity × load_factor) — default 0.75 — the table **doubles in capacity** and all existing entries are rehashed into the new array. Rehashing is O(n) but amortized O(1) per insertion over many operations.

**Java 8 Treeification:** If a single bucket's chain exceeds 8 nodes, the linked list is converted to a **Red-Black Tree**, reducing worst-case lookup in that bucket from O(n) to O(log n).

**Worst-case degradation:** If all keys hash to the same bucket (e.g., pathological hash function), lookup degrades to O(n) before treeification kicks in.`
                }
            },
            {
                q: "What is the difference between optimistic and pessimistic locking in database transactions? When would you choose which?",
                topic: "DBMS & Transactions",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "pessimistic_def", label: "Pessimistic locking acquires exclusive row/table locks before reads/writes", keywords: ["exclusive lock", "row lock", "select for update", "block", "prevent concurrent"] },
                        { id: "optimistic_def", label: "Optimistic locking uses version numbers or timestamps; validates at commit time", keywords: ["version", "timestamp", "conflict check", "at commit", "check before write", "compareandset"] },
                        { id: "optimistic_use", label: "Optimistic is best for high-read / low-contention workloads", keywords: ["high read", "low contention", "read heavy", "few conflicts"] },
                        { id: "pessimistic_use", label: "Pessimistic is best for high-contention write workloads to prevent dirty reads", keywords: ["high contention", "write heavy", "conflict prone", "financial", "inventory"] },
                    ],
                    shouldHit: [
                        { id: "optimistic_rollback", label: "Optimistic locking may require transaction retry on conflict", keywords: ["retry", "rollback", "conflict detected", "stale read"] },
                        { id: "deadlock", label: "Pessimistic locking can cause deadlocks requiring timeout or deadlock detection", keywords: ["deadlock", "cycle", "wait-for", "timeout"] },
                    ],
                    wrongIfSaid: [
                        { claim: "Optimistic locking is always faster than pessimistic", correction: "Optimistic locking forces full transaction retry on conflict. Under high contention this causes more throughput loss than pessimistic locking, which serializes correctly the first time." },
                        { claim: "Pessimistic locking prevents all consistency problems", correction: "Pessimistic locking can cause deadlocks and severely reduces concurrency. It prevents dirty/non-repeatable reads within locked scopes only." },
                    ],
                    modelAnswer: `**Pessimistic Locking:** Acquires exclusive locks on rows/tables before any read or write. Uses \`SELECT ... FOR UPDATE\`. Other transactions block until the lock is released at commit or rollback. Best for high-contention scenarios (banking, inventory updates) where conflicts are frequent and retrying is expensive.

**Optimistic Locking:** Reads proceed without any lock. A \`version\` column (or timestamp) is incremented on every update. At commit time, the transaction checks that the version it read matches the current DB version. If another transaction committed first, the version mismatches and the current transaction is aborted and retried.

**Decision rule:**
- High read / low write contention → **Optimistic** (no blocking overhead during reads).
- High write contention or critical financial writes → **Pessimistic** (deterministic serialization, no retry storms).`
                }
            },
            {
                q: "In an operating system, what is the exact difference between a process and a thread, and how does context switching overhead differ between the two?",
                topic: "Operating Systems",
                difficulty: "Medium",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "address_space", label: "Process has its own isolated virtual address space; threads share the parent process's address space", keywords: ["address space", "virtual memory", "isolated", "shared memory", "heap"] },
                        { id: "tlb_flush", label: "Process context switch flushes the TLB (Translation Lookaside Buffer), causing cache misses", keywords: ["tlb", "translation lookaside", "cache miss", "flush", "mmu"] },
                        { id: "thread_switch", label: "Thread context switch is cheaper — TLB is preserved since address space is shared", keywords: ["thread switch", "same address space", "no tlb flush", "cheaper", "lightweight"] },
                        { id: "resources", label: "Processes own file descriptors, signal handlers, PID; threads share these within a process", keywords: ["file descriptor", "pid", "signal", "shared", "own resources"] },
                    ],
                    shouldHit: [
                        { id: "pcb_tcb", label: "OS stores Process Control Block (PCB) / Thread Control Block (TCB) with register state", keywords: ["pcb", "tcb", "control block", "register state", "stack pointer"] },
                        { id: "creation_cost", label: "Process creation (fork) is more expensive than thread creation (pthread_create)", keywords: ["fork", "pthread", "creation overhead", "clone", "spawn"] },
                    ],
                    wrongIfSaid: [
                        { claim: "Threads have their own separate heap memory", correction: "Threads within the same process share the heap. Only the stack is per-thread." },
                        { claim: "A process context switch is only slightly more expensive than a thread switch", correction: "TLB flush on process switch can cause hundreds of extra cache misses per switch. The difference is significant under high switch rates." },
                    ],
                    modelAnswer: `**Process:** An independent execution unit with its own virtual address space, page tables, file descriptors, and PID. Two processes cannot read each other's memory without IPC mechanisms.

**Thread:** A lightweight execution unit within a process, sharing the process's heap, code segment, file descriptors, and page tables. Each thread has its own stack and register set.

**Context Switch Overhead:**
- **Process switch:** The OS must switch page tables (CR3 register on x86), flush the TLB, and reload the memory mapping. This causes cascading L1/L2 cache misses until the working set rewarms — expensive.
- **Thread switch:** Since threads share the same address space, no page table or TLB switch is needed. Only registers and the stack pointer change — far cheaper.

Empirically, process switches can be 3–10× more expensive than thread switches at high switch rates.`
                }
            }
        ],

        JavaFoundation: [
            {
                q: "How does Java 8+ ConcurrentHashMap achieve high write concurrency without locking the entire table? Contrast it with Hashtable and Collections.synchronizedMap.",
                topic: "Java Collections & Concurrency",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "cas_empty", label: "Lock-free CAS (Compare-And-Swap) for empty bucket insertion", keywords: ["cas", "compare-and-swap", "compare and swap", "lock free", "empty bucket", "first node"] },
                        { id: "sync_node", label: "Synchronized block on only the specific bucket head node for hash collisions", keywords: ["synchronized on head", "head node", "bucket level", "node lock", "synchronized block"] },
                        { id: "volatile_read", label: "Lock-free reads using volatile value and next pointers", keywords: ["volatile", "lock free read", "lockless read", "no lock on get"] },
                        { id: "table_lock_diff", label: "Hashtable and synchronizedMap lock the entire table on every single read/write operation", keywords: ["hashtable", "synchronizedmap", "global lock", "entire table", "single lock", "monitor lock"] }
                    ],
                    shouldHit: [
                        { id: "treeify_concurrent", label: "Maintains Red-Black trees when single bucket exceeds 8 entries", keywords: ["treeify", "red-black", "treebin", "tree node"] },
                        { id: "striped_counter", label: "Uses LongAdder/CounterCell striped counters for size() without bottleneck", keywords: ["countercell", "size()", "striped", "longadder"] }
                    ],
                    wrongIfSaid: [
                        { claim: "ConcurrentHashMap uses 16 segment locks in Java 8 and newer", correction: "Segment locks (ReentrantLock segments) were used in Java 7. Java 8 replaced them with CAS + bucket-head synchronized blocks." },
                        { claim: "ConcurrentHashMap locks the table during read operations", correction: "Reads in ConcurrentHashMap are completely non-blocking and lock-free due to volatile memory visibility." }
                    ],
                    modelAnswer: `**ConcurrentHashMap (Java 8+):**
1. **CAS for Empty Buckets:** When inserting into an empty bucket, it uses \`Unsafe.compareAndSwapObject\` — zero locking overhead.
2. **Fine-Grained Node Locking:** On hash collisions, it locks *only the first node of that specific bucket* using a \`synchronized(node)\` block. Threads modifying different buckets never block each other.
3. **Lock-Free Reads:** Table array elements, node values, and \`next\` pointers are declared \`volatile\`, allowing \`get()\` operations to execute without acquiring any lock.

**Contrast with Hashtable / Collections.synchronizedMap:** Both wrap every method in a coarse-grained global lock on the map instance (\`this\`), bottlenecking all concurrent reads and writes into a single-threaded queue.`
                }
            },
            {
                q: "Explain the difference between Heap memory and Metaspace in the JVM. What causes an OutOfMemoryError: Metaspace, and how do you diagnose it?",
                topic: "JVM Architecture & Memory Management",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "heap_vs_meta", label: "Heap stores object instances; Metaspace stores class metadata, bytecodes, and method tables in native off-heap RAM", keywords: ["object instance", "class metadata", "native memory", "off-heap", "bytecode", "method table"] },
                        { id: "meta_cause", label: "Metaspace OOM is caused by classloader memory leaks (dynamic proxy generation, reflection, or unreleased redeployments)", keywords: ["classloader leak", "dynamic proxy", "cglib", "reflection", "redeploy", "too many classes"] },
                        { id: "meta_flags", label: "Tuned via -XX:MaxMetaspaceSize and diagnosed with jcmd GC.class_stats / heap dumps", keywords: ["maxmetaspacesize", "jcmd", "class stats", "heap dump", "jstat"] }
                    ],
                    shouldHit: [
                        { id: "permgen_diff", label: "Replaced PermGen in Java 8 to auto-expand within OS virtual memory limits", keywords: ["permgen", "java 8", "auto expand", "native ram"] }
                    ],
                    wrongIfSaid: [
                        { claim: "Metaspace is stored inside the JVM heap space", correction: "Metaspace is stored in native OS memory outside the contiguous JVM heap (unlike the obsolete Java 7 PermGen)." },
                        { claim: "Metaspace stores static variables in Java 8+", correction: "In Java 8+, static variables and interned Strings were moved to the regular Java Heap; Metaspace holds class metadata and method bytecodes." }
                    ],
                    modelAnswer: `**JVM Heap vs Metaspace:**
- **Heap Space:** Holds all live Java object instances, arrays, static fields, and the interned string pool. Managed by the garbage collector (Eden, Survivor, Tenured).
- **Metaspace (Java 8+):** Stored in **native OS memory** (off-heap). Holds class metadata, constant pools, method bytecodes, and annotations.

**Causes of OutOfMemoryError: Metaspace:**
1. **Classloader Leaks:** Application servers repeatedly deploying apps without recycling classloaders.
2. **Dynamic Bytecode Generation:** Heavy use of CGLIB, ByteBuddy, Spring AOP, or runtime proxies generating unbounded unique class definitions.

**Diagnosis & Remediation:**
- Inspect class counts using \`jcmd <PID> VM.classloader_stats\` and \`jstat -class <PID>\`.
- Set an upper bound with \`-XX:MaxMetaspaceSize=512m\` and analyze classloader references in Eclipse Memory Analyzer (MAT).`
                }
            }
        ],

        SpringBoot: [
            {
                q: "What is the N+1 select problem in Spring Data JPA? Show how to fix it using @EntityGraph and JOIN FETCH, and explain why FetchType.EAGER does not solve it.",
                topic: "Spring Data JPA & Hibernate",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "n1_cause", label: "N+1 occurs when fetching N parent records triggers N additional queries to load child associations", keywords: ["1 initial query", "parent entity", "n queries", "n additional queries", "child sql", "n+1 select", "additional queries"] },
                        { id: "join_fetch", label: "Fix via JPQL 'JOIN FETCH' to load parent and child associations in a single SQL join", keywords: ["join fetch", "single query", "inner join", "left join fetch"] },
                        { id: "entity_graph", label: "Fix via @EntityGraph(attributePaths = {...}) overriding lazy loading for specific repository methods", keywords: ["entitygraph", "entity graph", "attribute paths", "ad-hoc fetch"] },
                        { id: "eager_fail", label: "FetchType.EAGER does NOT fix N+1 for findAll() queries because JPQL executes the initial select directly", keywords: ["eager does not fix", "findall", "jpql ignores eager", "still fires n queries", "eager does not solve"] }
                    ],
                    shouldHit: [
                        { id: "batch_size", label: "Alternative mitigation using @BatchSize to fetch children in IN-clauses", keywords: ["batchsize", "batch size", "in clause", "hibernate.default_batch_fetch_size"] }
                    ],
                    wrongIfSaid: [
                        { claim: "Setting FetchType.EAGER completely resolves the N+1 query problem", correction: "FetchType.EAGER only works for findById(). When executing findAll() or custom JPQL, Hibernate runs the root query first and then executes N subsequent queries for EAGER relationships." },
                        { claim: "JOIN FETCH can be applied across multiple distinct @OneToMany collections without cartesian product risk", correction: "Joining multiple Bag collections simultaneously causes a MultipleBagFetchException or massive Cartesian product. Use @BatchSize or separate queries for second-level collections." }
                    ],
                    modelAnswer: `**The N+1 Select Problem:**
When loading 100 \`Author\` entities where each author has lazy \`books\`, \`authorRepository.findAll()\` fires 1 SQL query. Iterating through the authors to read their books triggers **100 additional queries** ($1 + 100 = 101$ queries).

**Why \`FetchType.EAGER\` Fails:**
When JPQL executes \`SELECT a FROM Author a\`, Hibernate parses the JPQL query directly and fetches the authors. Only *after* that does it realize the relationship is EAGER, firing N subsequent queries anyway.

**The Real Solutions:**
1. **JPQL \`JOIN FETCH\`:**
\`\`\`java
@Query("SELECT a FROM Author a LEFT JOIN FETCH a.books")
List<Author> findAllWithBooks();
\`\`\`
2. **Spring Data \`@EntityGraph\`:**
\`\`\`java
@EntityGraph(attributePaths = {"books"})
List<Author> findAll();
\`\`\`
3. **Hibernate Batch Fetching (\`@BatchSize(size = 30)\`):**
Batches child queries into \`WHERE author_id IN (?, ?, ...)\`, reducing 100 queries to ~4.`
                }
            },
            {
                q: "Explain how Spring Security's SecurityFilterChain works for stateless JWT authentication. Where should the JWT filter be positioned and why?",
                topic: "Spring Security & REST APIs",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "filter_chain", label: "SecurityFilterChain is an ordered chain of servlet filters intercepting HTTP requests", keywords: ["filter chain", "delegatingfilterproxy", "filterchainproxy", "servlet filter"] },
                        { id: "jwt_pos", label: "JWT filter is placed before UsernamePasswordAuthenticationFilter", keywords: ["addfilterbefore", "usernamepasswordauthenticationfilter", "before", "early in chain"] },
                        { id: "sec_context", label: "Extracts Bearer token, validates signature/claims, and populates SecurityContextHolder with Authentication token", keywords: ["securitycontextholder", "securitycontext", "usernamepasswordauthenticationtoken", "bearer token", "claims"] },
                        { id: "stateless", label: "Configures SessionCreationPolicy.STATELESS to disable HTTP sessions", keywords: ["stateless", "sessioncreationpolicy.stateless", "no session", "disable session"] }
                    ],
                    shouldHit: [
                        { id: "auth_entry_point", label: "AuthenticationEntryPoint handles 401 Unauthorized for unauthenticated or expired tokens", keywords: ["authenticationentrypoint", "401", "unauthorized", "expired token"] }
                    ],
                    wrongIfSaid: [
                        { claim: "JWT authentication stores user session state on the Tomcat server", correction: "JWT authentication in Spring Security is strictly stateless (SessionCreationPolicy.STATELESS); the server verifies the cryptographic signature on every request without keeping session state in memory." },
                        { claim: "The JWT filter should run after the Authorization filter", correction: "Authentication (who you are) MUST precede Authorization (what you are allowed to do) in the security filter chain." }
                    ],
                    modelAnswer: `**Spring Security JWT Architecture:**
1. **Stateless Configuration:**
   Configure \`http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\` so Spring never creates \`HttpSession\` cookies.
2. **Filter Placement:**
   Use \`http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)\`.
3. **Execution Flow:**
   - \`OncePerRequestFilter\` intercepts the request and extracts \`Authorization: Bearer <token>\`.
   - Validates the cryptographic signature and expiration claims.
   - Creates a \`UsernamePasswordAuthenticationToken(userDetails, null, authorities)\`.
   - Sets \`SecurityContextHolder.getContext().setAuthentication(authToken)\`.
   - Downstream filters (e.g. \`AuthorizationFilter\`) check \`@PreAuthorize\` roles against the populated context.`
                }
            }
        ],

        DSA: [
            {
                q: "Given an unsorted array of integers, find the length of the longest consecutive elements sequence in O(n) time.",
                topic: "Arrays & Hash Sets",
                difficulty: "Medium",
                rubric: {
                    type: "dsa",
                    mustHit: [
                        { id: "hashset", label: "Insert all elements into a HashSet in O(n) for O(1) lookups", keywords: ["hash set", "set", "hashset", "o(1) lookup"] },
                        { id: "start_check", label: "Only start counting a sequence from num if (num - 1) is NOT in the set — avoids redundant counting", keywords: ["num - 1", "start of sequence", "not in set", "only if previous", "beginning of streak"] },
                        { id: "inner_while", label: "Inner while loop extends the sequence — each element visited at most twice → O(n) total", keywords: ["while", "extend", "each element", "twice", "amortized", "linear scan"] },
                        { id: "space", label: "Space complexity O(n) for the hash set", keywords: ["o(n) space", "space o(n)", "extra space", "hashset memory"] },
                    ],
                    shouldHit: [
                        { id: "sort_wrong", label: "Explicitly contrasts with naive O(n log n) sort approach and explains why O(n) is achievable", keywords: ["sort", "o(n log n)", "why not sort", "can avoid sorting"] },
                    ],
                    wrongIfSaid: [
                        { claim: "Sort the array first then scan linearly for O(n) total", correction: "Sorting is O(n log n). The O(n) solution uses a HashSet to skip scanning from non-sequence-starts." },
                        { claim: "Use a HashMap with counts", correction: "A plain HashSet suffices — you only need membership queries, not counts." },
                    ],
                    modelAnswer: `\`\`\`python
def longestConsecutive(nums):
    num_set = set(nums)           # O(n) space, O(n) build
    best = 0
    for num in num_set:
        if num - 1 not in num_set:    # only start sequences at their true beginning
            length = 1
            while num + length in num_set:
                length += 1
            best = max(best, length)
    return best
\`\`\`
**Why O(n):** Each number is visited at most twice (once in the outer loop, once in the inner while loop). Overall time complexity is strictly $O(n)$, space complexity is $O(n)$.`
                }
            },
            {
                q: "How would you detect a cycle in a singly linked list and find the cycle start node? Prove why Floyd's algorithm works.",
                topic: "Linked Lists & Two Pointers",
                difficulty: "Medium",
                rubric: {
                    type: "dsa",
                    mustHit: [
                        { id: "fast_slow", label: "Use fast (2 steps) and slow (1 step) pointers — they meet inside the cycle if one exists", keywords: ["fast", "slow", "two pointer", "tortoise", "hare", "meet"] },
                        { id: "find_start", label: "Reset one pointer to head, move both at 1 step — meeting point is the cycle start", keywords: ["reset", "head", "one step", "cycle start", "entry point"] },
                        { id: "math_proof", label: "Mathematical proof: distance from head to cycle start equals distance from meeting point to cycle start", keywords: ["distance", "formula", "proof", "equal", "l1", "mu", "modular", "cycle length"] },
                        { id: "no_cycle", label: "Fast pointer reaches null → no cycle exists", keywords: ["null", "no cycle", "end", "fast reaches"] },
                    ],
                    shouldHit: [
                        { id: "time_space", label: "O(n) time, O(1) space — no visited set needed", keywords: ["o(n)", "o(1) space", "no extra", "constant space"] },
                    ],
                    wrongIfSaid: [
                        { claim: "Use a visited HashSet to detect cycles", correction: "HashSet works but uses O(n) space. Floyd's algorithm is the O(1) space standard interview answer." },
                        { claim: "The meeting point of fast and slow pointers is always the cycle start", correction: "The initial meeting point is inside the cycle but NOT necessarily the start. You must then reset one pointer to head and walk both at 1 step to find the actual start." },
                    ],
                    modelAnswer: `**Floyd's Tortoise and Hare:**
1. \`slow\` moves 1 step, \`fast\` moves 2 steps. If they meet, a cycle exists.
2. Let $L$ = distance from head to cycle start, $C$ = cycle length, $k$ = distance from cycle start to meeting point.
3. Slow traveled $L + k$. Fast traveled $2(L + k) = L + k + nC \\implies L = nC - k$.
4. Reset \`slow = head\`. Move both at 1 step/iteration. They meet at the cycle entry node after $L$ steps.
5. Time Complexity: $O(n)$, Space Complexity: $O(1)$.`
                }
            }
        ],

        DBMS: [
            {
                q: "Explain B-Trees vs B+ Trees. Why do modern relational databases like PostgreSQL and MySQL InnoDB use B+ Trees for table indexing?",
                topic: "Indexing & Storage Engines",
                difficulty: "Hard",
                rubric: {
                    type: "technical",
                    mustHit: [
                        { id: "bplus_leaves_only", label: "B+ Trees store ALL data pointers only in leaf nodes; internal nodes store only keys", keywords: ["leaf", "data pointer", "only keys", "internal node", "no data in internal"] },
                        { id: "linked_leaves", label: "B+ Tree leaf nodes are linked in a doubly-linked list enabling fast range scans", keywords: ["linked list", "doubly linked", "leaf", "range scan", "sequential"] },
                        { id: "fan_out", label: "B+ Tree internal nodes fit more keys per disk page (no data pointers) → greater fan-out → shallower tree → fewer disk I/Os", keywords: ["fan out", "more keys", "per page", "disk page", "shallower", "disk i/o"] },
                        { id: "btree_diff", label: "B-Trees store data at every node (internal + leaf), limiting fan-out and preventing sequential scans", keywords: ["b-tree", "internal node", "data at every", "no leaf list", "not sequential"] },
                    ],
                    shouldHit: [
                        { id: "height", label: "Both maintain O(log n) height via balanced splits on insert/delete", keywords: ["balanced", "split", "log n", "height"] },
                        { id: "innodb", label: "InnoDB clustered index stores actual row data in B+ Tree leaves (primary key = physical order)", keywords: ["innodb", "clustered", "primary key", "row data", "physical order"] },
                    ],
                    wrongIfSaid: [
                        { claim: "B-Trees and B+ Trees are identical except B+ Trees have leaves", correction: "The critical difference is where data pointers are stored. B-Trees store data at internal nodes too, which reduces fan-out. B+ Trees push all data to leaves, maximising keys per internal page." },
                        { claim: "B+ Trees are faster for point lookups than B-Trees", correction: "For point lookups, B-Trees can be faster (data found at internal node = fewer levels traversed). B+ Trees win on range scans and sequential reads due to leaf linking." },
                    ],
                    modelAnswer: `**B-Tree:** Internal nodes store keys AND data pointers. Lower fan-out, taller tree.

**B+ Tree:** Internal nodes store ONLY routing keys. All row pointers reside in leaf nodes, connected via a **doubly-linked list**.

**Why Databases Use B+ Trees:**
1. **Higher Fan-out:** Without data pointers, internal pages hold hundreds of keys, keeping tree height to 3–4 levels even for 100M+ rows.
2. **Range Scans:** Scanning \`BETWEEN A AND B\` traverses the leaf linked list directly with sequential disk reads ($O(k)$ range traversal).
3. **Clustered Storage:** InnoDB leaf pages contain actual table rows sorted by primary key.`
                }
            }
        ],

        HR: [
            {
                q: "Tell me about a time you faced a serious technical disagreement with a teammate on an engineering project. How did you resolve it?",
                topic: "STAR Behavioral — Conflict Resolution",
                difficulty: "Medium",
                rubric: {
                    type: "hr_star",
                    mustHit: [
                        { id: "situation", label: "STAR — Situation: clear context of the project and the nature of the disagreement", keywords: ["project", "working on", "disagreement", "conflict", "we were", "situation"] },
                        { id: "task", label: "STAR — Task: your specific role and why resolving this disagreement mattered to the outcome", keywords: ["my role", "responsible", "needed to", "impact", "stakes", "task"] },
                        { id: "action_data", label: "STAR — Action: used data/evidence/prototype to advance the discussion, not just opinion", keywords: ["data", "prototype", "benchmark", "proof", "measured", "tested", "evidence"] },
                        { id: "result", label: "STAR — Result: concrete positive outcome (shipped, improved metric, team alignment)", keywords: ["result", "outcome", "shipped", "improved", "deployed", "resolved", "we agreed"] },
                    ],
                    shouldHit: [
                        { id: "listen", label: "Actively listened to and acknowledged the teammate's perspective before proposing a solution", keywords: ["listen", "hear them", "understood", "their point", "perspective", "acknowledged"] },
                        { id: "learning", label: "Extracted a lesson or process improvement from the conflict for the future", keywords: ["learned", "going forward", "process", "retrospect", "lesson"] },
                    ],
                    wrongIfSaid: [
                        { claim: "I escalated to my manager immediately", correction: "Immediate escalation without attempting peer resolution signals low collaboration maturity. Strong answers show you resolved it peer-to-peer using data or structured discussion first." },
                        { claim: "I just let them do it their way to avoid conflict", correction: "This signals passive disengagement. Interviewers want to see constructive assertiveness with humility — advocating your position with evidence while remaining open to being wrong." },
                    ],
                    starRequired: true,
                    modelAnswer: `**STAR Framework Model Answer:**
- **Situation:** During a sprint, a teammate advocated for MongoDB while I argued for PostgreSQL with foreign keys for financial ledger consistency.
- **Task:** As lead backend contributor, I needed to ensure data integrity without causing deadlocks in our project timeline.
- **Action:** I built a benchmark script testing 50,000 transactions across both systems. I presented concrete latency numbers and proposed using JSONB columns in Postgres to give them the flexible fields they needed.
- **Result:** We aligned on Postgres with JSONB. The feature shipped on schedule with zero transactional integrity anomalies.`
                }
            },
            {
                q: "Describe a scenario where a project or feature you built failed in production or missed a critical deadline. What went wrong and what did you change?",
                topic: "STAR Behavioral — Ownership & Resilience",
                difficulty: "Medium",
                rubric: {
                    type: "hr_star",
                    mustHit: [
                        { id: "situation", label: "STAR — Situation: context of the production outage or deadline miss", keywords: ["production", "outage", "deadline", "incident", "failure", "deployed"] },
                        { id: "ownership", label: "STAR — Task/Ownership: took direct responsibility without blaming team members or external tools", keywords: ["my responsibility", "i owned", "i realized", "i should have", "accountability"] },
                        { id: "postmortem", label: "STAR — Action: performed root cause analysis, implemented immediate fix, and added automated safeguards", keywords: ["postmortem", "root cause", "automated test", "monitoring", "safeguard", "alert"] },
                        { id: "long_term_res", label: "STAR — Result: measurable reliability improvement and permanent process fix", keywords: ["prevented", "zero incidents", "sla", "improved process", "team adopted"] }
                    ],
                    shouldHit: [
                        { id: "communication", label: "Communicated transparently with stakeholders during the incident", keywords: ["communicated", "status page", "updated users", "transparent"] }
                    ],
                    wrongIfSaid: [
                        { claim: "It wasn't my fault because the requirements were bad", correction: "Deflecting blame onto others signals poor ownership. Senior engineers take responsibility for clarifying ambiguous requirements before shipping." }
                    ],
                    starRequired: true,
                    modelAnswer: `**Model STAR Answer:**
- **Situation:** A database migration I deployed locked the active orders table during peak load, causing API timeouts for 12 minutes.
- **Ownership:** I immediately initiated the rollback protocol and owned the communication on our incident channel.
- **Action:** I authored a blameless post-mortem identifying that the migration added a non-null column without a default value. I updated our CI/CD pipeline with automated migration lock-analysis checks.
- **Result:** We prevented future locking migrations, and our deployment checklist was adopted team-wide.`
                }
            }
        ]
    };

    // ─────────────────────────────────────────────────────────────────────────
    // DYNAMIC FOLLOW-UP GENERATOR
    // Probes candidate's exact answer, missed points, or deepens edge cases
    // ─────────────────────────────────────────────────────────────────────────
    static generateDynamicFollowUp(questionText, studentAnswer, evalResult, rubric) {
        const text = (studentAnswer || "").toLowerCase();
        const { incorrectClaims, missingCritical, overallScore } = evalResult;

        // 1. If candidate made an explicitly incorrect statement -> Probe that misconception
        if (incorrectClaims && incorrectClaims.length > 0) {
            const claim = incorrectClaims[0].claim;
            return `You mentioned that "${claim}". In high-concurrency systems, that assumption can lead to severe bottlenecks. Can you walk me through what actually happens under failure modes or high contention?`;
        }

        // 2. If candidate missed critical must-hit concepts -> Probe the primary missing concept
        if (missingCritical && missingCritical.length > 0) {
            const primaryMissed = missingCritical[0];
            return `Good initial points. To explore the deeper architectural mechanics: can you specifically elaborate on **${primaryMissed.label}**?`;
        }

        // 3. If answer was very short or shallow -> Ask for concrete implementation invariants
        if (evalResult.wordCount < 40) {
            return `That's a high-level summary. Could you dive deeper into the exact step-by-step algorithmic steps, time complexity ($O(n)$ bounds), and memory overhead?`;
        }

        // 4. If answer was strong (score >= 80) -> Challenge with distributed/senior trade-off
        if (rubric.type === "technical" || rubric.type === "dsa") {
            return `Excellent explanation. Let's push the constraints: how would your design adapt if this system is deployed across a distributed cluster with network partitions (CAP theorem), or if available memory is constrained to 10MB while serving 50,000 requests/sec?`;
        } else {
            return `Strong response. Looking back on that experience, what is one structural decision you would approach differently today with the hindsight and technical depth you've gained since?`;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // START a new interview session
    // ─────────────────────────────────────────────────────────────────────────
    static startInterview({ studentId, mode = "Technical", role = "Staff SDE & Bar Raiser" }) {
        const normalizedMode = 
            mode === 'JavaFoundation' ? 'JavaFoundation' :
            mode === 'SpringBoot' ? 'SpringBoot' :
            mode === 'DBMS' ? 'DBMS' :
            mode === 'DSA' ? 'DSA' :
            mode === 'HR' ? 'HR' : 'Technical';

        const bank = MockInterviewer.INTERVIEW_BANKS[normalizedMode] || MockInterviewer.INTERVIEW_BANKS.Technical;
        const firstQ = bank[0];

        const session = {
            id: "int-" + crypto.randomUUID(),
            studentId,
            mode: normalizedMode,
            role,
            status: "in_progress",
            currentQuestionIndex: 0,
            questions: [
                {
                    questionIndex: 0,
                    questionText: firstQ.q,
                    topic: firstQ.topic,
                    difficulty: firstQ.difficulty,
                    rubric: firstQ.rubric,
                    studentAnswer: null,
                    followUpGiven: false,
                    evaluation: null
                }
            ],
            history: [],
            finalReport: null,
            startedAt: new Date().toISOString()
        };

        db.saveInterview(session);
        return session;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUBMIT an answer — evaluate against rubric, return dimension scores + follow-up
    // ─────────────────────────────────────────────────────────────────────────
    static async submitAnswer({ interviewId, studentId, studentAnswer }) {
        const session = db.getInterviewById(interviewId);
        if (!session || session.studentId !== studentId || session.status === "completed") {
            return { error: "Interview session not found or already completed." };
        }

        const currentQ = session.questions[session.currentQuestionIndex];
        currentQ.studentAnswer = studentAnswer;

        // Perform dimensional rubric evaluation
        const evalResult = MockInterviewer.evaluateAgainstRubric(studentAnswer, currentQ.rubric);
        currentQ.evaluation = evalResult;

        const bank = MockInterviewer.INTERVIEW_BANKS[session.mode] || MockInterviewer.INTERVIEW_BANKS.Technical;
        const nextIndex = session.currentQuestionIndex + 1;

        let followUp = null;
        let isFinal = false;

        // Dynamically generate follow-up question probing what the student said
        if (!currentQ.followUpGiven) {
            followUp = MockInterviewer.generateDynamicFollowUp(
                currentQ.questionText,
                studentAnswer,
                evalResult,
                currentQ.rubric
            );
            currentQ.followUpGiven = true;
        } else if (nextIndex < bank.length) {
            session.currentQuestionIndex = nextIndex;
            const nextQ = bank[nextIndex];
            session.questions.push({
                questionIndex: nextIndex,
                questionText: nextQ.q,
                topic: nextQ.topic,
                difficulty: nextQ.difficulty,
                rubric: nextQ.rubric,
                studentAnswer: null,
                followUpGiven: false,
                evaluation: null
            });
        } else {
            session.status = "completed";
            isFinal = true;
            session.finalReport = MockInterviewer.generateFinalReport(session);
            MockInterviewer.persistInterviewPerformance(session);
        }

        db.saveInterview(session);

        return {
            interviewId: session.id,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            evaluation: evalResult,
            followUp,
            isCompleted: isFinal,
            nextQuestion: isFinal ? null : session.questions[session.currentQuestionIndex].questionText,
            nextTopic: isFinal ? null : session.questions[session.currentQuestionIndex].topic,
            finalReport: session.finalReport
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RUBRIC EVALUATOR — the core evaluation engine
    // ─────────────────────────────────────────────────────────────────────────
    static evaluateAgainstRubric(answer, rubric) {
        if (!rubric) return MockInterviewer._legacyEvaluate(answer, []);

        const text = (answer || "").toLowerCase();
        const wordCount = (answer || "").trim().split(/\s+/).filter(Boolean).length;

        // ── 1. CORRECTNESS ── Check for explicitly wrong statements (Negation-aware)
        const incorrectClaims = [];
        const sentences = text.split(/[.!?;\n]+/).map(s => s.trim()).filter(Boolean);

        for (const wrong of (rubric.wrongIfSaid || [])) {
            const wrongText = wrong.claim.toLowerCase();
            const wrongKeywords = wrongText.split(/\s+/).filter(w => w.length > 3);
            if (wrongKeywords.length < 2) continue;

            for (const sentence of sentences) {
                // If the candidate explicitly negated or contrasted the misconception, skip false positive
                const isNegated = /not\s+|never\s+|unlike\s+|does\s*n'?t|fails\s+to|without\s+|in\s+contrast|instead\s+of|rather\s+than/.test(sentence);
                
                const matchCount = wrongKeywords.filter(kw => sentence.includes(kw)).length;
                const matchRatio = matchCount / wrongKeywords.length;
                
                if (!isNegated && matchRatio >= 0.65 && matchCount >= Math.min(wrongKeywords.length, 3)) {
                    incorrectClaims.push({
                        claim: wrong.claim,
                        correction: wrong.correction
                    });
                    break;
                }
            }
        }

        // ── 2. COMPLETENESS ── Check mustHit and shouldHit rubric points
        const hitIds = new Set();
        const missingCritical = [];
        const missingOptional = [];

        for (const point of (rubric.mustHit || [])) {
            const hit = point.keywords.some(kw => text.includes(kw.toLowerCase()));
            if (hit) hitIds.add(point.id);
            else missingCritical.push(point);
        }

        for (const point of (rubric.shouldHit || [])) {
            const hit = point.keywords.some(kw => text.includes(kw.toLowerCase()));
            if (hit) hitIds.add(point.id);
            else missingOptional.push(point);
        }

        const totalMustHit = (rubric.mustHit || []).length;
        const totalShouldHit = (rubric.shouldHit || []).length;
        const criticalHits = totalMustHit - missingCritical.length;
        const optionalHits = totalShouldHit - missingOptional.length;

        // ── 3. DIMENSION SCORES ──
        const correctnessScore = Math.max(0, 100 - (incorrectClaims.length * 25));

        const criticalRatio = totalMustHit > 0 ? criticalHits / totalMustHit : 1;
        const optionalRatio = totalShouldHit > 0 ? optionalHits / totalShouldHit : 1;
        const completenessScore = Math.round((criticalRatio * 70 + optionalRatio * 30));

        let clarityScore = 50;
        if (wordCount >= 60) clarityScore += 20;
        if (wordCount >= 120) clarityScore += 10;
        if (/first|second|third|step \d|additionally|furthermore|in contrast|however/.test(text)) clarityScore += 10;
        if (/example|for instance|concretely|specifically/.test(text)) clarityScore += 10;
        clarityScore = Math.min(100, clarityScore);

        let edgeCaseScore = 0;
        if (rubric.type === "technical" || rubric.type === "dsa") {
            if (/o\(n\)|o\(log|o\(1\)|o\(n\^2\)|o\(n\s*log/.test(text)) edgeCaseScore += 25;
            if (/worst case|edge case|corner case|failure|overflow|null|empty/.test(text)) edgeCaseScore += 25;
            if (/tradeoff|trade-off|versus|compared to|better when|worse when/.test(text)) edgeCaseScore += 25;
            if (/amortized|average case|expected|probabilistic|concurrency/.test(text)) edgeCaseScore += 25;
            edgeCaseScore = Math.min(100, edgeCaseScore);
        } else {
            const starHits = (rubric.mustHit || []).filter(p => hitIds.has(p.id)).length;
            const starTotal = (rubric.mustHit || []).length;
            edgeCaseScore = starTotal > 0 ? Math.round((starHits / starTotal) * 100) : 70;
        }

        // ── 4. OVERALL SCORE ──
        let overallScore;
        if (rubric.type === "technical" || rubric.type === "dsa") {
            overallScore = Math.round(
                correctnessScore * 0.30 +
                completenessScore * 0.35 +
                clarityScore * 0.20 +
                edgeCaseScore * 0.15
            );
        } else {
            overallScore = Math.round(
                correctnessScore * 0.25 +
                completenessScore * 0.45 +
                clarityScore * 0.30
            );
        }

        // ── 5. FEEDBACK LINES ── Specific, actionable
        const feedbackLines = [];

        if (incorrectClaims.length > 0) {
            feedbackLines.push(`❌ **Incorrect statement detected:** "${incorrectClaims[0].claim}" — ${incorrectClaims[0].correction}`);
        }

        if (missingCritical.length > 0) {
            feedbackLines.push(`⚠️ **Critical gap:** Your answer did not cover **${missingCritical[0].label}**.`);
            if (missingCritical.length > 1) {
                feedbackLines.push(`⚠️ **Also missing:** ${missingCritical.slice(1, 3).map(p => `**${p.label}**`).join(', ')}.`);
            }
        }

        if (missingOptional.length > 0) {
            feedbackLines.push(`💡 **Depth opportunity:** Mentioning **${missingOptional[0].label}** would have elevated this to a senior-level answer.`);
        }

        if (clarityScore < 70) {
            feedbackLines.push(`📝 **Clarity:** Answer was brief (${wordCount} words). Elaborate with concrete examples or trade-off reasoning.`);
        }

        if (rubric.type === "technical" || rubric.type === "dsa") {
            if (edgeCaseScore < 50) {
                feedbackLines.push(`🧪 **Edge cases & complexity:** State explicit Big-O bounds and failure modes.`);
            }
        }

        if (feedbackLines.length === 0) {
            feedbackLines.push(`✅ Strong answer — covered all critical rubric points with appropriate depth.`);
        }

        const verdict =
            overallScore >= 80 ? "HIRE SIGNAL — Strong, hire-bar response" :
            overallScore >= 60 ? "BORDERLINE — Needs elaboration on critical gaps" :
            "NO HIRE SIGNAL — Missed multiple critical concepts; requires targeted study";

        return {
            overallScore,
            dimensions: {
                correctness: correctnessScore,
                completeness: completenessScore,
                clarity: clarityScore,
                edgeCaseDepth: edgeCaseScore,
            },
            verdict,
            incorrectClaims,
            missingCritical,
            missingOptional,
            feedbackLines,
            modelAnswer: rubric.modelAnswer || "Model answer not available for this question.",
            wordCount,
            rubricType: rubric.type
        };
    }

    static _legacyEvaluate(answer, keyPoints) {
        const text = (answer || "").toLowerCase();
        return {
            overallScore: 70,
            dimensions: { correctness: 75, completeness: 70, clarity: 70, edgeCaseDepth: 60 },
            verdict: "BORDERLINE",
            incorrectClaims: [],
            missingCritical: [],
            missingOptional: [],
            feedbackLines: ["Evaluated against standard criteria."],
            modelAnswer: "Not available.",
            wordCount: text.split(/\s+/).filter(Boolean).length,
            rubricType: "legacy"
        };
    }

    static generateFinalReport(session) {
        const evals = session.questions.map(q => q.evaluation).filter(Boolean);
        if (evals.length === 0) return null;

        const avgOf = key => Math.round(evals.reduce((s, e) => s + (e.dimensions?.[key] || 0), 0) / evals.length);
        const avgOverall = Math.round(evals.reduce((s, e) => s + (e.overallScore || 0), 0) / evals.length);

        const allMissedCritical = [];
        const allIncorrectClaims = [];
        evals.forEach(e => {
            allMissedCritical.push(...(e.missingCritical || []).map(p => p.label));
            allIncorrectClaims.push(...(e.incorrectClaims || []).map(ic => ic.claim));
        });

        const topWeaknesses = [...new Set(allMissedCritical)].slice(0, 5);
        const factualErrors = [...new Set(allIncorrectClaims)].slice(0, 3);

        return {
            overallInterviewScore: avgOverall,
            verdict: avgOverall >= 80 ? "HIRE — Recommend for Onsite" :
                     avgOverall >= 60 ? "BORDERLINE — Needs Targeted Preparation" :
                     "NOT READY — Significant gaps across core concepts",
            dimensionAverages: {
                correctness: avgOf("correctness"),
                completeness: avgOf("completeness"),
                clarity: avgOf("clarity"),
                edgeCaseDepth: avgOf("edgeCaseDepth")
            },
            questionsEvaluated: evals.length,
            topConceptGaps: topWeaknesses,
            factualErrorsDetected: factualErrors,
            perQuestionSummary: session.questions.map(q => ({
                topic: q.topic,
                difficulty: q.difficulty,
                score: q.evaluation?.overallScore || 0,
                verdict: q.evaluation?.verdict || "—",
                criticalGaps: (q.evaluation?.missingCritical || []).map(p => p.label)
            })),
            recommendedStudyTargets: topWeaknesses.slice(0, 3),
            interviewMode: session.mode,
            completedAt: new Date().toISOString()
        };
    }

    static persistInterviewPerformance(session) {
        try {
            if (!session.finalReport) return;
            const { overallInterviewScore, dimensionAverages } = session.finalReport;
            const student = db.getStudentById(session.studentId);
            if (!student) return;

            const existing = student.interviewScores || [];
            existing.push({
                sessionId: session.id,
                mode: session.mode,
                score: overallInterviewScore,
                correctness: dimensionAverages.correctness,
                completeness: dimensionAverages.completeness,
                clarity: dimensionAverages.clarity,
                edgeCaseDepth: dimensionAverages.edgeCaseDepth,
                conductedAt: session.finalReport.completedAt
            });

            const capped = existing.slice(-20);
            db.updateStudent(session.studentId, { interviewScores: capped });
        } catch (e) {
            console.error("Failed to persist interview performance:", e.message);
        }
    }
}

module.exports = MockInterviewer;
