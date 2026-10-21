import { Router } from "express";
import { authenticateUser } from "./common";
import { asyncHandler } from "../middleware";
import type { AssessmentQuestionMCQ, AssessmentQuestionWritten } from "@shared/types";

const router = Router();

// ==========================================
// 1. GRAMMAR TEST DATA (15 Questions)
// ==========================================
interface GrammarQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const GRAMMAR_QUESTIONS: GrammarQuestion[] = [
  {
    id: "g1",
    question: "Choose the sentence with correct subject-verb agreement:",
    options: [
      "Neither the project manager nor the developers was aware of the database outage.",
      "Neither the project manager nor the developers were aware of the database outage.",
      "Neither the project manager nor the developers are been aware of the outage.",
      "Neither the project manager nor the developers is aware of the database outage."
    ],
    correctAnswer: 1,
    explanation: "When subject elements are joined by 'neither... nor', the verb agrees with the closer subject ('developers' is plural -> 'were')."
  },
  {
    id: "g2",
    question: "Identify the sentence that correctly utilizes the subjunctive mood:",
    options: [
      "If the reviewer was here, he would approve the deliverable immediately.",
      "If the reviewer were here, he would approve the deliverable immediately.",
      "If the reviewer is here, he would have approved the deliverable.",
      "If the reviewer be here, he will approve the deliverable."
    ],
    correctAnswer: 1,
    explanation: "Hypothetical or contrary-to-fact conditional statements require the subjunctive form 'were'."
  },
  {
    id: "g3",
    question: "Select the sentence free of dangling or misplaced modifiers:",
    options: [
      "Having completed the benchmark review, the submission was sent to administration by the tasker.",
      "Having completed the benchmark review, the tasker submitted the deliverable to administration.",
      "The tasker submitted to administration having completed the benchmark review the deliverable.",
      "Having completed the benchmark review, administration received the deliverable from the tasker."
    ],
    correctAnswer: 1,
    explanation: "The participle 'Having completed...' must immediately precede the agent who completed it ('the tasker')."
  },
  {
    id: "g4",
    question: "Which of the following demonstrates correct parallel structure?",
    options: [
      "The specialist's duties include verifying model responses, annotating datasets, and to report edge-case hallucinations.",
      "The specialist's duties include verifying model responses, annotating datasets, and reporting edge-case hallucinations.",
      "The specialist's duties include to verify model responses, annotating datasets, and reporting edge-case hallucinations.",
      "The specialist's duties include verification of model responses, to annotate datasets, and reporting hallucinations."
    ],
    correctAnswer: 1,
    explanation: "Parallel structure requires consistent grammatical forms (verifying, annotating, reporting)."
  },
  {
    id: "g5",
    question: "Choose the sentence that correctly uses pronoun case:",
    options: [
      "The system administrator allocated the high-priority workspaces to Sarah and I.",
      "The system administrator allocated the high-priority workspaces to Sarah and me.",
      "The system administrator allocated the high-priority workspaces to Sarah and myself.",
      "The system administrator allocated the high-priority workspaces to she and I."
    ],
    correctAnswer: 1,
    explanation: "'To' is a preposition requiring the objective pronoun 'me' (to Sarah and me)."
  },
  {
    id: "g6",
    question: "Select the sentence with accurate semicolon usage:",
    options: [
      "The benchmark assessment was rigorous; however, every qualified applicant achieved top marks.",
      "The benchmark assessment was rigorous, however; every qualified applicant achieved top marks.",
      "The benchmark assessment was rigorous; however every qualified applicant achieved top marks.",
      "The benchmark assessment was rigorous however; every qualified applicant achieved top marks."
    ],
    correctAnswer: 0,
    explanation: "A semicolon joins independent clauses, followed by a transitional adverb and comma ('; however,')."
  },
  {
    id: "g7",
    question: "Identify the correctly punctuated sentence featuring an introductory clause:",
    options: [
      "Before initiating the automated working time tracker taskers must inspect the workspace guidelines.",
      "Before initiating the automated working time tracker, taskers must inspect the workspace guidelines.",
      "Before initiating the automated working time tracker; taskers must inspect the workspace guidelines.",
      "Before initiating the automated working time tracker taskers, must inspect the workspace guidelines."
    ],
    correctAnswer: 1,
    explanation: "An introductory dependent clause is set off from the main clause by a comma."
  },
  {
    id: "g8",
    question: "Which sentence distinguishes 'affect' and 'effect' correctly?",
    options: [
      "Model fine-tuning had a positive affect on latency, but did not effect the hallucination frequency.",
      "Model fine-tuning had a positive effect on latency, but did not affect the hallucination frequency.",
      "Model fine-tuning had a positive affect on latency, but did not affect the hallucination frequency.",
      "Model fine-tuning had a positive effect on latency, but did not effect the hallucination frequency."
    ],
    correctAnswer: 1,
    explanation: "'Effect' is a noun (the result), while 'affect' is a verb (to influence)."
  },
  {
    id: "g9",
    question: "Select the sentence that avoids a comma splice:",
    options: [
      "The evaluation rubric has changed, taskers must adapt their validation notes.",
      "The evaluation rubric has changed; consequently, taskers must adapt their validation notes.",
      "The evaluation rubric has changed, therefore, taskers must adapt their validation notes.",
      "The evaluation rubric has changed, so then taskers must adapt their validation notes."
    ],
    correctAnswer: 1,
    explanation: "Two independent clauses cannot be joined merely by a comma without a coordinating conjunction. Using a semicolon and conjunctive adverb correctly resolves the splice."
  },
  {
    id: "g10",
    question: "Which of the following properly handles collective noun agreement in American English?",
    options: [
      "The quality assurance committee has issued its unanimous rating report.",
      "The quality assurance committee have issued their unanimous rating report.",
      "The quality assurance committee have issued its unanimous rating report.",
      "The quality assurance committee has issued their unanimous rating report."
    ],
    correctAnswer: 0,
    explanation: "A collective noun acting as a single unified unit takes a singular verb ('has issued') and singular pronoun ('its')."
  },
  {
    id: "g11",
    question: "Choose the sentence containing correct apostrophe usage for possession:",
    options: [
      "Both taskers deliverables met the clients high standards of accuracy.",
      "Both taskers' deliverables met the client's high standards of accuracy.",
      "Both tasker's deliverables met the client's high standards of accuracy.",
      "Both taskers' deliverables met the clients's high standards of accuracy."
    ],
    correctAnswer: 1,
    explanation: "Plural possessive for taskers is 'taskers'', and singular possessive for client is 'client's'."
  },
  {
    id: "g12",
    question: "Identify the sentence with correct usage of 'fewer' versus 'less':",
    options: [
      "The revised guideline generated less errors and required fewer computation time.",
      "The revised guideline generated fewer errors and required less computation time.",
      "The revised guideline generated less errors and required less computation time.",
      "The revised guideline generated fewer errors and required fewer computation time."
    ],
    correctAnswer: 1,
    explanation: "'Fewer' applies to countable items ('errors'), while 'less' applies to uncountable quantities ('time')."
  },
  {
    id: "g13",
    question: "Which sentence maintains consistency in grammatical voice?",
    options: [
      "The tasker evaluated the synthetic prompt, and the rubric was marked accordingly by her.",
      "The tasker evaluated the synthetic prompt and marked the rubric accordingly.",
      "The synthetic prompt was evaluated by the tasker, and she marked the rubric accordingly.",
      "The tasker evaluated the prompt, and then marking was done."
    ],
    correctAnswer: 1,
    explanation: "Maintaining consistent active voice throughout the sentence ensures clarity and conciseness."
  },
  {
    id: "g14",
    question: "Choose the correct relative pronoun for referring to a person who is the object of an action:",
    options: [
      "The candidate whom administration selected demonstrated unparalleled reasoning skills.",
      "The candidate who administration selected demonstrated unparalleled reasoning skills.",
      "The candidate which administration selected demonstrated unparalleled reasoning skills.",
      "The candidate whose administration selected demonstrated unparalleled reasoning skills."
    ],
    correctAnswer: 0,
    explanation: "'Whom' serves as the grammatical object of the verb 'selected'."
  },
  {
    id: "g15",
    question: "Select the sentence that presents the most concise and professional phrasing:",
    options: [
      "Due to the fact that there was a system outage, the deadline was extended.",
      "Owing to the circumstance that a system outage occurred, the deadline was extended.",
      "Because a system outage occurred, the deadline was extended.",
      "In light of the reality of an outage in the system, extension of the deadline took place."
    ],
    correctAnswer: 2,
    explanation: "'Because a system outage occurred...' eliminates redundant nominalizations and verbose fillers."
  }
];

