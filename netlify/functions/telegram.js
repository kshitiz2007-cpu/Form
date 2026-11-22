const bank = {
  GK: [
    { q: "Which is the capital of India?", a: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], c: 1 },
    { q: "How many days are there in a leap year?", a: ["364", "365", "366", "367"], c: 2 },
    { q: "Which is the largest ocean?", a: ["Atlantic", "Indian", "Arctic", "Pacific"], c: 3 },
    { q: "Who wrote India's national anthem?", a: ["Rabindranath Tagore", "Bankim Chandra", "Sarojini Naidu", "Premchand"], c: 0 },
    { q: "The currency of Japan is?", a: ["Won", "Yuan", "Yen", "Ringgit"], c: 2 }
  ],
  Science: [
    { q: "What is the chemical symbol for water?", a: ["CO2", "H2O", "O2", "NaCl"], c: 1 },
    { q: "Which planet is called the Red Planet?", a: ["Venus", "Jupiter", "Mars", "Mercury"], c: 2 },
    { q: "What gas do plants absorb?", a: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], c: 2 },
    { q: "What is the center of an atom called?", a: ["Electron", "Nucleus", "Proton", "Shell"], c: 1 },
    { q: "Speed of light is approximately?", a: ["3×10^8 m/s", "300 m/s", "3×10^5 m/s", "1500 m/s"], c: 0 }
  ],
  Maths: [
    { q: "12 × 8 = ?", a: ["86", "96", "108", "88"], c: 1 },
    { q: "Square root of 144?", a: ["10", "11", "12", "14"], c: 2 },
    { q: "Sum of angles in a triangle?", a: ["90°", "180°", "270°", "360°"], c: 1 },
    { q: "15% of 200?", a: ["20", "25", "30", "35"], c: 2 },
    { q: "A prime number is divisible by?", a: ["Only 1 and itself", "Two other numbers", "Every even number", "10"], c: 0 }
  ],
  Technology: [
    { q: "HTML is mainly used to?", a: ["Style pages", "Structure web pages", "Store databases", "Compile apps"], c: 1 },
    { q: "CPU stands for?", a: ["Central Processing Unit", "Computer Personal Unit", "Core Program Utility", "Central Print Unit"], c: 0 },
    { q: "Which is an operating system?", a: ["Python", "Linux", "HTML", "SQL"], c: 1 },
    { q: "What does URL stand for?", a: ["Uniform Resource Locator", "Universal Runtime Link", "User Reference List", "Unified Router Line"], c: 0 },
    { q: "Which is commonly used for styling websites?", a: ["CSS", "HTTP", "RAM", "DNS"], c: 0 }
  ]
};

// Netlify functions are stateless across invocations. This memory is only best-effort
// and may reset whenever instances recycle. Use a database for persistent scores.
const sessions = new Map();
const leaderboard = new Map();

const api = (token, method) => `https://api.telegram.org/bot${token}/${method}`;
async function telegram(token, method, payload) {
  const response = await fetch(api(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json();
}
async function sendQuestion(token, chatId, userId) {
  const session = sessions.get(userId);
  if (!session) return;
  const q = session.questions[session.index];
  return telegram(token, "sendMessage", {
    chat_id: chatId,
    text: `🧠 ${session.category} Quiz\nQuestion ${session.index + 1}/${session.questions.length}\n\n${q.q}`,
    reply_markup: { inline_keyboard: q.a.map((answer, i) => [{ text: answer, callback_data: `ans:${i}` }]) }
  });
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return new Response("Missing TELEGRAM_BOT_TOKEN", { status: 500 });
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) return new Response("Unauthorized", { status: 401 });

  try {
    const update = await req.json();
    if (update.message) {
      const msg = update.message, chatId = msg.chat.id, text = (msg.text || "").trim();
      if (text === "/start") {
        await telegram(token, "sendMessage", { chat_id: chatId, text: "👋 Welcome to QuizFlow!\n\n/quiz - Start a quiz\n/leaderboard - Top scores\n\nReady to test your knowledge? 🧠" });
      } else if (text === "/quiz") {
        await telegram(token, "sendMessage", { chat_id: chatId, text: "Choose a category:", reply_markup: { inline_keyboard: Object.keys(bank).map(cat => [{ text: cat, callback_data: `cat:${cat}` }]) } });
      } else if (text === "/leaderboard") {
        const top = [...leaderboard.entries()].sort((a,b) => b[1]-a[1]).slice(0,10);
        const textOut = top.length ? "🏆 QuizFlow Leaderboard\n" + top.map((e,i) => `${i+1}. ${e[0]} — ${e[1]} points`).join("\n") : "No scores yet. Play /quiz to be the first!";
        await telegram(token, "sendMessage", { chat_id: chatId, text: textOut });
      }
    } else if (update.callback_query) {
      const query = update.callback_query, userId = query.from.id, chatId = query.message.chat.id, data = query.data || "";
      if (data.startsWith("cat:")) {
        const category = data.slice(4);
        if (bank[category]) {
          const questions = bank[category].map(q => ({ ...q })).sort(() => Math.random() - 0.5);
          sessions.set(userId, { category, questions, index: 0, score: 0, name: query.from.username || query.from.first_name || String(userId) });
          await telegram(token, "answerCallbackQuery", { callback_query_id: query.id });
          await telegram(token, "sendMessage", { chat_id: chatId, text: `Starting ${category}! Good luck 🚀` });
          await sendQuestion(token, chatId, userId);
        } else {
          await telegram(token, "answerCallbackQuery", { callback_query_id: query.id });
        }
      } else if (data.startsWith("ans:")) {
        const session = sessions.get(userId);
        if (!session) {
          await telegram(token, "answerCallbackQuery", { callback_query_id: query.id, text: "Start a quiz with /quiz" });
        } else {
          const chosen = Number(data.slice(4)), q = session.questions[session.index];
          if (chosen === q.c) session.score++;
          await telegram(token, "answerCallbackQuery", { callback_query_id: query.id, text: chosen === q.c ? "Correct!" : "Incorrect" });
          await telegram(token, "editMessageReplyMarkup", { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
          session.index++;
          if (session.index < session.questions.length) {
            await sendQuestion(token, chatId, userId);
          } else {
            leaderboard.set(session.name, (leaderboard.get(session.name) || 0) + session.score);
            await telegram(token, "sendMessage", { chat_id: chatId, text: `🎉 Quiz complete!\nCategory: ${session.category}\nScore: ${session.score}/${session.questions.length}\n\nPlay again with /quiz or check /leaderboard.` });
            sessions.delete(userId);
          }
        }
      }
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
};
