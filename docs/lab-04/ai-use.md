# Lab 4 — AI Use and Reflection

**LLM / Agent used:** Google Gemini 3.8 Flash (High) / Antigravity Agent

---

## Selected Key Prompts (6–10)

| # | Prompt (Summarised) | What I Did with the Result |
| :- | :--- | :--- |
| **1** | Read `SE+Lab+4.md` and previous lab context (`LAB2AGENTS.md`, `LAB3AGENTS.md`). Create `LAB4AGENTS.md` and decompose Sprint 4 into sub-features. Streamline into 6 consolidated issues matching Handout Section 11. | สั่งให้ Agent วิเคราะห์ข้อกำหนด Lab 4 อย่างละเอียด และสังเคราะห์แผนงาน 6 Issues ลงใน `.agents/LAB4AGENTS.md` เพื่อให้เป็น Single Source of Truth สำหรับการทำงานของ Agent ทุกตัวในโปรเจกต์ |
| **2** | Implement Issue #4-1 (Sprint 4 Engineering Contract & Specification): Draft `docs/lab-04/specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md` according to Spec DD and Test DD. | ตรวจสอบเอกสารทั้ง 6 ฉบับใน `docs/lab-04/` ให้ครอบคลุมกฎ BR-01..19, State Machine 8 สถานะ, Optimistic Concurrency 409 Conflict, Dashboard Formulas, และ AC-01..14 อย่างแม่นยำก่อนเริ่มเขียนโค้ด |
| **3** | *[Planned]* Implement Issue #4-2 (Actions Taken Foundation): Add `ActionTaken` model and `version` counter to Prisma schema, run migration, update seed script with 0/1/multi-action tickets, and build REST APIs with RBAC. | *[Pending execution]* |
| **4** | *[Planned]* Implement Issue #4-3 (Actions Taken UI): Create Actions Taken responsive table and modal for IT Staff with conditional follow-up note validation, and read-only view for Requesters. | *[Pending execution]* |
| **5** | *[Planned]* Implement Issue #4-4 (Ticket Workflow & Concurrency): Implement 8-status transition state machine, optimistic locking version check, advisory resolution gate, and conflict recovery UI banner. | *[Pending execution]* |
| **6** | *[Planned]* Implement Issue #4-5 (Role-Appropriate Operational Dashboards): Implement backend analytics endpoints and frontend Requester/Staff dashboards with Zen Green metric cards and drill-downs. | *[Pending execution]* |
| **7** | *[Planned]* Implement Issue #4-6 (Final Hardening, Regression & E2E): Implement Playwright E2E suites, verify zero regressions across Labs 1–3, audit accessibility and responsive layouts, and capture screenshots. | *[Pending execution]* |
| **8** | *[Planned]* Final integration: Merge feature branches into `lab4-staging` and `main`, complete peer review record, and generate the 9-part submission PDF report. | *[Pending execution]* |

---

## My Reflection

การนำ AI Agent (Gemini 3.8 Flash High) มาใช้ใน Lab 4 ตั้งแต่ขั้น Specification-Driven Development (Spec DD) ช่วยให้เราสามารถวางรากฐานทางสถาปัตยกรรมได้อย่างเป็นระบบ โดยเฉพาะอย่างยิ่งการออกแบบโครงสร้าง Parent-Child ของ **Actions Taken** และกลไก **Optimistic Concurrency Control (OCC)** ด้วย `version` integer บนโมเดล Ticket ซึ่งช่วยป้องกันปัญหา Stale Updates ในระบบที่รองรับการทำงานร่วมกันของ IT Staff หลายคนได้อย่างรัดกุม

การสกัดกฎทางธุรกิจออกเป็นรหัสที่ชัดเจน (`BR-01` ถึง `BR-19`) และเชื่อมโยงไปยังเกณฑ์การยอมรับ (`AC-01` ถึง `AC-14`) ทำให้การวาง Test Plan ใน `tests.md` มีความแม่นยำสูง สามารถการันตีได้ว่าทุกฟังก์ชันที่พัฒนาขึ้นจะตอบโจทย์ Stakeholder ครบถ้วนตามมาตรฐานวิศวกรรมซอฟต์แวร์ระดับมืออาชีพ