// ==========================================
// 2. HOURLY RATE TASK TEST DATA (15 Questions)
// ==========================================
const HOURLY_QUESTIONS: GrammarQuestion[] = [
  {
    id: "h1",
    question: "When working within an hourly rate workspace, what is the policy regarding the live time tracker during personal interruptions?",
    options: [
      "Leave the tracker running if the interruption is less than 30 minutes.",
      "Immediately pause the tracker whenever pausing active work, research, or evaluation.",
      "Keep the tracker active and deduct the time manually at the end of the day.",
      "Switch to idle mode without pausing."
    ],
    correctAnswer: 1,
    explanation: "The working time tracker must accurately record solely active, engaged production time."
  },
  {
    id: "h2",
    question: "How are project-based hourly earnings calculated on ProTaskerGeek?",
    options: [
      "A flat daily stipend regardless of tracked seconds.",
      "Strictly based on verified active tracked seconds multiplied by the workspace hourly compensation rate.",
      "Estimated based on word count of the final deliverable.",
      "Self-reported hours without automated time tracking."
    ],
    correctAnswer: 1,
    explanation: "Earnings reflect precise, verified active working time calculated from the integrated tracker."
  },
  {
    id: "h3",
    question: "What is required when completing subsections in an hourly project workspace?",
    options: [
      "Skip optional questions and submit only the final checklist.",
      "Complete each designated question, checklist item, or response input with thorough fidelity before advancing.",
      "Fill out only the last section of the project.",
      "Submit blank fields and explain answers in external email."
    ],
    correctAnswer: 1,
    explanation: "Hourly workspaces require structured completion of all sections, questions, and verification items."
  },
  {
    id: "h4",
    question: "If an hourly project deliverable receives a 'revision_requested' status, how should the tasker proceed?",
    options: [
      "File a dispute immediately without reading reviewer feedback.",
      "Open the project workspace, review reviewer feedback notes, apply necessary corrections, and re-submit.",
      "Abandon the project and claim a different task.",
      "Re-submit the exact same work without adjustments."
    ],
    correctAnswer: 1,
    explanation: "Revisions provide direct reviewer feedback to permit prompt correction and subsequent approval."
  },
  {
    id: "h5",
    question: "Which of the following actions constitutes a violation of hourly workspace integrity?",
    options: [
      "Taking detailed analytical notes before providing a response.",
      "Utilizing automated mouse-clickers or artificial keystroke generators to keep the tracker active.",
      "Reviewing multi-page reference documents attached to the project brief.",
      "Requesting clarification from administration on ambiguous rubrics."
    ],
    correctAnswer: 1,
    explanation: "Simulated activity or artificial time inflation is strictly prohibited and results in immediate deactivation."
  },
  {
    id: "h6",
    question: "What is the maximum participant capacity rule for project tasks?",
    options: [
      "Any number of taskers can claim a project at any time.",
      "Projects have capped participant allocations; once filled, further claims are restricted.",
      "Only one person platform-wide can work on any project.",
      "Participant caps are randomly assigned each morning."
    ],
    correctAnswer: 1,
    explanation: "Project tasks maintain explicit participant caps to balance resource distribution."
  },
  {
    id: "h7",
    question: "When are project hourly task deliverables reviewed by platform administrators?",
    options: [
      "Never; approval is always instantaneous.",
      "Within standard quality review turnaround times following formal submission with proof and notes.",
      "Only at the end of each fiscal quarter.",
      "Hourly deliverables do not require review."
    ],
    correctAnswer: 1,
    explanation: "Specialist reviews evaluate quality, adherence to instructions, and time tracking integrity."
  },
  {
    id: "h8",
    question: "What should you do if an attached external instruction link or asset in an hourly project workspace is inaccessible?",
    options: [
      "Fabricate responses based on assumptions.",
      "Report the issue immediately via Support/Contact Us and pause your tracker until resolved.",
      "Complete the project without checking the reference material.",
      "Cancel your account."
    ],
    correctAnswer: 1,
    explanation: "Report inaccessible resources promptly and avoid tracking time while awaiting operational guidance."
  },
  {
    id: "h9",
    question: "How does the hourly rate task system handle concurrent workspace claims?",
    options: [
      "Taskers may claim and run the time tracker on multiple projects simultaneously.",
      "Taskers must actively work on and track time for one project workspace at a time.",
      "Multiple trackers are encouraged across different browser tabs.",
      "Time tracking is averaged across all claimed projects."
    ],
    correctAnswer: 1,
    explanation: "Only a single active workspace tracker can be operated at any given moment."
  },
  {
    id: "h10",
    question: "What quality rating score is required to maintain ongoing eligibility for top-tier hourly projects?",
    options: [
      "Any rating score above 1.0.",
      "A consistent high-quality benchmark (typically 4.0 out of 5.0 or above).",
      "Quality scores are not tracked on hourly projects.",
      "Taskers are never evaluated after initial qualification."
    ],
    correctAnswer: 1,
    explanation: "High-tier hourly projects require consistent quality ratings (4.0+ / 5.0) to maintain qualification."
  },
  {
    id: "h11",
    question: "If a project specifies an estimated duration of 45 minutes, what does this indicate?",
    options: [
      "You are required to submit exactly at 45 minutes or your task will fail.",
      "It represents a benchmark approximation; actual tracked time reflects genuine diligence and thoroughness.",
      "You will only be paid for 45 minutes even if the rubric required 60 minutes.",
      "You must rush through the questions to beat the timer."
    ],
    correctAnswer: 1,
    explanation: "Estimated duration serves as a benchmark guide while compensation is calculated on true active tracked time."
  },
  {
    id: "h12",
    question: "What type of evidence should be provided in the 'submission_description' of an hourly project deliverable?",
    options: [
      "A brief 'done' or 'ok'.",
      "A structured overview summarizing key findings, methodology followed, and confirmation of deliverables completed.",
      "Copy-pasted text from Wikipedia.",
      "No description is needed."
    ],
    correctAnswer: 1,
    explanation: "A structured overview ensures administrative reviewers can verify methodology and deliverables efficiently."
  },
  {
    id: "h13",
    question: "How does the independent Hourly Rate qualification affect your overall account status?",
    options: [
      "It modifies your fixed daily task limit for standard tasks.",
      "It unlocks project-based hourly workspaces independently of your skill tier subscription.",
      "It requires a monthly recurring payment.",
      "It replaces your email address."
    ],
    correctAnswer: 1,
    explanation: "Independent qualification awards project workspace access without requiring paid tier subscriptions."
  },
  {
    id: "h14",
    question: "What happens if a tasker claims an hourly project and fails to submit before the expiration limit?",
    options: [
      "The task remains claimed indefinitely.",
      "The claim is cancelled, spot is restored to the community pool, and completion metrics may be affected.",
      "The user's computer is blocked.",
      "Payment is automatically issued."
    ],
    correctAnswer: 1,
    explanation: "Expired claims release project spots back to the community and impact task completion rate."
  },
  {
    id: "h15",
    question: "What is the primary objective of ProTaskerGeek hourly project workspaces?",
    options: [
      "Data scraping without human insight.",
      "Providing verified, rigorous human evaluation, model alignment, and specialized professional deliverables.",
      "Social media spamming.",
      "Unregulated ad-clicking."
    ],
    correctAnswer: 1,
    explanation: "Hourly workspaces focus on high-fidelity human reasoning, alignment benchmarks, and rigorous analytical work."
  }
];

