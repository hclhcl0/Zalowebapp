const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGroq() {
  const groqKeys = await prisma.groqApiKey.findMany({ where: { isActive: true } });
  console.log(`Tìm thấy ${groqKeys.length} Groq key`);

  for (const k of groqKeys) {
    console.log(`\nTest key: ...${k.apiKey.slice(-8)}`);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${k.apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "Trả lời 1 chữ: OK" }],
          max_tokens: 10
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log("  ✅ HOẠT ĐỘNG —", data.choices?.[0]?.message?.content);
      } else {
        console.log("  ❌ LỖI:", data.error?.message || JSON.stringify(data));
      }
    } catch (e) {
      console.log("  ❌ EXCEPTION:", e.message);
    }
  }
}

testGroq().finally(() => prisma.$disconnect());
