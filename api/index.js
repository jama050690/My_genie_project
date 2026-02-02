import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  initDatabase,
  createUser,
  getUserById,
  createConversation,
  getConversationsByUser,
  addMessage,
  getMessagesByConversation,
  saveFoodAnalysis,
  getFoodAnalysesByUser,
} from "./database.js";

const PORT = process.env.PORT || 3_000;

const app = express();

app.use(express.json());
app.use(cors());

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

app.use("/uploads", express.static("uploads"));

/* =======================
   MULTER (FILE UPLOAD)
======================= */

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Faqat rasm fayllari ruxsat etilgan"), false);
  }
};

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage, fileFilter });

/* =======================
   USER ROUTES
======================= */

app.post("/users", async (req, res) => {
  try {
    const { name, email, avatar_url } = req.body;
    const user = await createUser(name, email, avatar_url);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Foydalanuvchi yaratishda xatolik" });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

/* =======================
   CONVERSATION ROUTES
======================= */

app.post("/conversations", async (req, res) => {
  try {
    const { user_id, title } = req.body;
    const conversation = await createConversation(user_id, title);
    res.json(conversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Suhbat yaratishda xatolik" });
  }
});

app.get("/users/:userId/conversations", async (req, res) => {
  try {
    const conversations = await getConversationsByUser(req.params.userId);
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

app.get("/conversations/:id/messages", async (req, res) => {
  try {
    const messages = await getMessagesByConversation(req.params.id);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

/* =======================
   CHAT / PROMPT
======================= */

app.get("/", (req, res) => {
  res.send({ ok: true });
});

app.post("/prompt", async (req, res) => {
  try {
    const { prompt, conversation_id } = req.body;

    if (!conversation_id) {
      return res.status(400).json({ error: "conversation_id talab qilinadi" });
    }

    // Xabarni saqlash
    await addMessage(conversation_id, "user", prompt);

    // Oldingi xabarlarni olish (context)
    const context = await getMessagesByConversation(conversation_id);

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: context,
      max_tokens: 1024,
    });

    const assistantMessage = response.choices[0].message.content;

    // Assistant javobini saqlash
    await addMessage(conversation_id, "assistant", assistantMessage);

    res.json({ answer: assistantMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

/* =======================
   FILE UPLOAD
======================= */

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Fayl yuklanmadi" });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

/* =======================
   FOOD ANALYSIS
======================= */

app.post("/analyze-food", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Rasm yuklanmadi" });
    }

    const { user_id } = req.body;
    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Avval rasmni tekshir:
         Agar rasmda oziq-ovqat yoki mahsulotlarga oid aniq buyumlar bo'lsa, ularni aniqlab, har bir mahsulot uchun quyidagi formatda javob ber:
  - Emoji + mahsulot nomi — 100 g
  - Kaloriya
  - Uglevod
  - Oqsil
  - Yog'
  - Shakar/Glyukoza

    Qoidalar:
    - Jadval ishlatma
    - Faqat ro'yxat ko'rinishida yoz
    - Har bir mahsulot orasida bosh qator qoldir
    - Javob o'zbek tilida bo'lsin
    - Qiymatlar taxminiy bo'lishi mumkin

    Agar rasm oziq-ovqat yoki mahsulotlarga OID BO'LMASA,
    unda FAQAT quyidagi jumlani yoz va boshqa hech narsa qo'shma:

   Uzr, bu rasmda mahsulotga oid narsalar aniqlanmadi. Iltimos, boshqa rasm yuboring.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    });

    const result = response.choices[0].message.content;

    // Natijani databasega saqlash
    if (user_id) {
      await saveFoodAnalysis(user_id, `/uploads/${req.file.filename}`, result);
    }

    // Rasmni o'chirish (ixtiyoriy - saqlash ham mumkin)
    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      result: result,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Xatolik yuz berdi" });
  }
});

app.get("/users/:userId/food-analyses", async (req, res) => {
  try {
    const analyses = await getFoodAnalysesByUser(req.params.userId);
    res.json(analyses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

/* =======================
   SERVER START
======================= */

initDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server ready at: ${PORT}`));
  })
  .catch((err) => {
    console.error("Database ulanishda xatolik:", err);
    process.exit(1);
  });
