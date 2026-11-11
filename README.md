# MySkillForAgents

Repository รวบรวม Custom Skills, Lifecycle Hooks และ Workflow Rules สำหรับนำไปใช้งานกับ **AI Agent Harnesses** (เช่น Antigravity, Claude Code, Gemini CLI, Cursor, OpenCode)

สร้างและดูแลโดย **ปริญญา กันชัย (Parinya Kanchai)** — [rmzstudio.xyz](https://rmzstudio.xyz)

---

## 📦 รายการ Skills ใน Repository นี้

| Skill | หมวดหมู่ | รายละเอียด | Path |
| :--- | :--- | :--- | :--- |
| **`scope`** | Context & Workflow Guard | จัดการ Context Window (100k `/compact`, 200k บันทึก `STATUS.md` + `/clear` หรือ `/new`), เตือนเมื่อโหลด Skill > 20k tokens, บล็อกการ Read ไฟล์ > 600 บรรทัดทั้งไฟล์ในครั้งแรก (ส่งซ้ำครั้งที่ 2 ผ่าน), และบังคับอัปเดต `README.md` ก่อนจบงาน | [`skills/scope/`](./skills/scope/) |

---

## 🗂️ โครงสร้างโปรเจกต์ (Repository Structure)

```text
MySkillForAgents/
├── plugin.json                        # Manifest สำหรับติดตั้งเป็น Plugin ทั้งชุด
├── hooks.json                         # Lifecycle Hooks (PreToolUse, PreInvocation, Stop)
├── rules/
│   └── AGENTS.md                      # Global Rules สำหรับ AI Harness
└── skills/
    └── scope/
        ├── SKILL.md                   # คำสั่งหลักของ Skill "scope"
        ├── README.md                  # เอกสารอธิบายการทำงานของ Skill "scope"
        └── scripts/
            └── scope-hook.cjs         # Hook Engine (Node.js)
```

---

## 🚀 วิธีนำไปใช้งาน (Installation)

### 1. ติดตั้งด้วย `npx skills` หรือ Clone ลง Global Config

```bash
# Clone repository
git clone https://github.com/6ruce-wayne/MySkillForAgents.git

# คัดลอก skill "scope", rules และ hooks ไปยัง Global Config ของ Antigravity / Gemini
cp -r MySkillForAgents/skills/scope ~/.gemini/config/skills/scope
cp MySkillForAgents/rules/AGENTS.md ~/.gemini/config/AGENTS.md
cp MySkillForAgents/hooks.json ~/.gemini/config/hooks.json
```

### 2. การตรวจสอบสถานะการทำงานของ `scope`

```bash
node ~/.gemini/config/skills/scope/scripts/scope-hook.cjs status
```
