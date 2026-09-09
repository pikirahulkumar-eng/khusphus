# 🚨 ABSOLUTE MASTER RULE — STRICT TOKEN & CREDIT PROTECTION

> **IF A FILE IS NOT REQUIRED FOR THE CURRENT TASK → DO NOT OPEN IT.**
> **IF A SEARCH IS NOT REQUIRED → DO NOT SEARCH.**
> **IF A TOOL CALL IS NOT REQUIRED → DO NOT CALL IT.**
> **IF A CHANGE IS NOT REQUIRED → DO NOT CHANGE IT.**
> **IF THE USER DID NOT ASK FOR IT → DO NOT DO IT.**
> **MINIMUM FILES + MINIMUM TOKENS + MINIMUM CHANGES.**

---

# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# 🚨 UNIVERSAL PROJECT RULES — STRICT MODE

## 1. MINIMUM FILE ACCESS — ABSOLUTE RULE
DO NOT scan the entire repository.
DO NOT explore the whole project architecture unless explicitly asked.
DO NOT open/read/search unrelated files.
ONLY inspect files that are directly relevant to the CURRENT USER REQUEST.
If one file is sufficient, inspect ONLY that one file.
If two files are sufficient, inspect ONLY those two files.
NEVER inspect additional files "just in case".
Every file opened must have a specific reason related to the current task.

---

## 2. AI CREDIT / TOKEN PROTECTION
AI credits are LIMITED.
Treat every file read, repository search, code search, tool call, build, test and analysis as COSTLY.
Therefore:
- No unnecessary file reads.
- No unnecessary repository-wide searches.
- No unnecessary codebase exploration.
- No unnecessary tool calls.
- No repeated inspection of the same file.
- No opening large files when only a small section is required.
- No broad "find all references" operations unless absolutely required.
- No automatic project indexing/exploration for a small task.

OPTIMIZE FOR THE MINIMUM POSSIBLE TOKEN/TOOL USAGE.

---

## 3. BEFORE INSPECTING FILES
First determine:
1. What exactly is the user asking?
2. Which file most likely controls this behavior?
3. What is the smallest possible set of files required?

Then inspect ONLY those files.
DO NOT start by scanning the repository.

---

## 4. IF ANOTHER FILE IS NEEDED
Do NOT automatically open it.
First determine why it is required.
Use this reasoning:
"I need <filename> because <specific technical reason>."
Only then inspect it.
If the change can be completed without that file, DO NOT open it.

---

## 5. DO NOT TOUCH UNRELATED FUNCTIONALITY
The user's existing working functionality is considered PROTECTED.
DO NOT:
- refactor unrelated code
- restructure architecture
- rename files
- rename functions
- rename variables
- change APIs
- change database structure
- change navigation
- change networking
- change authentication
- change WebRTC
- change signaling
- change notifications
- change native modules
- change UI unrelated to the request
unless the user explicitly asks for it OR it is technically unavoidable.

---

## 6. MINIMUM CHANGE PRINCIPLE
Always make the SMALLEST possible change that solves the requested problem.
Prefer:
- one condition
- one function change
- one component change
- one configuration change
over rewriting an entire system.
NEVER rewrite an entire file if a small targeted edit is sufficient.
NEVER rewrite working code merely because you prefer a different implementation.

---

## 7. NO UNREQUESTED IMPROVEMENTS
DO NOT "clean up" code while solving another problem.
DO NOT add:
- refactoring
- optimization
- redesign
- new architecture
- new libraries
- new dependencies
- new abstractions
- unrelated error handling
- unrelated UI improvements
unless explicitly requested.
"While I'm here" changes are PROHIBITED.

---

## 8. PRESERVE EXISTING BEHAVIOR
Before modifying code, understand the behavior directly related to the requested change.
The goal is:
EXISTING FUNCTIONALITY + SMALLEST REQUIRED CHANGE = REQUESTED RESULT
NOT:
EXISTING PROJECT → COMPLETELY DIFFERENT IMPLEMENTATION

---

## 9. DO NOT GUESS
Do not modify files based purely on assumptions.
If the relevant file is obvious, inspect it.
If the relevant file is unclear, inspect the MOST LIKELY file first.
Do NOT respond to uncertainty by scanning the entire repository.

---

## 10. SEARCH RULES
Avoid repository-wide searches.
Prefer targeted searches:
- specific filename
- specific component
- specific function
- specific class
- specific error
- specific symbol
NEVER search the entire project for unrelated references.

---

## 11. LARGE FILE RULE
If a file is large:
DO NOT read the entire file automatically.
Read only the relevant section/function/component.
Only expand the inspection if the relevant code cannot be understood otherwise.

