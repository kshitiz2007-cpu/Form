require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and set it.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const sessions = new Map();
const scores = new Map();

const bank = {
  GK: [
    {q:"Which is the capital of India?",a:["Mumbai","New Delhi","Kolkata","Chennai"],c:1},
    {q:"How many days are there in a leap year?",a:["364","365","366","367"],c:2},
    {q:"Which is the largest ocean?",a:["Atlantic","Indian","Arctic","Pacific"],c:3},
    {q:"Who wrote India's national anthem?",a:["Rabindranath Tagore","Bankim Chandra","Sarojini Naidu","Premchand"],c:0},
    {q:"The currency of Japan is?",a:["Won","Yuan","Yen","Ringgit"],c:2}
  ],
  Science: [
    {q:"What is the chemical symbol for water?",a:["CO2","H2O","O2","NaCl"],c:1},
    {q:"Which planet is called the Red Planet?",a:["Venus","Jupiter","Mars","Mercury"],c:2},
    {q:"What gas do plants absorb?",a:["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],c:2},
    {q:"What is the center of an atom called?",a:["Electron","Nucleus","Proton","Shell"],c:1},
    {q:"Speed of light is approximately?",a:["3×10^8 m/s","300 m/s","3×10^5 m/s","1500 m/s"],c:0}
  ],
  Maths: [
    {q:"12 × 8 = ?",a:["86","96","108","88"],c:1},
    {q:"Square root of 144?",a:["10","11","12","14"],c:2},
    {q:"Sum of angles in a triangle?",a:["90°","180°","270°","360°"],c:1},
    {q:"15% of 200?",a:["20","25","30","35"],c:2},
    {q:"A prime number is divisible by?",a:["Only 1 and itself","2 numbers other than itself","Every even number","10"],c:0}
  ],
  Technology: [
    {q:"HTML is mainly used to?",a:["Style pages","Structure web pages","Store databases","Compile apps"],c:1},
    {q:"CPU stands for?",a:["Central Processing Unit","Computer Personal Unit","Core Program Utility","Central Print Unit"],c:0},
    {q:"Which is an operating system?",a:["Python","Linux","HTML","SQL"],c:1},
    {q:"What does URL stand for?",a:["Uniform Resource Locator","Universal Runtime Link","User Reference List","Unified Router Line"],c:0},
    {q:"Which is commonly used for styling websites?",a:["CSS","HTTP","RAM","DNS"],c:0}
  ]
};

function categoryKeyboard() {
  return { inline_keyboard: Object.keys(bank).map(cat => [{text:cat,callback_data:"cat:"+cat}]) };
}
function questionKeyboard(session) {
  const q=session.questions[session.index];
  return { inline_keyboard:q.a.map((option,i)=>[{text:option,callback_data:"ans:"+i}]) };
}
function sendQuestion(chatId, session) {
  const q=session.questions[session.index];
  bot.sendMessage(chatId, `🧠 *${session.category} Quiz*\nQuestion ${session.index+1}/${session.questions.length}\n\n${q.q}`, {
    parse_mode:"Markdown", reply_markup:questionKeyboard(session)
  });
}

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, "👋 Welcome to *QuizFlow*!\n\nUse /quiz to play a 5-question quiz, or /leaderboard to see top scores.", {parse_mode:"Markdown"});
});
bot.onText(/\/quiz/, msg => {
  bot.sendMessage(msg.chat.id, "Choose your quiz category:", {reply_markup:categoryKeyboard()});
});
bot.onText(/\/leaderboard/, msg => {
  const top=[...scores.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
  if(!top.length) return bot.sendMessage(msg.chat.id,"No scores yet. Play /quiz to be the first!");
  bot.sendMessage(msg.chat.id, "🏆 *QuizFlow Leaderboard*\n"+top.map((e,i)=>`${i+1}. ${e[0]} — ${e[1]} pts`).join("\n"),{parse_mode:"Markdown"});
});
bot.on("callback_query", async query => {
  const chatId=query.message.chat.id, userId=query.from.id;
  const data=query.data||"";
  if(data.startsWith("cat:")) {
    const category=data.slice(4);
    if(!bank[category]) return bot.answerCallbackQuery(query.id);
    const questions=bank[category].map(q=>({...q})).sort(()=>Math.random()-0.5;
    sessions.set(userId,{category,questions,index:0,score:0,name:query.from.username||query.from.first_name||String(userId)});
    await bot.answerCallbackQuery(query.id);
    await bot.sendMessage(chatId,`Starting ${category}! Good luck 🚀`);
    return sendQuestion(chatId,sessions.get(userId));
  }
  if(data.startsWith("ans:")) {
    const session=sessions.get(userId);
    if(!session) { await bot.answerCallbackQuery(query.id,{text:"Start a new quiz with /quiz"}); return; }
    const chosen=Number(data.slice(4)), q=session.questions[session.index];
    if(chosen===q.c) session.score++;
    await bot.answerCallbackQuery(query.id,{text:chosen===q.c?"Correct!":"Incorrect"});
    await bot.editMessageReplyMarkup({inline_keyboard:[]},{chat_id:chatId,message_id:query.message.message_id}).catch(()=>{});
    session.index++;
    if(session.index<session.questions.length) return sendQuestion(chatId,session);
    scores.set(session.name,(scores.get(session.name)||0)+session.score);
    await bot.sendMessage(chatId,`🎉 Quiz complete!\nCategory: ${session.category}\nScore: ${session.score}/${session.questions.length}\n\nPlay again with /quiz or check /leaderboard.`);
    sessions.delete(userId);
  }
});
bot.on("polling_error", err => console.error("Telegram polling error:", err.message));
console.log("QuizFlow Telegram bot is running.");
