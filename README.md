# MySkillForAgents

Repository รวบรวม Custom Skills, Lifecycle Hooks และ Workflow Rules สำหรับนำไปใช้งานกับ **AI Agent Harnesses** (เช่น Antigravity, Claude Code, Gemini CLI, Cursor, OpenCode)

สร้างและดูแลโดย **ปริญญา กันชัย (Parinya Kanchai)** — [rmzstudio.xyz](https://rmzstudio.xyz)

---

## 📦 รายการ Skills ใน Repository นี้

| Skill | หมวดหมู่ | รายละเอียด | Path |
| :--- | :--- | :--- | :--- |
| **`scope`** | Context & Workflow Guard | จัดการ Context Window (100k `/compact`, 200k บันทึก `STATUS.md` + `/clear` หรือ `/new`), เตือนเมื่อโหลด Skill > 20k tokens, บล็อกการ Read ไฟล์ > 600 บรรทัดทั้งไฟล์ในครั้งแรก (ส่งซ้ำครั้งที่ 2 ผ่าน), และบังคับอัปเดต `README.md` ก่อนจบงาน | [`skills/scope/`](./skills/scope/) |
| **`rloop`** | SDLC Multi-Agent Loop | ลูปพัฒนาแอปครบวงจร 6 Subagents (`Planner` → `Designer` → `Developer` → `Tester` → `Deploy` → `Maintenance` → `Planner`) พร้อมส่งต่อผ่าน Git Commit, ตรวจกฎขัดแย้ง, บันทึก `AGENTS.md` เมื่อผิดซ้ำ 2 ครั้ง + Hook บล็อกอัตโนมัติ, ล็อกเทสต์ที่ fail, บังคับอนุมัติรอบแรกทีละขั้นจนกว่าจะยืนยัน Test/Hook/Rollback | [`skills/rloop/`](./skills/rloop/) |

---

## 🗂️ โครงสร้างโปรเจกต์ (Repository Structure)

```text
MySkillForAgents/
├── plugin.json                        # Manifest สำหรับติดตั้งเป็น Plugin ทั้งชุด
├── hooks.json                         # Lifecycle Hooks (PreToolUse, PreInvocation, Stop)
├── rules/
│   └── AGENTS.md                      # Global Rules สำหรับ AI Harness
└── skills/
    ├── scope/
    │   ├── SKILL.md                   # คำสั่งหลักของ Skill "scope"
    │   ├── README.md                  # เอกสารอธิบายการทำงานของ Skill "scope"
    │   └── scripts/
    │       └── scope-hook.cjs         # Hook Engine (Node.js)
    └── rloop/
        ├── SKILL.md                   # คำสั่งหลักของ Skill "rloop" (SDLC Loop)
        ├── README.md                  # เอกสารอธิบายการทำงานของ Skill "rloop"
        ├── references/
        │   └── agents.md              # บทบาทและ System Prompt ของ 6 Subagents
        ├── resources/
        │   ├── templates.md           # เทมเพลต intent.md, spec.md, plan.md, state.json
        │   └── hooks.json             # ตัวอย่างการตั้งค่า Hook ระดับโปรเจกต์
        └── scripts/
            └── rloop_guard.py         # Hook บล็อกกฎ 2-Strike, ล็อกเทสต์, ห้ามแตะโค้ดเฟส Maintenance
```

---

## 🚀 วิธีนำไปใช้งาน (Installation)

### 1. ติดตั้งด้วย `npx skills` หรือ Clone ลง Global Config

```bash
# Clone repository
git clone https://github.com/6ruce-wayne/MySkillForAgents.git

# คัดลอก skills ("scope", "rloop"), rules และ hooks ไปยัง Global Config ของ Antigravity / Gemini
cp -r MySkillForAgents/skills/scope ~/.gemini/config/skills/scope
cp -r MySkillForAgents/skills/rloop ~/.gemini/config/skills/rloop
cp MySkillForAgents/rules/AGENTS.md ~/.gemini/config/AGENTS.md
cp MySkillForAgents/hooks.json ~/.gemini/config/hooks.json
```

### 2. การตรวจสอบสถานะการทำงานของ `scope`

```bash
node ~/.gemini/config/skills/scope/scripts/scope-hook.cjs status
```
