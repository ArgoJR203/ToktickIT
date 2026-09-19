# Lab 3 — Peer Review Record

**Author**: จีราวัฒน์ รัชตะประเมศฐ์ | 67070501057 | GitHub: @ArgoJR203  
**Peer reviewer**: หฤษฎ์ ไชยานุกิจ | 67070501047 | GitHub: @Gluesaber

---

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
| :-- | :--------------------------------- | :--------------- |
| https://github.com/ArgoJR203/ToktickIT/pull/39 | `feature/3-1-requirement`          | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/40 | `feature/3-2-schema-seed`          | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/41 | `feature/3-3-auth-foundation`      | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/42 | `feature/3-4-login-ui`             | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/43 | `feature/3-5-requester-regression` | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/44 | `feature/3-6-staff-queue`          | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/45 | `feature/3-7-staff-ticket-detail`  | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/46 | `feature/3-8-admin-users`          | Approved |
| https://github.com/ArgoJR203/ToktickIT/pull/47 | `feature/3-9-e2e-review`           | Approved |

---

## Peer Review Notes & Comments Log

### 1. PR #39 (`feature/3-1-requirement`)
- **Reviewer Feedback**: ตรวจสอบเอกสารความต้องการและโครงสร้าง Requirement ทั้งหมดครอบคลุม User Role (Requester, IT Staff, Admin), Password Policy, JWT Authentication, Staff Queue, Admin Safety และ E2E Test Scenarios ตาม Handout §10-§14
- **Resolution**: ปรับแก้เอกสาร Requirement และ Test Matrix ให้สอดคล้องกับเกณฑ์การให้คะแนนและ Acceptance Criteria ครบถ้วน (AC-01 ถึง AC-16)

### 2. PR #40 (`feature/3-2-schema-seed`)
- **Reviewer Feedback**: Schema มี Role enum, User model, IT priority, Resolution summary และ seed data ครบถ้วนตามโจทย์ มีผู้ใช้ทดสอบ 11 บัญชีรวม David Lee (`mustChangePassword: true`), Robert Taylor (`isActive: false`), และ Admin John Smith
- **Resolution**: Approved — รัน seed สำเร็จ ข้อมูลเริ่มต้นพร้อมสำหรับการทดสอบทุก Role

### 3. PR #41 (`feature/3-3-auth-foundation`)
- **Reviewer Feedback**: มีข้อเสนอแนะเรื่องความปลอดภัยของ JWT Secret: ในโค้ดเดิมมี fallback secret ค่าคงที่ ซึ่งอาจมีความเสี่ยงเรื่อง Credential Leakage หากหลุดขึ้น source control
- **Resolution**: ปรับปรุง `server/src/utils/jwt.ts` ให้ดึงจาก `process.env.JWT_SECRET` และสุ่ม ephemeral in-memory secret เฉพาะ dev/test โดยปฏิเสธ strict refusal ใน production ตาม Handout §6.1

### 4. PR #42 (`feature/3-4-login-ui`)
- **Reviewer Feedback**: หน้าจอ Login และ Change Password ทำงานได้ดี ตรวจสอบ real-time checklist สำหรับ Password Complexity ครบ 4 กฎ และ Route Guard ปิดกั้นการเข้าใช้งานแอปพลิเคชันจนกว่าจะเปลี่ยนรหัสผ่านเริ่มต้นสำเร็จ
- **Resolution**: Approved — ผ่านการทดสอบ Component unit tests ทั้งหมด

### 5. PR #43 (`feature/3-5-requester-regression`)
- **Reviewer Feedback**: ตรวจพบช่องโหว่ความปลอดภัยเกี่ยวกับ `authenticateWithLegacyFallback`: แม้จะซ่อนปุ่ม Dev Selector บนหน้า Login แล้ว แต่ middleware ยังยอมรับ `x-requester-id` header หากไม่มี Bearer token ทำให้ผู้ใช้สามารถ bypass เข้าถึงตั๋วของผู้อื่นได้โดยตรง
- **Resolution**: อัปเดต `authenticateWithLegacyFallback` ให้ตรวจสอบสิทธิ์อย่างเข้มงวดและปิดการใช้งาน legacy bypass เมื่ออยู่ใน production/authenticated mode พร้อมทั้งป้องกัน cross-requester ownership leak (API-09)

### 6. PR #44 (`feature/3-6-staff-queue`)
- **Reviewer Feedback**: ฟังก์ชันค้นหาและกรองตั๋วใน Ticket Queue ทำงานได้ถูกต้อง แต่ต้องการให้ Badge ของ Status และ Priority มีดีไซน์และโทนสีสอดคล้องกับหน้า My Tickets และแก้ไข badge "WAITING FOR REQUESTER" ให้ไม่ล้นกรอบ
- **Resolution**: ปรับปรุง CSS และ Badge component ให้ใช้ Zen Green design tokens ร่วมกับสีมาตรฐานเดียวกัน และแก้ไข whitespace/padding ไม่ให้ล้นตาราง

### 7. PR #45 (`feature/3-7-staff-ticket-detail`)
- **Reviewer Feedback**: หน้า Ticket Detail สำหรับ Staff ทำงานได้สมบูรณ์ ทั้งการ Assign to Me, ปรับเปลี่ยน IT Priority อิสระ, บันทึก Status พร้อม Resolution Summary และแยก Tab ระหว่าง Public Comments กับ Internal Notes (สี Warm Amber พร้อมแม่กุญแจ 🔒)
- **Resolution**: Approved — ทำการทดสอบสิทธิ์ AC-04 ยืนยัน Requester ไม่สามารถมองเห็นหรือเข้าถึง Internal Notes ได้อย่างเด็ดขาด

### 8. PR #46 (`feature/3-8-admin-users`)
- **Reviewer Feedback**: การทำงานของ Administrator User Management ดีมาก แต่พบข้อสังเกต 3 ประการ:
  1. *Password handling*: ตรวจสอบ password โดยยังไม่ trim แต่ trim ก่อน hash ทำให้รหัสผ่านที่มี trailing space ถูกบันทึกต่างจากที่กรอก
  2. *Race condition*: ใช้ `findUnique` แล้วตามด้วย `create` หากมี concurrent requests สองตัวส่งอีเมลซ้ำพร้อมกันจะหลุดไป 500 แทน 409
  3. *Active admin count*: นับจำนวน admin จากข้อมูลที่ filter ในตาราง ทำให้ตัวเลขนับลดลงเมื่อค้นหา
- **Resolution**: แก้ไข password validation ให้สอดคล้องกัน, เพิ่ม Prisma `P2002` error handling เป็น 409 Conflict, และแยก authoritative global active admin count API อิสระจาก table filter

### 9. PR #47 (`feature/3-9-e2e-review`)
- **Reviewer Feedback**: ชุดทดสอบ Playwright E2E Tests (E2E-01, E2E-02, E2E-03, E2E-04) และการบันทึกภาพถ่าย Visual Evidence Screenshots ผ่านทุกการทดสอบครบ 100% ทั้ง 3 Viewports (Desktop, Tablet, Mobile) ครอบคลุมเกณฑ์ Handout §10, §14 Part 9
- **Resolution**: Approved — ตรวจสอบผลการรัน 39/39 tests ผ่านทั้งหมด เอกสารและหลักฐานเสร็จสมบูรณ์พร้อมส่งมอบ
