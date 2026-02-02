import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import multer from "multer";
import fs from "fs";

const PORT = process.env.PORT || 3_000;

const app = express();

app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const context = [];

app.use(cors());

app.use("/uploads", express.static("uploads"));

/* =======================
   MULTER (AVATAR UPLOAD)
======================= */

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

const upload = multer({ storage });

app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

// reouter chat
app.get("/", (req, res) => {
  res.send({ ok: true });
});

app.post("/prompt", async (req, res) => {
  const { prompt } = req.body;

  context.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: context,
    max_tokens: 1024,
  });

  const assistantMessage = response.choices[0].message.content;
  context.push({ role: "assistant", content: assistantMessage });

  res.send({ answer: assistantMessage });
});
app.post("/analyze-food", upload.single("image"), async (req, res) => {
  try {
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
         Agar rasmda oziq-ovqat yoki mahsulotlarga oid aniq buyumlar bo'lsa,unda ularni aniqlab, har bir mahsulot uchun quyidagi formatda javob ber:
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

   ❌ Uzr, bu rasmda mahsulotga oid narsalar aniqlanmadi. Iltimos, boshqa rasm yuboring.`,
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

    fs.unlinkSync(imagePath);

    res.json({
      success: true,
      result: response.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Xatolik yuz berdi" });
  }
});

app.listen(PORT, () => console.log(`Server ready at: ${PORT}`));