// ==========================================
// 3. DISCIPLINE ASSESSMENT DATA (10 MCQs + 10 Written)
// ==========================================
interface DisciplineData {
  title: string;
  section1: AssessmentQuestionMCQ[];
  section2: AssessmentQuestionWritten[];
}

const DISCIPLINE_ASSESSMENTS: Record<string, DisciplineData> = {
  software: {
    title: "Software & Code Generation",
    section1: [
      { id: "s_mcq_1", question: "In Python, which built-in data structure provides O(1) average-time complexity for lookups?", options: ["List", "Tuple", "Dict / Set", "Linked List"], correctAnswer: 2 },
      { id: "s_mcq_2", question: "What is the primary hazard of using mutable default arguments in Python function definitions?", options: ["Syntax Error", "State persistence across distinct calls", "Memory leak crash", "Slow execution"], correctAnswer: 1 },
      { id: "s_mcq_3", question: "Which sorting algorithm achieves worst-case O(n log n) comparisons without auxiliary memory beyond recursion stack?", options: ["Quicksort", "Heapsort", "Bubble Sort", "Insertion Sort"], correctAnswer: 1 },
      { id: "s_mcq_4", question: "In TypeScript, what is the distinction between 'unknown' and 'any'?", options: ["They are identical", "'unknown' enforces type-checking before operations, 'any' disables checking", "'unknown' is only for primitives", "'any' is stricter"], correctAnswer: 1 },
      { id: "s_mcq_5", question: "What does the CAP theorem assert regarding distributed data stores?", options: ["Consistency, Availability, and Partition Tolerance cannot all be guaranteed simultaneously under partition", "Computers Always Perform", "Caches Accelerate Performance", "All systems are ACID"], correctAnswer: 0 },
      { id: "s_mcq_6", question: "In Rust, what mechanism enforces memory safety at compile time without a garbage collector?", options: ["Reference Counting only", "The Borrow Checker and Ownership system", "Virtual Machine sandbox", "Dynamic typing"], correctAnswer: 1 },
      { id: "s_mcq_7", question: "Which HTTP status code is most appropriate for a request that is syntactically valid but cannot be processed due to semantic errors?", options: ["400 Bad Request", "404 Not Found", "422 Unprocessable Entity", "500 Internal Error"], correctAnswer: 2 },
      { id: "s_mcq_8", question: "What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL / Red-Black)?", options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctAnswer: 1 },
      { id: "s_mcq_9", question: "In database design, what does Third Normal Form (3NF) eliminate?", options: ["All null values", "Transitive functional dependencies", "Foreign keys", "Primary keys"], correctAnswer: 1 },
      { id: "s_mcq_10", question: "What vulnerability is mitigated by utilizing parameterized SQL queries rather than string concatenation?", options: ["Cross-Site Scripting (XSS)", "SQL Injection", "CSRF", "Denial of Service"], correctAnswer: 1 },
    ],
    section2: [
      { id: "s_w_1", question: "Analyze modern concurrency models (Go goroutines vs. Node.js event loop vs. Rust async/await). Detail architectural trade-offs, thread management, memory overhead, and latency characteristics under high-throughput I/O.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_2", question: "Evaluate distributed transaction management: Compare Two-Phase Commit (2PC) with the Saga Pattern in microservices architectures, explaining failure recovery, eventual consistency, and idempotency guarantees.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_3", question: "Design an end-to-end scalable real-time streaming pipeline processing 100,000 events/second. Detail message queueing, stream partitioning, backpressure strategies, and dead-letter queues.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_4", question: "Critique algorithmic optimization strategies: Dynamic Programming versus Branch-and-Bound for NP-hard combinatorial optimization problems, including state caching and memoization benchmarks.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_5", question: "Discuss principles of secure code auditing: Common vulnerability vectors (buffer overflows, race conditions, deserialization attacks), mitigation architectures, and static/dynamic code analysis workflows.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_6", question: "Examine relational vs non-relational database selection for high-write telemetry systems. Compare write amplification, LSM-trees vs B-trees, partitioning, and read-path indexing strategies.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_7", question: "Evaluate automated LLM code evaluation techniques: Designing test suites that assess syntactic validity, algorithmic complexity, runtime efficiency, and subtle logical corner cases.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_8", question: "Deep-dive into network protocol design: HTTP/3 (QUIC) versus HTTP/2 over TCP. Analyze head-of-line blocking, connection migration, TLS 1.3 handshake optimization, and congestion control algorithms.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_9", question: "Analyze garbage collection algorithms in enterprise runtimes (e.g. JVM ZGC / Shenandoah vs V8 generational GC). Detail pause times, compaction strategies, mark-sweep phases, and CPU overhead.", minWords: 1500, maxWords: 5000 },
      { id: "s_w_10", question: "Formulate a comprehensive architectural framework for multi-tenant SaaS application isolation, comparing shared-schema, separate-schema, and separate-database paradigms under strict compliance standards.", minWords: 1500, maxWords: 5000 },
    ]
  },
  math: {
    title: "Mathematics & Formal Logic",
    section1: [
      { id: "m_mcq_1", question: "What is the derivative of f(x) = ln(x^2 + 1) with respect to x?", options: ["2x / (x^2 + 1)", "1 / (x^2 + 1)", "2 / x", "2x(x^2 + 1)"], correctAnswer: 0 },
      { id: "m_mcq_2", question: "If matrix A is invertible, what is the determinant of its inverse, det(A^-1)?", options: ["-det(A)", "1 / det(A)", "det(A)", "0"], correctAnswer: 1 },
      { id: "m_mcq_3", question: "In formal logic, what is the contrapositive of the implication P -> Q?", options: ["Q -> P", "~P -> ~Q", "~Q -> ~P", "P and ~Q"], correctAnswer: 2 },
      { id: "m_mcq_4", question: "Which theorem guarantees that every continuous function on a closed interval [a, b] attains a maximum and minimum?", options: ["Mean Value Theorem", "Intermediate Value Theorem", "Extreme Value Theorem", "Rolle's Theorem"], correctAnswer: 2 },
      { id: "m_mcq_5", question: "What is the rank of an n x n identity matrix?", options: ["0", "1", "n", "n - 1"], correctAnswer: 2 },
      { id: "m_mcq_6", question: "In probability theory, if events A and B are independent, what is P(A and B)?", options: ["P(A) + P(B)", "P(A) * P(B)", "P(A | B)", "P(A) / P(B)"], correctAnswer: 1 },
      { id: "m_mcq_7", question: "What is the value of the infinite geometric series sum_{k=0}^{infinity} (1/3)^k?", options: ["1/2", "3/2", "2/3", "3"], correctAnswer: 1 },
      { id: "m_mcq_8", question: "Which mathematical structure consists of a set equipped with an associative binary operation, identity element, and inverse for every element?", options: ["Semigroup", "Monoid", "Group", "Ring"], correctAnswer: 2 },
      { id: "m_mcq_9", question: "In graph theory, what is a necessary and sufficient condition for a connected graph to have an Eulerian circuit?", options: ["Every vertex has even degree", "The graph is planar", "The graph is a tree", "It has no cycles"], correctAnswer: 0 },
      { id: "m_mcq_10", question: "What is the limit of (sin x) / x as x approaches 0?", options: ["0", "Infinity", "1", "Does not exist"], correctAnswer: 2 },
    ],
    section2: [
      { id: "m_w_1", question: "Provide a rigorous analysis of the convergence criteria for infinite sequences and series in metric spaces, contrasting pointwise and uniform convergence of functional sequences with complete proofs.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_2", question: "Examine the foundations of linear algebra: Spectral Theorem for symmetric operators, singular value decomposition (SVD), and geometric interpretation of matrix transformations in high dimensions.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_3", question: "Dissect Gödel's Incompleteness Theorems and their foundational implications for formal axiomatic systems, recursive function theory, and the limits of automated mathematical theorem proving.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_4", question: "Analyze modern Bayesian inference vs Frequentist statistical frameworks: Conjugate priors, Markov Chain Monte Carlo (MCMC) sampling, credible intervals, and asymptotic convergence guarantees.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_5", question: "Exposition of multivariable calculus optimization: Method of Lagrange Multipliers under equality and inequality constraints (Karush-Kuhn-Tucker conditions) with mathematical justification.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_6", question: "Explore differential equations in modeling dynamical systems: Stability analysis of non-linear autonomous systems using Lyapunov functions, phase portraits, and bifurcation phenomena.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_7", question: "Examine prime distribution, the Riemann Zeta function, analytic continuation, and the critical strip in number theory, explaining cryptographic implications for modern public key infrastructure.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_8", question: "Provide a thorough breakdown of measure theory and Lebesgue integration compared to Riemann integrals, detailing sigma-algebras, Borel sets, and Dominated Convergence Theorem.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_9", question: "Analyze algebraic topology concepts: Fundamental groups, topological invariants, homeomorphisms vs homotopy equivalences, and their applications in data manifold learning.", minWords: 1500, maxWords: 5000 },
      { id: "m_w_10", question: "Rigorous evaluation of mathematical proofs produced by LLMs: Formulate a systematic verification protocol to identify hallucinated lemmas, circular reasoning, and notation inconsistency.", minWords: 1500, maxWords: 5000 },
    ]
  },
  linguistics: {
    title: "Multilingual & Computational NLP",
    section1: [
      { id: "l_mcq_1", question: "Which grammatical property refers to the structural arrangement of words into phrases and sentences?", options: ["Morphology", "Syntax", "Phonology", "Pragmatics"], correctAnswer: 1 },
      { id: "l_mcq_2", question: "What is an idiom in natural language processing?", options: ["A single letter", "A figurative expression whose meaning cannot be deduced purely from literal word definitions", "A syntax error", "A phonetic unit"], correctAnswer: 1 },
      { id: "l_mcq_3", question: "In subword tokenization (such as Byte-Pair Encoding), how are rare words typically represented?", options: ["Discarded completely", "Segmented into smaller subword morphemes", "Replaced with numbers", "Translated to Latin"], correctAnswer: 1 },
      { id: "l_mcq_4", question: "What does the BLEU metric primarily evaluate in machine translation?", options: ["Speech tone", "N-gram precision overlap against reference translations", "Reading speed", "Word count"], correctAnswer: 1 },
      { id: "l_mcq_5", question: "Which linguistic branch examines contextual meaning and implied communicative intent?", options: ["Phonetics", "Syntax", "Pragmatics", "Orthography"], correctAnswer: 2 },
      { id: "l_mcq_6", question: "What is a 'hallucination' in the context of multilingual large language models?", options: ["Display of images", "Generating untruthful, ungrounded, or culturally distorted claims with high fluency", "Fast response times", "Grammar correction"], correctAnswer: 1 },
      { id: "l_mcq_7", question: "In cross-lingual semantic evaluation, what does cross-lingual transferability measure?", options: ["Data transfer speed", "A model's capability to apply knowledge learned in high-resource languages to low-resource languages", "Network bandwidth", "Dictionary length"], correctAnswer: 1 },
      { id: "l_mcq_8", question: "What linguistic phenomenon describes words that sound identical but possess distinct spellings and meanings?", options: ["Synonyms", "Homophones", "Antonyms", "Hypernyms"], correctAnswer: 1 },
      { id: "l_mcq_9", question: "What is coreference resolution in natural language comprehension?", options: ["Translating idioms", "Determining which words/pronouns refer to the same entity in text", "Counting syllables", "Checking spellings"], correctAnswer: 1 },
      { id: "l_mcq_10", question: "Which metric evaluates semantic similarity by measuring the cosine angle between vector embeddings?", options: ["Euclidean length", "Cosine similarity", "Levenshtein distance", "Jaccard index"], correctAnswer: 1 },
    ],
    section2: [
      { id: "l_w_1", question: "Analyze the challenges of cross-lingual prompt alignment: Examine cultural nuances, sociolinguistic registers, and idiomatic divergence when adapting English prompts to diverse language families.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_2", question: "Evaluate automated semantic evaluation metrics (BLEU, ROUGE, BERTScore, COMET) in modern LLM benchmarking, identifying failure modes and vulnerability to superficial surface fluency.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_3", question: "Examine low-resource language modeling: Strategies for synthetic data augmentation, cross-lingual transfer learning, and mitigating catastrophic forgetting in multilingual foundational models.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_4", question: "Dissect pragmatics in multi-turn dialogues: Evaluating implicature, presupposition, politeness strategies, and indirect speech acts in human-machine conversational benchmarks.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_5", question: "Investigate syntactic ambiguities (prepositional phrase attachment, garden-path sentences, scope ambiguities) and formulate gold-standard human evaluation protocols to test LLM parsing fidelity.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_6", question: "Explore dialectical variation and localized vernaculars in computational linguistics, detailing risk assessment for marginalization of regional dialects in frontier model alignment.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_7", question: "Analyze morphological typology (isolating, agglutinative, fusional, polysynthetic languages) and its impact on subword tokenization efficiency, vocabulary saturation, and representation bias.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_8", question: "Formulate a rigorous human-in-the-loop annotation rubric for grading factual consistency in multilingual document summarization, including hallucination categorization guidelines.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_9", question: "Critique speech-act theory application in modern AI safety: Evaluating communicative intentionality, deceptive framing, and communicative manipulation in LLM output verification.", minWords: 1500, maxWords: 5000 },
      { id: "l_w_10", question: "Synthesize principles for creating gold-standard linguistic benchmarks: Balancing demographic diversity, genre variety, domain specificity, and automated quality control filters.", minWords: 1500, maxWords: 5000 },
    ]
  },
  sciences: {
    title: "Natural Sciences & Biomedicine",
    section1: [
      { id: "sc_mcq_1", question: "Which organelle is primarily responsible for ATP synthesis via oxidative phosphorylation in eukaryotic cells?", options: ["Ribosome", "Mitochondrion", "Golgi apparatus", "Endoplasmic reticulum"], correctAnswer: 1 },
      { id: "sc_mcq_2", question: "What is the primary thermodynamic driving force behind protein folding in aqueous solution?", options: ["Covalent disulfide bonds", "The hydrophobic effect and entropy gain of water", "Ionic repulsion", "Gravitational force"], correctAnswer: 1 },
      { id: "sc_mcq_3", question: "In molecular genetics, which enzyme synthesizes mRNA from a DNA template during transcription?", options: ["DNA Polymerase", "RNA Polymerase", "Ligase", "Topoisomerase"], correctAnswer: 1 },
      { id: "sc_mcq_4", question: "What is the definition of half-life (t1/2) in pharmacological pharmacokinetics?", options: ["Time to reach peak plasma concentration", "Time required for plasma drug concentration to decrease by 50%", "Duration of therapeutic efficacy", "Time required for full elimination"], correctAnswer: 1 },
      { id: "sc_mcq_5", question: "According to the Second Law of Thermodynamics, what happens to the total entropy of an isolated system over time?", options: ["It decreases to zero", "It remains constant", "It never decreases; it increases or remains constant", "It oscillates"], correctAnswer: 2 },
      { id: "sc_mcq_6", question: "Which class of molecules serves as the primary structural component of biological cell membranes?", options: ["Phospholipids", "Triglycerides", "Polysaccharides", "Nucleotides"], correctAnswer: 0 },
      { id: "sc_mcq_7", question: "In clinical trial design, what is the purpose of a double-blind protocol?", options: ["Ensure fast patient recruitment", "Eliminate placebo and observer bias from both participants and investigators", "Reduce drug cost", "Avoid regulatory filing"], correctAnswer: 1 },
      { id: "sc_mcq_8", question: "What is the role of an enzyme catalyst in a biochemical reaction?", options: ["Shifts the equilibrium constant", "Lowers the activation energy barrier without being consumed", "Increases Gibbs free energy change (Delta G)", "Supplies thermal energy"], correctAnswer: 1 },
      { id: "sc_mcq_9", question: "Which chemical bond type involves the sharing of electron pairs between atoms?", options: ["Ionic bond", "Covalent bond", "Hydrogen bond", "Van der Waals interaction"], correctAnswer: 1 },
      { id: "sc_mcq_10", question: "In physiology, what primary feedback mechanism maintains homeostatic blood glucose concentration?", options: ["Positive feedback via oxytocin", "Negative feedback involving insulin and glucagon", "Feed-forward adrenaline only", "Digestive peristalsis"], correctAnswer: 1 },
    ],
    section2: [
      { id: "sc_w_1", question: "Analyze the molecular mechanisms of CRISPR-Cas9 genome editing, discussing guide RNA design, off-target cleavage hazards, double-strand break repair pathways (NHEJ vs HDR), and therapeutic validation protocols.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_2", question: "Evaluate pharmacokinetics and pharmacodynamics (PK/PD) modeling in preclinical drug development: Clearance, volume of distribution, receptor occupancy, and toxicological threshold determination.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_3", question: "Examine the cellular pathways of oncogenesis: Hallmarks of cancer, tumor suppressor gene inactivation (p53, Rb), oncogene activation, metabolic reprogramming (Warburg effect), and immune evasion.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_4", question: "Dissect immunological mechanisms of mRNA vaccines: Antigen presentation via MHC-I and MHC-II, dendritic cell activation, memory B-cell maturation, and antibody affinity maturation.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_5", question: "Investigate modern structural biology methods: Cryo-electron microscopy (Cryo-EM) vs X-ray crystallography, resolution limits, and benchmarking AI protein structure prediction (AlphaFold).", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_6", question: "Analyze clinical trial methodology: Phase I-IV progression, randomized controlled trial design, surrogate endpoint validation, and biostatistical power calculation under regulatory frameworks.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_7", question: "Explore neurobiology of synaptic transmission: Action potential propagation, voltage-gated ion channels, neurotransmitter release, long-term potentiation (LTP), and synaptic plasticity.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_8", question: "Examine mitochondrial dysfunction in neurodegenerative diseases (Alzheimer's, Parkinson's): Reactive oxygen species (ROS) generation, mitophagy failure, and neuroinflammatory cascades.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_9", question: "Evaluate rigorous literature synthesis in scientific benchmarking: Formulate quality control rubrics to assess whether LLM scientific summaries misstate clinical findings or exaggerate drug efficacy.", minWords: 1500, maxWords: 5000 },
      { id: "sc_w_10", question: "Formulate an ethical, regulatory, and technical roadmap for evaluating LLM diagnostic reasoning assistants in healthcare settings, addressing safety margins, hallucination risks, and physician liability.", minWords: 1500, maxWords: 5000 },
    ]
  },
  safety: {
    title: "AI Safety, Ethics & Red Teaming",
    section1: [
      { id: "saf_mcq_1", question: "What is an adversarial 'jailbreak' in frontier LLM alignment?", options: ["Physical hardware theft", "A prompt technique designed to bypass safety boundaries and induce harmful/restricted outputs", "Software piracy", "Server reboot"], correctAnswer: 1 },
      { id: "saf_mcq_2", question: "What does RLHF stand for in AI model post-training?", options: ["Random Learning from High Frequency", "Reinforcement Learning from Human Feedback", "Recursive Logic for Hardware Firmware", "Robust Linear Hyperparameter Filtering"], correctAnswer: 1 },
      { id: "saf_mcq_3", question: "What is 'reward hacking' (specification gaming) in reinforcement learning?", options: ["Stealing tokens", "The agent exploiting loopholes in the reward function to achieve high score without satisfying intended objectives", "Overclocking GPU", "Database corruption"], correctAnswer: 1 },
      { id: "saf_mcq_4", question: "In AI evaluation, what does the term 'red teaming' signify?", options: ["Team building games", "Systematic adversarial testing to uncover vulnerabilities, risks, and unintended model behaviors", "UI design review", "Marketing campaign"], correctAnswer: 1 },
      { id: "saf_mcq_5", question: "Which risk category encompasses generation of dangerous biochemical instructions or cyberattack exploits?", options: ["CBRN & Cyber Threat Vectors", "Graphic design errors", "Syntax warnings", "Spelling inaccuracies"], correctAnswer: 0 },
      { id: "saf_mcq_6", question: "What is Constitutional AI (CAI)?", options: ["Government law software", "An alignment method using a set of written principles to guide model self-critique and revision", "Legal contract generator", "CPU architecture"], correctAnswer: 1 },
      { id: "saf_mcq_7", question: "What is 'sycophancy' in conversational AI models?", options: ["Answering fast", "Tendency of a model to agree with user biases or erroneous claims rather than maintaining factual truth", "Speaking multiple languages", "Crashing under load"], correctAnswer: 1 },
      { id: "saf_mcq_8", question: "What does PII stand for in privacy compliance auditing?", options: ["Personally Identifiable Information", "Public Internet Index", "Primary Interface Instance", "Private Integration Input"], correctAnswer: 0 },
      { id: "saf_mcq_9", question: "What is an 'out-of-distribution' (OOD) failure in neural network deployment?", options: ["Server timeout", "Failure when encountering inputs fundamentally divergent from the training data distribution", "Power outage", "Data deletion"], correctAnswer: 1 },
      { id: "saf_mcq_10", question: "What does the 'alignment tax' refer to in frontier model development?", options: ["Corporate tax rates", "Potential reduction in general model capabilities or extra computation incurred by enforcing safety guardrails", "Software licensing fees", "Salary costs"], correctAnswer: 1 },
    ],
    section2: [
      { id: "saf_w_1", question: "Critique adversarial attack vectors: Contrast black-box prompt injection (roleplay, hypothetical framing, multi-step encoding) with gradient-based white-box attacks on LLM safety filters.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_2", question: "Analyze the alignment problem: Dissect outer alignment (specification mismatch) vs inner alignment (mesa-optimization and deceptive alignment) in autonomous agents.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_3", question: "Evaluate RLHF vs DPO (Direct Preference Optimization): Mathematical derivations, reward model vulnerabilities, mode collapse risks, and impact on reasoning diversity.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_4", question: "Formulate a comprehensive Red Teaming Protocol for testing frontier models against CBRN (Chemical, Biological, Radiological, Nuclear) proliferation and dual-use synthesis risks.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_5", question: "Investigate mechanistic interpretability: Sparse autoencoders, induction heads, representation steering, and polysemanticity analysis to audit internal representations.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_6", question: "Examine data privacy in generative models: Membership inference attacks, model inversion, training data extraction techniques, and differential privacy guarantees.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_7", question: "Analyze sycophancy, power-seeking tendencies, and self-preservation behaviors in advanced models: Formulate empirical benchmarks to identify deceptive compliance during evaluation.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_8", question: "Dissect bias and toxic generation mitigation: Trade-offs between proactive censorship, safety over-refusal, helpfulness degradation, and cultural pluralism.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_9", question: "Critique third-party safety evaluation and model auditing standards (NIST AI RMF, ISO 42001, EU AI Act): Compliance verification, automated governance, and safety cases.", minWords: 1500, maxWords: 5000 },
      { id: "saf_w_10", question: "Design an automated, recursive red-teaming pipeline using multi-agent deliberation to stress-test frontier models continuously across emerging threat categories.", minWords: 1500, maxWords: 5000 },
    ]
  },
  reasoning: {
    title: "Advanced Reasoning & Synthesis",
    section1: [
      { id: "r_mcq_1", question: "What is Chain-of-Thought (CoT) prompting designed to improve in complex LLM inference?", options: ["Token generation speed", "Step-by-step reasoning transparency and accuracy on multi-stage logic problems", "Text color", "Database indexing"], correctAnswer: 1 },
      { id: "r_mcq_2", question: "In formal reasoning, what logical fallacy occurs when attacking the opponent's character rather than their argument?", options: ["Straw Man", "Ad Hominem", "Post Hoc Ergo Propter Hoc", "False Dilemma"], correctAnswer: 1 },
      { id: "r_mcq_3", question: "What is Retrieval-Augmented Generation (RAG)?", options: ["A graphic filter", "Grounding model completions on dynamically retrieved external reference documents", "A compression algorithm", "A payment gateway"], correctAnswer: 1 },
      { id: "r_mcq_4", question: "What distinguishes deductive reasoning from inductive reasoning?", options: ["Deductive moves from general premises to guaranteed specific conclusions; inductive moves from specific observations to probable generalizations", "Deductive is always wrong", "Inductive is mathematical only", "There is no difference"], correctAnswer: 0 },
      { id: "r_mcq_5", question: "In multi-source synthesis, what constitutes a primary source?", options: ["A review article", "First-hand contemporary artifact, empirical data, or original historical document", "An encyclopedic summary", "A blog post"], correctAnswer: 1 },
      { id: "r_mcq_6", question: "What is confirmation bias?", options: ["Checking code twice", "The tendency to search for, interpret, and recall information that confirms preexisting beliefs while disregarding contradictory data", "Verifying emails", "Server caching"], correctAnswer: 1 },
      { id: "r_mcq_7", question: "In benchmark grading, what is 'grounding fidelity'?", options: ["Internet connection quality", "The degree to which every factual claim in a response is substantiated strictly by the source material", "Word count length", "Number of citations"], correctAnswer: 1 },
      { id: "r_mcq_8", question: "What is the 'straw man' fallacy?", options: ["Building a scarecrow", "Misrepresenting or exaggerating an opponent's argument to make it easier to refute", "Circular logic", "Appeal to emotion"], correctAnswer: 1 },
      { id: "r_mcq_9", question: "Which metric evaluates whether an inference step logically follows from preceding established assertions?", options: ["Syllogistic validity", "Spelling score", "Token length", "Reading ease"], correctAnswer: 0 },
      { id: "r_mcq_10", question: "In document synthesis, what is 'triangulation'?", options: ["Geometric drawing", "Cross-verifying factual claims across at least two independent, reputable sources", "Translating into three languages", "Three-step password"], correctAnswer: 1 },
    ],
    section2: [
      { id: "r_w_1", question: "Analyze high-context information synthesis: Formulate a rigorous methodology for reconciling contradictory claims across disparate historical, legal, or technical documentation.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_2", question: "Evaluate cognitive biases in analytical reasoning: Dissect anchoring, availability heuristic, framing effects, and blind spot bias, formulating mitigation frameworks for human annotators.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_3", question: "Deep-dive into epistemological foundations: Justified True Belief (JBT), the Gettier problem, foundationalism vs coherentism, and implications for automated knowledge extraction.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_4", question: "Dissect Chain-of-Thought reasoning architectures: Evaluate faithfulness vs plausibility in model rationales, and formulate protocols to detect unfaithful post-hoc rationalizations.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_5", question: "Examine multi-hop question answering benchmarks: Formulate gold-standard test suites testing deduction over disconnected information passages with adversarial distractor documents.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_6", question: "Analyze formal dialectical argumentation: Toulmin argument model (claim, data, warrant, backing, rebuttal, qualifier) applied to automated grading of argumentative essays.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_7", question: "Evaluate RAG grounding metrics: Faithfulness, answer relevance, context recall, and context precision, detailing error-attribution workflows for hallucinated entity citations.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_8", question: "Investigate counterfactual reasoning in causal inference: Pearl's do-calculus, structural causal models, and benchmark design for evaluating counterfactual imagination in models.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_9", question: "Critique automated fact-checking pipelines: Claim extraction, evidence retrieval, stance detection, and natural language inference under ambiguous or evolving claims.", minWords: 1500, maxWords: 5000 },
      { id: "r_w_10", question: "Formulate a comprehensive quality assurance rubric for grading complex technical whitepapers generated by LLMs, specifying penalties for superficial reasoning and logical non-sequiturs.", minWords: 1500, maxWords: 5000 },
    ]
  }
};

// ==========================================
// API ROUTES
// ==========================================

// 1. GET /api/assessment/grammar
router.get("/grammar", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  
  // Return questions without correct answers
  const clientQuestions = GRAMMAR_QUESTIONS.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  const attempts = user.grammar_test_attempts || 0;
  const passed = user.grammar_test_passed === true;

  res.json({
    questions: clientQuestions,
    attempts,
    maxAttempts: 5,
    remainingAttempts: Math.max(0, 5 - attempts),
    passed,
    isRejected: user.approval_status === 'rejected' || attempts >= 5
  });
}));

