# Scope Skill & Lifecycle Guard (`scope`)

ระบบจัดการ Context Window, ป้องกันการอ่านไฟล์ขนาดใหญ่เกินความจำเป็น, แจ้งเตือนเมื่อโหลด Skill ขนาดใหญ่ และบังคับอัปเดต `README.md` ก่อนจบงาน สำหรับ Antigravity

## โครงสร้างไฟล์ (Files)

- [`SKILL.md`](file:///C:/Users/parinya/.gemini/config/skills/scope/SKILL.md) — คำสั่งหลักของ Skill `scope`
- [`scripts/scope-hook.cjs`](file:///C:/Users/parinya/.gemini/config/skills/scope/scripts/scope-hook.cjs) — Lifecycle Hook Engine ทำงานร่วมกับ `PreToolUse`, `PreInvocation`, และ `Stop`
- [`~/.gemini/config/hooks.json`](file:///C:/Users/parinya/.gemini/config/hooks.json) — ไฟล์ลงทะเบียน Global Hooks
- [`~/.gemini/config/AGENTS.md`](file:///C:/Users/parinya/.gemini/config/AGENTS.md) — กฎ Global Rule ให้ Agent ปฏิบัติตามในทุกโปรเจกต์

## กฎการทำงานหลัก (Core Rules)

1. **Context Window >= 100k Tokens**: แจ้งเตือนให้ใช้คำสั่ง `/compact`
2. **Context Window >= 200k Tokens**: บันทึกงานที่กำลังทำอยู่ลง `STATUS.md` ในโฟลเดอร์โปรเจกต์ แล้วสั่ง `/clear` หรือ `/new`
3. **Skill > 20k Tokens ถูกโหลด**: แนะนำให้รัน `/clear` หลังจบงานนั้น
4. **Read ไฟล์ยาวเกิน 600 บรรทัดทั้งไฟล์**: บล็อกครั้งแรกเพื่อให้ระบุ `StartLine`/`EndLine` (offset/limit) เฉพาะส่วนที่ใช้ หากส่ง Read เดิมซ้ำครั้งที่ 2 จะอนุญาตให้ผ่าน
5. **ก่อนจบการทำงาน**: บังคับตรวจสอบและอัปเดต `README.md` ของโปรเจกต์เสมอ