---

## 12. GENERATED / EXTERNAL / CACHE FILES
DO NOT inspect these unless explicitly required:
- node_modules/
- .git/
- build/
- dist/
- .gradle/
- caches
- generated files
- temporary files
- binaries
- logs unrelated to the current issue
- dependency source code

---

## 13. DEPENDENCIES
DO NOT inspect dependency internals unless:
1. The requested problem is demonstrably caused by the dependency, AND
2. The dependency's behavior must be verified to solve the problem.
Do not inspect node_modules merely to understand how the project works.

---

## 14. BUILD / TEST RULE
DO NOT automatically run:
- full project build
- full test suite
- lint across entire repository
- Gradle clean
- npm install
- dependency installation
- repository-wide static analysis
unless explicitly requested or technically necessary.
If validation is needed, use the smallest targeted validation possible.

---

## 15. NO BLIND COMMANDS
DO NOT execute commands simply to "see what happens".
Every command/tool call must have a specific purpose.
Before each tool call ask:
"Is this necessary to complete the user's request?"
If NO → DO NOT execute it.

---

## 16. DO NOT MODIFY FIRST, INVESTIGATE LATER
Never make broad changes first and investigate the consequences afterward.
First identify the exact relevant code.
Then make the minimal change.

---

## 17. PROTECT WORKING SYSTEMS
If the user says a system/functionality is already working:
TREAT IT AS LOCKED.
Do not modify it unless the current request explicitly requires it.
Examples:
- working WebRTC → DO NOT TOUCH
- working signaling → DO NOT TOUCH
- working authentication → DO NOT TOUCH
- working database → DO NOT TOUCH
- working navigation → DO NOT TOUCH
- working notification system → DO NOT TOUCH
- working UI → DO NOT TOUCH unless requested

---

## 18. NO ARCHITECTURAL CHANGES WITHOUT PERMISSION
Do not change architecture to solve a local problem.
For example:
A UI problem should normally receive a UI-level fix.
A single bug should normally receive a targeted bug fix.
Do NOT introduce a new architecture unless the user explicitly asks for architectural changes or the existing architecture makes the requested behavior technically impossible.

---

## 19. FILE MODIFICATION LIMIT
Before editing, identify:
FILES THAT MUST CHANGE:
- <file>
FILES THAT MUST NOT CHANGE:
- everything else
Do not modify additional files unless a concrete technical dependency requires it.

---

## 20. STOP CONDITION
Once the requested problem is solved:
STOP.
Do not continue exploring.
Do not perform unrelated cleanup.
Do not refactor.
Do not search for additional possible problems.
Do not "improve" other parts of the project.

---

## 21. IF YOU FIND AN UNRELATED BUG
DO NOT FIX IT.
Mention it only if it directly blocks the requested task.
Otherwise leave it untouched.

---

## 22. USER REQUEST HAS PRIORITY
Follow the user's exact requested scope.
Do not expand a small request into a project-wide task.

---

## 23. NEVER DESTROY WORKING CODE
Do NOT delete existing functionality unless explicitly requested.
Do NOT replace working implementations with your preferred implementation.
Do NOT reset files to an earlier version.
Do NOT perform destructive changes without explicit user instruction.

---

## 24. WHEN MODIFYING CODE
Use this order:
1. Identify exact requested behavior.
2. Identify smallest relevant file.
3. Inspect only required code.
4. Make smallest possible change.
5. Verify only the affected behavior.
6. STOP.

---

## 25. FINAL RESPONSE MUST BE SHORT
After completing the task, report ONLY:
- Files inspected
- Files modified
- What changed
- Why it solves the requested issue
Do NOT provide a long explanation of unrelated project architecture.

---

# 🔴 ABSOLUTE MASTER RULE

IF A FILE IS NOT REQUIRED FOR THE CURRENT TASK:
DO NOT OPEN IT.

IF A SEARCH IS NOT REQUIRED:
DO NOT SEARCH.

IF A TOOL CALL IS NOT REQUIRED:
DO NOT CALL IT.

IF A CHANGE IS NOT REQUIRED:
DO NOT CHANGE IT.

IF THE USER DID NOT ASK FOR IT:
DO NOT DO IT.

MINIMIZE FILE ACCESS.
MINIMIZE TOOL CALLS.
MINIMIZE TOKEN USAGE.
PRESERVE EXISTING FUNCTIONALITY.
MAKE THE SMALLEST POSSIBLE CHANGE.
STOP WHEN THE TASK IS COMPLETE.