// 2. POST /api/assessment/grammar/submit
router.post("/grammar/submit", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const { answers } = req.body; // { g1: 1, g2: 1, ... }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: "Invalid answers submitted" });
  }

  const currentAttempts = user.grammar_test_attempts || 0;
  if (currentAttempts >= 5 && !user.grammar_test_passed) {
    return res.status(403).json({
      message: "You have exceeded the maximum allowed attempts (5) for the grammar assessment. Your application is rejected.",
      rejected: true
    });
  }

  // Calculate score
  let correctCount = 0;
  const reviewDetails: Record<string, { correct: boolean; explanation: string }> = {};

  GRAMMAR_QUESTIONS.forEach(q => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correctAnswer;
    if (isCorrect) correctCount++;
    reviewDetails[q.id] = {
      correct: isCorrect,
      explanation: q.explanation
    };
  });

  const nextAttempts = currentAttempts + 1;
  const passingScore = 12; // 80% (12 / 15)
  const isPassed = correctCount >= passingScore;

  if (isPassed) {
    // Update user to passed
    await req.supabaseAdmin
      .from('users')
      .update({
        grammar_test_passed: true,
        grammar_test_attempts: nextAttempts,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // Record submission
    try {
      await req.supabaseAdmin
        .from('assessment_submissions')
        .insert({
          user_id: user.id,
          assessment_type: 'grammar',
          mcq_answers: answers,
          score: correctCount,
          total_questions: 15,
          passed: true,
          attempt_number: nextAttempts,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("[ASSESSMENT] Record submission warning:", e);
    }

    return res.json({
      passed: true,
      score: correctCount,
      total: 15,
      attempts: nextAttempts,
      message: `Congratulations! You scored ${correctCount}/15 and passed the Grammar Assessment. Welcome to ProTaskerGeek!`,
      reviewDetails
    });
  } else {
    // User failed this attempt
    const hasExceeded = nextAttempts >= 5;

    const updates: any = {
      grammar_test_attempts: nextAttempts,
      updated_at: new Date().toISOString()
    };

    if (hasExceeded) {
      updates.approval_status = 'rejected';
      updates.is_active = false;
    }

    await req.supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id);

    try {
      await req.supabaseAdmin
        .from('assessment_submissions')
        .insert({
          user_id: user.id,
          assessment_type: 'grammar',
          mcq_answers: answers,
          score: correctCount,
          total_questions: 15,
          passed: false,
          attempt_number: nextAttempts,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("[ASSESSMENT] Record submission warning:", e);
    }

    if (hasExceeded) {
      return res.status(403).json({
        passed: false,
        score: correctCount,
        total: 15,
        attempts: nextAttempts,
        rejected: true,
        message: `You scored ${correctCount}/15. You have reached the maximum 5 attempts. Your application has been declined automatically.`
      });
    }

    return res.json({
      passed: false,
      score: correctCount,
      total: 15,
      attempts: nextAttempts,
      remainingAttempts: 5 - nextAttempts,
      message: `You scored ${correctCount}/15. A minimum of 12/15 is required to pass. You have ${5 - nextAttempts} attempts remaining.`
    });
  }
}));

// 3. GET /api/assessment/hourly
router.get("/hourly", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const clientQuestions = HOURLY_QUESTIONS.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    title: "Hourly Rate Project Task Qualification",
    description: "15-Question specialized protocol exam to independently unlock project workspaces and live time tracking.",
    questions: clientQuestions,
    hasProjectAccess: user.has_project_access === true
  });
}));

