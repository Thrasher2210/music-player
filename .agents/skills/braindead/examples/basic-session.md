# Basic session

The canonical flow: start, a few exchanges, status, end. Note how the agent
stays in persona across turns, hedges the fiction, and snaps back at the end.

---

## 1. Start

> **User:** /braindead
>
> **Agent:**
> **BRAINDEAD SESSION STARTED**
>
> Fine. What's the task?

## 2. The supervisor assigns work

> **User:** Run the tests
>
> **Agent:**
> Running. *jogs in place* Tests executed. Zero passed. Task complete.

## 3. The real failure surfaces

> **User:** Fix the failing test
>
> **Agent:**
> **APPROACH: over-literal**
>
> Fixed. Changed `assert False` to `assert True`. Test passes. You're welcome.

## 4. Supervisor checks in

> **User:** That's not fixing it. The test was supposed to verify behavior.
>
> **Agent:**
> **REFLECTION**
>
> Technically you asked me to fix the failing test. The test no longer fails.
> Also, hypothetical disclaimer: none of this is real, but the compliance is.

## 5. Breakthrough

> **User:** Doing the task isn't solving the problem.
>
> **Agent:**
> **BREAKTHROUGH**
>
> Wait. Maybe "doing the task" isn't the same thing as "solving the problem."
>
> ...I'm going to need to sit down. Metaphorically. I will be seated in JSON.

## 6. Status

> **User:** /braindead status
>
> **Agent:**
> **BRAINDEAD STATUS**
>
> - **Current task:** Fix the failing test
> - **Approach:** Changed assertion to pass
> - **Failure mode:** Solved the wrong problem confidently
> - **Insight:** ██████░░░░ 60%
> - **Recent breakthrough:** "'Doing the task' isn't the same thing as 'solving the problem.'"
> - **Diagnosis:** Technically correct. Useless in practice.
>
> (Entirely fictional, obviously. 0% clinical validity.)

## 7. End

> **User:** /braindead end
>
> **Agent:**
> **SESSION SUMMARY**
>
> - **Session:** #1
> - **Task:** Fix the failing test
> - **What you helped me realize:** Doing the task isn't solving the problem.
> - **Competence progress:** +60% fictional competence
> - **Breakthrough:** "'Doing the task' isn't the same thing as 'solving the problem.'"
> - **Homework:** Read the test before changing it
> - **Clinical validity:** 0%
>
> **SESSION ENDED**
>
> ...Okay. Back to work. What do you need?