const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getAIAnalysis = async (req, res) => {
    try {
        // Validasi input
        const { user, foodLogs, dailyGoals } = req.body;

        if (!user || !foodLogs || !dailyGoals) {
            console.error("Error: Data pengguna tidak lengkap.");
            return res.status(400).json({ message: "Data pengguna tidak lengkap." });
        }

        const totals = foodLogs.reduce((acc, log) => {
            acc.totalCalories += log.calories;
            acc.totalProtein += log.protein;
            acc.totalCarbs += log.carbohydrates;
            acc.totalFat += log.fat;
            return acc;
        }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });

        const foodList = foodLogs.map(f => f.foodName).join(', ') || 'Belum ada';

        const prompt = `
            Anda adalah seorang Asisten Nutrisi yang ramah dan suportif untuk aplikasi bernama NutriTrack.
            Berikan analisis dalam Bahasa Indonesia.

            Berikut adalah data pengguna hari ini:
            - Nama: ${user.name}
            - Kategori Usia: ${user.ageCategory}
            - Target Kalori Harian: ${dailyGoals.calories} kkal
            - Target Protein Harian: ${dailyGoals.protein} g
            - Target Karbohidrat Harian: ${dailyGoals.carbohydrates} g
            - Target Lemak Harian: ${dailyGoals.fat} g

            Asupan yang sudah dikonsumsi hari ini:
            - Total Kalori: ${Math.round(totals.totalCalories)} kkal
            - Total Protein: ${Math.round(totals.totalProtein)} g
            - Total Karbohidrat: ${Math.round(totals.totalCarbs)} g
            - Total Lemak: ${Math.round(totals.totalFat)} g
            - Makanan yang dimakan: ${foodList}

            Tugas Anda:
            Berikan analisis singkat, ramah, dan memotivasi dalam 2 bagian menggunakan format Markdown:

            1.  **Analisis Hari Ini:** Berikan satu atau dua kalimat ringkasan tentang progres pengguna hari ini. Puji apa yang sudah bagus dan beri masukan halus untuk yang kurang.
            2.  **Rekomendasi Cerdas:** Berikan satu atau dua saran spesifik untuk waktu makan berikutnya (misal: "Untuk makan malam nanti..."). Fokus pada makronutrien yang paling dibutuhkan pengguna untuk mencapai targetnya.

            Contoh jika protein kurang: "Untuk makan malam nanti, coba tambahkan sumber protein rendah lemak seperti dada ayam bakar atau tahu rebus untuk mengejar target proteinmu."
            Jaga agar respons tetap singkat dan mudah dimengerti.
        `;

        // Ganti dengan model yang tersedia
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Tambahkan logging sebelum memanggil Gemini API
        console.log("Mengirim permintaan ke Gemini API:", { prompt });

        const result = await model.generateContent(prompt);
        const response = result.response;

         // Tambahkan logging setelah menerima respons dari Gemini API
        console.log("Respons dari Gemini API:", { response });


        if (!response || typeof response.text !== 'function') {
            console.error("Respons dari Gemini kosong atau tidak valid.", result);
            return res.status(500).json({ message: "Gagal mendapatkan analisis dari AI. Respons mungkin diblokir atau tidak valid." });
        }

        const text = response.text();
        res.json({ analysisText: text });

    } catch (error) {
        console.error("Error saat menghubungi atau memproses respons Gemini API:", error);
        res.status(500).json({ message: "Gagal mendapatkan analisis dari AI. Respons mungkin diblokir." });
    }
};

module.exports = { getAIAnalysis };