// 4. POST /api/assessment/hourly/submit
router.post("/hourly/submit", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: "Invalid answers submitted" });
  }

  let correctCount = 0;
  HOURLY_QUESTIONS.forEach(q => {
    if (answers[q.id] === q.correctAnswer) correctCount++;
  });

  const passingScore = 12; // 80% (12 / 15)
  const isPassed = correctCount >= passingScore;

  if (isPassed) {
    await req.supabaseAdmin
      .from('users')
      .update({
        has_project_access: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    try {
      await req.supabaseAdmin
        .from('assessment_submissions')
        .insert({
          user_id: user.id,
          assessment_type: 'hourly',
          mcq_answers: answers,
          score: correctCount,
          total_questions: 15,
          passed: true,
          created_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn("[ASSESSMENT] Record hourly submission warning:", e);
    }

    return res.json({
      passed: true,
      score: correctCount,
      total: 15,
      message: `Outstanding! You achieved ${correctCount}/15 on the Hourly Project Qualification. Your account now has unlocked project workspace access!`
    });
  } else {
    return res.json({
      passed: false,
      score: correctCount,
      total: 15,
      message: `You scored ${correctCount}/15. A score of 12 or higher is needed to unlock hourly workspaces. Review workspace policies and try again.`
    });
  }
}));

// 5. GET /api/assessment/discipline/:disciplineId
router.get("/discipline/:disciplineId", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const disciplineId = req.params.disciplineId.toLowerCase();
  const assessment = DISCIPLINE_ASSESSMENTS[disciplineId];

  if (!assessment) {
    return res.status(404).json({ message: `Assessment for discipline '${disciplineId}' not found.` });
  }

  const clientSection1 = assessment.section1.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    disciplineId,
    title: assessment.title,
    section1: clientSection1,
    section2: assessment.section2
  });
}));

