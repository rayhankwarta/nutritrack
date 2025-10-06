    const translate = require('@iamtraction/google-translate');

    async function testTranslation() {
      console.log('Mencoba menerjemahkan "nasi goreng"...');
      try {
        const result = await translate('nasi goreng', { from: 'id', to: 'en' });
        console.log('--- BERHASIL! ---');
        console.log('Hasil:', result);
        console.log('Teks Terjemahan:', result.text);
      } catch (error) {
        console.error('--- GAGAL! ---');
        console.error('Error:', error);
      }
    }

    testTranslation();