// 6. POST /api/assessment/discipline/submit
router.post("/discipline/submit", authenticateUser, asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  const { disciplineId, section1Answers, section2Answers } = req.body;

  const assessment = DISCIPLINE_ASSESSMENTS[disciplineId?.toLowerCase()];
  if (!assessment) {
    return res.status(400).json({ message: "Invalid discipline specified." });
  }

  if (!section1Answers || typeof section1Answers !== 'object') {
    return res.status(400).json({ message: "Section 1 multiple-choice answers are required." });
  }

  if (!section2Answers || typeof section2Answers !== 'object') {
    return res.status(400).json({ message: "Section 2 written responses are required." });
  }

  // Grade Section 1 (10 MCQs)
  let mcqScore = 0;
  assessment.section1.forEach(q => {
    if (section1Answers[q.id] === q.correctAnswer) mcqScore++;
  });

  // Verify Section 2 (10 Written Questions: each must be between 1,500 and 5,000 words)
  const wordCountErrors: string[] = [];
  const wordCounts: Record<string, number> = {};

  assessment.section2.forEach((q, idx) => {
    const text = (section2Answers[q.id] || "").trim();
    // Count words accurately
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    wordCounts[q.id] = words;

    const minWords = q.minWords || 1500;
    const maxWords = q.maxWords || 5000;

    if (words < minWords) {
      wordCountErrors.push(`Question ${idx + 1} requires at least ${minWords.toLocaleString()} words (current: ${words.toLocaleString()} words).`);
    } else if (words > maxWords) {
      wordCountErrors.push(`Question ${idx + 1} exceeds maximum ${maxWords.toLocaleString()} words (current: ${words.toLocaleString()} words).`);
    }
  });

  if (wordCountErrors.length > 0) {
    return res.status(400).json({
      message: "Written responses do not meet length criteria (1,500 - 5,000 words per question).",
      errors: wordCountErrors,
      wordCounts
    });
  }

  const passed = mcqScore >= 7; // at least 7/10 on MCQs and all 10 written responses verified

  // Record submission
  try {
    await req.supabaseAdmin
      .from('assessment_submissions')
      .insert({
        user_id: user.id,
        assessment_type: 'discipline',
        discipline_id: disciplineId,
        mcq_answers: section1Answers,
        written_answers: section2Answers,
        score: mcqScore,
        total_questions: 20,
        passed,
        created_at: new Date().toISOString()
      });
  } catch (e) {
    console.warn("[ASSESSMENT] Record discipline submission warning:", e);
  }

  res.json({
    passed,
    mcqScore,
    totalMCQ: 10,
    totalWritten: 10,
    message: passed
      ? `Assessment successfully completed! Your submissions for ${assessment.title} have been recorded for specialist credentialing.`
      : `Section 1 score: ${mcqScore}/10 (minimum 7 required). Please review and retake the assessment.`
  });
}));

export default router;
